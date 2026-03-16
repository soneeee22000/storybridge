# StoryBridge -- Demo Video Script (< 4 minutes)

## 0:00 - 0:30 -- THE HOOK (Problem Statement)

**[Screen: Landing page hero -- book-bridge logo, floating decorative elements, stats]**

NARRATION:
"Every night, millions of immigrant parents face an invisible wall. They want to
read bedtime stories to their children -- but their native language and their
child's adopted language create a gap that no ordinary book can bridge.

A Burmese mother in Paris. A Spanish father in New York. An Arabic grandmother
in London. They all share the same wish: to pass on their stories, their
culture, their language -- through the magic of storytelling.

StoryBridge makes that possible."

---

## 0:30 - 2:30 -- LIVE DEMO (Show the App Working)

**[Screen: Scroll the landing page briefly -- stats, features, architecture section]**

NARRATION:
"Let me show you how it works."

**[Click the "Create Your Story" CTA button to navigate to the setup form]**

### Step 1: Setup (0:30 - 0:50)

**[Show the story creation form]**
"A parent selects their home language -- in this case, Burmese. Their child is
five years old. They choose a magical adventure theme, and add cultural
elements they want in the story -- the Thingyan water festival, thanaka face
paint, and golden pagodas."

**[Click 'Begin the Story']**

### Step 2: Story Generation (0:50 - 1:10)

**[Show loading screen, then the first scene appearing]**
"StoryBridge's AI creates a story outline and the first scene. Watch -- the
story appears in both Burmese script and English, side by side."

### Step 3: Illustration (1:10 - 1:30)

**[Show the watercolor illustration loading]**
"Each scene gets a unique watercolor illustration -- culturally authentic,
featuring the pagodas and thanaka that the parent requested. These aren't
stock images -- they're generated in real time."

### Step 4: Audio Narration (1:30 - 1:50)

**[Click play on the audio player]**
"And here's where the magic happens -- listen. The story is narrated first in
Burmese, then in English. The parent hears their language. The child hears
theirs. Together, they share the story."

### Step 5: Interactive Choice (1:50 - 2:10)

**[Show the interactive prompt and type a response]**
"At the end of each scene, the child makes a choice that shapes the story.
'Should Thiri follow the golden butterfly or explore the cave?' The child
types their answer, and the story adapts."

### Step 6: Story Continues (2:10 - 2:30)

**[Show the next scene with new illustration and narration]**
"The next scene unfolds -- new illustration, new narration, new choice. Every
story is unique, every story bridges two worlds."

**[On scene 5, click 'Finish Story']**
"When the final scene concludes, the parent taps 'Finish Story' and sees a
completion screen with stats badges summarizing the adventure."

---

## 2:30 - 3:15 -- ARCHITECTURE (Technical Depth)

**[Screen: Switch to architecture diagram]**

NARRATION:
"Under the hood, StoryBridge uses a multi-agent architecture built with
Google's Agent Development Kit.

Three specialized agents work together:

- The Story Architect creates bilingual narratives with cultural context
- The Illustrator generates watercolor scenes using Gemini's native image generation
- The Narrator creates bilingual audio using Gemini's text-to-speech

These agents are coordinated by a FastAPI orchestrator running on Google Cloud
Run. The frontend is React with TypeScript. Every modality -- text, images,
audio, interaction -- is essential. Remove any one, and the experience breaks."

---

## 3:15 - 3:50 -- IMPACT (Why This Matters)

**[Screen: Return to the app showing a completed story]**

NARRATION:
"StoryBridge isn't just a storytelling app. It's a bridge between generations,
between cultures, between languages.

There are 281 million international migrants worldwide. Their children are
growing up between two worlds. StoryBridge helps families stay connected to
their roots -- one bedtime story at a time.

And because it supports over 20 languages out of the box, it works for
families everywhere -- from Myanmar to Mexico, from Syria to Somalia."

---

## 3:50 - 4:00 -- CLOSE

**[Screen: StoryBridge title card with book-bridge logo]**

NARRATION:
"StoryBridge. Where languages meet through the magic of storytelling.

Built by Pyae Sone Kyaw -- a Burmese engineer in Paris, building the bridge
he wished he had growing up."

**[Fade to black]**
