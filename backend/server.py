"""StoryBridge FastAPI server — serves the multi-agent storytelling system.

Provides REST API endpoints for the React frontend to interact with
the ADK agent pipeline.
"""

import base64
import json
import os
import uuid
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google import genai
from pydantic import BaseModel

load_dotenv()

app = FastAPI(
    title="StoryBridge API",
    description="Bilingual family storytelling companion powered by Gemini",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# In-memory session store
sessions: dict[str, dict[str, Any]] = {}


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


class SessionResponse(BaseModel):
    """Response containing session info."""

    session_id: str
    message: str


STORY_ARCHITECT_PROMPT = """You are a master storyteller who creates bilingual children's stories.

Create a story with exactly 5 scenes based on this input:
- Parent's language: {parent_language}
- Child's age: {child_age}
- Theme: {story_theme}
- Cultural elements to include: {cultural_elements}
- Story seed/idea: {story_seed}

For each scene, output a JSON object with these fields:
- scene_number (int)
- title_native (string, in {parent_language})
- title_english (string)
- narration_native (string, 2-3 sentences in {parent_language})
- narration_english (string, 2-3 sentences in English)
- image_prompt (string, detailed visual description for illustration — warm watercolor storybook style, culturally authentic, child-friendly, 16:9 landscape)
- cultural_element (string, what cultural element is featured)
- interactive_prompt_native (string, a question/choice for the child in {parent_language})
- interactive_prompt_english (string, same question/choice in English)

Output ONLY valid JSON: {{"story_title_native": "...", "story_title_english": "...", "scenes": [...]}}
No markdown, no code blocks, just raw JSON.
"""

ILLUSTRATION_PROMPT = """Generate a warm, beautiful watercolor storybook illustration for a children's story scene.

Style: Premium children's picture book, warm watercolor with soft edges
Mood: Cozy, magical, wonder-filled
Colors: Rich, warm palette
Aspect: Landscape (16:9)
Important: NO text in the image. Safe for children ages 3-10.

Scene to illustrate: {image_prompt}
"""

NARRATION_PROMPT = """Read this children's story scene aloud in a warm, gentle storytelling voice, like a loving parent reading a bedtime story.

First, read in {parent_language}:
{narration_native}

Then, read in English:
{narration_english}

Then ask the interactive question in both languages:
{interactive_prompt_native}
{interactive_prompt_english}

Keep a brief pause between language switches. Be expressive and warm.
"""


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "storybridge"}


@app.post("/api/story/create")
async def create_story(request: StoryRequest) -> JSONResponse:
    """Create a new story outline based on the parent's input."""
    session_id = str(uuid.uuid4())

    try:
        # Generate story outline
        prompt = STORY_ARCHITECT_PROMPT.format(
            parent_language=request.parent_language,
            child_age=request.child_age,
            story_theme=request.story_theme,
            cultural_elements=request.cultural_elements or "traditional elements",
            story_seed=request.story_seed or request.story_theme,
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        # Parse the story JSON
        story_text = response.text.strip()
        # Remove potential markdown code blocks
        if story_text.startswith("```"):
            story_text = story_text.split("\n", 1)[1]
            if story_text.endswith("```"):
                story_text = story_text[:-3].strip()

        story_data = json.loads(story_text)

        # Store session
        sessions[session_id] = {
            "story": story_data,
            "parent_language": request.parent_language,
            "child_age": request.child_age,
            "current_scene": 0,
            "choices": [],
        }

        return JSONResponse(
            content={
                "session_id": session_id,
                "story": story_data,
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


@app.post("/api/scene/illustrate")
async def illustrate_scene(
    session_id: str,
    scene_index: int,
) -> JSONResponse:
    """Generate an illustration for a specific scene."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    scenes = session["story"]["scenes"]

    if scene_index >= len(scenes):
        raise HTTPException(status_code=400, detail="Invalid scene index")

    scene = scenes[scene_index]

    try:
        prompt = ILLUSTRATION_PROMPT.format(image_prompt=scene["image_prompt"])

        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=prompt,
            config={
                "response_modalities": ["TEXT", "IMAGE"],
            },
        )

        # Extract image from response
        image_data = None
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


@app.post("/api/scene/narrate")
async def narrate_scene(
    session_id: str,
    scene_index: int,
) -> JSONResponse:
    """Generate audio narration for a specific scene."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    scenes = session["story"]["scenes"]

    if scene_index >= len(scenes):
        raise HTTPException(status_code=400, detail="Invalid scene index")

    scene = scenes[scene_index]

    try:
        prompt = NARRATION_PROMPT.format(
            parent_language=session["parent_language"],
            narration_native=scene["narration_native"],
            narration_english=scene["narration_english"],
            interactive_prompt_native=scene["interactive_prompt_native"],
            interactive_prompt_english=scene["interactive_prompt_english"],
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-preview-tts",
            contents=prompt,
            config={
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {
                            "voice_name": "Kore",
                        }
                    }
                },
            },
        )

        # Extract audio from response
        audio_data = None
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                audio_data = base64.b64encode(part.inline_data.data).decode("utf-8")
                break

        if not audio_data:
            raise HTTPException(
                status_code=500,
                detail="No audio generated",
            )

        return JSONResponse(
            content={
                "scene_index": scene_index,
                "audio_base64": audio_data,
                "mime_type": "audio/wav",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Narration generation failed: {str(e)}",
        )


@app.post("/api/scene/choice")
async def make_choice(request: SceneChoiceRequest) -> JSONResponse:
    """Process a child's choice and advance the story."""
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[request.session_id]
    session["choices"].append(request.choice)
    session["current_scene"] += 1

    current = session["current_scene"]
    total = len(session["story"]["scenes"])

    if current >= total:
        return JSONResponse(
            content={
                "completed": True,
                "message": "Story complete! What a wonderful adventure!",
                "total_scenes": total,
            }
        )

    return JSONResponse(
        content={
            "completed": False,
            "current_scene": current,
            "total_scenes": total,
            "scene": session["story"]["scenes"][current],
        }
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
            "total_scenes": len(session["story"]["scenes"]),
            "story": session["story"],
            "choices": session["choices"],
        }
    )


# Serve frontend static files in production
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str) -> FileResponse:
        """Serve the React frontend SPA."""
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))

    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
