/**
 * Startup greeting for Mazda Connect
 *
 * Installed as an Opera "user JavaScript" (/jci/opera/opera_dir/userjs/), which the CMU runs once when
 * the interface loads at startup. Shows a short card over the home screen, then removes itself.
 * Optionally plays a startup sound through AIO's command server (needs the AIO Tweaks app).
 *
 * Reads car data from CASDK if installed, and saved data from GT Dash, Road Trip and Kodo.
 * Every data source is optional: with nothing installed it still says good morning.
 *
 * ES5 only (Opera Presto).
 */

var MZD_GREETING_CONFIG = {
    name: '',                       // e.g. 'Keaton' -> "Good morning, Keaton"
    birthday: '',                   // 'MM-DD', e.g. '07-14'
    units: 'imperial',              // or 'metric'
    showSeconds: 7,
    delaySeconds: 4,                // wait after the interface is ready
    sound: true,
    soundFile: '/tmp/mnt/resources/aio/sounds/startup.mp3',
    soundMaxSeconds: 6,             // hard stop, in case the file is long
    assets: '/tmp/mnt/resources/aio/mzd-greeting/'   // theme fonts + wave pattern (installed by tweaks.sh)
};

var MzdGreeting = (function() {

    var C = MZD_GREETING_CONFIG;

    /* ---------- data ---------- */

    function stored(appId) {
        try { return JSON.parse(localStorage.getItem(appId)) || {}; } catch (e) { return {}; }
    }

    function vehicle(id) {
        try {
            var v = window.CustomApplicationDataHandler.get(id).value;
            var n = parseFloat(v);
            return isNaN(n) ? undefined : n;
        } catch (e) {
            return undefined;
        }
    }

    function readData() {
        return {
            outsideC: vehicle('VDTCOut-CarTemperature'),
            coolantC: vehicle('PIDEngineCoolantTemperature'),
            odometerKm: vehicle('VDTCOdocount'),
            fuelPct: vehicle('VDTFuelGaugePosition'),
            gtdash: stored('app.gtdash'),
            roadtrip: stored('app.roadtrip'),
            kodo: stored('app.carpet')
        };
    }

    /* ---------- message ---------- */

    function pad(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function temp(c) {
        return C.units === 'metric' ? Math.round(c) + '°C' : Math.round(c * 9 / 5 + 32) + '°F';
    }

    function dist(km) {
        return C.units === 'metric' ? km : km * 0.621371;
    }

    function unit() {
        return C.units === 'metric' ? 'km' : 'mi';
    }

    function fmt(n) {
        return Math.round(n).toLocaleString();
    }

    function isPalindrome(n) {
        var s = String(n);
        return s.length > 2 && s === s.split('').reverse().join('');
    }

    // [Japanese, English]
    function title(now) {
        var md = pad(now.getMonth() + 1) + '-' + pad(now.getDate());
        var who = C.name ? ', ' + C.name : '';
        if (C.birthday && md === C.birthday) return ['お誕生日おめでとう！', 'Happy birthday' + who + '!'];
        if (md === '01-01') return ['あけましておめでとう！', 'Happy New Year' + who + '!'];
        if (md === '07-04') return ['独立記念日！', 'Happy 4th of July' + who + '!'];
        if (md === '10-31') return ['ハッピーハロウィン！', 'Happy Halloween' + who + '!'];
        if (md === '12-25') return ['メリークリスマス！', 'Merry Christmas' + who + '!'];
        var h = now.getHours();
        if (h >= 5 && h < 12) return ['おはよう！', 'Good morning' + who];
        if (h >= 12 && h < 17) return ['こんにちは！', 'Good afternoon' + who];
        if (h >= 17 && h < 22) return ['こんばんは！', 'Good evening' + who];
        return ['夜のドライブ？', 'Late night drive' + who + '?'];
    }

    // odometer moments within the next 50 (or just passed, within 20)
    function odometerLine(km) {
        if (km === undefined) return null;
        var now = Math.floor(dist(km)), u = unit();
        var nextRound = Math.ceil((now + 1) / 10000) * 10000;
        var lastRound = Math.floor(now / 10000) * 10000;
        if (now - lastRound <= 20 && lastRound > 0) return 'Happy ' + fmt(lastRound) + ' ' + u + '!';
        if (nextRound - now <= 50) return fmt(nextRound) + ' ' + u + ' is only ' + (nextRound - now) + ' ' + u + ' away!';
        for (var i = 1; i <= 50; i++) {
            if (isPalindrome(now + i)) return 'Odometer hits ' + fmt(now + i) + ' in ' + i + ' ' + u + '. Watch it!';
        }
        return null;
    }

    function oilLine(d) {
        var g = d.gtdash;
        if (g.oilOdo === undefined || d.odometerKm === undefined) return null;
        var left = Math.round((g.oilInterval || 5000) - dist(d.odometerKm - g.oilOdo));
        if (left < 0) return 'Oil change overdue by ' + fmt(-left) + ' ' + unit();
        if (left <= 300) return 'Oil change due in ' + fmt(left) + ' ' + unit();
        return null;
    }

    function build(now, d) {
        var lines = [];
        function add(line) { if (line && lines.length < 2) lines.push(line); }

        var saidTemp = false;
        add(odometerLine(d.odometerKm));
        if (d.outsideC !== undefined && d.outsideC <= 0) {
            add(temp(d.outsideC) + ' out. Engine\'s cold, take it easy for a few minutes.');
            saidTemp = true;
        } else if (d.coolantC !== undefined && d.coolantC < 40) {
            add('Engine\'s cold. Go easy until it warms up.');
        }
        add(oilLine(d));
        if (d.fuelPct !== undefined && d.fuelPct < 12) add('Low fuel: ' + Math.round(d.fuelPct) + '% left');
        var visited = 0;
        for (var k in (d.roadtrip.visited || {})) if (k !== 'DC') visited++;
        if (visited > 1) add(visited + ' states and counting. Where to today?');
        if (d.kodo.happiness !== undefined) add(d.kodo.happiness >= 55 ? 'Kodo missed you!' : 'Kodo could use a smooth drive today.');
        if (d.outsideC !== undefined && !saidTemp) add('It\'s ' + temp(d.outsideC) + ' outside.');
        if (!lines.length) add('Have a great drive.');

        return {title: title(now), lines: lines};
    }

    /* ---------- display ---------- */

    // styles are injected once; fonts and pattern come from C.assets
    function injectStyle() {
        if (document.getElementById('mzd-greeting-style')) return;
        var a = C.assets;
        var css =
            '@font-face{font-family:KodoDisplay;src:url(' + a + 'kodo-display.woff) format("woff"),url(' + a + 'kodo-display.ttf) format("truetype")}' +
            '@font-face{font-family:KodoRound;src:url(' + a + 'kodo-round.woff) format("woff"),url(' + a + 'kodo-round.ttf) format("truetype")}' +
            '#mzd-greeting{position:absolute;z-index:99999;left:70px;top:104px;width:660px;height:200px;' +
                'background:#0c0b10 url(' + a + 'seigaiha.png);border:2px solid #d4a857;color:#f4ede1;' +
                'font-family:KodoRound,sans-serif;overflow:hidden}' +
            '#mzd-greeting .gr-band{position:absolute;left:0;top:0;width:12px;height:200px;background:#c8102e}' +
            '#mzd-greeting .gr-sun{position:absolute;left:40px;top:36px;width:128px;height:128px;border-radius:64px;' +
                'background:#c8102e;text-align:center;font-family:KodoDisplay,sans-serif;font-size:56px;line-height:128px;color:#fff}' +
            '#mzd-greeting .gr-text{position:absolute;left:196px;top:28px;right:24px}' +
            '#mzd-greeting .gr-jp{font-family:KodoDisplay,sans-serif;font-size:36px;line-height:46px;color:#fff;white-space:nowrap}' +
            '#mzd-greeting .gr-en{font-family:KodoRound,sans-serif;font-size:20px;letter-spacing:1px;color:#d4a857;' +
                'margin:0 0 10px}' +
            '#mzd-greeting .gr-line{font-size:20px;line-height:28px;color:#f4ede1}' +
            '#mzd-greeting .gr-line.dim{color:#a39cad}' +
            '#mzd-greeting .gr-line{font-size:21px}';
        var style = document.createElement('style');
        style.id = 'mzd-greeting-style';
        style.appendChild(document.createTextNode(css));
        (document.head || document.body).appendChild(style);
    }

    function show(message) {
        injectStyle();
        var old = document.getElementById('mzd-greeting');
        if (old) old.parentNode.removeChild(old);

        var card = document.createElement('div');
        card.id = 'mzd-greeting';
        var html = '<div class="gr-band"></div><div class="gr-sun">魂</div><div class="gr-text">' +
            '<div class="gr-jp">' + message.title[0] + '</div><div class="gr-en">' + message.title[1] + '</div>';
        for (var i = 0; i < message.lines.length; i++) {
            html += '<div class="gr-line' + (i ? ' dim' : '') + '">' + message.lines[i] + '</div>';
        }
        card.innerHTML = html + '</div>';
        card.onclick = function() { remove(card); };
        document.body.appendChild(card);
        setTimeout(function() { remove(card); }, C.showSeconds * 1000);
    }

    function remove(card) {
        if (card.parentNode) card.parentNode.removeChild(card);
    }

    // AIO's websocket command server (port 9997) runs shell commands; it is started by the AIO Tweaks app
    function playSound() {
        if (!C.sound || !window.WebSocket) return;
        try {
            var f = C.soundFile;
            var cmd = '[ -f "' + f + '" ] && ( /usr/bin/gplay --audio-sink=alsasink "' + f + '" >/dev/null 2>&1 & ' +
                'sleep ' + C.soundMaxSeconds + '; killall -9 gplay ) &';
            var ws = new WebSocket('ws://127.0.0.1:9997/');
            ws.onopen = function() { ws.send(cmd); setTimeout(function() { ws.close(); }, 1000); };
            ws.onerror = function() {};
        } catch (e) {}
    }

    /* ---------- startup ---------- */

    function ready() {
        return document.body && window.framework && typeof window.framework.getCurrCtxtId === 'function';
    }

    function start() {
        var waited = 0;
        var poll = setInterval(function() {
            waited += 2;
            if (ready() || waited > 90) {
                clearInterval(poll);
                setTimeout(function() {
                    show(build(new Date(), readData()));
                    playSound();
                }, C.delaySeconds * 1000);
            }
        }, 2000);
    }

    return {build: build, show: show, readData: readData, start: start, playSound: playSound};
})();

// run once, only in the main interface window (not in the simulator preview)
if (window.top === window && !window.MZD_GREETING_PREVIEW && !window.__mzdGreetingStarted) {
    window.__mzdGreetingStarted = true;
    MzdGreeting.start();
}
