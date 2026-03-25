export const API_BASE = "/api";

export const LANGUAGES = [
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
] as const;

export const THEMES = [
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
] as const;

export const MOOD_COLORS: Record<string, { primary: string; glow: string }> = {
  "Magical adventure": {
    primary: "#9b8ec4",
    glow: "rgba(155, 142, 196, 0.15)",
  },
  "Animal friends": { primary: "#3d6b4f", glow: "rgba(61, 107, 79, 0.15)" },
  "Family & home": { primary: "#c67a4a", glow: "rgba(198, 122, 74, 0.15)" },
  "Nature & seasons": { primary: "#3d6b4f", glow: "rgba(61, 107, 79, 0.15)" },
  "Space & stars": { primary: "#2c2438", glow: "rgba(44, 36, 56, 0.15)" },
  "Ocean & sea creatures": {
    primary: "#7cb5c9",
    glow: "rgba(124, 181, 201, 0.15)",
  },
  "Friendship & kindness": {
    primary: "#e8967a",
    glow: "rgba(232, 150, 122, 0.15)",
  },
  "Food & cooking": { primary: "#d4a843", glow: "rgba(212, 168, 67, 0.15)" },
  "Music & dance": { primary: "#9b8ec4", glow: "rgba(155, 142, 196, 0.15)" },
  "Brave heroes": { primary: "#c67a4a", glow: "rgba(198, 122, 74, 0.15)" },
};
