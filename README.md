# Mazda Connect Custom Apps

Custom apps and guides for a 2016 Mazda 3 Grand Touring (Mazda Connect, 7" screen, commander knob, Bose).

Everything shares one look: **魂動 KODO**, Japan × Mazda in an anime title-card style. It uses sumi-ink black,
Soul Red and gold, a seigaiha wave pattern, rising-sun disks, slanted title ribbons, bold Japanese titles with
English subtitles, manga speech bubbles and hanko stamps. See [theme/kodo.css](theme/kodo.css).

## What's here

| | What it does |
|---|---|
| **[GT Dash 計器盤](apps/app.gtdash)** | Real coolant temperature and warm-up status (the car has no gauge), trip info, oil-change countdown |
| **[Knob Breakout ブロック崩し](apps/app.knobbrick)** | Brick breaker played by spinning the commander knob. Parked only. |
| **[Road Trip 旅の記録](apps/app.roadtrip)** | Colors in each US state you drive in, with a "NEW STATE!" banner, farthest-from-home and highest-point records |
| **[Kodo こどう](apps/app.carpet)** | A car pet whose mood follows how the car is treated: smooth driving, warm-ups, fuel, oil changes, weather. Levels up with miles. |
| **[Akari あかり](apps/app.companion)** | An anime chibi companion who gets madder the faster you drive: happy, pouty, puffed cheeks, shouting, then full meltdown with steam at 85+ mph. Pat her head while parked. |
| **[Startup greeting おはよう](greeting)** | A card at startup: good morning, holidays, your birthday, odometer milestones, cold-engine and oil reminders |
| **[Startup sound](docs/STARTUP_SOUND.md)** | A short chime (or your own MP3) with the greeting |

Guides:

- [Clean install checklist](docs/CLEAN_INSTALL_CHECKLIST.md): clean up and reinstall MZD-AIO tweaks (do this first)
- [Installing on the car](installer/README.md): one USB installs everything
- [Startup sound findings](docs/STARTUP_SOUND.md)
- [App ideas](docs/APP_IDEAS.md): what's possible on this hardware
- [Akari's art](docs/COMPANION_ART.md): swapping in PixelLab sprites, with prompts

## Try everything on a computer

Open `simulator/index.html` in a browser. Tabs at the top switch between apps and the startup greeting.

- Knob: `[` `]` or the mouse wheel to rotate, arrow keys to tilt, Enter to press (or the on-screen buttons)
- Sliders fake sensor values (speed, RPM, temperatures, fuel, odometer)
- 📍 buttons teleport the GPS for Road Trip
- Apps share saved data like on the car, so logging an oil change in GT Dash makes Kodo happy

## Status

Everything runs in the simulator and has automated checks: Road Trip state lookup passes 35 border-city tests
(`node tools/test-roadtrip-lookup.js`), and the installer was dry-run against a fake copy of the car's folders.
**None of it has run on the car yet.** Expect to calibrate a few sensor values (GT Dash's RAW mode, knob-left, shows them).

## Limits of the hardware

- Vehicle data updates about **once per second**: fine for temperatures, levels and GPS, too slow for shift lights.
- CASDK only sends data to the app on screen, so Kodo and Road Trip only track while they're open.
- The CMU's browser is Opera Presto (about 2012), so everything is plain ES5 JavaScript with simple CSS
  (no CSS variables or flexbox; `-o-` prefixes on transforms and gradients).
- Japanese text uses bundled fonts (Dela Gothic One and M PLUS Rounded 1c, both SIL Open Font License)
  trimmed to the ~200 characters the apps use, so nothing depends on fonts installed on the car.
  **After changing any Japanese text, re-run `node tools/build-theme.js`**, or new characters show as empty boxes.
- Games and petting lock while the car is moving.

## Rebuilding generated files

```
npm i us-atlas@3 topojson-client@3 topojson-simplify@3 d3-geo@3 lamejs@1.2.1 playwright
pip install fonttools
node tools/build-theme.js     # theme fonts (subset to the characters used), wave pattern, speed lines
python3 tools/check-theme-glyphs.py   # fails if any character used is missing from the fonts
node tools/build-states.js    # Road Trip state map data
node tools/make-chime.js      # default startup chime
node tools/make-companion-sprites.js   # Akari placeholder sprites (needs playwright)
sh tools/build-usb.sh         # assemble the USB installer in dist/usb
```
