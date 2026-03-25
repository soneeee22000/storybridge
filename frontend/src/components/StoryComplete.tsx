import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { Story } from "../lib/types";

export function StoryComplete({
  story,
  scenesCompleted,
  saved,
  onRestart,
  onViewLibrary,
}: {
  story: Story;
  scenesCompleted: number;
  saved: boolean;
  onRestart: () => void;
  onViewLibrary: () => void;
}): ReactNode {
  return (
    <motion.div
      className="completion-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.h2
        className="completion-title"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        The End
      </motion.h2>
      <motion.p
        className="completion-story-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {story.story_title_native}
      </motion.p>
      <motion.p
        className="completion-story-title-english"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {story.story_title_english}
      </motion.p>
      <motion.div
        className="completion-stats"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <span className="completion-stat">
          {scenesCompleted} scenes explored
        </span>
        <span className="completion-stat-divider" />
        <span className="completion-stat">2 languages bridged</span>
        {saved && (
          <>
            <span className="completion-stat-divider" />
            <span className="completion-stat">Saved to library</span>
          </>
        )}
      </motion.div>
      <motion.p
        className="completion-message"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        What a beautiful journey through story and language. Every story you
        share builds a bridge between worlds.
      </motion.p>
      <motion.div
        className="completion-actions"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <motion.button
          className="btn-primary landing-cta"
          onClick={onRestart}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          Tell Another Story
        </motion.button>
        {saved && (
          <motion.button
            className="btn-secondary"
            onClick={onViewLibrary}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            View My Stories
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
