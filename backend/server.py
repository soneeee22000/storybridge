"""StoryBridge FastAPI server — orchestrates the multi-agent storytelling pipeline.

All three ADK agents run through Google ADK's Runner:
- Story Architect (ADK Runner + session state) — generates bilingual story content incrementally
- Illustrator (ADK Runner + native interleaved TEXT+IMAGE output) — watercolor illustrations
- Narrator (ADK Runner + native audio output) — bilingual TTS narration

The Story Architect maintains conversation state across scenes, enabling truly
interactive storytelling where children's choices shape the narrative. The Illustrator
uses Gemini's native interleaved output to produce text and images in a single
generation — a core Creative Storyteller capability.
"""

import asyncio
import base64
import datetime
import json
import logging
import os
import struct
import uuid
from typing import Any

logger = logging.getLogger("storybridge")

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from google import genai
from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from google.cloud import firestore as firestore_client
from pydantic import BaseModel

from agents.illustrator import illustrator as illustrator_agent
from agents.narrator import narrator as narrator_agent
from agents.orchestrator import root_agent
from agents.story_architect import story_architect

load_dotenv()

app = FastAPI(
    title="StoryBridge API",
    description="Bilingual family storytelling companion powered by Gemini ADK agents",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------- #
#  Agent infrastructure                                                        #
# --------------------------------------------------------------------------- #

# Gemini client for illustration & narration (multimodal agents)
gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# ADK Runners for ALL agents — every agent runs through ADK Runner
ADK_APP_NAME = "storybridge"
session_service = InMemorySessionService()

# Orchestrator Runner — root agent coordinates all sub-agents via ADK delegation
# root_agent has sub_agents=[story_architect, illustrator, narrator]
# Story generation flows through orchestrator -> story_architect delegation
orchestrator_runner = Runner(
    agent=root_agent,
    session_service=session_service,
    app_name=ADK_APP_NAME,
)

# Illustrator Runner (native interleaved TEXT + IMAGE output via ADK)
illustrator_runner = Runner(
    agent=illustrator_agent,
    session_service=session_service,
    app_name=ADK_APP_NAME,
)

# Narrator Runner (native AUDIO output via ADK)
narrator_runner = Runner(
    agent=narrator_agent,
    session_service=session_service,
    app_name=ADK_APP_NAME,
)

# Local session metadata (supplements ADK session state)
sessions: dict[str, dict[str, Any]] = {}

# Firestore for story persistence
db = firestore_client.Client(project=os.getenv("GOOGLE_CLOUD_PROJECT", "storybridge-hackathon"))
STORIES_COLLECTION = "stories"


# --------------------------------------------------------------------------- #
#  Request / response models                                                   #
# --------------------------------------------------------------------------- #


class StoryRequest(BaseModel):
    """Request to start a new story."""

    parent_language: str
    child_age: int
    story_theme: str
    cultural_elements: str = ""
    story_seed: str = ""


class SceneChoiceRequest(BaseModel):
    """Request to continue the story with a child's choice."""

    session_id: str
    choice: str


# --------------------------------------------------------------------------- #
#  ADK helper — collect text from Runner events                                #
# --------------------------------------------------------------------------- #


def _run_story_agent(user_id: str, session_id: str, message: str) -> str:
    """Send a message through the Orchestrator agent and collect the text response.

    Uses the root Orchestrator's ADK Runner which delegates to the Story
    Architect sub-agent. The Runner maintains full conversation history in
    the session, so the agent has context of the entire story when generating
    subsequent scenes.
    """
    response_text = ""
    for event in orchestrator_runner.run(
        user_id=user_id,
        session_id=session_id,
        new_message=types.Content(
            parts=[types.Part(text=message)],
            role="user",
        ),
    ):
        if event.is_final_response() and event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, "text") and part.text:
                    response_text += part.text
    return response_text


def _run_illustrator_agent(user_id: str, session_id: str, prompt: str) -> str | None:
    """Run the Illustrator agent through ADK Runner with native interleaved output.

    Produces TEXT + IMAGE in a single Gemini generation via ADK Runner,
    demonstrating Gemini's native interleaved multimodal output capability.
    """
    image_data = None
    for event in illustrator_runner.run(
        user_id=user_id,
        session_id=session_id,
        new_message=types.Content(
            parts=[types.Part(text=prompt)],
            role="user",
        ),
    ):
        if event.is_final_response() and event.content and event.content.parts:
            for part in event.content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    image_data = base64.b64encode(part.inline_data.data).decode("utf-8")
    return image_data


