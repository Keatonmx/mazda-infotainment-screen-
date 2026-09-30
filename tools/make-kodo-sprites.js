/**
 * Draws Kodo's placeholder sprite sheet: apps/app.carpet/sprites.png
 *
 *   npm i playwright
 *   node tools/make-kodo-sprites.js
 *
 * Kodo is the car's tsukumogami (an object that gains a soul): a round Soul Red spirit with a hitodama
 * flame on top, a hachimaki headband and little tires for feet.
 *
 * Same format as Akari, so PixelLab art can replace it 1:1 (see tools/pixellab/):
 *   rows    = moods, in KODO_ROWS order below
 *   columns = base, alternate (bob + flame flicker), blink
 *   cells   = 48x48 pixels exported at 5x (240x240), no smoothing
 */

var path = require('path');
var fs = require('fs');
var playwright = require('playwright');

var ROWS = ['happy', 'ecstatic', 'meh', 'grumpy', 'sick', 'hungry', 'shock', 'sleepy', 'cold', 'hot', 'petted'];

function draw(opts) {
    var CELL = 48, SCALE = 5, ROWS = opts.rows, COLS = 3;
    var P = {
        line: '#2b1b2e', red: '#c8102e', redDark: '#8f0b20', redLight: '#e2253f', belly: '#ec6a7e',
        sickRed: '#9a5a68', sickBelly: '#b88590', white: '#f4ede1', eye: '#2b1b2e', blush: '#ff8fa3',
        flame: '#ffb020', flameCore: '#fff1b8', flameBlue: '#8ab4ff', tire: '#26222e', hub: '#8c8696',
        scarf: '#5b8def', scarfDark: '#3d6cc4', drop: '#7fd3ff', green: '#9be08a', vein: '#e0103a',
        heart: '#ff4d6d', zzz: '#8ab4ff', mouth: '#5a1020', tongue: '#ff6b81'
    };

    var small = document.createElement('canvas');
    small.width = CELL * COLS;
    small.height = CELL * ROWS.length;
    var ctx = small.getContext('2d');
    var ox = 0, oy = 0;

    function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); }
    function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); }
    function ellipse(cx, cy, rx, ry, c) {
        for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) {
            if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) px(cx + x, cy + y, c);
        }
    }
    function pixels(list, c, dy) {
        for (var i = 0; i < list.length; i += 2) px(list[i], list[i + 1] + (dy || 0), c);
    }

    // hitodama flame on top of the head; flickers between frames
    function flame(dy, alt, blue) {
        var outer = blue ? P.flameBlue : P.flame;
        ellipse(24, 10 + dy, 4, 4, outer);
        pixels(alt ? [23, 4, 24, 3, 24, 4, 25, 5, 22, 5] : [24, 3, 25, 4, 24, 4, 23, 5, 26, 5], outer, dy);
        ellipse(24, 11 + dy, 2, 2, P.flameCore);
    }

    function tires(dy) {
        [16, 32].forEach(function(x) {
            ellipse(x, 41, 4, 4, P.tire);
            ellipse(x, 41, 1, 1, P.hub);
        });
    }

    function body(dy, sick) {
        ellipse(24, 27 + dy, 16, 14, P.line);                       // outline
        ellipse(24, 27 + dy, 15, 13, sick ? P.sickRed : P.red);
        ellipse(20, 20 + dy, 5, 3, sick ? P.sickRed : P.redLight);  // shine
        ellipse(24, 33 + dy, 8, 5, sick ? P.sickBelly : P.belly);
        rect(10, 37 + dy, 28, 1, P.redDark);
    }

    function hachimaki(dy) {
        rect(9, 17 + dy, 30, 3, P.white);
        ellipse(24, 18 + dy, 1, 1, P.red);
        pixels([39, 17, 40, 16, 41, 16, 42, 15, 39, 19, 40, 20, 41, 20, 42, 21], P.white, dy);   // tails
    }

    // ---------- faces ----------
    function eyesOpen(dy, lid) {
        [18, 28].forEach(function(x) {
            rect(x, 23 + dy, 3, 4, P.eye);
            px(x, 23 + dy, P.white);
            if (lid) rect(x - 1, 23 + dy, 5, lid, P.red);
        });
    }
    function eyesHappy(dy) { pixels([17, 25, 18, 24, 19, 24, 20, 25, 27, 25, 28, 24, 29, 24, 30, 25], P.eye, dy); }
    function eyesClosed(dy) { rect(17, 25 + dy, 4, 1, P.eye); rect(27, 25 + dy, 4, 1, P.eye); }
    function eyesSpiral(dy) {   // dizzy/shocked: wide white eyes with small pupils
        [18, 28].forEach(function(x) { ellipse(x + 1, 25 + dy, 2, 2, P.white); px(x + 1, 25 + dy, P.eye); });
    }
    function eyesSad(dy) {
        eyesOpen(dy);
        pixels([16, 22, 17, 21, 31, 21, 32, 22], P.eye, dy);   // worried brows
    }
    function eyesAngry(dy) {
        rect(18, 24 + dy, 3, 3, P.eye); rect(28, 24 + dy, 3, 3, P.eye);
        pixels([16, 21, 17, 22, 18, 22, 19, 23, 32, 21, 31, 22, 30, 22, 29, 23], P.eye, dy);
    }

    function smile(dy) { pixels([22, 30, 23, 31, 24, 31, 25, 31, 26, 30], P.eye, dy); }
    function grin(dy) { rect(21, 30 + dy, 7, 3, P.mouth); rect(22, 32 + dy, 5, 1, P.tongue); rect(21, 30 + dy, 7, 1, P.eye); }
    function flat(dy) { rect(22, 31 + dy, 5, 1, P.eye); }
    function frown(dy) { pixels([22, 32, 23, 31, 24, 31, 25, 31, 26, 32], P.eye, dy); }
    function ohMouth(dy) { ellipse(24, 31 + dy, 2, 2, P.mouth); }
    function wavy(dy) { pixels([21, 31, 22, 30, 23, 31, 24, 30, 25, 31, 26, 30, 27, 31], P.eye, dy); }
    function blush(dy) { rect(14, 28 + dy, 3, 2, P.blush); rect(32, 28 + dy, 3, 2, P.blush); }

    // ---------- extras ----------
    function scarf(dy) {
        rect(10, 34 + dy, 28, 4, P.scarf);
        rect(30, 37 + dy, 4, 6, P.scarfDark);
    }
    function sweat(dy, color) { pixels([36, 20, 36, 21, 35, 22, 36, 22, 37, 22, 36, 23], color, dy); }
    function vein(x, y) {
        pixels([x + 1, y, x + 3, y, x, y + 1, x + 1, y + 1, x + 3, y + 1, x + 4, y + 1,
            x, y + 3, x + 1, y + 3, x + 3, y + 3, x + 4, y + 3, x + 1, y + 4, x + 3, y + 4], P.vein);
    }
    function zzz(alt) {
        var y = alt ? 5 : 7;
        pixels([36, y, 37, y, 38, y, 37, y + 1, 36, y + 2, 37, y + 2, 38, y + 2], P.zzz);
        pixels([41, y - 4, 42, y - 4, 42, y - 3, 41, y - 2, 42, y - 2], P.zzz);
    }
    function heart(alt) {
        var y = alt ? 2 : 4;
        pixels([33, y, 34, y, 36, y, 37, y, 32, y + 1, 33, y + 1, 34, y + 1, 35, y + 1, 36, y + 1, 37, y + 1, 38, y + 1,
            33, y + 2, 34, y + 2, 35, y + 2, 36, y + 2, 37, y + 2, 34, y + 3, 35, y + 3, 36, y + 3, 35, y + 4], P.heart);
    }
    function exclaim() { rect(37, 5, 2, 6, P.vein); rect(37, 12, 2, 2, P.vein); }
    function drool(dy) { pixels([26, 32, 26, 33, 26, 34], P.drop, dy); }

    function spirit(mood, col) {
        var alt = col === 1, blink = col === 2, dy = alt ? 1 : 0;
        var sick = mood === 'sick';

        tires(dy);
        body(dy, sick);
        flame(dy, alt, mood === 'cold' || mood === 'sleepy');
        hachimaki(dy);

        var closed = blink && ['happy', 'meh', 'grumpy', 'sick', 'hungry', 'cold', 'hot'].indexOf(mood) >= 0;
        if (closed) eyesClosed(dy);

        if (mood === 'happy')    { if (!closed) eyesOpen(dy); smile(dy); blush(dy); }
        if (mood === 'ecstatic') { eyesHappy(dy); grin(dy); blush(dy); }
        if (mood === 'meh')      { if (!closed) eyesOpen(dy, 2); flat(dy); }
        if (mood === 'grumpy')   { if (!closed) eyesAngry(dy); frown(dy); vein(33, 12); }
        if (mood === 'sick')     { if (!closed) eyesSad(dy); wavy(dy); sweat(dy, P.green); }
        if (mood === 'hungry')   { if (!closed) eyesSad(dy); ohMouth(dy); drool(dy); }
        if (mood === 'shock')    { eyesSpiral(dy); ohMouth(dy); exclaim(); }
        if (mood === 'sleepy')   { eyesClosed(dy); flat(dy); zzz(alt); }
        if (mood === 'cold')     { if (!closed) eyesOpen(dy, 1); wavy(dy); scarf(dy); }
        if (mood === 'hot')      { if (!closed) eyesOpen(dy, 2); ohMouth(dy); sweat(dy, P.drop); }
        if (mood === 'petted')   { eyesHappy(dy); smile(dy); blush(dy); heart(alt); }
    }

    for (var r = 0; r < ROWS.length; r++) for (var c = 0; c < COLS; c++) {
        ox = c * CELL; oy = r * CELL;
        spirit(ROWS[r], c);
    }

    var big = document.createElement('canvas');
    big.width = small.width * SCALE;
    big.height = small.height * SCALE;
    var b = big.getContext('2d');
    b.imageSmoothingEnabled = false;
    b.drawImage(small, 0, 0, big.width, big.height);
    return big.toDataURL('image/png');
}

(async function() {
    var browser = await playwright.chromium.launch(process.env.CHROMIUM ? {executablePath: process.env.CHROMIUM} : {});
    var page = await browser.newPage();
    var dataUrl = await page.evaluate(draw, {rows: ROWS});
    await browser.close();
    var out = path.join(__dirname, '..', 'apps', 'app.carpet', 'sprites.png');
    fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('wrote ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB), rows: ' + ROWS.join(', '));
})();
