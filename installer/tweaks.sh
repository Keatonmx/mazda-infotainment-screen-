#!/bin/sh
# Mazda Connect custom apps installer (GT Dash, Knob Breakout, Road Trip, Kodo, Akari, startup greeting + sound)
#
# Runs on the CMU from a USB stick, the same way MZD-AIO-TI installs tweaks.
# Needs: firmware that accepts AIO tweaks, and AIO's CASDK framework already installed (for the apps).
# See installer/README.md for how to build the USB.
#
# Set each option to 1 (yes) or 0 (no). UNINSTALL=1 removes everything this script installed.

INSTALL_GTDASH=1
INSTALL_KNOBBRICK=1
INSTALL_ROADTRIP=1
INSTALL_KODO=1
INSTALL_COMPANION=1
INSTALL_GREETING=1
INSTALL_SOUND=1
UNINSTALL=0

# ---------------------------------------------------------------------------

MYDIR=$(dirname "$(readlink -f "$0")")
LOG="${MYDIR}/mzd-apps-install.log"
APP_DIR="/tmp/mnt/resources/aio/mzd-casdk/apps"
APPS_JS="${APP_DIR}/apps.js"
USERJS="/jci/opera/opera_dir/userjs"
SOUND_DIR="/tmp/mnt/resources/aio/sounds"
STAGE_WIFI="/jci/scripts/stage_wifi.sh"
SOUND_MARK="mzd-greeting-sound"

log_message()
{
  echo "$*" >> "${LOG}"
}

show_message()
{
  sleep 4
  killall -q jci-dialog
  /jci/tools/jci-dialog --info --title="MAZDA CUSTOM APPS" --text="$*" --no-cancel &
}

finish()
{
  sync
  show_message "$1\n\nREMOVE THE USB DRIVE.\nTHE SYSTEM WILL REBOOT NOW."
  log_message "=== done: $1"
  sleep 10
  killall -q jci-dialog
  reboot
  exit 0
}

# remove one app's entry from apps.js; matches the exact quoted id so similar names are untouched
remove_app_entry()
{
  [ -e "${APPS_JS}" ] && sed -i "/\"${1}\"/d" "${APPS_JS}"
}

install_app()
{
  if [ "${1}" -eq 1 ] && [ -d "${MYDIR}/apps/${2}" ]
  then
    rm -rf "${APP_DIR}/${2}"
    cp -a "${MYDIR}/apps/${2}" "${APP_DIR}/"
    remove_app_entry "${2}"
    echo "  \"${2}\"," >> "${APPS_JS}"
    log_message "installed ${2}"
  fi
}

uninstall_app()
{
  rm -rf "${APP_DIR}/${1}"
  remove_app_entry "${1}"
  log_message "removed ${1}"
}

# ---------------------------------------------------------------------------

echo "=== Mazda custom apps installer $(date) ===" > "${LOG}"

# disable the watchdog during the install and allow writes (same as MZD-AIO-TI)
echo 1 > /sys/class/gpio/Watchdog\ Disable/value
mount -o rw,remount /
mount -o rw,remount /tmp/mnt/resources/
mount -o rw,remount "${MYDIR}"

if [ "${UNINSTALL}" -eq 1 ]
then
  show_message "REMOVING CUSTOM APPS..."
  for APP in app.gtdash app.knobbrick app.roadtrip app.carpet app.companion
  do
    uninstall_app "${APP}"
  done
  rm -f "${USERJS}/mzd-greeting.js"
  rm -rf "${SOUND_DIR}"
  sed -i "/${SOUND_MARK}/d" "${STAGE_WIFI}"
  finish "CUSTOM APPS REMOVED"
fi

# ---- apps (need AIO + CASDK) ----
if [ "${INSTALL_GTDASH}${INSTALL_KNOBBRICK}${INSTALL_ROADTRIP}${INSTALL_KODO}${INSTALL_COMPANION}" != "00000" ]
then
  if [ ! -e /jci/casdk/casdk.aio ]
  then
    show_message "AIO CASDK FRAMEWORK IS NOT INSTALLED.\nINSTALL CASDK WITH MZD-AIO-TI FIRST.\n\nSKIPPING THE APPS."
    log_message "CASDK missing, apps skipped"
    sleep 10
  else
    show_message "INSTALLING CUSTOM APPS..."
    mkdir -p "${APP_DIR}"
    if [ -e "${APPS_JS}" ]
    then
      cp -a "${APPS_JS}" "${MYDIR}/apps.js.backup"
      sed -i '/];/d' "${APPS_JS}"
    else
      echo "var CustomApplications = [" > "${APPS_JS}"
    fi
    install_app "${INSTALL_GTDASH}" app.gtdash
    install_app "${INSTALL_KNOBBRICK}" app.knobbrick
    install_app "${INSTALL_ROADTRIP}" app.roadtrip
    install_app "${INSTALL_KODO}" app.carpet
    install_app "${INSTALL_COMPANION}" app.companion
    echo "];" >> "${APPS_JS}"
    chmod -R 777 "${APP_DIR}"
  fi
fi

# ---- startup greeting (Opera user JavaScript, runs once when the interface loads) ----
if [ "${INSTALL_GREETING}" -eq 1 ] && [ -e "${MYDIR}/greeting/mzd-greeting.js" ]
then
  show_message "INSTALLING STARTUP GREETING..."
  cp -a "${MYDIR}/greeting/mzd-greeting.js" "${USERJS}/"
  chmod 777 "${USERJS}/mzd-greeting.js"
  log_message "installed greeting"
fi

# ---- startup sound ----
if [ "${INSTALL_SOUND}" -eq 1 ] && [ -e "${MYDIR}/greeting/sounds/startup.mp3" ]
then
  mkdir -p "${SOUND_DIR}"
  cp -a "${MYDIR}/greeting/sounds/startup.mp3" "${SOUND_DIR}/"
  chmod -R 777 "${SOUND_DIR}"
  sed -i "/${SOUND_MARK}/d" "${STAGE_WIFI}"
  if [ -d /jci/gui/apps/_aiotweaks ] && [ "${INSTALL_GREETING}" -eq 1 ]
  then
    # the greeting plays the sound through AIO's command server, in sync with the card
    log_message "sound: played by greeting via AIO Tweaks websocket"
  else
    # no AIO Tweaks app: play it from the boot script instead, about when the home screen appears
    # one line, tagged with a comment, so uninstall can remove it with a plain sed delete
    echo "(sleep 30; /usr/bin/gplay --audio-sink=alsasink ${SOUND_DIR}/startup.mp3 >/dev/null 2>&1 & sleep 6; killall -9 gplay) & # ${SOUND_MARK}" >> "${STAGE_WIFI}"
    log_message "sound: added to ${STAGE_WIFI}"
  fi
fi

finish "CUSTOM APPS INSTALLED"
