/**
 * Builds the shared 魂動 KODO theme assets into theme/:
 *   - kodo-display.woff/.ttf  (Dela Gothic One, subset)    titles, numbers, kanji labels
 *   - kodo-round.woff/.ttf    (M PLUS Rounded 1c ExtraBold, subset)   speech bubbles, body text
 *   - seigaiha.png            faint wave-pattern background tile
 *   - speedlines.png          anime speed-line overlay (800x416)
 *
 *   pip install fonttools          (for pyftsubset)
 *   npm i playwright               (draws the PNGs with the browser canvas)
 *   node tools/build-theme.js
 *
 * Fonts are subset to only the characters used in the apps and greeting, so a full Japanese font
 * (2-4 MB) becomes a few dozen KB. Re-run this after adding new Japanese text.
 * Both fonts are SIL Open Font License 1.1 (theme/OFL-*.txt).
 */

var fs = require('fs');
var path = require('path');
var https = require('https');
var execFileSync = require('child_process').execFileSync;

var ROOT = path.join(__dirname, '..');
var THEME = path.join(ROOT, 'theme');
var CACHE = path.join(__dirname, '.cache');

var FONTS = [
    {name: 'kodo-display', file: 'DelaGothicOne-Regular.ttf', url: 'ofl/delagothicone/DelaGothicOne-Regular.ttf'},
    {name: 'kodo-round', file: 'MPLUSRounded1c-ExtraBold.ttf', url: 'ofl/mplusrounded1c/MPLUSRounded1c-ExtraBold.ttf'}
];

function download(url, dest) {
    return new Promise(function(resolve, reject) {
        https.get(url, function(res) {
            if (res.statusCode !== 200) return reject(new Error(url + ' -> ' + res.statusCode));
            var out = fs.createWriteStream(dest);
            res.pipe(out);
            out.on('finish', function() { out.close(resolve); });
        }).on('error', reject);
    });
}

// every character the apps can show: printable ASCII plus anything non-ASCII in the sources
function usedCharacters() {
    var files = [path.join(ROOT, 'greeting', 'mzd-greeting.js'), path.join(THEME, 'kodo.css')];
    fs.readdirSync(path.join(ROOT, 'apps')).forEach(function(app) {
        ['app.js', 'app.css'].forEach(function(f) {
            var p = path.join(ROOT, 'apps', app, f);
            if (fs.existsSync(p)) files.push(p);
        });
    });
    var chars = {};
    for (var c = 0x20; c <= 0x7e; c++) chars[String.fromCharCode(c)] = true;
    '°•…—–·×♪♡★☆！？～、。「」『』・ー'.split('').forEach(function(ch) { chars[ch] = true; });
    files.forEach(function(f) {
        Array.from(fs.readFileSync(f, 'utf8')).forEach(function(ch) {
            if (ch.charCodeAt(0) > 0x7e && ch.trim()) chars[ch] = true;
        });
    });
    return Object.keys(chars).join('');
}

function subset(font, text) {
    var src = path.join(CACHE, font.file);
    var textFile = path.join(CACHE, 'chars.txt');
    fs.writeFileSync(textFile, text);
    ['woff', 'ttf'].forEach(function(ext) {
        var args = [src, '--text-file=' + textFile, '--output-file=' + path.join(THEME, font.name + '.' + ext),
            '--layout-features=*', '--no-hinting'];
        if (ext === 'woff') args.push('--flavor=woff');
        execFileSync('pyftsubset', args);
    });
}

function drawPatterns() {
    var playwright = require('playwright');
    return playwright.chromium.launch(process.env.CHROMIUM ? {executablePath: process.env.CHROMIUM} : {})
        .then(function(browser) {
            return browser.newPage().then(function(page) {
                return page.evaluate(function() {
                    // ---- seigaiha: overlapping rows of concentric half-circles, painted top to bottom ----
                    var r = 24, big = document.createElement('canvas');
                    big.width = r * 8; big.height = r * 8;
                    var g = big.getContext('2d');
                    g.fillStyle = '#0c0b10';
                    g.fillRect(0, 0, big.width, big.height);
                    for (var k = -2; k < 18; k++) {
                        var cy = k * r / 2;
                        for (var j = -1; j < 6; j++) {
                            var cx = j * 2 * r + (k % 2 ? r : 0);
                            for (var ring = 4; ring >= 1; ring--) {
                                g.beginPath();
                                g.arc(cx, cy, r * ring / 4, 0, Math.PI * 2);
                                g.fillStyle = '#0c0b10';
                                g.fill();
                                g.lineWidth = 1.2;
                                g.strokeStyle = ring % 2 ? 'rgba(200,16,46,0.13)' : 'rgba(212,168,87,0.07)';
                                g.stroke();
                            }
                        }
                    }
                    var tile = document.createElement('canvas');
                    tile.width = 2 * r; tile.height = r;
                    tile.getContext('2d').drawImage(big, 2 * r, 4 * r, 2 * r, r, 0, 0, 2 * r, r);

                    // ---- speed lines: thin wedges radiating from behind the character ----
                    var lines = document.createElement('canvas');
                    lines.width = 800; lines.height = 416;
                    var s = lines.getContext('2d'), seed = 7;
                    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
                    var ox = 232, oy = 224;   // Akari's sun center (apps/app.companion/app.css)
                    for (var i = 0; i < 90; i++) {
                        var a = rand() * Math.PI * 2, width = 0.004 + rand() * 0.012;
                        var start = 170 + rand() * 90, end = 700;
                        s.beginPath();
                        s.moveTo(ox + Math.cos(a) * start, oy + Math.sin(a) * start);
                        s.lineTo(ox + Math.cos(a - width) * end, oy + Math.sin(a - width) * end);
                        s.lineTo(ox + Math.cos(a + width) * end, oy + Math.sin(a + width) * end);
                        s.closePath();
                        s.fillStyle = 'rgba(255,255,255,' + (0.10 + rand() * 0.18).toFixed(2) + ')';
                        s.fill();
                    }
                    return {seigaiha: tile.toDataURL('image/png'), speedlines: lines.toDataURL('image/png')};
                });
            }).then(function(images) {
                return browser.close().then(function() { return images; });
            });
        });
}

(async function() {
    fs.mkdirSync(CACHE, {recursive: true});
    for (var i = 0; i < FONTS.length; i++) {
        var f = FONTS[i], dest = path.join(CACHE, f.file);
        if (!fs.existsSync(dest)) {
            console.log('downloading ' + f.file);
            await download('https://raw.githubusercontent.com/google/fonts/main/' + f.url, dest);
        }
    }

    var text = usedCharacters();
    FONTS.forEach(function(f) { subset(f, text); });

    var images = await drawPatterns();
    Object.keys(images).forEach(function(name) {
        fs.writeFileSync(path.join(THEME, name + '.png'), Buffer.from(images[name].split(',')[1], 'base64'));
    });

    fs.readdirSync(THEME).filter(function(n) { return !/\.(css|txt)$/.test(n); }).forEach(function(n) {
        console.log(n + '  ' + Math.round(fs.statSync(path.join(THEME, n)).size / 1024) + ' KB');
    });
    console.log(Array.from(text).length + ' characters');
})();
