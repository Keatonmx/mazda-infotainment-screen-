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
  mkdir -p "${OUT}/apps/${APP}/theme"
  cp "${ROOT}"/theme/kodo.css "${ROOT}"/theme/*.woff "${ROOT}"/theme/*.ttf "${ROOT}"/theme/*.png "${OUT}/apps/${APP}/theme/"
done
cp "${ROOT}/greeting/mzd-greeting.js" "${OUT}/greeting/"
mkdir -p "${OUT}/greeting/theme"
cp "${ROOT}"/theme/*.woff "${ROOT}"/theme/*.ttf "${ROOT}"/theme/seigaiha.png "${OUT}/greeting/theme/"
cp "${ROOT}/greeting/sounds/startup.mp3" "${OUT}/greeting/sounds/"
echo "Built ${OUT}"
echo "Now add from an MZD-AIO-TI USB: jci-autoupdate, cmu_dataretrieval.up, dataRetrieval_config.txt"
