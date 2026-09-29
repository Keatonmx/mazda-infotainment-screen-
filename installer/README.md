# Installing on the car

This installs GT Dash, Knob Breakout, Road Trip, Kodo, the startup greeting and the startup sound in one pass,
using the same USB method MZD-AIO-TI uses.

> **Not yet tested on a real car.** The installer was dry-run against a fake copy of the CMU's folders
> (install, reinstall, no-AIO-Tweaks fallback and uninstall all behave correctly), but the first real install
> is the real test. Keep your MZD-AIO-TI USB handy.

## Before you start

- Finish the [clean install checklist](../docs/CLEAN_INSTALL_CHECKLIST.md). The system should be stable first.
- In **MZD-AIO-TI**, install:
  - **CASDK** (the custom app framework). The apps need it.
  - **AIO Tweaks app** (recommended). It lets the greeting play the sound at the same moment the card appears.
    Without it, the installer plays the sound from the boot script instead, about 30 s after startup.

## Build the USB

1. On a computer, run `sh tools/build-usb.sh`. This creates `dist/usb/`.
2. Format a USB stick as **FAT32** and copy everything in `dist/usb/` to the root of the stick.
3. From any USB stick that **MZD-AIO-TI** has built, copy these three files to the root of the same stick:
   - `jci-autoupdate`
   - `cmu_dataretrieval.up`
   - `dataRetrieval_config.txt`

   These tell the CMU to run `tweaks.sh`. They come from Mazda/AIO, so they aren't included in this repo.

The stick should look like this:

```
tweaks.sh
jci-autoupdate
cmu_dataretrieval.up
dataRetrieval_config.txt
apps/app.gtdash/ ...
apps/app.knobbrick/ ...
apps/app.roadtrip/ ...
apps/app.carpet/ ...
greeting/mzd-greeting.js
greeting/sounds/startup.mp3
```

## Choose what to install

Open `tweaks.sh` in a text editor. The options are at the top:

```
INSTALL_GTDASH=1
INSTALL_KNOBBRICK=1
INSTALL_ROADTRIP=1
INSTALL_KODO=1
INSTALL_GREETING=1
INSTALL_SOUND=1
UNINSTALL=0
```

Set any to `0` to skip it. To **remove everything**, set `UNINSTALL=1`.

Personalize the greeting by editing the top of `greeting/mzd-greeting.js`: your name, birthday (`MM-DD`),
and `metric` or `imperial`.

## Install

1. Start the car with the **engine running**.
2. Plug in the USB stick and accept the prompts.
3. Wait for "CUSTOM APPS INSTALLED". The system reboots on its own.
4. Remove the stick. A log is saved on it as `mzd-apps-install.log`.

## Where things go

| What | Installed to |
|---|---|
| Apps | `/tmp/mnt/resources/aio/mzd-casdk/apps/` (AIO's CASDK apps folder), listed in `apps.js` there |
| Greeting | `/jci/opera/opera_dir/userjs/mzd-greeting.js` (runs once when the interface loads) |
| Sound | `/tmp/mnt/resources/aio/sounds/startup.mp3` |
| Sound fallback (no AIO Tweaks app) | one line in `/jci/scripts/stage_wifi.sh`, tagged `mzd-greeting-sound` |

The installer only adds or removes its own entries in `apps.js`, matching the exact app names, so AIO's apps
(including AIO's own `app.breakout`) are left alone. It backs up `apps.js` to the USB stick before changing it.
