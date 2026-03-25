import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function LoadingScreen({
  message,
  streamingText,
}: {
  message: string;
  streamingText?: string;
}): ReactNode {
  return (
    <motion.div
      className="loading-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="loading-spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />
      <motion.p
        className="loading-text"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>
      {streamingText && (
        <motion.div
          className="streaming-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="streaming-text">{streamingText}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
