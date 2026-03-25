import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { LANGUAGES, THEMES } from "../lib/constants";
import type { CreateStoryParams } from "../lib/types";

export function SetupForm({
  onSubmit,
}: {
  onSubmit: (data: CreateStoryParams) => void;
}): ReactNode {
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [age, setAge] = useState(5);
  const [theme, setTheme] = useState<string>(THEMES[0]);
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
    <motion.div
      className="setup-container"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
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

        <motion.button
          type="submit"
          className="btn-primary"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Begin the Story
        </motion.button>
      </form>
    </motion.div>
  );
}
