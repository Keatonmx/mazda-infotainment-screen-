/**
 * Draws the placeholder companion sprite sheet: apps/app.companion/sprites.png
 *
 *   npm i playwright   (uses the browser's canvas to draw and export the PNG)
 *   node tools/make-companion-sprites.js
 *
 * Layout matches what the app expects, so PixelLab art can replace it 1:1:
 *   6 rows    = anger levels 0 (calm) .. 5 (furious)
 *   3 columns = base, alternate (bob / flail), blink
 *   each cell = 48x48 pixels, exported at 5x (240x240) with no smoothing, so the CMU never has to scale it
 */

var path = require('path');
var fs = require('fs');
var playwright = require('playwright');

var CELL = 48, SCALE = 5, ROWS = 6, COLS = 3;

// runs inside the browser page
function draw(opts) {
    var CELL = opts.CELL, SCALE = opts.SCALE, ROWS = opts.ROWS, COLS = opts.COLS;
    var P = {
        line: '#2b1b2e', skin: '#ffdcc6', skinShade: '#f3b9a2', hair: '#3b2442', hairHi: '#6a4574',
        white: '#ffffff', red: '#c8102e', redShade: '#8f0b20', shirt: '#f4f4f4', blush: '#ff8fa3',
        angry: '#ff7a7a', vein: '#e0103a', steam: '#e9eef2', mouth: '#5a1020', tongue: '#ff6b81', shoe: '#3a2a3e'
    };

    var small = document.createElement('canvas');
    small.width = CELL * COLS;
    small.height = CELL * ROWS;
    var ctx = small.getContext('2d');

    var ox = 0, oy = 0;
    function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); }
    function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); }
    function ellipse(cx, cy, rx, ry, c) {
        for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) {
            if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) px(cx + x, cy + y, c);
        }
    }
    function pixels(list, c) { for (var i = 0; i < list.length; i += 2) px(list[i], list[i + 1], c); }

    // ---------- body parts ----------

    function hairBack(dy) {
        ellipse(24, 17 + dy, 15, 14, P.hair);
        ellipse(8, 25 + dy, 4, 9, P.hair);      // twin tails
        ellipse(40, 25 + dy, 4, 9, P.hair);
        rect(4, 20 + dy, 3, 2, P.red);           // hair ties
        rect(41, 20 + dy, 3, 2, P.red);
    }

    function face(dy, flush) {
        ellipse(24, 21 + dy, 11, 10, P.skin);
        ellipse(24, 29 + dy, 7, 2, P.skinShade);   // chin shading
        ellipse(24, 21 + dy, 11, 10, P.skin);      // redraw so only the edge shade remains
        rect(18, 30 + dy, 12, 1, P.skinShade);
        if (flush) {                                 // red face when angry
            ellipse(24, 24 + dy, 9, 5, P.angry);
        }
    }

    function bangs(dy) {
        ellipse(24, 10 + dy, 13, 6, P.hair);
        // jagged fringe
        pixels([13, 14, 14, 15, 15, 16, 18, 14, 19, 15, 23, 15, 24, 16, 25, 15, 29, 15, 30, 14, 33, 15, 34, 14], P.hair);
        for (var x = 13; x <= 35; x++) px(x, 13 + dy, P.hair);
        pixels([18, 8, 19, 8, 20, 7, 21, 7], P.hairHi);   // shine
        pixels([18, 8 + dy - 0, 19, 8 + dy, 20, 7 + dy, 21, 7 + dy], P.hairHi);
    }

    function body(dy, arms) {
        // jacket
        rect(15, 32 + dy, 18, 11, P.red);
        rect(15, 40 + dy, 18, 3, P.redShade);
        // collar / shirt
        pixels([22, 32, 23, 33, 24, 34, 25, 33, 26, 32], P.shirt);
        rect(23, 33 + dy, 3, 7, P.shirt);
        rect(24, 34 + dy, 1, 6, P.redShade);
        // legs + shoes
        rect(18, 43 + dy, 4, 3, P.skin);
        rect(26, 43 + dy, 4, 3, P.skin);
        rect(17, 46, 6, 2, P.shoe);
        rect(25, 46, 6, 2, P.shoe);
        // arms
        if (arms === 'down') {
            rect(12, 33 + dy, 3, 8, P.red);
            rect(33, 33 + dy, 3, 8, P.red);
            rect(12, 41 + dy, 3, 2, P.skin);
            rect(33, 41 + dy, 3, 2, P.skin);
        } else if (arms === 'fistsUp') {
            rect(11, 26 + dy, 3, 8, P.red);
            rect(34, 26 + dy, 3, 8, P.red);
            rect(10, 23 + dy, 5, 4, P.skin);
            rect(33, 23 + dy, 5, 4, P.skin);
        } else if (arms === 'fistsFlail') {
            rect(10, 29 + dy, 3, 6, P.red);
            rect(35, 25 + dy, 3, 8, P.red);
            rect(8, 27 + dy, 5, 4, P.skin);
            rect(34, 22 + dy, 5, 4, P.skin);
        } else if (arms === 'hips') {
            // bent arms, hands on hips
            rect(12, 33 + dy, 3, 3, P.red);
            rect(11, 35 + dy, 3, 3, P.red);
            rect(12, 38 + dy, 3, 2, P.skin);
            rect(33, 33 + dy, 3, 3, P.red);
            rect(34, 35 + dy, 3, 3, P.red);
            rect(33, 38 + dy, 3, 2, P.skin);
        }
    }

    // ---------- face features ----------

    function eyesOpen(dy, lid) {
        [18, 28].forEach(function(x) {
            rect(x, 19 + dy, 3, 5, P.line);
            px(x, 19 + dy, P.white);                  // sparkle
            px(x + 2, 22 + dy, '#7a5a8a');
            if (lid) rect(x - 1, 19 + dy, 5, lid, P.skin);
            if (lid) rect(x - 1, 19 + dy + lid, 5, 1, P.line);
        });
    }

    function eyesClosedHappy(dy) {        // ^ ^
        pixels([18, 21, 19, 20, 20, 21, 28, 21, 29, 20, 30, 21], P.line);
        pixels([17, 22, 21, 22, 27, 22, 31, 22], P.line);
    }

    function eyesBlink(dy) {
        rect(17, 22 + dy, 5, 1, P.line);
        rect(27, 22 + dy, 5, 1, P.line);
    }

    function eyesAngry(dy) {              // narrowed, with slanted brows
        rect(18, 21 + dy, 3, 3, P.line);
        rect(28, 21 + dy, 3, 3, P.line);
        pixels([16, 17, 17, 17, 18, 18, 19, 18, 20, 19, 21, 19], P.line);
        pixels([27, 19, 28, 19, 29, 18, 30, 18, 31, 17, 32, 17], P.line);
    }

    function eyesXX(dy) {                 // > <
        pixels([17, 19, 18, 20, 19, 21, 20, 22, 19, 23, 18, 24, 17, 25], P.line);
        pixels([31, 19, 30, 20, 29, 21, 28, 22, 29, 23, 30, 24, 31, 25], P.line);
    }

    function browsFurrowed(dy) {
        pixels([17, 16, 18, 16, 19, 17, 20, 17, 21, 18], P.line);
        pixels([27, 18, 28, 17, 29, 17, 30, 16, 31, 16], P.line);
    }

    function smile(dy) { pixels([22, 27, 23, 28, 24, 28, 25, 28, 26, 27], P.line); }
    function flatMouth(dy) { rect(22, 28 + dy, 5, 1, P.line); }
    function pout(dy) { pixels([23, 27, 24, 28, 23, 29, 25, 27, 25, 29], P.line); }   // "3" pout, sideways
    function shoutMouth(dy, wide) {
        var w = wide ? 7 : 5, x = 24 - Math.floor(w / 2);
        rect(x, 26 + dy, w, wide ? 5 : 4, P.mouth);
        rect(x + 1, 29 + dy + (wide ? 1 : 0), w - 2, 1, P.tongue);
        rect(x, 26 + dy, w, 1, P.line);
    }

    function blush(dy, big) {
        rect(15, 24 + dy, big ? 4 : 3, 2, P.blush);
        rect(big ? 29 : 30, 24 + dy, big ? 4 : 3, 2, P.blush);
    }

    function puffedCheeks(dy) {
        pixels([12, 22, 12, 23, 12, 24, 36, 22, 36, 23, 36, 24], P.skin);
        pixels([11, 23, 37, 23], P.line);
    }

    function vein(x, y) {                // 💢 anger mark
        pixels([x + 1, y, x + 3, y, x, y + 1, x + 1, y + 1, x + 3, y + 1, x + 4, y + 1,
            x, y + 3, x + 1, y + 3, x + 3, y + 3, x + 4, y + 3, x + 1, y + 4, x + 3, y + 4], P.vein);
    }

    function steam(alt) {
        var puffs = alt ? [[6, 8, 3], [3, 4, 2], [42, 7, 3], [45, 3, 2]] : [[5, 10, 2], [4, 5, 3], [43, 9, 2], [44, 4, 3]];
        puffs.forEach(function(p) { ellipse(p[0], p[1], p[2], p[2], P.steam); });
    }

    // ---------- frames ----------

    function character(level, col) {
        var alt = col === 1, blink = col === 2;
        var dy = (alt && level <= 3) ? 1 : 0;                   // gentle bob for calm levels
        var arms = level <= 1 ? 'down' : level === 2 ? 'down' : level === 3 ? 'hips' :
            level === 4 ? 'fistsUp' : (alt ? 'fistsFlail' : 'fistsUp');
        var shake = level === 5 && alt ? 1 : 0;
        ox += shake;

        hairBack(dy);
        body(dy, arms);
        face(dy, level >= 4);
        bangs(dy);

        if (level === 0) { blink ? eyesBlink(dy) : eyesOpen(dy); smile(dy); blush(dy); }
        if (level === 1) { eyesClosedHappy(dy); smile(dy); blush(dy, true); }
        if (level === 2) { blink ? eyesBlink(dy) : eyesOpen(dy, 2); flatMouth(dy); }
        if (level === 3) { blink ? eyesBlink(dy) : eyesOpen(dy, 1); browsFurrowed(dy); puffedCheeks(dy); pout(dy); blush(dy); }
        if (level === 4) { eyesAngry(dy); shoutMouth(dy, false); vein(34, 3); }
        if (level === 5) { eyesXX(dy); shoutMouth(dy, true); vein(34, 2); vein(9, 5); steam(alt); }

        ox -= shake;
    }

    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        ox = c * CELL; oy = r * CELL;
        character(r, c);
    }

    var big = document.createElement('canvas');
    big.width = small.width * SCALE;
    big.height = small.height * SCALE;
    var bctx = big.getContext('2d');
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(small, 0, 0, big.width, big.height);
    return big.toDataURL('image/png');
}

(async function() {
    var browser = await playwright.chromium.launch(process.env.CHROMIUM ? {executablePath: process.env.CHROMIUM} : {});
    var page = await browser.newPage();
    var dataUrl = await page.evaluate(draw, {CELL: CELL, SCALE: SCALE, ROWS: ROWS, COLS: COLS});
    await browser.close();
    var out = path.join(__dirname, '..', 'apps', 'app.companion', 'sprites.png');
    fs.mkdirSync(path.dirname(out), {recursive: true});
    fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('wrote ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
})();
