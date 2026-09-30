# Character art: Akari and Kodo

Both characters are 48×48 pixel art shown at 5× (240×240 cells, no smoothing), in one sprite sheet per app:

| Character | Sheet | Rows (top to bottom) |
|---|---|---|
| Akari あかり | `apps/app.companion/sprites.png` (720×1440) | calm, happy, pouty, annoyed, mad, furious |
| Kodo こどう | `apps/app.carpet/sprites.png` (720×2640) | happy, ecstatic, meh, grumpy, sick, hungry, shock, sleepy, cold, hot, petted |

Columns are always: **base**, **alternate** (bob / flicker), **blink**. Transparent background.

The sheets in the repo are placeholders drawn by code (`tools/make-companion-sprites.js`, `tools/make-kodo-sprites.js`).

## Generating real art with PixelLab

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

Tested offline with `--mock` (rebuilds the current sheets through the same pipeline): layout, sizes and scaling match.
It hasn't made a live PixelLab call yet.

## Rules for replacement art

- Keep the row order above; the apps pick rows by position.
- Keep the character's feet at about the same height, so Kodo sits on his cushion and Akari stays centered in her sun
  (her circle is centered on the art's measured center, `apps/app.companion/app.css`).
- Keep each sheet under about 200 KB.
