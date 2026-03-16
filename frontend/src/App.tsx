/**
 * StoryBridge — Main Application Component
 *
 * A bilingual family storytelling companion that creates interactive,
 * illustrated stories bridging languages and cultures.
 */

import { useCallback, useRef, useState } from "react";

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
}

type AppPhase = "setup" | "loading" | "scene" | "complete";

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
): Promise<{ completed: boolean; current_scene: number }> {
  const res = await fetch(`${API_BASE}/scene/choice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, choice }),
  });
  if (!res.ok) throw new Error(`Choice failed: ${res.statusText}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function Header(): JSX.Element {
  return (
    <header className="app-header">
      <h1 className="app-title">StoryBridge</h1>
      <p className="app-subtitle">
        Where languages meet through the magic of storytelling
      </p>
    </header>
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
}): JSX.Element {
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

function LoadingScreen({ message }: { message: string }): JSX.Element {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}

function SceneView({
  scene,
  sceneIndex,
  totalScenes,
  imageBase64,
  audioBase64,
  isLoadingImage,
  isLoadingAudio,
  onChoice,
}: {
  scene: Scene;
  sceneIndex: number;
  totalScenes: number;
  imageBase64: string | null;
  audioBase64: string | null;
  isLoadingImage: boolean;
  isLoadingAudio: boolean;
  onChoice: (choice: string) => void;
}): JSX.Element {
  const [choice, setChoice] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback((): void => {
    if (!audioBase64) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
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

          {/* Interactive choice */}
          <div className="choice-section">
            <p className="choice-prompt">{scene.interactive_prompt_native}</p>
            <p className="choice-prompt-english">
              {scene.interactive_prompt_english}
            </p>
            <div className="choice-input-group">
              <input
                className="choice-input"
                type="text"
                placeholder="Type your answer..."
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChoice()}
              />
              <button
                className="btn-choice"
                onClick={handleChoice}
                disabled={!choice.trim()}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryComplete({
  story,
  onRestart,
}: {
  story: Story;
  onRestart: () => void;
}): JSX.Element {
  return (
    <div className="completion-container">
      <h2 className="completion-title">The End</h2>
      <p className="completion-message">
        &quot;{story.story_title_native}&quot; &mdash;{" "}
        {story.story_title_english}
      </p>
      <p
        className="completion-message"
        style={{ fontSize: "1rem", marginBottom: "2rem" }}
      >
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

export function App(): JSX.Element {
  const [phase, setPhase] = useState<AppPhase>("setup");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [sceneAudio, setSceneAudio] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const loadSceneMedia = useCallback(
    async (sid: string, index: number): Promise<void> => {
      setSceneImage(null);
      setSceneAudio(null);
      setIsLoadingImage(true);
      setIsLoadingAudio(true);

      // Load image and audio in parallel
      const [imageResult, audioResult] = await Promise.allSettled([
        illustrateScene(sid, index),
        narrateScene(sid, index),
      ]);

      if (imageResult.status === "fulfilled") {
        setSceneImage(imageResult.value.image_base64);
      }
      setIsLoadingImage(false);

      if (audioResult.status === "fulfilled") {
        setSceneAudio(audioResult.value.audio_base64);
      }
      setIsLoadingAudio(false);
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
        setPhase("setup");
      }
    },
    [loadSceneMedia],
  );

  const handleChoice = useCallback(
    async (choice: string): Promise<void> => {
      if (!sessionId || !story) return;

      try {
        const result = await submitChoice(sessionId, choice);

        if (result.completed) {
          setPhase("complete");
        } else {
          const nextScene = result.current_scene;
          setCurrentScene(nextScene);
          await loadSceneMedia(sessionId, nextScene);
        }
      } catch (err) {
        console.error("Failed to submit choice:", err);
      }
    },
    [sessionId, story, loadSceneMedia],
  );

  const handleRestart = (): void => {
    setPhase("setup");
    setSessionId(null);
    setStory(null);
    setCurrentScene(0);
    setSceneImage(null);
    setSceneAudio(null);
  };

  return (
    <div className="app-container">
      <Header />

      {phase === "setup" && <SetupForm onSubmit={handleStartStory} />}

      {phase === "loading" && <LoadingScreen message={loadingMessage} />}

      {phase === "scene" && story && story.scenes[currentScene] && (
        <SceneView
          scene={story.scenes[currentScene]}
          sceneIndex={currentScene}
          totalScenes={story.scenes.length}
          imageBase64={sceneImage}
          audioBase64={sceneAudio}
          isLoadingImage={isLoadingImage}
          isLoadingAudio={isLoadingAudio}
          onChoice={handleChoice}
        />
      )}

      {phase === "complete" && story && (
        <StoryComplete story={story} onRestart={handleRestart} />
      )}
    </div>
  );
}
