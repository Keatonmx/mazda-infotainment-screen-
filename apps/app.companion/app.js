/**
 * Akari: an anime chibi companion who gets madder the faster you drive (CASDK custom application)
 *
 * Anger level from speed (mph, see THRESHOLDS_MPH):
 *   0 calm (parked/crawling)  1 happy  2 pouty  3 annoyed  4 mad  5 FURIOUS
 * Levels rise right away and fall back only after you stay below the threshold for a few seconds,
 * so she doesn't flicker between moods at a steady speed.
 *
 * Art: sprites.png, 6 rows (levels) x 3 columns (base, alternate, blink), 240x240 per cell.
 * Replace it with PixelLab art in the same layout (see tools/make-companion-sprites.js).
 *
 * Controls: press the knob while parked to pat her head. ES5 only.
 */

CustomApplicationsHandler.register("app.companion", new CustomApplication({

    require: {
        js: [],
        css: ['theme/kodo.css', 'app.css'],
        images: {}
    },

    settings: {
        title: 'Akari',  // あかり 灯
        statusbar: true,
        statusbarIcon: false,
        hasLeftButton: false,
        hasMenuCaret: false,
        hasRightArc: false
    },

    THRESHOLDS_MPH: [5, 45, 65, 75, 85],   // entering levels 1..5
    CALM_MARGIN_MPH: 3,                     // must drop this far below a threshold...
    CALM_SECONDS: 3,                        // ...for this long before she calms down a level
    CELL: 240,
    MOVING_KMH: 3,

    // [Japanese, English]
    LINES: [
        [['いつでもいいよ！', 'Ready when you are!'], ['ドライブ行こう～', 'Let\'s go for a drive~'], ['シートベルトしてね', 'Buckle up!']],
        [['ゆっくりね♪', 'Nice and easy~'], ['気持ちいい～', 'This is nice!'], ['のんびり～♪', 'Cruising~']],
        [['ちょっと速くない…？', 'Hmm... bit fast?'], ['スピード見てる？', 'Watch the speed...'], ['……', '...']],
        [['もう！遅くして！', 'Hey! Slow down!'], ['ぷんぷん！', 'Hmph! Too fast!'], ['怒るよ！', 'I\'m not happy!']],
        [['スピード落として！！', 'SLOW DOWN!!'], ['聞いてるの？！', 'I SAID SLOW DOWN!'], ['信じられない！', 'Are you kidding me?!']],
        [['きゃあああ！！', 'WAAAH! TOO FAST!!'], ['ママに言うからね！', 'I\'M TELLING YOUR MOM!'], ['ブレーキ！ブレーキ！', 'BRAKES! BRAKES!!']]
    ],
    PAT_LINES: [['えへへ～', 'Hehe~'], ['ありがと！', 'Ehehe, thanks!'], ['な、なにするの？！', 'W-what are you doing?!']],

    created: function() {
        var root = this.canvas[0];
        this.el = document.createElement('div');
        this.el.className = 'k-root ak';
        this.el.innerHTML =
            '<div class="k-sun"></div>' +
            '<div class="k-speedlines"></div>' +
            '<div class="sprite"></div>' +
            '<div class="k-bubble bubble"></div>' +
            '<div class="hud"><span class="k-label">速度<i>Speed</i></span><b class="speed k-num"></b>' +
                '<span class="k-label anger">怒り<i>Anger</i></span><span class="meter"></span></div>' +
            '<div class="k-hints"><span><i class="k-knob press"></i><b>なでる</b>Pat (parked)</span></div>' +
            '<div class="k-ribbon"><b>あかり</b><i>AKARI</i></div>' +
            '<div class="k-side">相<br>棒</div>';
        root.appendChild(this.el);

        this.$ = {
            bubble: this.el.getElementsByClassName('bubble')[0],
            sprite: this.el.getElementsByClassName('sprite')[0],
            speed: this.el.getElementsByClassName('speed')[0],
            meter: this.el.getElementsByClassName('meter')[0]
        };

        this.level = 0;
        this.mph = 0;
        this.calmSince = 0;
        this.patUntil = 0;
        this.line = 0;
        this.frame = 0;

        this.subscribe(VehicleData.vehicle.speed, function(kmh) {
            var v = parseFloat(kmh);
            if (isNaN(v)) return;
            this.kmh = v;
            this.mph = v * 0.621371;
            this.updateLevel();
        }.bind(this));

        this.render();
    },

    focused: function() {
        if (!this.timer) this.timer = setInterval(this.tick.bind(this), 250);
    },

    lost: function() {
        clearInterval(this.timer);
        this.timer = null;
    },

    save: function(key, value) {
        if (!this.getStorage()) this.__storage = {};
        this.set(key, value);
    },

    /* ---------- mood ---------- */

    targetLevel: function(mph) {
        var level = 0;
        for (var i = 0; i < this.THRESHOLDS_MPH.length; i++) {
            if (mph >= this.THRESHOLDS_MPH[i]) level = i + 1;
        }
        return level;
    },

    updateLevel: function() {
        var target = this.targetLevel(this.mph), now = new Date().getTime();

        if (target > this.level) {                       // angrier: right away
            this.setLevel(target);
            this.calmSince = 0;
        } else if (target < this.level) {                // calmer: only after staying slower
            var floor = this.THRESHOLDS_MPH[this.level - 1] - this.CALM_MARGIN_MPH;
            if (this.mph < floor) {
                if (!this.calmSince) this.calmSince = now;
                if (now - this.calmSince >= this.CALM_SECONDS * 1000) {
                    this.setLevel(this.level - 1);       // one level at a time, like cooling off
                    this.calmSince = now;
                }
            } else {
                this.calmSince = 0;
            }
        } else {
            this.calmSince = 0;
        }

        if (this.mph > this.get('topMph', 0)) this.save('topMph', this.mph);
        this.renderHud();
    },

    setLevel: function(level) {
        if (level === 5 && this.level !== 5) this.save('furious', this.get('furious', 0) + 1);
        this.level = level;
        this.line = Math.floor(Math.random() * this.LINES[level].length);
        this.patUntil = 0;
        this.render();
    },

    onControllerEvent: function(eventId) {
        if (eventId === 'selectStart' && (this.kmh || 0) <= this.MOVING_KMH) {
            this.patUntil = new Date().getTime() + 3000;
            this.line = Math.floor(Math.random() * this.PAT_LINES.length);
            this.render();
        }
    },

    /* ---------- rendering ---------- */

    patting: function() {
        return new Date().getTime() < this.patUntil;
    },

    render: function() {
        if (!this.$) return;
        var lines = this.patting() ? this.PAT_LINES : this.LINES[this.level];
        var line = lines[this.line % lines.length];
        this.$.bubble.innerHTML = '<b>' + line[0] + '</b><i>' + line[1] + '</i>';
        this.$.bubble.className = 'k-bubble bubble lv' + this.level + (this.patting() ? ' pat' : '');
        this.el.className = 'k-root ak lv' + this.level + (this.patting() ? ' patting' : '');
        this.drawFrame();
        this.renderHud();
    },

    renderHud: function() {
        var unit = this.getRegion() === 'na' ? ' mph' : ' km/h';
        var shown = this.getRegion() === 'na' ? this.mph : (this.kmh || 0);
        this.$.speed.innerHTML = Math.round(shown) + '<em>' + unit + '</em>';
        var marks = '';
        for (var i = 1; i <= 5; i++) marks += '<i class="' + (i <= this.level ? 'on' : '') + '"></i>';
        this.$.meter.innerHTML = marks;
    },

    // pick the sprite cell: row = mood, column = base / alternate / blink
    drawFrame: function() {
        var row = this.patting() ? 1 : this.level, col;
        var fast = row >= 4;
        if (!fast && this.frame % 16 === 15 && row !== 1) col = 2;                 // blink now and then
        else col = Math.floor(this.frame / (fast ? 1 : 3)) % 2;                    // bob, or flail when mad
        this.$.sprite.style.backgroundPosition = (-col * this.CELL) + 'px ' + (-row * this.CELL) + 'px';

        // furious: shake the whole character
        var shake = row === 5 ? (this.frame % 2 ? 4 : -4) : 0;
        this.$.sprite.style.marginLeft = shake + 'px';
    },

    tick: function() {
        this.frame++;
        this.drawFrame();
        if (this.patUntil && !this.patting()) { this.patUntil = 0; this.render(); }
        if (this.frame % 32 === 0) { this.line++; this.render(); }       // new line every ~8 s
        if (this.calmSince) this.updateLevel();                           // keep cooling off between speed updates
    }
}));
