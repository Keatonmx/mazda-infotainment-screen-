/**
 * Generates Akari's and Kodo's sprite sheets with PixelLab (https://www.pixellab.ai) and writes them
 * straight into the apps, in the layout they already use.
 *
 *   export PIXELLAB_API_KEY=...            (from pixellab.ai/account; never commit it)
 *   NODE_USE_ENV_PROXY=1 node tools/pixellab/generate.js            # both characters
 *   NODE_USE_ENV_PROXY=1 node tools/pixellab/generate.js --only kodo
 *   node tools/pixellab/generate.js --dry-run                         # print the plan, no API calls
 *   node tools/pixellab/generate.js --mock                            # offline test using the current sheets
 *
 * NODE_USE_ENV_PROXY=1 makes Node's fetch use HTTPS_PROXY (needed in Claude Code cloud sessions).
 * Needs playwright (npm i playwright) to scale and assemble the PNGs. CHROMIUM=/path overrides the browser.
 *
 * Per character (tools/pixellab/assets.json):
 *   1. one base image with /generate-image-pixflux
 *   2. each mood row with /generate-image-bitforge, using the base as style and starting image,
 *      so every expression stays the same character
 *   3. a blink frame per row (bitforge again, starting from that row's frame)
 *   4. the "alternate" frame is the row frame nudged down 1 pixel (a gentle bob), made locally
 * Raw 48x48 frames are kept in tools/pixellab/out/<character>/ for review. The sheet is scaled 5x with
 * no smoothing and saved as apps/<app>/sprites.png. Rerun with --seed N for a different take.
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..', '..');
var API = 'https://api.pixellab.ai/v1';
var manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets.json'), 'utf8'));

var args = process.argv.slice(2);
var DRY = args.indexOf('--dry-run') >= 0;
var MOCK = args.indexOf('--mock') >= 0;
var only = args.indexOf('--only') >= 0 ? args[args.indexOf('--only') + 1] : null;
var seed = args.indexOf('--seed') >= 0 ? parseInt(args[args.indexOf('--seed') + 1], 10) : 1;
var spent = 0;
var browser, page;

function b64Image(base64) {
    return {type: 'base64', base64: base64, format: 'png'};
}

async function call(endpoint, body, mockImage) {
    if (DRY) {
        console.log('  POST ' + endpoint + '  ' + JSON.stringify(body, function(k, v) {
            return v && v.type === 'base64' ? '<image>' : v;
        }).slice(0, 220));
        return mockImage;
    }
    if (MOCK) return mockImage;

    for (var attempt = 1; attempt <= 4; attempt++) {
        var res = await fetch(API + endpoint, {
            method: 'POST',
            headers: {'Authorization': 'Bearer ' + process.env.PIXELLAB_API_KEY, 'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        if (res.status === 429 || res.status >= 500) {
            console.log('  ' + res.status + ', retrying in ' + (attempt * 5) + ' s');
            await new Promise(function(r) { setTimeout(r, attempt * 5000); });
            continue;
        }
        if (!res.ok) throw new Error(endpoint + ' -> ' + res.status + ' ' + (await res.text()).slice(0, 300));
        var json = await res.json();
        if (json.usage && json.usage.usd) spent += json.usage.usd;
        return json.image.base64;
    }
    throw new Error(endpoint + ' kept failing');
}

// ---------- image helpers (run in the browser page) ----------

async function crop48(sheetB64, row, col, cell, size) {   // mock source: a cell of the current sheet, scaled back down
    return page.evaluate(async function(o) {
        var img = new Image();
        img.src = 'data:image/png;base64,' + o.sheet;
        await img.decode();
        var c = document.createElement('canvas');
        c.width = o.size; c.height = o.size;
        var g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(img, o.col * o.cell, o.row * o.cell, o.cell, o.cell, 0, 0, o.size, o.size);
        return c.toDataURL('image/png').split(',')[1];
    }, {sheet: sheetB64, row: row, col: col, cell: cell, size: size});
}

async function shiftDown(b64, size) {
    return page.evaluate(async function(o) {
        var img = new Image();
        img.src = 'data:image/png;base64,' + o.b64;
        await img.decode();
        var c = document.createElement('canvas');
        c.width = o.size; c.height = o.size;
        c.getContext('2d').drawImage(img, 0, 1);
        return c.toDataURL('image/png').split(',')[1];
    }, {b64: b64, size: size});
}

async function assemble(frames, size, scale) {    // frames[row][col] -> one scaled sheet
    return page.evaluate(async function(o) {
        var cell = o.size * o.scale;
        var c = document.createElement('canvas');
        c.width = cell * 3; c.height = cell * o.frames.length;
        var g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        for (var r = 0; r < o.frames.length; r++) for (var k = 0; k < 3; k++) {
            var img = new Image();
            img.src = 'data:image/png;base64,' + o.frames[r][k];
            await img.decode();
            g.drawImage(img, k * cell, r * cell, cell, cell);
        }
        return c.toDataURL('image/png').split(',')[1];
    }, {frames: frames, size: size, scale: scale});
}

// ---------- per character ----------

async function character(name, spec) {
    var style = manifest.style, size = spec.size;
    var common = {
        image_size: {width: size, height: size}, no_background: true, outline: style.outline,
        shading: style.shading, detail: style.detail, negative_description: style.negative, seed: seed
    };
    var sheetPath = path.join(ROOT, 'apps', spec.app, 'sprites.png');
    var current = fs.existsSync(sheetPath) ? fs.readFileSync(sheetPath).toString('base64') : null;
    var cell = size * spec.scale;
    var mock = function(r, c) { return current && (DRY || MOCK) ? crop48(current, r, c, cell, size) : null; };

    console.log(name + ': base');
    var base = await call('/generate-image-pixflux', Object.assign({description: spec.base}, common), await mock(0, 0));

    var outDir = path.join(__dirname, 'out', name);
    fs.mkdirSync(outDir, {recursive: true});
    fs.writeFileSync(path.join(outDir, 'base.png'), Buffer.from(base, 'base64'));

    var frames = [];
    for (var r = 0; r < spec.rows.length; r++) {
        var row = spec.rows[r];
        console.log(name + ': ' + row.name);
        var prompt = spec.base + ', ' + row.prompt;
        var frame = await call('/generate-image-bitforge', Object.assign({
            description: prompt, style_image: b64Image(base), style_strength: 60,
            init_image: b64Image(base), init_image_strength: 300
        }, common), await mock(r, 0));
        var blink = await call('/generate-image-bitforge', Object.assign({
            description: prompt + ', eyes closed, blinking', style_image: b64Image(base), style_strength: 60,
            init_image: b64Image(frame), init_image_strength: 700
        }, common), await mock(r, 2));
        var alt = await shiftDown(frame, size);
        frames.push([frame, alt, blink]);
        [frame, alt, blink].forEach(function(f, k) {
            fs.writeFileSync(path.join(outDir, row.name + '-' + ['base', 'alt', 'blink'][k] + '.png'), Buffer.from(f, 'base64'));
        });
    }

    var sheet = await assemble(frames, size, spec.scale);
    var target = MOCK || DRY ? path.join(outDir, 'sprites.png') : sheetPath;
    fs.writeFileSync(target, Buffer.from(sheet, 'base64'));
    console.log(name + ': wrote ' + path.relative(ROOT, target) + ' (' + spec.rows.length + ' rows)');
}

(async function() {
    if (!DRY && !MOCK && !process.env.PIXELLAB_API_KEY) {
        console.error('Set PIXELLAB_API_KEY (from pixellab.ai/account), or use --dry-run / --mock.');
        process.exit(1);
    }
    if (!DRY && !MOCK && process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
        console.warn('HTTPS_PROXY is set: run with NODE_USE_ENV_PROXY=1 so fetch uses it.');
    }
    var playwright = require('playwright');
    browser = await playwright.chromium.launch(process.env.CHROMIUM ? {executablePath: process.env.CHROMIUM} : {});
    page = await browser.newPage();
    try {
        var names = Object.keys(manifest.characters).filter(function(n) { return !only || n === only; });
        for (var i = 0; i < names.length; i++) await character(names[i], manifest.characters[names[i]]);
        if (!DRY && !MOCK) console.log('PixelLab cost: $' + spent.toFixed(3));
        console.log('Next: check the sheets in the simulator, then node tools/build-theme.js is not needed (art only).');
    } finally {
        await browser.close();
    }
})();
