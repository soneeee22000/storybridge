/**
 * StoryBridge — Main Application Component
 *
 * A bilingual family storytelling companion that creates interactive,
 * illustrated stories bridging languages and cultures.
 *
 * Features voice input via Web Speech API — moving "beyond the text box"
 * for a more natural, immersive storytelling experience.
 */

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/* Web Speech API type declarations for TypeScript strict mode */
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Scene {
  scene_number: number;
  title_native: string;
  title_english: string;
  narration_native: string;
  narration_english: string;
  image_prompt: string;
  cultural_element: string;
  interactive_prompt_native: string;
  interactive_prompt_english: string;
}

interface Story {
  story_title_native: string;
  story_title_english: string;
  scenes: Scene[];
  total_scenes: number;
}

type AppPhase =
  | "landing"
  | "setup"
  | "loading"
  | "scene"
  | "complete"
  | "reading";

const API_BASE = "/api";

const LANGUAGES = [
  "Burmese (Myanmar)",
  "Spanish",
  "Mandarin Chinese",
  "Arabic",
  "Hindi",
  "French",
  "Portuguese",
  "Vietnamese",
  "Korean",
  "Japanese",
  "Tagalog",
  "Thai",
  "Turkish",
  "Swahili",
  "Amharic",
  "Bengali",
  "Urdu",
  "Persian (Farsi)",
  "Ukrainian",
  "Russian",
];

const THEMES = [
  "Magical adventure",
  "Animal friends",
  "Family & home",
  "Nature & seasons",
  "Space & stars",
  "Ocean & sea creatures",
  "Friendship & kindness",
  "Food & cooking",
  "Music & dance",
  "Brave heroes",
];

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

async function createStory(params: {
  parent_language: string;
  child_age: number;
  story_theme: string;
  cultural_elements: string;
  story_seed: string;
}): Promise<{ session_id: string; story: Story }> {
  const res = await fetch(`${API_BASE}/story/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Story creation failed: ${res.statusText}`);
  return res.json();
}

async function illustrateScene(
  sessionId: string,
  sceneIndex: number,
): Promise<{ image_base64: string; mime_type: string }> {
  const res = await fetch(
    `${API_BASE}/scene/illustrate?session_id=${sessionId}&scene_index=${sceneIndex}`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`Illustration failed: ${res.statusText}`);
  return res.json();
}

async function narrateScene(
  sessionId: string,
  sceneIndex: number,
): Promise<{ audio_base64: string; mime_type: string }> {
  const res = await fetch(
    `${API_BASE}/scene/narrate?session_id=${sessionId}&scene_index=${sceneIndex}`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`Narration failed: ${res.statusText}`);
  return res.json();
}

