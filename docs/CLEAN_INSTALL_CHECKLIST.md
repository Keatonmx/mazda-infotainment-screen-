# Mazda Connect Clean Tweak Reinstall — Checklist

For: 2016 Mazda 3 Grand Touring (Mazda Connect, Bose), currently running MZD-AIO tweaks.
Goal: remove years of tweak buildup, then reinstall a small, fast set of tweaks using a new USB stick.

> **Golden rules**
> - Engine **running** (not accessory mode) for every USB install. A power loss mid-install can brick the unit.
> - Never unplug the USB or turn off the car until the screen says it's done and the system reboots.
> - Do **not** install official Mazda firmware updates. They can remove the ability to use tweaks.

---

## Before you start (at home, on a computer)

- [ ] Write down your firmware version: **Settings → System → About → Version Information**
      Version: `______________`
- [ ] Download the latest **MZD-AIO-TI** from [mazdatweaks.com](https://mazdatweaks.com/)
- [ ] Format the new USB stick as **FAT32** (MBR). A stick of 32 GB or smaller is easiest.
- [ ] Keep the **old USB stick** somewhere safe. Don't wipe it yet.
- [ ] Optional: back up your phonebook/favorites and take photos of your audio/display settings.

---

## Part 1: Uninstall everything

- [ ] Open MZD-AIO-TI and set it to your firmware version.
- [ ] Choose **Uninstall** for **every** tweak you have installed, including:
  - [ ] Swap file
  - [ ] Custom apps / CASDK
  - [ ] Speedometer
  - [ ] Video player
  - [ ] Android Auto app (headunit)
  - [ ] Any themes/backgrounds
- [ ] Compile to the USB stick.
- [ ] In the car: start the **engine**, remove the old USB stick, and plug in the new one.
- [ ] Accept the install prompts on screen.
- [ ] Wait for it to finish and reboot. Don't touch anything.
- [ ] Remove the USB stick.

## Part 2: Factory reset

- [ ] **Settings → System → Factory Reset** (clears old data like large phonebooks and leftover settings)
- [ ] Let it reboot.
- [ ] Re-pair your phone. Turn **off** full contact sync, or sync favorites only.

## Part 3: Test it stock for 1–2 drives

- [ ] Drive with **no USB plugged in**.
- [ ] Note how it feels:
  - [ ] Fast and stable → the tweak buildup and old USB were the problem. Continue to Part 4.
  - [ ] Still black screens/reboots → possible worn internal storage. See "If problems continue" below.

## Part 4: Reinstall a minimal tweak set

- [ ] Reformat the USB stick (FAT32).
- [ ] In MZD-AIO-TI, select **only**:
  - [ ] **Swap file on USB** (gives the system extra memory; the USB must stay plugged in)
  - [ ] **Disable boot animation** (faster startup)
  - [ ] Small visual tweaks you actually want (background, audio source order, etc.)
- [ ] **Skip for now:** custom apps, video player, Android Auto app, speedometer.
- [ ] Compile → car → engine running → plug in → accept prompts → wait for reboot.
- [ ] Leave the USB stick **plugged in** permanently (it holds the swap file).

## Part 5: Add extras one at a time (optional)

Add one tweak, then drive for a few days before adding the next.
If it gets slow again, uninstall the last thing you added.

| Added | Date | Still fast? |
|---|---|---|
| | | |
| | | |
| | | |

---

## If problems continue

- **Selects things by itself?** That's ghost touch from a failing digitizer (~$30–60, DIY). Temporary fix: turn off touch and use the knob.
- **Black screens/reboots even when stock with no USB?** The CMU's internal storage is likely worn. Fix: used 2017–18 CMU (~$60–80 on eBay), then repeat this checklist on it.
- **Want CarPlay/Android Auto later?** USB hub kit (~$38–54) + official v70 firmware. Note: this removes tweaks.
