import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Mic, MicOff, X } from "lucide-react";
import { useGeminiLive } from "../hooks/useGeminiLive";

export function VoiceCompanion({
  parentLanguage,
  sessionId,
  storyContext,
}: {
  parentLanguage?: string;
  sessionId?: string;
  storyContext?: string;
}): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const live = useGeminiLive();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [live.transcripts]);

  useEffect(() => {
    if (storyContext && live.isConnected) {
      live.sendContext(storyContext);
    }
  }, [storyContext, live.isConnected, live.sendContext]);

  const handleToggle = (): void => {
    if (isOpen) {
      live.disconnect();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      live.connect({
        parentLanguage,
        sessionId,
        storyContext,
      });
    }
  };

  const handleMicToggle = (): void => {
    if (live.isListening) {
      live.stopListening();
    } else {
      live.startListening();
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        className="voice-companion-trigger"
        onClick={handleToggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        animate={
          live.isSpeaking
            ? {
                boxShadow: [
                  "0 0 0 0 rgba(198,122,74,0.4)",
                  "0 0 0 16px rgba(198,122,74,0)",
                  "0 0 0 0 rgba(198,122,74,0.4)",
                ],
              }
            : {}
        }
        transition={live.isSpeaking ? { duration: 1.5, repeat: Infinity } : {}}
        aria-label={isOpen ? "Close voice companion" : "Open voice companion"}
        type="button"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="voice-companion-panel"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" as const }}
          >
            <div className="voice-companion-header">
              <span className="voice-companion-title">Voice Companion</span>
              <span
                className={`voice-companion-status ${live.isConnected ? "connected" : ""}`}
              >
                {live.isConnected
                  ? live.isSpeaking
                    ? "Speaking..."
                    : "Listening"
                  : "Connecting..."}
              </span>
            </div>

            <div className="voice-companion-transcripts">
              {live.transcripts.length === 0 && live.isConnected && (
                <p className="voice-companion-hint">
                  Tap the mic and start speaking — the companion will respond in
                  voice.
                </p>
              )}
              {live.transcripts.map((t, i) => (
                <motion.div
                  key={i}
                  className={`voice-transcript ${t.speaker}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="voice-transcript-speaker">
                    {t.speaker === "user" ? "You" : "Companion"}
                  </span>
                  <span className="voice-transcript-text">{t.text}</span>
                </motion.div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            <div className="voice-companion-controls">
              <motion.button
                className={`voice-mic-btn ${live.isListening ? "active" : ""}`}
                onClick={handleMicToggle}
                disabled={!live.isConnected}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                animate={
                  live.isListening
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(198,122,74,0.4)",
                          "0 0 0 12px rgba(198,122,74,0)",
                          "0 0 0 0 rgba(198,122,74,0.4)",
                        ],
                      }
                    : {}
                }
                transition={
                  live.isListening ? { duration: 1.2, repeat: Infinity } : {}
                }
                type="button"
                aria-label={
                  live.isListening ? "Stop microphone" : "Start microphone"
                }
              >
                {live.isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
