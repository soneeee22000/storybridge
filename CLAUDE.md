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
- **Illustrator** (gemini-2.5-flash-image) — generates warm watercolor storybook illustrations
- **Narrator** (gemini-2.5-flash-preview-tts) — creates bilingual audio narration

## Tech Stack

- **Backend:** Python 3.10, FastAPI, Google GenAI SDK
- **Frontend:** React 19, TypeScript, Vite
- **AI Models:** Gemini 2.5 Flash (text), gemini-2.5-flash-image (illustrations), gemini-2.5-flash-preview-tts (narration)
- **Deployment:** Google Cloud Run (multi-stage Docker build)
- **Design:** Custom warm storybook aesthetic (earth tones, watercolor feel, no gradients)

## GCP Project

- **Project ID:** storybridge-hackathon
- **Project Number:** 469521173814
- **Auth Account:** pyaesonekyaw1022000@gmail.com
- **Enabled APIs:** Cloud Run, Vertex AI, Cloud Build, Artifact Registry
- **IAM:** Compute service account granted storage.objectViewer, cloudbuild.builds.builder, artifactregistry.writer, run.admin
- **gcloud CLI path:** `C:\Users\pyaes\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`

## Key Files

- `backend/server.py` — FastAPI server + orchestrator, coordinates ADK agents via Runner
- `backend/agents/orchestrator.py` — Root ADK agent definition (architecture documentation)
- `backend/agents/story_architect.py` — Story generation agent (runs through ADK Runner with session state)
- `backend/agents/illustrator.py` — Image generation agent config (model: gemini-2.5-flash-image)
- `backend/agents/narrator.py` — TTS narration agent config (model: gemini-2.5-flash-preview-tts)
- `frontend/src/App.tsx` — Main React app with storybook UI
- `frontend/src/styles/global.css` — Design system
- `Dockerfile` — Multi-stage build (Node frontend + Python backend), uses `${PORT:-8080}` for Cloud Run
- `docs/DEMO-SCRIPT.md` — 4-minute demo video script with timestamps

## Build & Run

```bash
# Backend (use venv)
cd backend && .venv/Scripts/python -m uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend (dev)
cd frontend && npm run dev  # runs on port 5173

# Deploy to Cloud Run
GCLOUD="C:/Users/pyaes/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd"
"$GCLOUD" run deploy storybridge --source . --region us-central1 --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=...,GOOGLE_GENAI_USE_VERTEXAI=FALSE,GOOGLE_CLOUD_PROJECT=storybridge-hackathon" \
  --memory 1Gi --timeout 300 --quiet
```

## Deployment Issues Resolved

1. **IAM permissions** — Compute service account needed storage.objectViewer, cloudbuild.builds.builder, artifactregistry.writer, run.admin
2. **TypeScript build** — `JSX.Element` → `ReactNode` for React 19 compatibility
3. **Port config** — Cloud Run injects `PORT=8080`, Dockerfile CMD uses `${PORT:-8080}` (cannot set PORT as env var — reserved)

## Verified Working (Production)

- **Live URL:** https://storybridge-469521173814.us-central1.run.app
- Story generation — bilingual 5-scene stories with cultural context (Burmese + English tested)
- Illustration — watercolor storybook images with culturally authentic details (thanaka, Thingyan, pagodas)
- Audio narration — bilingual TTS narration with play/pause
- Interactive choices — child's input advances to next scene with new illustration + narration
- Full end-to-end flow tested on production Cloud Run

## External Links

- **Live App:** https://storybridge-469521173814.us-central1.run.app
- **GitHub:** https://github.com/soneeee22000/storybridge
- **Architecture Diagram:** https://excalidraw.com/#json=lDcsp4YXsoGnq5J0gucbp,wZotHiKfhUUfeekgUXWn-w
- **Devpost Submission:** https://devpost.com/submit-to/28633-gemini-live-agent-challenge/manage/submissions/971026/project-overview

## Progress

- [x] GCP project created & configured
- [x] Multi-agent engine built and verified (all 3 Gemini APIs working)
- [x] **ADK integration** — Story Architect runs through ADK Runner with session state
- [x] **Interactive choices are real** — child's choices generate new scenes via ADK agent
- [x] Frontend UI (warm storybook design, no AI slop)
- [x] Architecture diagram (Excalidraw)
- [x] GitHub repo public with README
- [x] Cloud Run deployed & verified (full E2E flow working)
- [x] Demo video script written (docs/DEMO-SCRIPT.md)
- [x] GIF walkthrough captured (storybridge-demo-walkthrough.gif)
- [x] Devpost project name + elevator pitch filled (draft saved)
- [x] **Landing page** — 6-section premium page (Hero with logo, Problem stats, How It Works, Features, Architecture, CTA)
- [x] **Premium design upgrade** — Playfair Display hero font, floating decorative elements, colored accent stripes, hover lift cards, connecting step lines
- [x] **Logo + favicon** — Book-bridge SVG mark (two pages meeting, green + gold text lines)
- [x] **UX polish** — Error handling, generating overlay, scene 5 "Finish Story" button, improved completion screen
- [x] **Audio bug fix** — Generation counter prevents stale audio from old scenes overwriting current
- [x] **Navigation fix** — "Tell Another Story" goes to setup form; logo click goes to landing
- [x] **Redeployed to Cloud Run** — All changes live (latest revision storybridge-00012-lmk)
- [x] **README.md overhaul** — Mermaid diagrams, PMF analysis, limitations, roadmap, competitive landscape
- [x] **GitHub repo about** — Description, homepage, 14 topics/tags updated
- [x] **ALL 3 agents through ADK Runner** — Story Architect, Illustrator, Narrator all run via ADK Runner
- [x] **Native interleaved output** — Illustrator produces TEXT + IMAGE in single ADK generation
- [x] **Voice input** — Web Speech API for children's choices (mic button with pulse animation)
- [x] **Demo script fixed** — "70 languages" corrected to "20+"
- [x] **Redeploying to Cloud Run** — All technical upgrades deploying
- [ ] Record demo video with voiceover and upload to YouTube
- [ ] Take GCP deployment screenshot for submission
- [ ] Complete Devpost form (project details, additional info) and submit

## Design Rules

- No gradient backgrounds on buttons or UI elements
- Warm earth tones (cream, terracotta, forest green, deep brown)
- Playfair Display for hero/section headings, Crimson Pro for story text, Inter for UI
- Watercolor storybook aesthetic
- No AI slop — every element should feel handcrafted
- Book-bridge logo: two pages meeting at center, green text lines (native) + gold text lines (English)
