# StoryBridge — Bilingual Family Storytelling Companion

**Where languages meet through the magic of storytelling.**

StoryBridge is an AI-powered, interactive storytelling companion that helps immigrant and multilingual families create magical bedtime stories that bridge their native language and their children's language. Every story is brought to life with culturally-rich illustrations, bilingual narration, and interactive choices.

## The Problem

Millions of immigrant parents struggle to share bedtime stories with their children due to language barriers. Children growing up in bilingual households often lose connection to their parents' native language and cultural heritage. Existing tools treat translation as an afterthought — StoryBridge makes bilingualism the core experience.

## How It Works

1. **Choose your language** — Select your home language from 70+ supported languages
2. **Set the scene** — Pick a theme, cultural elements, and optionally provide a story seed
3. **Experience the story** — Each scene features:
   - Culturally-authentic watercolor illustrations (AI-generated)
   - Bilingual text (parent's language + English side by side)
   - Warm audio narration in both languages
   - Interactive prompts where your child shapes the story
4. **Build bridges** — Every story strengthens the bond between languages, cultures, and family

## Architecture

StoryBridge uses a **multi-agent architecture** powered by Google's Agent Development Kit (ADK):

```
User Input (any language)
    │
    ▼
┌─────────────────────┐
│  Orchestrator Agent  │ ← Root agent, manages story flow
│  (Gemini 2.5 Flash)  │
└─────────┬───────────┘
          │
    ┌─────┼─────────────┐
    ▼     ▼             ▼
┌───────┐ ┌──────────┐ ┌─────────┐
│Story  │ │Illustra- │ │Narrator │
│Archi- │ │tor Agent │ │Agent    │
│tect   │ │(Gemini   │ │(Gemini  │
│Agent  │ │Flash     │ │Flash    │
│       │ │Image Gen)│ │TTS)     │
└───────┘ └──────────┘ └─────────┘
    │          │            │
    ▼          ▼            ▼
Bilingual  Watercolor   Audio in
Story      Illustra-    both
Outline    tions        languages
```

## Tech Stack

- **Backend**: Python, FastAPI, Google ADK
- **AI Models**: Gemini 2.5 Flash (text), Gemini Flash Image Generation (illustrations), Gemini Flash TTS (narration)
- **Frontend**: React 19, TypeScript, Vite
- **Deployment**: Google Cloud Run
- **Design**: Custom warm storybook aesthetic (no AI slop)

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Google Cloud account with Gemini API access

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your GOOGLE_API_KEY

# Run the server
python server.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Docker (Production)

```bash
# Backend
cd backend
docker build -t storybridge-backend .
docker run -p 8000:8000 --env-file .env storybridge-backend

# Frontend
cd frontend
npm run build
# Serve the dist/ folder
```

## Google Cloud Deployment

```bash
# Authenticate
gcloud auth login
gcloud config set project storybridge-hackathon

# Deploy backend to Cloud Run
cd backend
gcloud run deploy storybridge-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=$GOOGLE_API_KEY
```

## Submission Category

**Creative Storyteller** — Multimodal storytelling with interleaved text, images, and audio.

## Team

- **Pyae Sone Kyaw** — Founding AI Engineer at Siloett.AI (Station F, Paris)

## License

MIT
