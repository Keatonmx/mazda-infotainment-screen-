#!/bin/sh
# Assembles dist/usb/: copy its contents to the root of a FAT32 USB stick, then add the
# three trigger files from any USB built by MZD-AIO-TI (see installer/README.md).
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="${ROOT}/dist/usb"
rm -rf "${OUT}"
mkdir -p "${OUT}/apps" "${OUT}/greeting/sounds"
cp "${ROOT}/installer/tweaks.sh" "${OUT}/"
for APP in app.gtdash app.knobbrick app.roadtrip app.carpet app.companion; do
  cp -R "${ROOT}/apps/${APP}" "${OUT}/apps/"
done
cp "${ROOT}/greeting/mzd-greeting.js" "${OUT}/greeting/"
cp "${ROOT}/greeting/sounds/startup.mp3" "${OUT}/greeting/sounds/"
echo "Built ${OUT}"
echo "Now add from an MZD-AIO-TI USB: jci-autoupdate, cmu_dataretrieval.up, dataRetrieval_config.txt"
