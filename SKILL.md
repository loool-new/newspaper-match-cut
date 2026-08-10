---
name: remotion-newspaper-match-cut
description: Create or adapt Remotion newspaper match-cut openers where complete editorial pages, headlines, fonts, crops, and paper treatments switch every few frames while one highlighted keyword remains locked near the same screen position. Use for newspaper or magazine editorial intros, highlighted-word match cuts, rapid print-layout transitions, and title sequences with dynamic blur on all non-focus text.
---

# Remotion Newspaper Match Cut

Create a sequence of complete newspaper layouts that match-cut around one sharp highlighted keyword.

## Required first interaction

At the beginning of every new Skill invocation, before inspecting references, creating files, or running the Remotion workflow, ask these questions in order and wait for each answer.

First ask for the output language:

> 这次报纸动画使用中文还是英文？

After the language is selected, ask for the text source:

> 文字内容由你提供完整标题和正文，还是使用所选语言的默认文本自动生成？

- Do not ask the text-source question before the language is known.
- If the user chooses custom text, collect the focus keyword plus at least one complete headline and one complete body paragraph. Convert the keyword position in each headline to exactly one `{{keyword}}` marker.
- If the user chooses default text, use the bundled Chinese or English arrays matching the selected language and only customize the focus keyword, kicker, and topic as needed.
- Do not silently choose a language or text source on the user's behalf.

## Workflow

1. After both required choices, inspect supplied references with `ffprobe` and contact sheets. Identify the keyword anchor, cut cadence, page families, blur direction, highlight treatment, and final hold.
2. Read [references/visual-recipe.md](references/visual-recipe.md) before changing composition structure or timing.
3. For a new project, run `python3 scripts/create_newspaper_match_cut.py <destination> --language zh --keyword "..." --kicker "..."` or use `--language en`. Add repeated `--headline "A complete {{keyword}} sentence"` and `--body "A complete paragraph"` flags to supply custom editorial copy.
4. For an existing Remotion project, copy the relevant template files from `assets/remotion-template/` and merge dependencies without overwriting unrelated work.
   The template includes six default paper backgrounds in `public/backgrounds/`; keep them paired with editions or replace them with licensed project textures.
5. Build each edition from a complete authored headline sentence and a coherent body paragraph. Store the headline as one template containing exactly one `{{keyword}}` marker; split it only at render time to style the native keyword span.
   Runtime props `headlineTemplates` and `bodyParagraphs` accept 1–24 entries and cycle independently across editions, so one body may be reused or every edition may receive unique copy.
6. Render the keyword exactly once inside its original headline or sentence. Measure that DOM span, then translate and scale the complete newspaper page until the native keyword reaches the shared match-cut anchor.
7. Keep non-focus words readable with spatial focus falloff: a sharp elliptical center around the native keyword, a lightly blurred transition field, and a strongly blurred outer field. Blend the three copies with broad complementary radial masks. The blur amount increases with distance from the keyword; the glyphs must not stretch radially outward.
8. Drive every animation with `useCurrentFrame()`, `interpolate()`, or explicit frame math. Never use CSS transitions, CSS keyframes, timers, or `Math.random()`.
9. Expose creative controls through composition props and keep inline `defaultProps` in `Root.tsx`.
10. Run `npm install`, `npm run typecheck`, and render stills at a cut frame, between cuts, and during the final hold. Render the full video only when explicitly requested.

## Non-negotiable look

- Treat the newspaper as the scene, not as a background behind floating typography.
- Keep the keyword in normal document flow at its natural position inside every edition.
- Author complete sentences and paragraphs; do not model the headline as independent prefix, keyword, and suffix fields or repeat filler copy.
- Prefer user-supplied `headlineTemplates` and `bodyParagraphs` when provided; otherwise use bundled copy matching `language`.
- For Chinese, use the bundled CJK font stacks and Chinese line breaking rather than relying on Latin fonts to fall back accidentally.
- Highlight one complete word with a flat rectangular marker; do not split it into ransom-note letters.
- Align editions by moving the whole measured page, not by moving or duplicating the keyword.
- Use no card shadow, torn-paper tile, independent letter rotation, or per-letter entrance.
- Preserve the keyword's screen position while surrounding layouts jump.
- Make non-focus copy progressively softer with distance from the keyword. Keep the center fully sharp, the transition field partly readable, and the outermost copy difficult to read.
- Keep variation editorial: serif, grotesk, condensed, mono, different columns and crops, restrained off-white paper tones.
- Switch paper texture with the edition. Use the bundled fibrous, soft-gray, aged-cream, halftone, and crumpled-paper defaults rather than reusing one background throughout.

## Deliverables

Return the project path, composition ID, adjustable props, validation results, and Studio or render command. Mention missing licensed fonts or supplied newspaper scans that may limit exact visual fidelity.
