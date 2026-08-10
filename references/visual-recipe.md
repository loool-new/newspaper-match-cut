# Visual Recipe

## Reference signature

The effect is a rapid sequence of complete newspaper pages. A single highlighted keyword remains near a fixed anchor while the entire editorial context changes: breadcrumb, headline, font, line breaks, columns, scale, and crop. The focus word is part of each page, not a separate card. Surrounding copy uses strong blur and vertical smear, especially on cut frames.

## Timeline at 30 fps

| Phase | Frames | Treatment |
| --- | ---: | --- |
| Establish | 0–3 | First page appears with focus word already aligned |
| Match-cut run | 4–54 | Switch editions every 3–6 frames; keep keyword anchored |
| Resolve | 55–65 | Reduce layout jitter and blur |
| Hold | 66–75 | Keep the last edition readable for the handoff |

This table is the fixed-timing fallback. In music mode, the selected audio segment defines the composition length and detected onset frames replace the regular 3–6-frame cadence.

## Music timing

- Analyze audio once during project generation with `scripts/analyze_audio_beats.py`; never analyze it inside Remotion.
- Detect local onset peaks from a mono PCM energy envelope and quantize their timestamps to composition frames. The result must be deterministic for the same source segment, fps, and density.
- Offer `sparse`, `standard`, and `dense` profiles. Use `standard` unless the user requests another density.
- Keep beat frames relative to the trimmed segment, sorted, unique, greater than frame 0, and below `durationInFrames`.
- Let repeated `--beat-frame` values replace automatic detection for exact editorial timing.
- Trim and transcode only the selected source range into `public/audio/source.mp3`. Do not copy an entire track when the video uses only a short range.
- Keep fixed timing available when no audio is supplied or when the user explicitly selects it.

## Layer model

1. `PaperField`: warm paper color, fiber texture, wrinkles, vignette.
2. `EditorialPage`: one normal-flow page containing kicker, headline, the single native keyword span, rules, and body columns.
3. `TextBlur`: filters attached only to non-focus spans and blocks inside that page.
4. `GrainAndVignette`: subtle full-frame print finish.

Do not blur a parent containing the keyword. Do not duplicate or overlay the keyword.

## Focus alignment

Lay out each edition naturally first. Put the keyword span at its native position inside the complete headline sentence. Measure that span in page-local coordinates by accumulating the `offsetParent` chain. Position the complete page so the measured keyword center reaches the target anchor. Set the inner page transform origin to the measured keyword center so edition-specific scale changes preserve alignment.

Key the measured page by edition so each cut mounts a fresh untransformed page before measurement. Never calculate alignment from a page that still carries the previous edition's transform.

## Motion and blur

- Quantize edition changes with `Math.floor(frame / cutIntervalFrames)`.
- Use 3–6 frames per edition at 30 fps.
- Keep the focus anchor stable by translating and scaling the complete measured page; surrounding layout motion follows from that page transform.
- Treat “radial” as spatial focus falloff, not zoom streaks. Blur strength increases with distance from the keyword, but glyphs stay in place instead of stretching away from the center.
- Render three coincident editorial text layers: sharp, medium anisotropic Gaussian blur, and strong anisotropic Gaussian blur. Keep the keyword visible only in the sharp layer; use invisible same-size placeholders in the blurred layers so line wrapping remains identical.
- Blend layers with broad complementary elliptical masks centered on the measured keyword. The sharp mask should fade slowly, the medium mask should bridge most of the page, and the strong outer mask should enter gradually while the medium layer fades out.
- Keep mask and blur parameters stable between frames. Animate edition changes, not blur opacity or filter radius, to avoid brightness pulsing and subpixel shimmer.
- Keep paper texture outside the text layers so fibers and wrinkles remain sharp.
- Use a very small focus-word scale impact at each cut, about 1.03 down to 1.0. Avoid flying or bouncing entrances.

## Editorial variation

Vary whole editions, not letters:

- serif, grotesk, condensed sans, slab, and monospace headline families;
- headline sizes, line breaks, alignment, rules, and two- or three-column body grids;
- off-white, cream, gray newsprint, and lightly aged paper;
- yellow, faded pink, pale blue, or neutral highlight markers;
- crop and page scale while keeping the keyword anchor stable.

Use local licensed fonts if supplied. System-font stacks are only a portable fallback.

## Language support

- Set `language` to `zh` or `en` before choosing the text source.
- Chinese defaults must contain natural complete Chinese headlines and paragraphs, not translated fragments.
- Use Chinese headline variation through PingFang/Heiti, Songti, Kaiti, Hiragino Sans GB, and FangSong stacks. Use explicit CJK fallbacks on macOS and Windows.
- Chinese headlines use a slightly larger line height and `word-break: break-all`; Chinese body copy uses a comfortable 1.55 line height.
- Keep English body copy in one continuous, left-aligned column. Do not justify short English copy or fragment it across CSS columns, since both treatments create distracting gaps and broken reading order.
- Preserve the same `{{keyword}}` marker and native-flow alignment rules in both languages.

## Bundled paper backgrounds

Assign one background per edition from `public/backgrounds/`: `fibrous-white.png`, `soft-gray.png`, `aged-cream.png`, `halftone-light.png`, `halftone-aged.png`, and `crumpled-white.png`. Load them with `staticFile()`, use `background-size: cover`, and keep the SVG fiber overlay subtle. Do not apply the same texture to every edition.

## Text integrity

Author every focus headline as a complete natural sentence containing exactly one `{{keyword}}` marker, for example `Understanding the skills behind a successful {{keyword}}`. Author each body as one coherent paragraph. At render time, split the complete headline around the marker only to attach the keyword ref and selective blur spans. Never store separate prefix and suffix fragments, and never fill columns by repeating one generic sentence.

## Parameters

Expose `language`, `keyword`, `kicker`, `topic`, `headlineTemplates`, `bodyParagraphs`, `seed`, `accentColor`, `paperColor`, `inkColor`, `timingMode`, `beatFrames`, `audioSrc`, `audioDurationSeconds`, `cutIntervalFrames`, `settleFrame`, `focusY`, `blurMin`, `blurMax`, and `focusScale`. `headlineTemplates` contains complete sentences with exactly one `{{keyword}}` marker; `bodyParagraphs` contains complete paragraphs. Cycle each non-empty array by edition index.

## Verification

- The focus word exists once, remains in normal text flow, and is clearly part of its sentence.
- Inspect the DOM or source to confirm there is no duplicate focus overlay.
- No individual letters have separate paper boxes, rotation, or shadows.
- Edition changes affect full layouts while the keyword center moves by no more than a few pixels.
- Background text is most blurred on cut frames and softer between cuts.
- Paper texture loads through `staticFile()` without a 404.
- Two renders of the same frame are pixel-identical.
- In beat mode, edition changes occur exactly on `beatFrames`, the audio begins at composition frame 0, and the rendered file contains an audio stream.
