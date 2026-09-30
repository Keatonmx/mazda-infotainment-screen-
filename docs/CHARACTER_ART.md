# Character art: Akari and Kodo

Both characters are 48×48 pixel art shown at 5× (240×240 cells, no smoothing), in one sprite sheet per app:

| Character | Sheet | Rows (top to bottom) |
|---|---|---|
| Akari あかり | `apps/app.companion/sprites.png` (720×1440) | calm, happy, pouty, annoyed, mad, furious |
| Kodo こどう | `apps/app.carpet/sprites.png` (720×2640) | happy, ecstatic, meh, grumpy, sick, hungry, shock, sleepy, cold, hot, petted |

Columns are always: **base**, **alternate** (bob / flicker), **blink**. Transparent background.

## The current art: made with PixelLab

The sheets in the repo are real PixelLab art, made through PixelLab's MCP tools in Claude Code:

1. **Base designs** with Create Image (Pro) at 48×48: 16 candidates per character. Picked: Akari #9 (neutral pose,
   arms at sides) and Kodo #10 (Soul Red, open eyes). Kodo's headband dot was widened by hand to read as a
   rising-sun disk. Both bases are saved in `tools/pixellab/bases/`.
2. **Every mood** with Edit Image (Pro), one text edit per mood on the base, so the character stays identical.
3. **Blinks** with one multi-frame Edit Image call per character ("close the eyes").
4. **Bob** frames made locally by nudging each frame down one pixel, then assembled into the sheets.

Fixes made by hand: Kodo's "hungry" frame came back with a blue headband and flame, so rows 0–24 (flame and
headband) were copied back from the base. Kodo's meh and hungry blinks were off (grey body, tears), so he
simply doesn't blink in those two moods. About 380 PixelLab generations in total.

The code-drawn placeholders (`tools/make-companion-sprites.js`, `tools/make-kodo-sprites.js`) still work
if you ever want to start over without PixelLab.

## Regenerating with the PixelLab API script

`tools/pixellab/generate.js` asks PixelLab for every frame using the prompts in `tools/pixellab/assets.json`,
then writes the sheets straight into the apps:

1. One **base** image per character (`/generate-image-pixflux`)
2. Each **mood** from the base as style and starting image (`/generate-image-bitforge`), so every expression is the same character
3. A **blink** frame per mood
4. The **bob** frame is made locally by nudging each frame down one pixel

```
npm i playwright
export PIXELLAB_API_KEY=...        # pixellab.ai/account; never commit it
NODE_USE_ENV_PROXY=1 node tools/pixellab/generate.js              # both
NODE_USE_ENV_PROXY=1 node tools/pixellab/generate.js --only akari --seed 7
node tools/pixellab/generate.js --dry-run     # show the requests, no API calls, no cost
```

Raw frames land in `tools/pixellab/out/<character>/` (not committed) so you can review them.
Then open `simulator/index.html` and check every mood. Keep a take you like by committing the sheet.
Try another `--seed` for a different take, and edit the prompts in `assets.json` to steer the look.

The script was tested offline with `--mock` (layout, sizes and scaling match) but hasn't made a live call;
the current art came from the MCP route above, which gave better consistency (Pro edits) than the script's
bitforge approach.

## Rules for replacement art

- Keep the row order above; the apps pick rows by position.
- Keep the character's feet at about the same height, so Kodo sits on his cushion and Akari stays centered in her sun
  (her circle is centered on the art's measured center, `apps/app.companion/app.css`). If the art moves,
  re-measure its bounding box and update the sprite position there, and Kodo's cushion in `apps/app.carpet/app.css`.
- Keep each sheet under about 200 KB. (Akari 106 KB, Kodo 145 KB.)
