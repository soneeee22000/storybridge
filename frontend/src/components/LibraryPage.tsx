import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { deleteStoryFromLibrary } from "../lib/api";
import type { SavedStorySummary } from "../lib/types";

const cardVariant = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export function LibraryPage({
  stories,
  onRead,
  onRefresh,
  onCreateNew,
}: {
  stories: SavedStorySummary[];
  onRead: (storyId: string) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}): ReactNode {
  const handleDelete = async (storyId: string): Promise<void> => {
    await deleteStoryFromLibrary(storyId);
    onRefresh();
  };

  return (
    <motion.div
      className="library-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="library-header">
        <h2 className="library-title">My Stories</h2>
        <motion.button
          className="btn-primary landing-cta"
          onClick={onCreateNew}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          Create New Story
        </motion.button>
      </div>
      {stories.length === 0 ? (
        <div className="library-empty">
          <p className="library-empty-text">
            No stories yet. Create your first bilingual bedtime story and it
            will appear here.
          </p>
          <motion.button
            className="btn-primary landing-cta"
            onClick={onCreateNew}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Create Your First Story
          </motion.button>
        </div>
      ) : (
        <motion.div
          className="library-grid"
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.08 }}
        >
          {stories.map((s) => (
            <motion.div
              key={s.story_id}
              className="library-card"
              variants={cardVariant}
              whileHover={{ y: -4 }}
            >
              <button
                className="library-card-btn"
                onClick={() => onRead(s.story_id)}
                type="button"
              >
                <p className="library-card-title">{s.story_title_native}</p>
                <p className="library-card-english">{s.story_title_english}</p>
                <div className="library-card-meta">
                  <span className="library-card-badge">{s.story_theme}</span>
                  <span className="library-card-badge">
                    {s.parent_language}
                  </span>
                </div>
                <p className="library-card-scenes">{s.total_scenes} scenes</p>
              </button>
              <button
                className="library-card-delete"
                onClick={() => handleDelete(s.story_id)}
                aria-label="Delete story"
                type="button"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
