import { API_BASE } from "./constants";
import type {
  CreateStoryParams,
  SavedStoryFull,
  SavedStorySummary,
  Scene,
  Story,
} from "./types";

export async function createStory(
  params: CreateStoryParams,
): Promise<{ session_id: string; story: Story }> {
  const res = await fetch(`${API_BASE}/story/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Story creation failed: ${res.statusText}`);
  return res.json();
}

export async function illustrateScene(
  sessionId: string,
  sceneIndex: number,
): Promise<{ image_base64: string; mime_type: string }> {
  const res = await fetch(
    `${API_BASE}/scene/illustrate?session_id=${sessionId}&scene_index=${sceneIndex}`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`Illustration failed: ${res.statusText}`);
  return res.json();
}

export async function narrateScene(
  sessionId: string,
  sceneIndex: number,
): Promise<{ audio_base64: string; mime_type: string }> {
  const res = await fetch(
    `${API_BASE}/scene/narrate?session_id=${sessionId}&scene_index=${sceneIndex}`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`Narration failed: ${res.statusText}`);
  return res.json();
}

export async function submitChoice(
  sessionId: string,
  choice: string,
): Promise<{ completed: boolean; current_scene: number; scene?: Scene }> {
  const res = await fetch(`${API_BASE}/scene/choice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, choice }),
  });
  if (!res.ok) throw new Error(`Choice failed: ${res.statusText}`);
  return res.json();
}

function getBrowserId(): string {
  const KEY = "storybridge_browser_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export async function saveStoryToLibrary(params: {
  story: Story;
  scenes: Scene[];
  choices: string[];
  parentLanguage: string;
  childAge: number;
  storyTheme: string;
  culturalElements: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/stories/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        browser_id: getBrowserId(),
        story_title_native: params.story.story_title_native,
        story_title_english: params.story.story_title_english,
        parent_language: params.parentLanguage,
        child_age: params.childAge,
        story_theme: params.storyTheme,
        cultural_elements: params.culturalElements,
        total_scenes: params.story.total_scenes,
        scenes: params.scenes,
        choices: params.choices,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSavedStories(): Promise<SavedStorySummary[]> {
  const res = await fetch(
    `${API_BASE}/stories/list?browser_id=${getBrowserId()}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.stories || [];
}

export async function fetchFullStory(
  storyId: string,
): Promise<SavedStoryFull | null> {
  const res = await fetch(`${API_BASE}/stories/${storyId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function deleteStoryFromLibrary(storyId: string): Promise<void> {
  await fetch(`${API_BASE}/stories/${storyId}`, { method: "DELETE" });
}
