import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Pause, Play } from "lucide-react";
import { useVoiceInput } from "../hooks/useVoiceInput";
import type { Scene } from "../lib/types";
import { LoadingScreen } from "./LoadingScreen";

const sceneFlip = {
  initial: { opacity: 0, rotateY: -8, x: 40 },
  animate: { opacity: 1, rotateY: 0, x: 0 },
  exit: { opacity: 0, rotateY: 8, x: -40 },
  transition: {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
};

export function SceneView({
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

  const voice = useVoiceInput(
    useCallback((transcript: string) => setChoice(transcript), []),
  );

  const prevAudioRef = useRef<string | null>(null);
  if (audioBase64 !== prevAudioRef.current) {
    prevAudioRef.current = audioBase64;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

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
    <div className="scene-container" style={{ perspective: "1200px" }}>
      <AnimatePresence mode="wait">
        <motion.div key={sceneIndex} className="scene-page" {...sceneFlip}>
          {isGenerating && (
            <motion.div
              className="scene-generating-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="loading-spinner" />
              <p className="loading-text">The story adapts to your choice...</p>
            </motion.div>
          )}

          {isLoadingImage ? (
            <div className="scene-illustration-placeholder">
              <LoadingScreen message="Painting your scene..." />
            </div>
          ) : imageBase64 ? (
            <motion.img
              className="scene-illustration"
              src={`data:image/png;base64,${imageBase64}`}
              alt={scene.title_english}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          ) : (
            <div className="scene-illustration-placeholder">
              Illustration loading...
            </div>
          )}

          <div className="scene-content">
            <div className="scene-header">
              <span className="scene-number">
                Scene {sceneIndex + 1} of {totalScenes}
              </span>
              <div className="scene-progress">
                {Array.from({ length: totalScenes }, (_, i) => (
                  <motion.div
                    key={i}
                    className={`progress-dot ${i < sceneIndex ? "completed" : i === sceneIndex ? "active" : ""}`}
                    initial={i === sceneIndex ? { scale: 0 } : undefined}
                    animate={i === sceneIndex ? { scale: 1 } : undefined}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  />
                ))}
              </div>
            </div>

            <motion.h2
              className="scene-title"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              {scene.title_native}
            </motion.h2>
            <motion.p
              className="scene-title-english"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {scene.title_english}
            </motion.p>

            <motion.div
              className="cultural-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
            >
              {scene.cultural_element}
            </motion.div>

            {scene.cultural_context && (
              <motion.div
                className="cultural-context-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                <span className="cultural-context-label">Did you know?</span>
                <p className="cultural-context-text">
                  {scene.cultural_context}
                </p>
              </motion.div>
            )}

            {scene.vocabulary_words && scene.vocabulary_words.length > 0 && (
              <motion.div
                className="vocabulary-section"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <span className="vocabulary-label">Words to learn</span>
                <div className="vocabulary-words">
                  {scene.vocabulary_words.map((word, i) => (
                    <motion.div
                      key={i}
                      className="vocabulary-word"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 + i * 0.1 }}
                    >
                      <span className="vocab-native">{word.native}</span>
                      <span className="vocab-pronunciation">
                        {word.pronunciation}
                      </span>
                      <span className="vocab-english">{word.english}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              className="narration-block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <p className="narration-native">{scene.narration_native}</p>
              <p className="narration-english">{scene.narration_english}</p>
            </motion.div>

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
                  <motion.button
                    className="audio-btn"
                    onClick={handlePlay}
                    aria-label={
                      isPlaying ? "Pause narration" : "Play narration"
                    }
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </motion.button>
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

            {scene.interactive_prompt_native && !isFinalScene && (
              <motion.div
                className="choice-section"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <p className="choice-prompt">
                  {scene.interactive_prompt_native}
                </p>
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
                    <motion.button
                      className={`mic-btn${voice.isListening ? " listening" : ""}`}
                      onClick={
                        voice.isListening
                          ? voice.stopListening
                          : voice.startListening
                      }
                      disabled={isGenerating}
                      aria-label={
                        voice.isListening
                          ? "Stop listening"
                          : "Speak your choice"
                      }
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {voice.isListening ? (
                        <MicOff size={20} />
                      ) : (
                        <Mic size={20} />
                      )}
                    </motion.button>
                  )}
                  <motion.button
                    className="btn-choice"
                    onClick={handleChoice}
                    disabled={!choice.trim() || isGenerating}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Continue
                  </motion.button>
                </div>
              </motion.div>
            )}

            {isFinalScene && (
              <motion.div
                className="choice-section"
                style={{ textAlign: "center" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <p
                  className="choice-prompt"
                  style={{ fontStyle: "italic", marginBottom: "1rem" }}
                >
                  And so the story comes to a close...
                </p>
                <motion.button
                  className="btn-primary landing-cta"
                  onClick={onFinish}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Finish Story
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
