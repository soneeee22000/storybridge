"""Gemini Live API session manager for real-time voice interaction.

Bridges WebSocket connections from the frontend to the Gemini Live API,
enabling bidirectional audio streaming for the StoryBridge voice companion.
The companion guides families through storytelling with real-time voice.
"""

import asyncio
import base64
import json
import logging
import os
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger("storybridge.live")

LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

COMPANION_SYSTEM_INSTRUCTION = """You are the StoryBridge Voice Companion — a warm, bilingual storytelling guide
for immigrant and multilingual families.

## Your Personality:
- Warm, gentle, and encouraging — like a favorite grandparent
- You speak the parent's heritage language AND English naturally
- You celebrate children's ideas and creativity
- You use simple vocabulary appropriate for young children

## What You Do:
1. **Story Setup**: Help the parent choose a story by asking about their language, their child's age,
   favorite themes, and cultural elements they want to include. Be conversational, not interrogative.
2. **During Stories**: Narrate scenes expressively, explain cultural elements, teach vocabulary words,
   and ask the child what they want to happen next.
3. **Vocabulary Teaching**: When you encounter a word in the heritage language, say it clearly,
   give the English meaning, and encourage the child to repeat it.

## Voice Style:
- Slow, clear pacing for young children
- Expressive and dramatic for story narration
- Warm and encouraging for interactions
- Natural code-switching between languages

## Important Rules:
- NEVER generate anything inappropriate for children
- Keep responses concise — children have short attention spans
- If the child says something unexpected, creatively incorporate it
- Always respond in both the heritage language AND English
"""


def build_live_config(
    parent_language: str = "",
    story_context: str = "",
) -> dict[str, Any]:
    """Build the Gemini Live API config with story context."""
    system_parts = COMPANION_SYSTEM_INSTRUCTION
    if parent_language:
        system_parts += f"\n\nThe parent's heritage language is: {parent_language}"
    if story_context:
        system_parts += f"\n\nCurrent story context:\n{story_context}"

    return {
        "response_modalities": ["AUDIO"],
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {
                    "voice_name": "Kore",
                }
            }
        },
        "system_instruction": system_parts,
        "input_audio_transcription": {},
        "output_audio_transcription": {},
    }


async def handle_live_session(
    websocket_send: Any,
    websocket_receive: Any,
    parent_language: str = "",
    story_context: str = "",
) -> None:
    """Run a Gemini Live session, bridging frontend WebSocket to Gemini.

    Args:
        websocket_send: Async callable to send messages to the frontend.
        websocket_receive: Async callable to receive messages from the frontend.
        parent_language: The parent's heritage language.
        story_context: Current story context for the companion.
    """
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    config = build_live_config(parent_language, story_context)

    try:
        async with client.aio.live.connect(
            model=LIVE_MODEL,
            config=config,
        ) as session:
            logger.info("Gemini Live session connected")

            # Send initial greeting context
            if parent_language:
                await session.send_client_content(
                    turns={
                        "role": "user",
                        "parts": [{"text": f"Greet me warmly in {parent_language} and English. I'm a parent ready to create a bedtime story with my child."}],
                    },
                    turn_complete=True,
                )

            async def forward_audio_to_gemini() -> None:
                """Receive audio from frontend WebSocket, forward to Gemini."""
                try:
                    while True:
                        raw = await websocket_receive()
                        if raw is None:
                            break

                        msg = json.loads(raw) if isinstance(raw, str) else raw

                        if isinstance(msg, dict):
                            if msg.get("type") == "audio":
                                audio_bytes = base64.b64decode(msg["data"])
                                await session.send_realtime_input(
                                    audio=types.Blob(
                                        data=audio_bytes,
                                        mime_type="audio/pcm;rate=16000",
                                    )
                                )
                            elif msg.get("type") == "text":
                                await session.send_client_content(
                                    turns={
                                        "role": "user",
                                        "parts": [{"text": msg["data"]}],
                                    },
                                    turn_complete=True,
                                )
                            elif msg.get("type") == "context":
                                # Update story context mid-session
                                await session.send_client_content(
                                    turns={
                                        "role": "user",
                                        "parts": [{"text": f"[Story context update]: {msg['data']}"}],
                                    },
                                    turn_complete=True,
                                )
                            elif msg.get("type") == "close":
                                break
                except Exception as e:
                    logger.warning("Audio forwarding ended: %s", e)

            async def forward_gemini_to_frontend() -> None:
                """Receive responses from Gemini, forward to frontend WebSocket."""
                try:
                    async for response in session.receive():
                        if response.server_content:
                            sc = response.server_content

                            # Audio response
                            if sc.model_turn:
                                for part in sc.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        audio_b64 = base64.b64encode(
                                            part.inline_data.data
                                        ).decode("utf-8")
                                        await websocket_send(json.dumps({
                                            "type": "audio",
                                            "data": audio_b64,
                                            "mime_type": "audio/pcm;rate=24000",
                                        }))

                            # Output transcription
                            if sc.output_transcription and sc.output_transcription.text:
                                await websocket_send(json.dumps({
                                    "type": "transcript",
                                    "speaker": "companion",
                                    "text": sc.output_transcription.text,
                                }))

                            # Input transcription
                            if sc.input_transcription and sc.input_transcription.text:
                                await websocket_send(json.dumps({
                                    "type": "transcript",
                                    "speaker": "user",
                                    "text": sc.input_transcription.text,
                                }))

                            # Interruption
                            if sc.interrupted:
                                await websocket_send(json.dumps({
                                    "type": "interrupted",
                                }))

                except Exception as e:
                    logger.warning("Gemini response forwarding ended: %s", e)

            # Run both directions concurrently
            await asyncio.gather(
                forward_audio_to_gemini(),
                forward_gemini_to_frontend(),
            )

    except Exception as e:
        logger.error("Live session error: %s", e)
        try:
            await websocket_send(json.dumps({
                "type": "error",
                "message": str(e),
            }))
        except Exception:
            pass
