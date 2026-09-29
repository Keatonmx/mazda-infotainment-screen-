# Mazda Connect Custom Apps

Custom apps and guides for a 2016 Mazda 3 Grand Touring (Mazda Connect, 7" screen, commander knob, Bose).

| Path | What it is |
|---|---|
| [`docs/CLEAN_INSTALL_CHECKLIST.md`](docs/CLEAN_INSTALL_CHECKLIST.md) | Step-by-step checklist to clean up and reinstall MZD-AIO tweaks |
| [`docs/APP_IDEAS.md`](docs/APP_IDEAS.md) | What custom apps can and can't do on this hardware, and the idea list |
| [`apps/app.gtdash/`](apps/app.gtdash) | **GT Dash**: coolant temp and warm-up, trip info, oil-change countdown |
| [`simulator/`](simulator) | Run apps in a desktop browser at 800×480 with a virtual knob |

## GT Dash

The Mazda 3 has no coolant temperature gauge, only a blue "cold" light. GT Dash shows the real temperature and tells you when the engine is warm enough to rev, which is handy with a manual.

- **ENGINE:** big coolant temperature, warm-up bar (blue → amber → green), intake and outside temperatures
- **TRIP:** fuel level, average economy, battery, outside temperature
- **SERVICE:** miles until the next oil change, based on the odometer. Press the knob twice to log a change. Knob up/down sets the interval.

Knob: **rotate** to switch pages, **left** to show raw values (for calibration).

### Try it on a computer

Open `simulator/index.html` in a browser. Use the sliders to change fake sensor values, and `[` `]`, arrow keys and Enter (or the on-screen buttons) to act as the knob.

### Install on the car (not yet tested on a real car)

GT Dash is a [CASDK](https://github.com/flyandi/mazda-custom-application-sdk) app. CASDK is the custom-app framework that MZD-AIO-TI can install.

1. Finish the clean install checklist first, and make sure the system is stable.
2. In MZD-AIO-TI, enable **CASDK**. Then add the `app.gtdash` folder to the CASDK apps folder, and add `"app.gtdash"` to the app list (`apps.js`). The exact folder depends on your AIO version: check AIO's CASDK tab.
3. Open **GT Dash** from the Applications menu.
4. **Calibrate:** press knob-left for RAW mode and compare the numbers with reality. For example, a warm engine should read about 90 (°C). If a value is off, adjust `calibration` at the top of `app.js`. The raw scaling of coolant temperature, fuel level, economy and odometer isn't documented, so this step matters.

### Limits

- Vehicle data updates about **once per second**, so the dashboard is good for temperatures and levels, and too slow for things like shift lights or 0–60 timing.
- The CMU's browser is old, so apps must be **plain ES5 JavaScript** with simple CSS, and no frameworks.
- Keep apps light. Every app that stays open uses the same limited memory that made the system slow.
