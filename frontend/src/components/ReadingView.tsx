import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SavedStoryFull } from "../lib/types";

const pageFlip = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
  transition: { duration: 0.4, ease: "easeInOut" as const },
};

export function ReadingView({
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
    <div className="scene-container" style={{ perspective: "1200px" }}>
      <AnimatePresence mode="wait">
        <motion.div key={sceneIndex} className="scene-page" {...pageFlip}>
          {story.scene_images && story.scene_images[String(sceneIndex)] ? (
            <motion.img
              className="scene-illustration"
              src={`data:image/png;base64,${story.scene_images[String(sceneIndex)]}`}
              alt={scene.title_english}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
          ) : (
            <div className="scene-illustration-placeholder">
              <span
                style={{
                  fontFamily: "var(--font-story)",
                  fontStyle: "italic",
                  color: "var(--color-terracotta)",
                }}
              >
                Illustration from your story session
              </span>
            </div>
          )}
          <div className="scene-content">
            <div className="scene-header">
              <span className="scene-number">
                Scene {sceneIndex + 1} of {story.total_scenes}
              </span>
              <div className="scene-progress">
                {Array.from({ length: story.total_scenes }, (_, i) => (
                  <div
                    key={i}
                    className={`progress-dot ${i < sceneIndex ? "completed" : i === sceneIndex ? "active" : ""}`}
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
                <motion.button
                  className="btn-primary landing-cta"
                  onClick={onClose}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Close
                </motion.button>
              ) : (
                <motion.button
                  className="btn-primary landing-cta"
                  onClick={onNext}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Next Scene
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
