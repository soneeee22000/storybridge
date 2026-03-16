# StoryBridge — Project Context

## What Is This?

StoryBridge is a hackathon submission for the **Gemini Live Agent Challenge** on Devpost.
Category: **Creative Storyteller** — multimodal storytelling with interleaved text, images, and audio.

Deadline: March 16, 2026, 8:00 PM EDT.

## The Problem

Immigrant/multilingual parents struggle to create bedtime stories that bridge their native language and their children's adopted language. This affects family bonding and cultural identity for millions of families worldwide.

## The Solution

A voice-driven bilingual storytelling companion where parents speak in their language and the agent co-creates an interactive, illustrated, narrated story in both languages.

## Architecture

Multi-agent system using Google ADK:

- **Orchestrator** (Gemini 2.5 Flash) — coordinates the storytelling flow
- **Story Architect** (Gemini 2.5 Flash) — creates bilingual story outlines with cultural context
- **Illustrator** (Gemini Flash Image Gen) — generates warm watercolor storybook illustrations
- **Narrator** (Gemini Flash TTS) — creates bilingual audio narration

## Tech Stack

- **Backend:** Python 3.10, FastAPI, Google ADK, Google GenAI SDK
- **Frontend:** React 19, TypeScript, Vite
- **AI Models:** Gemini 2.5 Flash, Gemini Flash Image Generation, Gemini Flash TTS
- **Deployment:** Google Cloud Run
- **Design:** Custom warm storybook aesthetic (earth tones, watercolor feel, no gradients)

## GCP Project

- **Project ID:** storybridge-hackathon
- **Project Name:** StoryBridge
- **Auth Account:** pyaesonekyaw1022000@gmail.com
- **Enabled APIs:** Cloud Run, Vertex AI

## Key Files

- `backend/server.py` — FastAPI server, all REST endpoints
- `backend/agents/orchestrator.py` — Root ADK agent
- `backend/agents/story_architect.py` — Story generation agent
- `backend/agents/illustrator.py` — Image generation agent
- `backend/agents/narrator.py` — TTS narration agent
- `frontend/src/App.tsx` — Main React app with storybook UI
- `frontend/src/styles/global.css` — Design system

## Build & Run

```bash
# Backend
cd backend && pip install -r requirements.txt && python server.py

# Frontend
cd frontend && npm install && npm run dev
```

## Submission Checklist

- [ ] Working app deployed on Cloud Run
- [ ] Public GitHub repo with README
- [ ] Architecture diagram
- [ ] Demo video (< 4 min) on YouTube
- [ ] GCP deployment proof (screenshot)
- [ ] Devpost form completed (all 5 steps)

## Design Rules

- No gradient backgrounds on buttons or UI elements
- Warm earth tones (cream, terracotta, forest green, deep brown)
- Crimson Pro for story text, Inter for UI
- Watercolor storybook aesthetic
- No AI slop — every element should feel handcrafted
