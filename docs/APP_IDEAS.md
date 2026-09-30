# Custom App Ideas for Mazda Connect

## What a custom app can do (CASDK)

Custom apps are small HTML/CSS/JavaScript pages that the Mazda Connect browser runs full-screen. They can:

- **Read vehicle data** (about once per second): speed, RPM, odometer, fuel gauge, average fuel economy,
  coolant/intake/outside temperature, battery state, GPS position/heading/altitude
- **Use the commander knob**: rotate, tilt up/down/left/right, press
- **Remember settings** between drives (browser storage)

They **can't** change car settings, control the Bose amp, read fast signals (like RPM for a shift light), or add CarPlay.

## Idea list

| # | Idea | Why it's useful | Status |
|---|---|---|---|
| 1 | **Coolant gauge + warm-up advisor** | The car has no temperature gauge. Tells you when it's OK to rev a cold engine. | ✅ Built (GT Dash, ENGINE page) |
| 2 | **Oil change countdown** | Tracks miles since the last change from the odometer. No app or sticker needed. | ✅ Built (GT Dash, SERVICE page) |
| 3 | **Trip glance page** | Fuel, economy, battery and outside temperature on one screen in large type | ✅ Built (GT Dash, TRIP page) |
| 4 | **Maintenance log** | Tire rotation, air filter and brake fluid, each with its own interval | Next: extends #2 |
| 5 | **Fuel-up log** | Log each fill-up with the knob to track real MPG and cost over time | Idea |
| 6 | **Tank range estimate** | Fuel % × your real average MPG = miles left | Idea: needs fuel calibration |
| 7 | **Minimal "Home" screen** | A single, fast, dark screen with clock, outside temperature and range, instead of the heavy stock home | Idea: the UI redesign step |
| 8 | **Health check page** | Shows the CMU's free memory and swap use, to see whether tweaks are slowing it down | Idea: needs a small shell helper |
| 9 | **Knob Breakout** | Brick breaker played with the knob, parked only | ✅ Built (`app.knobbrick`) |
| 10 | **Road Trip map** | Colors in each state you drive in; farthest and highest records | ✅ Built (`app.roadtrip`) |
| 11 | **Kodo car pet** | Pixel-art car spirit; mood follows smooth driving, warm-ups, fuel, oil changes | ✅ Built (`app.carpet`) |
| 12 | **Startup greeting + sound** | Greeting card at boot with milestones and reminders, plus a chime | ✅ Built (`greeting/`) |
| 14 | **Akari companion** | Anime chibi who gets madder the faster you go | ✅ Built (`app.companion`), placeholder art until PixelLab |
| 13 | **Car achievements** | Badges: palindrome odometer, Night Owl, Polar Bear, Road Warrior | Idea: greeting already announces odometer milestones |

## Suggested order

1. Do the [clean install checklist](CLEAN_INSTALL_CHECKLIST.md) and confirm the system is stable.
2. Install GT Dash and **calibrate** it with RAW mode (knob-left).
3. Build #4–#6 on top of the calibrated values.
4. Then try #7, a lightweight home screen, as the first step of the UI redesign.
