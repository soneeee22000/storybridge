# Feature: My Stories Library

## Vision

Every story a child creates with StoryBridge becomes a family artifact — like a photo album of adventures shared between languages. The My Stories library lets families revisit, re-read, and re-listen to every story they've created together.

## Why This Matters

- **Emotional switching cost** — A family with 50 saved stories won't switch to a competitor. These are _their_ stories.
- **Repeat engagement** — Children love re-reading favorite stories. This turns StoryBridge from a one-time experience into a nightly ritual.
- **Heritage preservation** — The stories become a record of the family's cultural identity, saved in both languages.
- **Moat building** — The MOAT-ASSESSMENT identifies story persistence as Priority 0. Every saved story is a unit of lock-in.

## User Experience

### Landing Page — "My Stories" Shelf

After the hero section, if the user has saved stories, a horizontal shelf appears:

```
My Stories (3)
[Story Card 1] [Story Card 2] [Story Card 3]
```

Each card shows:

- Story title (native language)
- Story title (English)
- Theme badge
- Number of scenes
- Date created
- Language pair (e.g., "Burmese + English")

### Story Replay

Clicking a saved story opens it in a read-only scene view:

- All scene text (bilingual) displayed
- Illustrations re-generated on demand (or cached)
- Audio re-generated on demand (or cached)
- Choices the child made shown inline
- No interactive prompts (story is complete)

### Completion Screen — Auto-Save

When a story finishes, it auto-saves to the library. The completion screen shows:

- "Story saved to My Stories"
- Option to name/rename the story

## Implementation Phases

### Phase 1: localStorage MVP (Hackathon)

**Scope:** Save completed story metadata + text to browser localStorage.

**What's saved per story:**

```typescript
interface SavedStory {
  id: string;
  createdAt: string;
  parentLanguage: string;
  childAge: number;
  storyTheme: string;
  culturalElements: string;
  storyTitleNative: string;
  storyTitleEnglish: string;
  totalScenes: number;
  scenes: Scene[]; // Full scene text (no images/audio)
  choices: string[]; // Child's choices at each scene
}
```

**What's NOT saved (too large for localStorage):**

- Base64 images (~500KB each)
- Base64 audio (~1MB each)

**UX:**

- "My Stories" shelf on landing page
- Click to re-read (text only, no media)
- Delete individual stories
- Max ~20 stories before localStorage fills up

### Phase 2: Cloud Persistence (Post-Hackathon)

**Tech:** Supabase (PostgreSQL + Auth + Storage)

**Schema:**

```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  parent_language TEXT NOT NULL,
  child_age INT NOT NULL,
  story_theme TEXT NOT NULL,
  cultural_elements TEXT,
  title_native TEXT NOT NULL,
  title_english TEXT NOT NULL,
  total_scenes INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  scene_number INT NOT NULL,
  title_native TEXT,
  title_english TEXT,
  narration_native TEXT,
  narration_english TEXT,
  image_prompt TEXT,
  cultural_element TEXT,
  child_choice TEXT,          -- What the child chose (null for scene 1)
  image_url TEXT,             -- Supabase Storage URL (cached)
  audio_url TEXT,             -- Supabase Storage URL (cached)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Additional features:**

- User accounts (email/Google OAuth via Supabase Auth)
- Image + audio cached in Supabase Storage (no re-generation)
- Share stories via link
- Child profiles (multiple children per family)
- Vocabulary tracking per language

### Phase 3: Family Sharing (6+ months)

- Grandparent starts a story seed, child continues
- Family story feed
- Community story library (browse by language pair)
- Export stories as PDF picture books

## Impact on Moat

| Without My Stories        | With My Stories                           |
| ------------------------- | ----------------------------------------- |
| Single-session experience | Multi-session relationship                |
| Zero switching cost       | Emotional switching cost (saved memories) |
| No reason to return       | Daily bedtime ritual                      |
| No data moat              | Vocabulary + engagement data              |
| Moat score: 3/10          | Moat score: 6/10 (with persistence)       |
