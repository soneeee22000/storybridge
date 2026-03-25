import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Header } from "./components/Header";
import { LandingPage } from "./components/LandingPage";
import { LibraryPage } from "./components/LibraryPage";
import { LoadingScreen } from "./components/LoadingScreen";
import { PageTransition } from "./components/PageTransition";
import { ReadingView } from "./components/ReadingView";
import { SceneView } from "./components/SceneView";
import { SetupForm } from "./components/SetupForm";
import { StoryComplete } from "./components/StoryComplete";
import { VoiceCompanion } from "./components/VoiceCompanion";
import {
  createStory,
  fetchFullStory,
  fetchSavedStories,
  illustrateScene,
  narrateScene,
  saveStoryToLibrary,
  submitChoice,
} from "./lib/api";
import type {
  AppPhase,
  CreateStoryParams,
  SavedStoryFull,
  SavedStorySummary,
  Scene,
  Story,
  StorySetup,
} from "./lib/types";
import "./styles/global.css";

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
  const [streamingText, setStreamingText] = useState("");
  const [savedStories, setSavedStories] = useState<SavedStorySummary[]>([]);
  const [readingStory, setReadingStory] = useState<SavedStoryFull | null>(null);
  const [readingSceneIndex, setReadingSceneIndex] = useState(0);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [isStoryComplete, setIsStoryComplete] = useState(false);
  const [storySaved, setStorySaved] = useState(false);

  const storySetupRef = useRef<StorySetup | null>(null);
  const sceneImagesRef = useRef<Record<number, string>>({});
  const mediaGenRef = useRef(0);

  const loadSceneMedia = useCallback(
    async (sid: string, index: number): Promise<void> => {
      const gen = ++mediaGenRef.current;
      setSceneImage(null);
      setSceneAudio(null);
      setIsLoadingImage(true);
      setIsLoadingAudio(true);

      const [imageResult, audioResult] = await Promise.allSettled([
        illustrateScene(sid, index),
        narrateScene(sid, index),
      ]);

      if (gen !== mediaGenRef.current) return;

      if (imageResult.status === "fulfilled") {
        setSceneImage(imageResult.value.image_base64);
        sceneImagesRef.current[index] = imageResult.value.image_base64;
      }
      setIsLoadingImage(false);

      if (audioResult.status === "fulfilled") {
        setSceneAudio(audioResult.value.audio_base64);
      } else {
        console.warn("Narration failed, retrying...", audioResult.reason);
        try {
          const retry = await narrateScene(sid, index);
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
    async (data: CreateStoryParams): Promise<void> => {
      setPhase("loading");
      setLoadingMessage("Weaving your story across languages...");
      setStreamingText("");
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
        await loadSceneMedia(result.session_id, 0);
      } catch (err) {
        console.error("Failed to create story:", err);
        setLoadingMessage("");
        setPhase("setup");
      }
    },
    [loadSceneMedia],
  );

  const handleChoice = useCallback(
    async (choice: string): Promise<void> => {
      if (!sessionId || !story) return;
      setIsGeneratingScene(true);

      try {
        const result = await submitChoice(sessionId, choice);

        if (result.completed) {
          if (result.scene) {
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
    if (phase === "landing" || phase === "library") {
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
    setStorySaved(false);
    sceneImagesRef.current = {};
  };

  const handleGoHome = (): void => {
    resetStoryState();
    setPhase("landing");
  };

  const handleNewStory = (): void => {
    resetStoryState();
    setPhase("setup");
  };

  return (
    <div className="app-container">
      <Header
        minimal={phase === "landing"}
        onLogoClick={handleGoHome}
        onLibraryClick={() => {
          loadSavedStories();
          setPhase("library");
        }}
      />

      <AnimatePresence mode="wait">
        {phase === "landing" && (
          <PageTransition layoutKey="landing">
            <LandingPage onStart={() => setPhase("setup")} />
          </PageTransition>
        )}

        {phase === "setup" && (
          <PageTransition layoutKey="setup">
            <SetupForm onSubmit={handleStartStory} />
          </PageTransition>
        )}

        {phase === "loading" && (
          <PageTransition layoutKey="loading">
            <LoadingScreen
              message={loadingMessage}
              streamingText={streamingText}
            />
          </PageTransition>
        )}

        {phase === "scene" && story && story.scenes[currentScene] && (
          <PageTransition layoutKey="scene">
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
              onFinish={async () => {
                let saved = false;
                if (story && storySetupRef.current) {
                  saved = await saveStoryToLibrary({
                    story,
                    scenes: story.scenes,
                    choices: [],
                    parentLanguage: storySetupRef.current.parentLanguage,
                    childAge: storySetupRef.current.childAge,
                    storyTheme: storySetupRef.current.storyTheme,
                    culturalElements: storySetupRef.current.culturalElements,
                  });
                }
                setStorySaved(saved);
                setPhase("complete");
              }}
            />
          </PageTransition>
        )}

        {phase === "library" && (
          <PageTransition layoutKey="library">
            <LibraryPage
              stories={savedStories}
              onRead={handleReadStory}
              onRefresh={loadSavedStories}
              onCreateNew={() => setPhase("setup")}
            />
          </PageTransition>
        )}

        {phase === "reading" && readingStory && (
          <PageTransition layoutKey="reading">
            <ReadingView
              story={readingStory}
              sceneIndex={readingSceneIndex}
              onNext={() => setReadingSceneIndex((i) => i + 1)}
              onPrev={() => setReadingSceneIndex((i) => Math.max(0, i - 1))}
              onClose={() => {
                setReadingStory(null);
                setReadingSceneIndex(0);
                loadSavedStories();
                setPhase("library");
              }}
            />
          </PageTransition>
        )}

        {phase === "complete" && story && (
          <PageTransition layoutKey="complete">
            <StoryComplete
              story={story}
              scenesCompleted={story.scenes.length}
              saved={storySaved}
              onRestart={handleNewStory}
              onViewLibrary={() => {
                loadSavedStories();
                setPhase("library");
              }}
            />
          </PageTransition>
        )}
      </AnimatePresence>

      {/* Voice Companion — Gemini Live API (visible during story scenes) */}
      {(phase === "scene" || phase === "reading") && (
        <VoiceCompanion
          parentLanguage={storySetupRef.current?.parentLanguage}
          sessionId={sessionId ?? undefined}
          storyContext={
            story && story.scenes[currentScene]
              ? `Scene ${currentScene + 1}: ${story.scenes[currentScene].title_english}. ${story.scenes[currentScene].narration_english}`
              : undefined
          }
        />
      )}
    </div>
  );
}
