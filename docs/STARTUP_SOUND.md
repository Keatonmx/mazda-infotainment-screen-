# Startup sound: findings

**Short answer:** very likely possible, and it's built. It hasn't been heard in a real car yet.
Mazda Connect has no startup sound setting, and I found no existing tweak that adds one, so this is new.

## What the research found

From the MZD-AIO-TI source code (github.com/Trevelopment/MZD-AIO):

| Finding | Where | What it means |
|---|---|---|
| AIO's video player plays audio with `/usr/bin/gplay --audio-sink=alsasink <file>` | `videoplayer-v3.js` | The CMU has a working command-line media player, and its sound reaches the speakers |
| The video player's music mode plays `.mp3`, `.ogg`, `.flac`, `.mp4` | `videoplayer-v3.js` | MP3 is a proven format, so the chime is an MP3 |
| The AIO Tweaks app runs a command server on `ws://127.0.0.1:9997` | `mzd.js`, `27_aioapp-i.txt` | Interface code (like the greeting) can start `gplay` |
| `/jci/scripts/stage_wifi.sh` runs at every boot; AIO adds its own startup lines there | `27_aioapp-i.txt` | A second, simpler way to play a sound at boot |
| Files in `/jci/opera/opera_dir/userjs/` run when the interface loads | `27_aioapp-i.txt` (`aio.js`) | How the greeting runs at startup |
| Auto-opening an app at boot "works in the emulator but not in the car" | `AIO-startup.js` comment | Why the greeting is an overlay, not an app |
| The video player "just mutes the player" and doesn't switch the audio source (TODO) | `videoplayer-v3.js` | The sound probably plays **on top of** the radio or Bluetooth instead of pausing it |

## How it works here

1. The greeting card appears about 4 s after the interface is ready.
2. At the same moment, it asks AIO's command server to run
   `gplay --audio-sink=alsasink /tmp/mnt/resources/aio/sounds/startup.mp3`, then force-stops it after 6 s.
3. If the AIO Tweaks app isn't installed, the installer adds a single line to `stage_wifi.sh` that plays the
   file about 30 s after boot instead.

## Unknowns to check on the first test

- **Volume:** `alsasink` may bypass the volume knob. The included chime is deliberately quiet (peak -18 dB).
  Test with the stereo volume low, and make your own sounds quiet too.
- **Mixing:** expect it to play over whatever audio source is on.
- **Timing (fallback only):** `stage_wifi.sh` may run earlier or later than the home screen appears.
  Change `sleep 30` in the line it adds if needed.

## Using your own sound

- Use an **MP3**, **2–5 seconds** long, and quiet: normalize to about -18 dB peak in Audacity or similar.
- Replace `greeting/sounds/startup.mp3` before building the USB (same file name).
- To regenerate the default chime: `node tools/make-chime.js` (needs `npm i lamejs@1.2.1`).
- To turn the sound off later: set `sound: false` in `mzd-greeting.js`, or reinstall with `INSTALL_SOUND=0`.