async function submitChoice(
  sessionId: string,
  choice: string,
): Promise<{ completed: boolean; current_scene: number; scene?: Scene }> {
  const res = await fetch(`${API_BASE}/scene/choice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, choice }),
  });
  if (!res.ok) throw new Error(`Choice failed: ${res.statusText}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Browser ID + Story Library API                                     */
/* ------------------------------------------------------------------ */

function getBrowserId(): string {
  const KEY = "storybridge_browser_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

interface SavedStorySummary {
  story_id: string;
  story_title_native: string;
  story_title_english: string;
  parent_language: string;
  story_theme: string;
  total_scenes: number;
  created_at: string;
}

interface SavedStoryFull extends SavedStorySummary {
  scenes: Scene[];
  choices: string[];
  child_age: number;
  cultural_elements: string;
}

async function saveStoryToLibrary(params: {
  story: Story;
  scenes: Scene[];
  choices: string[];
  parentLanguage: string;
  childAge: number;
  storyTheme: string;
  culturalElements: string;
}): Promise<void> {
  await fetch(`${API_BASE}/stories/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      browser_id: getBrowserId(),
      story_title_native: params.story.story_title_native,
      story_title_english: params.story.story_title_english,
      parent_language: params.parentLanguage,
      child_age: params.childAge,
      story_theme: params.storyTheme,
      cultural_elements: params.culturalElements,
      total_scenes: params.story.total_scenes,
      scenes: params.scenes,
      choices: params.choices,
    }),
  });
}

async function fetchSavedStories(): Promise<SavedStorySummary[]> {
  const res = await fetch(
    `${API_BASE}/stories/list?browser_id=${getBrowserId()}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.stories || [];
}

async function fetchFullStory(storyId: string): Promise<SavedStoryFull | null> {
  const res = await fetch(`${API_BASE}/stories/${storyId}`);
  if (!res.ok) return null;
  return res.json();
}

async function deleteStoryFromLibrary(storyId: string): Promise<void> {
  await fetch(`${API_BASE}/stories/${storyId}`, { method: "DELETE" });
}

/* ------------------------------------------------------------------ */
/*  Logo                                                               */
/* ------------------------------------------------------------------ */

/**
 * StoryBridge logo — a bridge formed by two open book pages meeting at
 * a center point. Left page has green "text lines" (native language),
 * right page has gold "text lines" (English). The bridge arc connects them.
 */
function LogoMark({ size = 36 }: { size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="logo-mark"
      aria-hidden="true"
    >
      <path
        d="M4 24C4 24 8 8 16 8"
        stroke="#c67a4a"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M28 24C28 24 24 8 16 8"
        stroke="#c67a4a"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M6 22Q16 14 26 22"
        stroke="#4a3228"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="16" cy="8" r="2.5" fill="#c67a4a" />
      <line
        x1="8"
        y1="17"
        x2="13"
        y2="13"
        stroke="#3d6b4f"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="9"
        y1="20"
        x2="14"
        y2="15.5"
        stroke="#3d6b4f"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <line
        x1="24"
        y1="17"
        x2="19"
        y2="13"
        stroke="#d4a843"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="23"
        y1="20"
        x2="18"
        y2="15.5"
        stroke="#d4a843"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function Header({
  minimal,
  onLogoClick,
}: {
  minimal?: boolean;
  onLogoClick?: () => void;
}): ReactNode {
  if (minimal) return null;
  return (
    <header className="app-header">
      <div className="header-row">
        <button
          className="header-logo-btn"
          onClick={onLogoClick}
          aria-label="Back to home"
          type="button"
        >
          <LogoMark size={32} />
          <h1 className="app-title">StoryBridge</h1>
        </button>
        <div className="header-links">
          <a
            href="https://github.com/soneeee22000/storybridge"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
            aria-label="GitHub repository"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://pseonkyaw.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
            aria-label="Portfolio"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </a>
        </div>
      </div>
      <p className="app-subtitle">
        Where languages meet through the magic of storytelling
      </p>
    </header>
  );
}

function MyStories({
  stories,
  onRead,
  onRefresh,
}: {
  stories: SavedStorySummary[];
  onRead: (storyId: string) => void;
  onRefresh: () => void;
}): ReactNode {
  if (stories.length === 0) return null;

  const handleDelete = async (storyId: string): Promise<void> => {
    await deleteStoryFromLibrary(storyId);
    onRefresh();
  };

  return (
    <section className="my-stories-section">
      <h2 className="my-stories-title">My Stories ({stories.length})</h2>
      <div className="my-stories-shelf">
        {stories.map((s) => (
          <div key={s.story_id} className="my-stories-card">
            <button
              className="my-stories-card-btn"
              onClick={() => onRead(s.story_id)}
              type="button"
            >
              <p className="my-stories-card-title">{s.story_title_native}</p>
              <p className="my-stories-card-english">{s.story_title_english}</p>
              <div className="my-stories-card-meta">
                <span className="my-stories-card-badge">{s.story_theme}</span>
                <span className="my-stories-card-badge">
                  {s.parent_language}
                </span>
              </div>
              <p className="my-stories-card-scenes">{s.total_scenes} scenes</p>
            </button>
            <button
              className="my-stories-delete"
              onClick={() => handleDelete(s.story_id)}
              aria-label="Delete story"
              type="button"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadingView({
  story,
  sceneIndex,
  onNext,
  onPrev,
  onClose,
}: {
  story: SavedStoryFull;
  sceneIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}): ReactNode {
  const scene = story.scenes[sceneIndex];
  if (!scene) return null;
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex === story.scenes.length - 1;

  return (
    <div className="scene-container">
      <div className="scene-page">
        <div className="scene-content">
          <div className="scene-header">
            <span className="scene-number">
              Scene {sceneIndex + 1} of {story.total_scenes}
            </span>
            <div className="scene-progress">
              {Array.from({ length: story.total_scenes }, (_, i) => (
                <div
                  key={i}
                  className={`progress-dot ${
                    i < sceneIndex
                      ? "completed"
                      : i === sceneIndex
                        ? "active"
                        : ""
                  }`}
                />
              ))}
            </div>
          </div>
          <h2 className="scene-title">{scene.title_native}</h2>
          <p className="scene-title-english">{scene.title_english}</p>
          <div className="cultural-badge">{scene.cultural_element}</div>
          <div className="narration-block">
            <p className="narration-native">{scene.narration_native}</p>
            <p className="narration-english">{scene.narration_english}</p>
          </div>
          <div className="reading-nav">
            <button
              className="btn-secondary"
              onClick={onPrev}
              disabled={isFirst}
            >
              Previous
            </button>
            {isLast ? (
              <button className="btn-primary landing-cta" onClick={onClose}>
                Close
              </button>
            ) : (
              <button className="btn-primary landing-cta" onClick={onNext}>
                Next Scene
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage({
  onStart,
  savedStories,
  onReadStory,
  onRefreshStories,
}: {
  onStart: () => void;
  savedStories: SavedStorySummary[];
  onReadStory: (storyId: string) => void;
  onRefreshStories: () => void;
}): ReactNode {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-logo">
          <LogoMark size={64} />
        </div>
        <h1 className="landing-hero-title">StoryBridge</h1>
        <p className="landing-hero-tagline">
          Where languages meet through the magic of storytelling
        </p>
        <p className="landing-hero-desc">
          An AI-powered bilingual storytelling companion that helps immigrant
          and multilingual families create interactive bedtime stories —
          bridging their native language, culture, and the language their
          children are growing up in.
        </p>
        <button className="btn-primary landing-cta" onClick={onStart}>
          Create Your Story
        </button>
      </section>

      <MyStories
        stories={savedStories}
        onRead={onReadStory}
        onRefresh={onRefreshStories}
      />

      {/* Problem */}
      <section className="landing-section">
        <h2 className="landing-section-title">The Invisible Wall</h2>
        <p className="landing-section-desc">
          Every night, millions of immigrant parents want to share bedtime
          stories with their children — but language barriers make it nearly
          impossible. Heritage languages are disappearing, and cultural
          connections fade with each generation.
        </p>
        <div className="landing-stats">
          <div className="landing-stat">
            <span className="landing-stat-number">281M</span>
            <span className="landing-stat-label">
              International migrants worldwide
            </span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-number">75M</span>
            <span className="landing-stat-label">
              Non-English speakers in the US alone
            </span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-number">12%</span>
            <span className="landing-stat-label">
              Of 3rd-generation children speak their heritage language
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section">
        <h2 className="landing-section-title">How It Works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <h3 className="landing-step-title">Choose Your Language</h3>
            <p className="landing-step-desc">
              Select your home language from 20+ supported languages — Burmese,
              Spanish, Arabic, Hindi, Mandarin, and many more.
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <h3 className="landing-step-title">Set the Scene</h3>
            <p className="landing-step-desc">
              Pick a theme, add cultural elements from your heritage —
              festivals, foods, traditions — and let the AI weave them into the
              narrative.
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <h3 className="landing-step-title">Experience Together</h3>
            <p className="landing-step-desc">
              Each scene features bilingual text, a watercolor illustration, and
              warm audio narration in both languages.
            </p>
          </div>
          <div className="landing-step">
            <div className="landing-step-number">4</div>
            <h3 className="landing-step-title">Shape the Story</h3>
            <p className="landing-step-desc">
              Your child makes choices that genuinely change the narrative.
              Every story is unique, every choice matters.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section">
        <h2 className="landing-section-title">Every Scene, Fully Alive</h2>
        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <h3 className="landing-feature-title">Bilingual Stories</h3>
            <p className="landing-feature-desc">
              Native language and English side by side — natural in both, never
              awkward translations.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3 className="landing-feature-title">Watercolor Illustrations</h3>
            <p className="landing-feature-desc">
              Every scene gets a unique, culturally authentic illustration in
              warm storybook watercolor style.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            </div>
            <h3 className="landing-feature-title">Audio Narration</h3>
            <p className="landing-feature-desc">
              Warm, expressive narration in both languages — like a loving
              parent reading a bedtime story.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <h3 className="landing-feature-title">Interactive Choices</h3>
            <p className="landing-feature-desc">
              Children shape the story with their decisions. Each choice
              generates a brand new scene — real interactivity, not scripted.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="landing-section landing-arch">
        <h2 className="landing-section-title">Built with Google ADK</h2>
        <p className="landing-section-desc">
          A multi-agent architecture powered by Google&apos;s Agent Development
          Kit and three Gemini modalities working in concert.
        </p>
        <div className="landing-arch-grid">
          <div className="landing-arch-agent">
            <h4 className="landing-arch-name">Story Architect</h4>
            <p className="landing-arch-model">Gemini 2.5 Flash</p>
            <p className="landing-arch-desc">
              ADK Runner with session state. Creates bilingual narratives and
              adapts to children&apos;s choices with full conversation context.
            </p>
          </div>
          <div className="landing-arch-agent">
            <h4 className="landing-arch-name">Illustrator</h4>
            <p className="landing-arch-model">Gemini Flash Image</p>
            <p className="landing-arch-desc">
              Generates culturally authentic watercolor storybook illustrations
              for every scene in real time.
            </p>
          </div>
          <div className="landing-arch-agent">
            <h4 className="landing-arch-name">Narrator</h4>
            <p className="landing-arch-model">Gemini Flash TTS</p>
            <p className="landing-arch-desc">
              Produces warm bilingual audio narration — native language first,
              then English, with natural transitions.
            </p>
          </div>
        </div>
        <div className="landing-arch-stack">
          <span>FastAPI</span>
          <span>React 19</span>
          <span>TypeScript</span>
          <span>Google Cloud Run</span>
          <span>Google ADK</span>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-section landing-final-cta">
        <h2 className="landing-section-title">One bedtime story at a time</h2>
        <p className="landing-section-desc">
          StoryBridge helps families stay connected to their roots, their
          language, and each other — through the oldest form of bonding there
          is: a story before sleep.
        </p>
        <button className="btn-primary landing-cta" onClick={onStart}>
          Create Your Story
        </button>
        <p className="landing-builder">
          Built by Pyae Sone Kyaw — a Burmese engineer in Paris, building the
          bridge he wished he had growing up.
        </p>
        <div className="landing-footer-links">
          <a
            href="https://github.com/soneeee22000/storybridge"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-footer-link"
          >
            GitHub
          </a>
          <span className="landing-footer-dot" />
          <a
            href="https://pseonkyaw.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-footer-link"
          >
            Portfolio
          </a>
        </div>
      </section>
    </div>
  );
}

function SetupForm({
  onSubmit,
}: {
  onSubmit: (data: {
    parent_language: string;
    child_age: number;
    story_theme: string;
    cultural_elements: string;
    story_seed: string;
  }) => void;
}): ReactNode {
  const [language, setLanguage] = useState(LANGUAGES[0]!);
  const [age, setAge] = useState(5);
  const [theme, setTheme] = useState(THEMES[0]!);
  const [culturalElements, setCulturalElements] = useState("");
  const [storySeed, setStorySeed] = useState("");

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSubmit({
      parent_language: language,
      child_age: age,
      story_theme: theme,
      cultural_elements: culturalElements,
      story_seed: storySeed,
    });
  };

  return (
    <div className="setup-container">
      <h2 className="setup-title">Create Your Family Story</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="language">
            Your home language
          </label>
          <select
            id="language"
            className="form-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="age">
            Child&apos;s age
          </label>
          <select
            id="age"
            className="form-select"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => i + 3).map((a) => (
              <option key={a} value={a}>
                {a} years old
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="theme">
            Story theme
          </label>
          <select
            id="theme"
            className="form-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cultural">
            Cultural elements to include (optional)
          </label>
          <input
            id="cultural"
            className="form-input"
            type="text"
            placeholder="e.g., Thingyan festival, thanaka, longyi..."
            value={culturalElements}
            onChange={(e) => setCulturalElements(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="seed">
            Story idea (optional — or let the magic decide)
          </label>
          <textarea
            id="seed"
            className="form-textarea"
            placeholder="e.g., A little girl who discovers a talking fish in the Inle Lake..."
            value={storySeed}
            onChange={(e) => setStorySeed(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary">
          Begin the Story
        </button>
      </form>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }): ReactNode {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Voice Input — Web Speech API (beyond the text box)                  */
/* ------------------------------------------------------------------ */

/**
 * Custom hook for Web Speech API voice input.
 * Enables children to speak their choices instead of typing — moving
 * "beyond the text box" as the hackathon requires.
 */
function useVoiceInput(onTranscript: (text: string) => void): {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
} {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const getRecognitionClass = ():
    | (new () => SpeechRecognitionInstance)
    | null => {
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const isSupported =
    typeof window !== "undefined" && getRecognitionClass() !== null;

  const startListening = useCallback((): void => {
    const Ctor = getRecognitionClass();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent): void => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript);
      }
      setIsListening(false);
    };

    recognition.onerror = (): void => {
      setIsListening(false);
    };

    recognition.onend = (): void => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onTranscript]);

  const stopListening = useCallback((): void => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return { isListening, isSupported, startListening, stopListening };
}

function SceneView({
  scene,
  sceneIndex,
  totalScenes,
  imageBase64,
  audioBase64,
  isLoadingImage,
  isLoadingAudio,
  isGenerating,
  isFinalScene,
  onChoice,
  onFinish,
}: {
  scene: Scene;
  sceneIndex: number;
  totalScenes: number;
  imageBase64: string | null;
  audioBase64: string | null;
  isLoadingImage: boolean;
  isLoadingAudio: boolean;
  isGenerating: boolean;
  isFinalScene: boolean;
  onChoice: (choice: string) => void;
  onFinish: () => void;
}): ReactNode {
  const [choice, setChoice] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice input — "beyond the text box"
  const voice = useVoiceInput(
    useCallback((transcript: string) => setChoice(transcript), []),
  );

  // Stop any playing audio and reset state when scene changes
  // This prevents stale audio from a previous scene playing on the new scene
  const prevAudioRef = useRef<string | null>(null);
  if (audioBase64 !== prevAudioRef.current) {
    prevAudioRef.current = audioBase64;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Can't call setIsPlaying during render, so we use a ref to flag it
  }

  // Reset isPlaying when audio source changes
  const prevSceneRef = useRef(sceneIndex);
  if (sceneIndex !== prevSceneRef.current) {
    prevSceneRef.current = sceneIndex;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

  const handlePlay = useCallback((): void => {
    if (!audioBase64) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    // Stop any existing audio before creating new one
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    audioRef.current = audio;
    audio.play();
    setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
  }, [audioBase64, isPlaying]);

  const handleChoice = (): void => {
    if (choice.trim()) {
      onChoice(choice.trim());
      setChoice("");
    }
  };

  return (
    <div className="scene-container">
      <div className="scene-page">
        {/* Generating overlay — shown while next scene text is loading */}
        {isGenerating && (
          <div className="scene-generating-overlay">
            <div className="loading-spinner" />
            <p className="loading-text">The story adapts to your choice...</p>
          </div>
        )}

        {/* Illustration */}
        {isLoadingImage ? (
          <div className="scene-illustration-placeholder">
            <LoadingScreen message="Painting your scene..." />
          </div>
        ) : imageBase64 ? (
          <img
            className="scene-illustration"
            src={`data:image/png;base64,${imageBase64}`}
            alt={scene.title_english}
          />
        ) : (
          <div className="scene-illustration-placeholder">
            Illustration loading...
          </div>
        )}

        {/* Content */}
        <div className="scene-content">
          {/* Header with progress */}
          <div className="scene-header">
            <span className="scene-number">
              Scene {sceneIndex + 1} of {totalScenes}
            </span>
            <div className="scene-progress">
              {Array.from({ length: totalScenes }, (_, i) => (
                <div
                  key={i}
                  className={`progress-dot ${
                    i < sceneIndex
                      ? "completed"
                      : i === sceneIndex
                        ? "active"
                        : ""
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Title */}
          <h2 className="scene-title">{scene.title_native}</h2>
          <p className="scene-title-english">{scene.title_english}</p>

          {/* Cultural badge */}
          <div className="cultural-badge">{scene.cultural_element}</div>

          {/* Narration */}
          <div className="narration-block">
            <p className="narration-native">{scene.narration_native}</p>
            <p className="narration-english">{scene.narration_english}</p>
          </div>

          {/* Audio player */}
          <div className="audio-player">
            {isLoadingAudio ? (
              <>
                <div
                  className="loading-spinner"
                  style={{ width: 28, height: 28, marginBottom: 0 }}
                />
                <span className="audio-label">Preparing narration...</span>
              </>
            ) : audioBase64 ? (
              <>
                <button
                  className="audio-btn"
                  onClick={handlePlay}
                  aria-label={isPlaying ? "Pause narration" : "Play narration"}
                >
                  {isPlaying ? "\u23F8" : "\u25B6"}
                </button>
                <span className="audio-label">
                  {isPlaying
                    ? "Listening to the story..."
                    : "Listen to the narration"}
                </span>
              </>
            ) : (
              <span className="audio-label">Audio unavailable</span>
            )}
          </div>

          {/* Interactive choice — hidden on final scene */}
          {scene.interactive_prompt_native && !isFinalScene && (
            <div className="choice-section">
              <p className="choice-prompt">{scene.interactive_prompt_native}</p>
              <p className="choice-prompt-english">
                {scene.interactive_prompt_english}
              </p>
              <div className="choice-input-group">
                <input
                  className="choice-input"
                  type="text"
                  placeholder={
                    voice.isListening
                      ? "Listening..."
                      : voice.isSupported
                        ? "Type or tap the mic to speak..."
                        : "Type your answer..."
                  }
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChoice()}
                  disabled={isGenerating}
                />
                {voice.isSupported && (
                  <button
                    className={`mic-btn${voice.isListening ? " listening" : ""}`}
                    onClick={
                      voice.isListening
                        ? voice.stopListening
                        : voice.startListening
                    }
                    disabled={isGenerating}
                    aria-label={
                      voice.isListening ? "Stop listening" : "Speak your choice"
                    }
                    type="button"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button>
                )}
                <button
                  className="btn-choice"
                  onClick={handleChoice}
                  disabled={!choice.trim() || isGenerating}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Finish button on final scene */}
          {isFinalScene && (
            <div className="choice-section" style={{ textAlign: "center" }}>
              <p
                className="choice-prompt"
                style={{ fontStyle: "italic", marginBottom: "1rem" }}
              >
                And so the story comes to a close...
              </p>
              <button className="btn-primary landing-cta" onClick={onFinish}>
                Finish Story
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoryComplete({
  story,
  scenesCompleted,
  onRestart,
}: {
  story: Story;
  scenesCompleted: number;
  onRestart: () => void;
}): ReactNode {
  return (
    <div className="completion-container">
      <h2 className="completion-title">The End</h2>
      <p className="completion-story-title">{story.story_title_native}</p>
      <p className="completion-story-title-english">
        {story.story_title_english}
      </p>
      <div className="completion-stats">
        <span className="completion-stat">
          {scenesCompleted} scenes explored
        </span>
        <span className="completion-stat-divider" />
        <span className="completion-stat">2 languages bridged</span>
      </div>
      <p className="completion-message">
        What a beautiful journey through story and language. Every story you
        share builds a bridge between worlds.
      </p>
      <button className="btn-secondary" onClick={onRestart}>
        Tell Another Story
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main App                                                           */
/* ------------------------------------------------------------------ */

export function App(): ReactNode {
  const [phase, setPhase] = useState<AppPhase>("landing");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [sceneAudio, setSceneAudio] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [savedStories, setSavedStories] = useState<SavedStorySummary[]>([]);
  const [readingStory, setReadingStory] = useState<SavedStoryFull | null>(null);
  const [readingSceneIndex, setReadingSceneIndex] = useState(0);

  const storySetupRef = useRef<{
    parentLanguage: string;
    childAge: number;
    storyTheme: string;
    culturalElements: string;
  } | null>(null);

  // Generation counter to prevent stale media from overwriting current scene
  const mediaGenRef = useRef(0);

  const loadSceneMedia = useCallback(
    async (sid: string, index: number): Promise<void> => {
      const gen = ++mediaGenRef.current;
      setSceneImage(null);
      setSceneAudio(null);
      setIsLoadingImage(true);
      setIsLoadingAudio(true);

      // Load image and audio in parallel
      const [imageResult, audioResult] = await Promise.allSettled([
        illustrateScene(sid, index),
        narrateScene(sid, index),
      ]);

      // Only apply results if this is still the current generation
      // (prevents stale results from old scenes overwriting new ones)
      if (gen !== mediaGenRef.current) return;

      if (imageResult.status === "fulfilled") {
        setSceneImage(imageResult.value.image_base64);
      }
      setIsLoadingImage(false);

      if (audioResult.status === "fulfilled") {
        setSceneAudio(audioResult.value.audio_base64);
      } else {
        // Retry narration once
        console.warn("Narration failed, retrying...", audioResult.reason);
        try {
          const retry = await narrateScene(sid, index);
          // Check generation again after retry
          if (gen === mediaGenRef.current) {
            setSceneAudio(retry.audio_base64);
          }
        } catch {
          console.error("Narration retry failed for scene", index);
        }
      }
      if (gen === mediaGenRef.current) {
        setIsLoadingAudio(false);
      }
    },
    [],
  );

  const handleStartStory = useCallback(
    async (data: {
      parent_language: string;
      child_age: number;
      story_theme: string;
      cultural_elements: string;
      story_seed: string;
    }): Promise<void> => {
      setPhase("loading");
      setLoadingMessage("Weaving your story across languages...");
      storySetupRef.current = {
        parentLanguage: data.parent_language,
        childAge: data.child_age,
        storyTheme: data.story_theme,
        culturalElements: data.cultural_elements,
      };

      try {
        const result = await createStory(data);
        setSessionId(result.session_id);
        setStory(result.story);
        setCurrentScene(0);
        setPhase("scene");

        // Load first scene media
        await loadSceneMedia(result.session_id, 0);
      } catch (err) {
        console.error("Failed to create story:", err);
        setLoadingMessage("");
        setPhase("setup");
        alert("Story creation failed. Please try again.");
      }
    },
    [loadSceneMedia],
  );

  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [isStoryComplete, setIsStoryComplete] = useState(false);

  const handleChoice = useCallback(
    async (choice: string): Promise<void> => {
      if (!sessionId || !story) return;

      // Show overlay on current scene while generating — DON'T wipe media yet
      setIsGeneratingScene(true);

      try {
        const result = await submitChoice(sessionId, choice);

        if (result.completed) {
          if (result.scene) {
            // Show the final scene — DON'T jump to completion yet.
            // The user needs to read/listen to scene 5 first.
            // They'll click "Finish Story" when ready.
            setStory((prev) =>
              prev
                ? { ...prev, scenes: [...prev.scenes, result.scene as Scene] }
                : prev,
            );
            setCurrentScene(result.current_scene);
            setIsGeneratingScene(false);
            setIsStoryComplete(true);
            await loadSceneMedia(sessionId, result.current_scene);
          } else {
            setIsGeneratingScene(false);
            setPhase("complete");
          }
        } else if (result.scene) {
          const nextIndex = result.current_scene;
          setStory((prev) =>
            prev
              ? { ...prev, scenes: [...prev.scenes, result.scene as Scene] }
              : prev,
          );
          setCurrentScene(nextIndex);
          // Now clear old media and load new — text is already visible
          setIsGeneratingScene(false);
          await loadSceneMedia(sessionId, nextIndex);
        }
      } catch (err) {
        console.error("Failed to submit choice:", err);
        setIsGeneratingScene(false);
        setIsLoadingImage(false);
        setIsLoadingAudio(false);
      }
    },
    [sessionId, story, loadSceneMedia],
  );

  const loadSavedStories = useCallback(async (): Promise<void> => {
    try {
      const stories = await fetchSavedStories();
      setSavedStories(stories);
    } catch {
      console.error("Failed to load saved stories");
    }
  }, []);

  useEffect(() => {
    if (phase === "landing") {
      loadSavedStories();
    }
  }, [phase, loadSavedStories]);

  const handleReadStory = useCallback(
    async (storyId: string): Promise<void> => {
      const full = await fetchFullStory(storyId);
      if (full) {
        setReadingStory(full);
        setReadingSceneIndex(0);
        setPhase("reading");
      }
    },
    [],
  );

  const resetStoryState = (): void => {
    setSessionId(null);
    setStory(null);
    setCurrentScene(0);
    setSceneImage(null);
    setSceneAudio(null);
    setIsStoryComplete(false);
  };

  /** Logo click — back to landing page */
  const handleGoHome = (): void => {
    resetStoryState();
    setPhase("landing");
  };

  /** "Tell Another Story" — skip landing, go straight to setup */
  const handleNewStory = (): void => {
    resetStoryState();
    setPhase("setup");
  };

  return (
    <div className="app-container">
      <Header minimal={phase === "landing"} onLogoClick={handleGoHome} />

      {phase === "landing" && (
        <LandingPage
          onStart={() => setPhase("setup")}
          savedStories={savedStories}
          onReadStory={handleReadStory}
          onRefreshStories={loadSavedStories}
        />
      )}

      {phase === "setup" && <SetupForm onSubmit={handleStartStory} />}

      {phase === "loading" && <LoadingScreen message={loadingMessage} />}

      {phase === "scene" && story && story.scenes[currentScene] && (
        <SceneView
          scene={story.scenes[currentScene]}
          sceneIndex={currentScene}
          totalScenes={story.total_scenes}
          imageBase64={sceneImage}
          audioBase64={sceneAudio}
          isLoadingImage={isLoadingImage}
          isLoadingAudio={isLoadingAudio}
          isGenerating={isGeneratingScene}
          isFinalScene={isStoryComplete}
          onChoice={handleChoice}
          onFinish={() => {
            if (story && storySetupRef.current) {
              saveStoryToLibrary({
                story,
                scenes: story.scenes,
                choices: [],
                parentLanguage: storySetupRef.current.parentLanguage,
                childAge: storySetupRef.current.childAge,
                storyTheme: storySetupRef.current.storyTheme,
                culturalElements: storySetupRef.current.culturalElements,
              }).catch((err) => console.error("Failed to save story:", err));
            }
            setPhase("complete");
          }}
        />
      )}

      {phase === "reading" && readingStory && (
        <ReadingView
          story={readingStory}
          sceneIndex={readingSceneIndex}
          onNext={() => setReadingSceneIndex((i) => i + 1)}
          onPrev={() => setReadingSceneIndex((i) => Math.max(0, i - 1))}
          onClose={() => {
            setReadingStory(null);
            setReadingSceneIndex(0);
            setPhase("landing");
          }}
        />
      )}

      {phase === "complete" && story && (
        <StoryComplete
          story={story}
          scenesCompleted={story.scenes.length}
          onRestart={handleNewStory}
        />
      )}
    </div>
  );
}
