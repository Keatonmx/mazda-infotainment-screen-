# Akari's art: swapping in PixelLab sprites

The included `apps/app.companion/sprites.png` is placeholder pixel art drawn by
`tools/make-companion-sprites.js`. Replace it with PixelLab art using the same layout and the app needs no changes.

## Sheet layout

- **6 rows**, one per anger level, top to bottom: 0 calm, 1 happy, 2 pouty, 3 annoyed, 4 mad, 5 furious
- **3 columns**: base pose, alternate (a gentle bob for levels 0–3; flailing arms or steam for 4–5), blink
- **Each cell 240×240 px** (a 48×48 sprite scaled 5× with nearest-neighbor, so pixels stay sharp).
  The full sheet is 720×1440 px, PNG with a transparent background.

If you generate at 64×64, 240 isn't a whole multiple of 64, so either generate at 48×48 (×5) or change `CELL` in
`app.js` and the `.sprite` size in `app.css` to match (for example 64×64 ×4 = 256).

## PixelLab prompts

Keep one character reference and generate each expression from it, so she stays consistent.

**Base character:**
> chibi anime girl, big head, small body, dark purple twin tails with red hair ties, big sparkling eyes,
> red racing jacket with white collar, white shirt, cute, front view, pixel art, 48x48, transparent background

**Expressions** (same character, front view):

| Row | Prompt addition |
|---|---|
| 0 calm | gentle smile, relaxed, hands at sides |
| 1 happy | eyes closed happily (^ ^), big smile, blushing |
| 2 pouty | half-lidded unimpressed eyes, flat mouth, side-eye |
| 3 annoyed | puffed cheeks, furrowed brows, pouting, hands on hips |
| 4 mad | shouting with open mouth, angry eyebrows, red face, anger mark symbol, fists raised |
| 5 furious | ">_<" eyes, screaming, very red face, steam coming out of ears, two anger marks, flailing fists |

For the alternate column, use PixelLab's animation tools on each expression (for example "idle breathing" for
rows 0–3 and "angry stomping / flailing" for rows 4–5), and pick a frame with eyes closed for the blink column.

## After you have the art

1. Arrange the cells into one 720×1440 PNG in the layout above (Aseprite's sprite sheet export can do this).
2. Save it as `apps/app.companion/sprites.png`.
3. Open `simulator/index.html?app=app.companion` and drag the speed slider to check every level.
4. Rebuild the USB (`sh tools/build-usb.sh`) and reinstall.

Keep the file under about 200 KB so the CMU loads it quickly. The placeholder is 43 KB.
