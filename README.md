# Mazda Connect Custom Apps

Custom apps and guides for a 2016 Mazda 3 Grand Touring (Mazda Connect, 7" screen, commander knob, Bose).

## What's here

| | What it does |
|---|---|
| **[GT Dash](apps/app.gtdash)** | Real coolant temperature and warm-up status (the car has no gauge), trip info, oil-change countdown |
| **[Knob Breakout](apps/app.knobbrick)** | Brick breaker played by spinning the commander knob. Parked only. |
| **[Road Trip](apps/app.roadtrip)** | Colors in each US state you drive in, with a "NEW STATE!" banner, farthest-from-home and highest-point records |
| **[Kodo](apps/app.carpet)** | A car pet whose mood follows how the car is treated: smooth driving, warm-ups, fuel, oil changes, weather. Levels up with miles. |
| **[Startup greeting](greeting)** | A card at startup: good morning, holidays, your birthday, odometer milestones, cold-engine and oil reminders |
| **[Startup sound](docs/STARTUP_SOUND.md)** | A short chime (or your own MP3) with the greeting |

Guides:

- [Clean install checklist](docs/CLEAN_INSTALL_CHECKLIST.md): clean up and reinstall MZD-AIO tweaks (do this first)
- [Installing on the car](installer/README.md): one USB installs everything
- [Startup sound findings](docs/STARTUP_SOUND.md)
- [App ideas](docs/APP_IDEAS.md): what's possible on this hardware

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
- The CMU's browser is Opera Presto (about 2012), so everything is plain ES5 JavaScript with simple CSS.
- Games and petting lock while the car is moving.

## Rebuilding generated files

```
npm i us-atlas@3 topojson-client@3 topojson-simplify@3 d3-geo@3 lamejs@1.2.1
node tools/build-states.js    # Road Trip state map data
node tools/make-chime.js      # default startup chime
sh tools/build-usb.sh         # assemble the USB installer in dist/usb
```
