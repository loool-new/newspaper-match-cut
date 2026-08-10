# Remotion Newspaper Match Cut

[简体中文](README.zh-CN.md)

A Codex Skill for generating newspaper and magazine match-cut openers with Remotion. One highlighted keyword stays locked in place while complete editorial layouts, fonts, columns, crops, and paper textures switch around it.

## Demos

### Editing · English

https://github.com/user-attachments/assets/3660b8f5-e801-43a4-bc09-39ce4fb77c9a

### 创作 · Chinese

https://github.com/user-attachments/assets/92f03700-d87c-4ee6-ac41-4b388f29a2ba

Both demos are 720 × 1280, 30fps, approximately eight seconds long, and switch complete newspaper editions on musical beats.

## Features

- Chinese and English language modes.
- Complete built-in headline and body copy for both languages.
- One to 24 user-supplied headline and body variants.
- A single native keyword span that remains inside its original sentence.
- Whole-page measurement and alignment around the keyword.
- Three-stage spatial focus falloff: sharp center, soft transition, strong outer blur.
- Six editorial layouts, varied font stacks, column systems, crops, and paper textures.
- Adjustable highlight color, blur strength, focus position, scale, and cut speed.
- Deterministic, frame-driven Remotion rendering.

## Required first interaction

At the start of every new request, the Skill asks these questions in order:

1. Should the newspaper animation use Chinese or English?
2. Will the user provide complete headlines and body copy, or should the Skill use default copy in the selected language?

The Skill must not silently choose either option.

## Install in Codex

```bash
git clone https://github.com/loool-new/newspaper-match-cut.git \
  ~/.codex/skills/remotion-newspaper-match-cut
```

Restart Codex, then invoke the Skill with a natural-language request:

```text
Use remotion-newspaper-match-cut to create a newspaper match-cut opener.
```

## Create a project with default English copy

```bash
python3 scripts/create_newspaper_match_cut.py ./my-newspaper-intro \
  --language en \
  --keyword "Editing" \
  --kicker "CREATIVE STUDIO" \
  --width 720 \
  --height 1280
```

## Use custom copy

Every complete headline must contain exactly one `{{keyword}}` marker. The marker identifies the keyword's native position inside the sentence.

```bash
python3 scripts/create_newspaper_match_cut.py ./custom-intro \
  --language en \
  --keyword "Editing" \
  --headline "Understanding the rhythm behind successful {{keyword}}" \
  --headline "How modern tools reshape creative {{keyword}}" \
  --body "Strong editing connects images, sound, pacing, and attention into one coherent experience." \
  --body "A clear visual hierarchy helps viewers understand each decision without losing momentum."
```

Headline and body arrays cycle independently by edition index, so one entry can be reused or every edition can receive unique copy.

## Run and render

```bash
cd my-newspaper-intro
npm install
npm run typecheck
npm run studio
npm run render
```

## Main props

| Prop | Purpose |
| --- | --- |
| `language` | `zh` or `en` |
| `keyword` | The single sharp highlighted word |
| `kicker` | Small newspaper breadcrumb or kicker |
| `topic` | Topic text used by default headlines |
| `headlineTemplates` | Complete headlines containing one `{{keyword}}` marker |
| `bodyParagraphs` | Complete body paragraphs |
| `accentColor` | Keyword highlight color |
| `cutIntervalFrames` | Default edition-switch interval |
| `focusY` | Vertical position of the shared keyword anchor |
| `blurMin` / `blurMax` | Transition and outer blur strength |
| `focusScale` | Whole-page scale |

## How it works

1. Each edition lays out a complete headline and body paragraph normally.
2. `{{keyword}}` becomes the single native focus-word element inside that headline.
3. The element is measured and the whole page is translated and scaled to a shared anchor.
4. The identical page is rendered as sharp, medium-blur, and strong-blur text layers.
5. Broad elliptical masks blend those layers around the measured keyword. Blur increases with distance without stretching glyphs outward.
6. Fonts, columns, crops, and paper textures change as complete editions at each cut.

## Repository structure

```text
SKILL.md                         Codex workflow and visual rules
agents/openai.yaml               Skill display metadata and default prompt
assets/remotion-template/        Reusable Remotion project template
examples/                        MP4 demos and preview images
references/visual-recipe.md      Timing, layout, blur, and verification guide
scripts/create_newspaper_match_cut.py
README.zh-CN.md                  Simplified Chinese documentation
```

## Requirements

- Python 3
- Node.js 20 or newer
- npm
- Remotion-compatible Chromium for preview and rendering

The template uses portable system-font stacks. Exact typography can vary by operating system; supply licensed local fonts when exact visual matching matters. Ensure you have permission to redistribute any replacement fonts, newspaper scans, paper textures, and music used in exported videos.