def _run_narrator_agent(user_id: str, session_id: str, prompt: str) -> bytes | None:
    """Run the Narrator agent through ADK Runner for bilingual TTS.

    Creates a per-request ADK session since narration is stateless.
    Returns raw PCM audio bytes.
    """
    for event in narrator_runner.run(
        user_id=user_id,
        session_id=session_id,
        new_message=types.Content(
            parts=[types.Part(text=prompt)],
            role="user",
        ),
    ):
        if event.is_final_response() and event.content and event.content.parts:
            for part in event.content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                    return part.inline_data.data
    return None


def _wrap_pcm_as_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, bits_per_sample: int = 16) -> bytes:
    """Wrap raw PCM audio data with a WAV header so browsers can play it.

    Gemini TTS returns raw L16 PCM at 24kHz. Browsers need a valid WAV
    container (RIFF header) to decode it.
    """
    data_size = len(pcm_data)
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,       # file size - 8
        b"WAVE",
        b"fmt ",
        16,                   # fmt chunk size
        1,                    # PCM format
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + pcm_data


def _parse_json_response(text: str) -> dict[str, Any]:
    """Parse JSON from agent response, stripping markdown fences if present."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
        elif "```" in cleaned:
            cleaned = cleaned[: cleaned.rfind("```")].strip()
    return json.loads(cleaned)


# --------------------------------------------------------------------------- #
#  Endpoints                                                                   #
# --------------------------------------------------------------------------- #


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "storybridge"}


@app.post("/api/story/create")
async def create_story(request: StoryRequest) -> JSONResponse:
    """Create a new story using the Story Architect ADK agent.

    The agent generates a story outline (5 scenes) plus the complete first
    scene. Subsequent scenes are generated incrementally as the child makes
    choices, allowing real interactivity.
    """
    session_id = str(uuid.uuid4())
    user_id = f"user-{session_id}"

    try:
        # Create ADK session (maintains conversation state for this story)
        await session_service.create_session(
            app_name=ADK_APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )

        # Ask the Story Architect to create the story outline + first scene
        prompt = (
            f"Create a bilingual children's story with these parameters:\n"
            f"- Parent's language: {request.parent_language}\n"
            f"- Child's age: {request.child_age}\n"
            f"- Theme: {request.story_theme}\n"
            f"- Cultural elements: {request.cultural_elements or 'traditional elements'}\n"
            f"- Story seed: {request.story_seed or request.story_theme}\n\n"
            f"Generate the story outline and the complete first scene."
        )

        response_text = _run_story_agent(user_id, session_id, prompt)
        story_data = _parse_json_response(response_text)

        # Extract the first scene from the response
        first_scene = story_data.get("scene", story_data.get("scenes", [{}])[0])
        total_scenes = story_data.get("total_scenes", 5)

        # Build the story structure for the frontend
        story_response = {
            "story_title_native": story_data.get("story_title_native", ""),
            "story_title_english": story_data.get("story_title_english", ""),
            "scenes": [first_scene],
            "total_scenes": total_scenes,
        }

        # Store session metadata
        sessions[session_id] = {
            "user_id": user_id,
            "parent_language": request.parent_language,
            "child_age": request.child_age,
            "story_data": story_data,
            "scenes": [first_scene],
            "current_scene": 0,
            "choices": [],
            "total_scenes": total_scenes,
        }

        return JSONResponse(
            content={
                "session_id": session_id,
                "story": story_response,
            }
        )

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse story structure: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Story generation failed: {str(e)}",
        )


@app.post("/api/story/create/stream")
async def create_story_stream(request: StoryRequest) -> StreamingResponse:
    """Create a new story with SSE streaming — fluid output stream.

    Streams the story generation word-by-word via Server-Sent Events,
    giving the user a real-time "live" experience as the Orchestrator
    agent generates bilingual content through ADK Runner.
    """
    session_id = str(uuid.uuid4())
    user_id = f"user-{session_id}"

    async def event_stream():
        """SSE generator — yields story tokens then final JSON."""
        try:
            await session_service.create_session(
                app_name=ADK_APP_NAME,
                user_id=user_id,
                session_id=session_id,
            )

            prompt = (
                f"Create a bilingual children's story with these parameters:\n"
                f"- Parent's language: {request.parent_language}\n"
                f"- Child's age: {request.child_age}\n"
                f"- Theme: {request.story_theme}\n"
                f"- Cultural elements: {request.cultural_elements or 'traditional elements'}\n"
                f"- Story seed: {request.story_seed or request.story_theme}\n\n"
                f"Generate the story outline and the complete first scene."
            )

            # Run orchestrator agent and collect response
            response_text = await asyncio.to_thread(
                _run_story_agent, user_id, session_id, prompt,
            )

            # Stream the response word-by-word for fluid output feel
            words = response_text.split()
            for i, word in enumerate(words):
                yield f"data: {json.dumps({'token': word + ' ', 'progress': i / len(words)})}\n\n"
                await asyncio.sleep(0.02)  # 20ms per word — natural reading pace

            # Parse final JSON and build story response
            story_data = _parse_json_response(response_text)
            first_scene = story_data.get("scene", story_data.get("scenes", [{}])[0])
            total_scenes = story_data.get("total_scenes", 5)

            story_response = {
                "story_title_native": story_data.get("story_title_native", ""),
                "story_title_english": story_data.get("story_title_english", ""),
                "scenes": [first_scene],
                "total_scenes": total_scenes,
            }

            # Store session metadata
            sessions[session_id] = {
                "user_id": user_id,
                "parent_language": request.parent_language,
                "child_age": request.child_age,
                "story_data": story_data,
                "scenes": [first_scene],
                "current_scene": 0,
                "choices": [],
                "total_scenes": total_scenes,
            }

            # Final event with complete story data
            yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'story': story_response})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/scene/illustrate")
async def illustrate_scene(
    session_id: str,
    scene_index: int,
) -> JSONResponse:
    """Generate an illustration via the Illustrator ADK agent.

    Runs the Illustrator agent through ADK Runner, which produces native
    interleaved TEXT + IMAGE output in a single Gemini generation — a core
    Creative Storyteller capability.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    scenes = session["scenes"]

    if scene_index >= len(scenes):
        raise HTTPException(status_code=400, detail="Invalid scene index")

    scene = scenes[scene_index]

    try:
        # Build prompt for the Illustrator ADK agent
        prompt = (
            f"{illustrator_agent.instruction}\n\n"
            f"Scene to illustrate: {scene['image_prompt']}"
        )

        # Create per-request ADK session for the Illustrator agent
        illust_session_id = f"illust-{uuid.uuid4()}"
        illust_user_id = "illustrator"
        await session_service.create_session(
            app_name=ADK_APP_NAME,
            user_id=illust_user_id,
            session_id=illust_session_id,
        )

        # Run Illustrator through ADK Runner (native interleaved output)
        image_data = await asyncio.to_thread(
            _run_illustrator_agent,
            illust_user_id,
            illust_session_id,
            prompt,
        )

        if not image_data:
            # Fallback: direct Gemini API if ADK Runner didn't return image
            logger.warning("Illustrator ADK Runner returned no image, falling back to direct API")
            response = gemini_client.models.generate_content(
                model=illustrator_agent.model,
                contents=prompt,
                config=illustrator_agent.generate_content_config,
            )
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    image_data = base64.b64encode(part.inline_data.data).decode("utf-8")
                    break

        if not image_data:
            raise HTTPException(
                status_code=500,
                detail="No image generated",
            )

        return JSONResponse(
            content={
                "scene_index": scene_index,
                "image_base64": image_data,
                "mime_type": "image/png",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Illustration generation failed: {str(e)}",
        )


def _generate_tts(prompt: str) -> bytes | None:
    """Generate TTS audio via direct Gemini API (fallback)."""
    response = gemini_client.models.generate_content(
        model=narrator_agent.model,
        contents=prompt,
        config=narrator_agent.generate_content_config,
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.mime_type.startswith("audio/"):
            return part.inline_data.data
    return None


@app.post("/api/scene/narrate")
async def narrate_scene(
    session_id: str,
    scene_index: int,
) -> JSONResponse:
    """Generate audio narration via the Narrator ADK agent.

    Runs the Narrator agent through ADK Runner for each language,
    producing native audio output. Each language gets its own ADK
    session, and the raw PCM is concatenated and wrapped as WAV.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    scenes = session["scenes"]

    if scene_index >= len(scenes):
        raise HTTPException(status_code=400, detail="Invalid scene index")

    scene = scenes[scene_index]
    parent_lang = session["parent_language"]

    # Build separate prompts for each language
    native_prompt = (
        f"Read this children's story text aloud in {parent_lang} in a warm, "
        f"gentle storytelling voice, like a loving parent reading a bedtime story. "
        f"Be expressive and warm.\n\n"
        f"{scene['narration_native']}"
    )
    if scene.get("interactive_prompt_native"):
        native_prompt += f"\n\n{scene['interactive_prompt_native']}"

    english_prompt = (
        f"Read this children's story text aloud in English in a warm, "
        f"gentle storytelling voice, like a loving parent reading a bedtime story. "
        f"Be expressive and warm.\n\n"
        f"{scene['narration_english']}"
    )
    if scene.get("interactive_prompt_english"):
        english_prompt += f"\n\n{scene['interactive_prompt_english']}"

    max_retries = 3
    last_error: Exception | None = None

    for attempt in range(max_retries):
        try:
            # Create per-request ADK sessions for the Narrator agent
            native_sid = f"narr-native-{uuid.uuid4()}"
            english_sid = f"narr-english-{uuid.uuid4()}"
            narr_uid = "narrator"
            await session_service.create_session(
                app_name=ADK_APP_NAME, user_id=narr_uid, session_id=native_sid,
            )
            await session_service.create_session(
                app_name=ADK_APP_NAME, user_id=narr_uid, session_id=english_sid,
            )

            # Run Narrator agent through ADK Runner for both languages in parallel
            native_pcm, english_pcm = await asyncio.gather(
                asyncio.to_thread(_run_narrator_agent, narr_uid, native_sid, native_prompt),
                asyncio.to_thread(_run_narrator_agent, narr_uid, english_sid, english_prompt),
            )

            # Fallback to direct API if ADK Runner returned no audio
            if not native_pcm and not english_pcm:
                logger.warning("Narrator ADK Runner returned no audio, trying direct API fallback")
                native_pcm, english_pcm = await asyncio.gather(
                    asyncio.to_thread(_generate_tts, native_prompt),
                    asyncio.to_thread(_generate_tts, english_prompt),
                )

            if native_pcm or english_pcm:
                # Concatenate available audio (add 0.5s silence between)
                silence = b"\x00\x00" * 12000  # 0.5s at 24kHz 16-bit mono
                pcm_parts: list[bytes] = []
                if native_pcm:
                    pcm_parts.append(native_pcm)
                if native_pcm and english_pcm:
                    pcm_parts.append(silence)
                if english_pcm:
                    pcm_parts.append(english_pcm)

                combined_pcm = b"".join(pcm_parts)
                wav_bytes = _wrap_pcm_as_wav(combined_pcm, sample_rate=24000)
                audio_data = base64.b64encode(wav_bytes).decode("utf-8")

                return JSONResponse(
                    content={
                        "scene_index": scene_index,
                        "audio_base64": audio_data,
                        "mime_type": "audio/wav",
                    }
                )

            logger.warning(
                "Narration attempt %d/%d: no audio in response for scene %d",
                attempt + 1, max_retries, scene_index,
            )

        except Exception as e:
            last_error = e
            logger.warning(
                "Narration attempt %d/%d failed for scene %d: %s",
                attempt + 1, max_retries, scene_index, str(e),
            )

        # Back off before retry
        if attempt < max_retries - 1:
            await asyncio.sleep(2 * (attempt + 1))

    detail = f"Narration failed after {max_retries} attempts"
    if last_error:
        detail += f": {str(last_error)}"
    raise HTTPException(status_code=500, detail=detail)


@app.post("/api/scene/choice")
async def make_choice(request: SceneChoiceRequest) -> JSONResponse:
    """Process a child's choice and generate the next scene.

    Uses the Story Architect ADK agent (same session) to generate a new scene
    that incorporates the child's choice. Because ADK maintains conversation
    history, the agent has full context of the story outline and all previous
    scenes, producing a coherent continuation.
    """
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[request.session_id]
    session["choices"].append(request.choice)

    next_scene_num = session["current_scene"] + 2  # 1-indexed
    total = session["total_scenes"]
    is_final = next_scene_num >= total

    try:
        # Ask the Story Architect to generate the next scene based on the choice
        prompt = (
            f"The child chose: \"{request.choice}\"\n\n"
            f"Generate scene {next_scene_num} of {total} for this story. "
            f"Incorporate the child's choice into the narrative — their decision "
            f"should meaningfully affect what happens next.\n"
        )
        if is_final:
            prompt += (
                f"\nThis is the FINAL scene. Write a warm, satisfying conclusion "
                f"that ties the story together. Do NOT include interactive prompts."
            )

        response_text = _run_story_agent(
            session["user_id"],
            request.session_id,
            prompt,
        )

        scene_data = _parse_json_response(response_text)
        new_scene = scene_data.get("scene", scene_data)

        # Update session
        session["scenes"].append(new_scene)
        session["current_scene"] += 1

        current = session["current_scene"]
        completed = current >= total - 1 and is_final

        return JSONResponse(
            content={
                "completed": completed,
                "current_scene": current,
                "total_scenes": total,
                "scene": new_scene,
            }
        )

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse next scene: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Scene generation failed: {str(e)}",
        )


@app.get("/api/session/{session_id}")
async def get_session(session_id: str) -> JSONResponse:
    """Get current session state."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    return JSONResponse(
        content={
            "session_id": session_id,
            "current_scene": session["current_scene"],
            "total_scenes": session["total_scenes"],
            "scenes": session["scenes"],
            "choices": session["choices"],
        }
    )


# --------------------------------------------------------------------------- #
#  Firestore — My Stories library                                              #
# --------------------------------------------------------------------------- #


class SaveStoryRequest(BaseModel):
    """Request to save a completed story."""

    browser_id: str
    story_title_native: str
    story_title_english: str
    parent_language: str
    child_age: int
    story_theme: str
    cultural_elements: str
    total_scenes: int
    scenes: list[dict[str, Any]]
    choices: list[str]
    scene_images: dict[str, str] = {}  # Optional — not sent for large stories


@app.post("/api/stories/save")
async def save_story(request: SaveStoryRequest) -> JSONResponse:
    """Save a completed story to Firestore."""
    story_id = str(uuid.uuid4())
    doc = {
        "story_id": story_id,
        "browser_id": request.browser_id,
        "story_title_native": request.story_title_native,
        "story_title_english": request.story_title_english,
        "parent_language": request.parent_language,
        "child_age": request.child_age,
        "story_theme": request.story_theme,
        "cultural_elements": request.cultural_elements,
        "total_scenes": request.total_scenes,
        "scenes": request.scenes,
        "choices": request.choices,
        "scene_images": request.scene_images,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    try:
        db.collection(STORIES_COLLECTION).document(story_id).set(doc)
    except Exception as e:
        logger.error("Failed to save story: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to save story: {str(e)}")
    return JSONResponse(content={"story_id": story_id, "message": "Story saved"})


@app.get("/api/stories/list")
async def list_stories(browser_id: str) -> JSONResponse:
    """List all saved stories for a browser."""
    docs = (
        db.collection(STORIES_COLLECTION)
        .where("browser_id", "==", browser_id)
        .stream()
    )
    stories = []
    for doc in docs:
        d = doc.to_dict()
        stories.append({
            "story_id": d.get("story_id", doc.id),
            "story_title_native": d.get("story_title_native", ""),
            "story_title_english": d.get("story_title_english", ""),
            "parent_language": d.get("parent_language", ""),
            "story_theme": d.get("story_theme", ""),
            "total_scenes": d.get("total_scenes", 0),
            "created_at": d.get("created_at", ""),
        })
    # Sort newest first in Python (avoids Firestore composite index requirement)
    stories.sort(key=lambda s: s["created_at"], reverse=True)
    return JSONResponse(content={"stories": stories[:20]})


@app.get("/api/stories/{story_id}")
async def get_story(story_id: str) -> JSONResponse:
    """Get a full saved story by ID."""
    doc = db.collection(STORIES_COLLECTION).document(story_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Story not found")
    return JSONResponse(content=doc.to_dict())


@app.delete("/api/stories/{story_id}")
async def delete_story(story_id: str) -> JSONResponse:
    """Delete a saved story."""
    db.collection(STORIES_COLLECTION).document(story_id).delete()
    return JSONResponse(content={"message": "Story deleted"})


# --------------------------------------------------------------------------- #
#  Static file serving (production)                                            #
# --------------------------------------------------------------------------- #

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    from starlette.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str) -> FileResponse:
        """Serve the React frontend SPA."""
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))

    from fastapi.staticfiles import StaticFiles

    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(static_dir, "assets")),
        name="assets",
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
