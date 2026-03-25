import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Globe,
  Heart,
  Image,
  MessageCircle,
  Mic,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react";
import { LogoMark } from "./LogoMark";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

const stagger = {
  whileInView: { transition: { staggerChildren: 0.12 } },
  viewport: { once: true },
};

const statItem = {
  initial: { opacity: 0, scale: 0.8 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

export function LandingPage({ onStart }: { onStart: () => void }): ReactNode {
  const [email, setEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const handleWaitlist = (e: React.FormEvent): void => {
    e.preventDefault();
    if (email.trim()) {
      setWaitlistSubmitted(true);
      setEmail("");
    }
  };

  return (
    <div className="landing">
      {/* Hero */}
      <motion.section
        className="landing-hero"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" as const }}
      >
        <motion.div
          className="landing-hero-logo"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" as const, delay: 0.2 }}
        >
          <LogoMark size={64} />
        </motion.div>
        <motion.h1
          className="landing-hero-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          StoryBridge
        </motion.h1>
        <motion.p
          className="landing-hero-tagline"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Bedtime stories that bridge two worlds
        </motion.p>
        <motion.p
          className="landing-hero-desc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          The first AI storytelling companion built for immigrant families.
          Speak in your language, and watch a bilingual, illustrated, narrated
          bedtime story come alive — with your culture woven into every scene.
        </motion.p>
        <motion.div
          className="landing-hero-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <motion.button
            className="btn-primary landing-cta"
            onClick={onStart}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Try It Free
          </motion.button>
          <span className="landing-hero-note">No account needed</span>
        </motion.div>
      </motion.section>

      {/* Social Proof */}
      <motion.section className="landing-section landing-proof" {...fadeUp}>
        <div className="landing-proof-badges">
          <span className="landing-proof-badge">Powered by Google Gemini</span>
          <span className="landing-proof-badge">Google Cloud Run</span>
          <span className="landing-proof-badge">20+ Languages</span>
        </div>
      </motion.section>

      {/* Problem */}
      <motion.section className="landing-section" {...fadeUp}>
        <h2 className="landing-section-title">The Invisible Wall</h2>
        <p className="landing-section-desc">
          Every night, millions of immigrant parents want to share bedtime
          stories with their children — but language barriers make it nearly
          impossible. Heritage languages are disappearing, and cultural
          connections fade with each generation.
        </p>
        <motion.div className="landing-stats" {...stagger}>
          <motion.div className="landing-stat" {...statItem}>
            <span className="landing-stat-number">281M</span>
            <span className="landing-stat-label">
              International migrants worldwide
            </span>
          </motion.div>
          <motion.div className="landing-stat" {...statItem}>
            <span className="landing-stat-number">75M</span>
            <span className="landing-stat-label">
              Non-English speakers in the US alone
            </span>
          </motion.div>
          <motion.div className="landing-stat" {...statItem}>
            <span className="landing-stat-number">12%</span>
            <span className="landing-stat-label">
              Of 3rd-generation children speak their heritage language
            </span>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* How it works */}
      <motion.section className="landing-section" {...fadeUp}>
        <h2 className="landing-section-title">How It Works</h2>
        <motion.div className="landing-steps" {...stagger}>
          {[
            {
              num: 1,
              title: "Choose Your Language",
              icon: Globe,
              desc: "Select your home language from 20+ supported languages — Burmese, Spanish, Arabic, Hindi, Mandarin, and many more.",
            },
            {
              num: 2,
              title: "Set the Scene",
              icon: Sparkles,
              desc: "Pick a theme, add cultural elements from your heritage — festivals, foods, traditions — and let the AI weave them into the narrative.",
            },
            {
              num: 3,
              title: "Experience Together",
              icon: BookOpen,
              desc: "Each scene features bilingual text, a watercolor illustration, audio narration, vocabulary words, and cultural context.",
            },
            {
              num: 4,
              title: "Shape the Story",
              icon: Mic,
              desc: "Your child makes choices that genuinely change the narrative. Speak or type — every story is unique, every choice matters.",
            },
          ].map((step) => (
            <motion.div key={step.num} className="landing-step" {...statItem}>
              <div className="landing-step-number">{step.num}</div>
              <h3 className="landing-step-title">{step.title}</h3>
              <p className="landing-step-desc">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Features */}
      <motion.section className="landing-section" {...fadeUp}>
        <h2 className="landing-section-title">Every Scene, Fully Alive</h2>
        <motion.div className="landing-features" {...stagger}>
          {[
            {
              icon: Globe,
              title: "Bilingual Stories",
              desc: "Native language and English side by side — natural in both, never awkward translations.",
            },
            {
              icon: Image,
              title: "Watercolor Illustrations",
              desc: "Every scene gets a unique, culturally authentic illustration in warm storybook watercolor style.",
            },
            {
              icon: Volume2,
              title: "Audio Narration",
              desc: "Warm, expressive narration in both languages — like a loving parent reading a bedtime story.",
            },
            {
              icon: Mic,
              title: "Voice Interaction",
              desc: "Speak naturally via the Gemini Live companion. Children shape the story with their voice.",
            },
            {
              icon: Heart,
              title: "Cultural Context",
              desc: '"Did you know?" cards explain the heritage elements — teaching children why their culture matters.',
            },
            {
              icon: Star,
              title: "Vocabulary Learning",
              desc: "Each scene highlights key words with pronunciation guides, turning every story into a gentle language lesson.",
            },
          ].map((feat) => (
            <motion.div
              key={feat.title}
              className="landing-feature"
              {...statItem}
              whileHover={{ y: -4 }}
            >
              <div className="landing-feature-icon">
                <feat.icon size={32} strokeWidth={1.5} />
              </div>
              <h3 className="landing-feature-title">{feat.title}</h3>
              <p className="landing-feature-desc">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Voice Companion highlight */}
      <motion.section
        className="landing-section landing-voice-highlight"
        {...fadeUp}
      >
        <div className="landing-voice-content">
          <MessageCircle
            size={40}
            strokeWidth={1.5}
            className="landing-voice-icon"
          />
          <h2 className="landing-section-title">Meet the Voice Companion</h2>
          <p className="landing-section-desc">
            Powered by the Gemini Live API, the Voice Companion is a real-time
            bilingual storytelling guide. Speak in your language, and it
            responds in both — narrating scenes, teaching words, and guiding
            your child through the adventure. No typing required.
          </p>
        </div>
      </motion.section>

      {/* Architecture */}
      <motion.section className="landing-section landing-arch" {...fadeUp}>
        <h2 className="landing-section-title">Built with Google ADK</h2>
        <p className="landing-section-desc">
          A multi-agent architecture powered by Google&apos;s Agent Development
          Kit — four Gemini models working in concert.
        </p>
        <div className="landing-arch-grid">
          {[
            {
              name: "Orchestrator",
              model: "Gemini 2.5 Flash",
              desc: "Coordinates the storytelling pipeline with full conversation context across scenes.",
            },
            {
              name: "Story Architect",
              model: "Gemini 2.5 Flash",
              desc: "Creates bilingual narratives with character visual bibles and cultural vocabulary.",
            },
            {
              name: "Illustrator",
              model: "Gemini Flash Image",
              desc: "Generates consistent watercolor illustrations with character visual bible injection.",
            },
            {
              name: "Voice Companion",
              model: "Gemini Live Audio",
              desc: "Real-time bidirectional voice via Gemini Live API for natural interaction.",
            },
          ].map((agent) => (
            <motion.div
              key={agent.name}
              className="landing-arch-agent"
              whileHover={{ y: -4 }}
            >
              <h4 className="landing-arch-name">{agent.name}</h4>
              <p className="landing-arch-model">{agent.model}</p>
              <p className="landing-arch-desc">{agent.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="landing-arch-stack">
          <span>FastAPI</span>
          <span>React 19</span>
          <span>TypeScript</span>
          <span>Google Cloud Run</span>
          <span>Google ADK</span>
          <span>Gemini Live API</span>
          <span>Firestore</span>
        </div>
      </motion.section>

      {/* Waitlist */}
      <motion.section className="landing-section landing-waitlist" {...fadeUp}>
        <h2 className="landing-section-title">Join the Waitlist</h2>
        <p className="landing-section-desc">
          StoryBridge is launching soon with premium features — unlimited
          stories, family profiles, downloadable storybooks, and more languages.
          Get early access.
        </p>
        {waitlistSubmitted ? (
          <motion.p
            className="landing-waitlist-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            You&apos;re on the list. We&apos;ll reach out soon.
          </motion.p>
        ) : (
          <form className="landing-waitlist-form" onSubmit={handleWaitlist}>
            <input
              type="email"
              className="landing-waitlist-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <motion.button
              type="submit"
              className="btn-primary landing-cta"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              Get Early Access
            </motion.button>
          </form>
        )}
      </motion.section>

      {/* Final CTA */}
      <motion.section className="landing-section landing-final-cta" {...fadeUp}>
        <h2 className="landing-section-title">One bedtime story at a time</h2>
        <p className="landing-section-desc">
          StoryBridge helps families stay connected to their roots, their
          language, and each other — through the oldest form of bonding there
          is: a story before sleep.
        </p>
        <motion.button
          className="btn-primary landing-cta"
          onClick={onStart}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          Create Your Story
        </motion.button>
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
      </motion.section>
    </div>
  );
}
