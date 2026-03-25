export interface VocabularyWord {
  native: string;
  english: string;
  pronunciation: string;
}

export interface Scene {
  scene_number: number;
  title_native: string;
  title_english: string;
  narration_native: string;
  narration_english: string;
  image_prompt: string;
  cultural_element: string;
  cultural_context?: string;
  vocabulary_words?: VocabularyWord[];
  interactive_prompt_native: string;
  interactive_prompt_english: string;
}

export interface Story {
  story_title_native: string;
  story_title_english: string;
  scenes: Scene[];
  total_scenes: number;
}

export type AppPhase =
  | "landing"
  | "setup"
  | "loading"
  | "scene"
  | "complete"
  | "library"
  | "reading";

export interface SavedStorySummary {
  story_id: string;
  story_title_native: string;
  story_title_english: string;
  parent_language: string;
  story_theme: string;
  total_scenes: number;
  created_at: string;
}

export interface SavedStoryFull extends SavedStorySummary {
  scenes: Scene[];
  choices: string[];
  child_age: number;
  cultural_elements: string;
  scene_images?: Record<string, string>;
}

export interface StorySetup {
  parentLanguage: string;
  childAge: number;
  storyTheme: string;
  culturalElements: string;
}

export interface CreateStoryParams {
  parent_language: string;
  child_age: number;
  story_theme: string;
  cultural_elements: string;
  story_seed: string;
}
