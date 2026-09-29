/**
 * Generates greeting/sounds/startup.mp3: a short, quiet three-note chime.
 *
 *   npm i lamejs@1.2.1
 *   node tools/make-chime.js
 *
 * The CMU may play this on top of the radio at a fixed level, so it is kept short (~1.8 s)
 * and quiet (peak about -18 dBFS). Swap in your own MP3 the same way: short and quiet.
 */

var fs = require('fs');
var path = require('path');
// lamejs 1.2.1's CommonJS entry is broken on modern Node; its bundled build works
var vm = require('vm');
var lamejs = (function() {
    var sandbox = {};
    vm.runInNewContext(fs.readFileSync(require.resolve('lamejs/lame.all.js'), 'utf8'), sandbox);
    return sandbox.lamejs;
})();

var RATE = 44100;
var PEAK = 0.125;                        // -18 dBFS
var NOTES = [                            // [start s, frequency Hz]  E5, G#5, B5 rising
    [0.00, 659.25],
    [0.18, 830.61],
    [0.36, 987.77]
];
var LENGTH = 1.8;

var total = Math.round(RATE * LENGTH);
var mix = new Float32Array(total);

NOTES.forEach(function(n) {
    var start = Math.round(n[0] * RATE);
    for (var i = start; i < total; i++) {
        var t = (i - start) / RATE;
        var attack = Math.min(1, t / 0.01);                 // 10 ms fade-in, no click
        var decay = Math.exp(-t * 3.2);
        // a soft bell: fundamental plus a quiet octave
        var v = Math.sin(2 * Math.PI * n[1] * t) + 0.25 * Math.sin(2 * Math.PI * n[1] * 2 * t);
        mix[i] += v * attack * decay;
    }
});

// normalize to the target peak and fade the tail to silence
var max = 0;
for (var i = 0; i < total; i++) max = Math.max(max, Math.abs(mix[i]));
var samples = new Int16Array(total);
for (i = 0; i < total; i++) {
    var tail = Math.min(1, (total - i) / (RATE * 0.2));
    samples[i] = Math.round(mix[i] / max * PEAK * tail * 32767);
}

var encoder = new lamejs.Mp3Encoder(1, RATE, 128);
var chunks = [];
for (i = 0; i < samples.length; i += 1152) {
    var buf = encoder.encodeBuffer(samples.subarray(i, i + 1152));
    if (buf.length) chunks.push(Buffer.from(buf));
}
chunks.push(Buffer.from(encoder.flush()));

var out = path.join(__dirname, '..', 'greeting', 'sounds', 'startup.mp3');
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, Buffer.concat(chunks));
console.log('wrote ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB, ' + LENGTH + ' s)');
