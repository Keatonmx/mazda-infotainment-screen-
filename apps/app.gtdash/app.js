/**
 * GT Dash: a lightweight dashboard for Mazda Connect (CASDK custom application)
 *
 * Pages (rotate the commander knob to switch):
 *   1. ENGINE  - real coolant temperature + warm-up status (the car only has a blue "cold" light)
 *   2. TRIP    - fuel level, average economy, battery, outside temperature
 *   3. SERVICE - oil change countdown based on the odometer
 *
 * Controls:
 *   Rotate knob          switch page
 *   Knob up / down       (SERVICE page) change oil interval by 500
 *   Press knob           (SERVICE page) press twice within 3 s to log an oil change
 *   Knob left            toggle RAW mode (shows uncalibrated values, for calibration)
 *
 * The CMU runs an old browser engine: ES5 only (no let/const, arrow functions or template strings).
 */

CustomApplicationsHandler.register("app.gtdash", new CustomApplication({

    require: {
        js: [],
        css: ['theme/kodo.css', 'app.css'],
        images: {}
    },

    settings: {
        title: 'GT Dash',
        statusbar: true,
        statusbarIcon: false,
        hasLeftButton: false,
        hasMenuCaret: false,
        hasRightArc: false
    },

    /**
     * Calibration: the raw scale of some signals is not documented.
     * Open the app, press knob-left for RAW mode, compare against the car, then adjust here.
     * value = raw * scale + offset
     */
    calibration: {
        coolant:     {scale: 1, offset: 0},     // expected °C
        intake:      {scale: 1, offset: 0},     // expected °C
        outside:     {scale: 1, offset: 0},     // expected °C
        fuel:        {scale: 1, offset: 0},     // expected 0-100 %
        economy:     {scale: 1, offset: 0},     // expected L/100km
        odometer:    {scale: 1, offset: 0},     // expected km
        battery:     {scale: 1, offset: 0}
    },

    // Coolant thresholds in °C: blue below COLD_BELOW, amber until WARM_AT, green (normal) until HOT_AT, red above
    COLD_BELOW: 60,
    WARM_AT: 80,
    HOT_AT: 105,

    DEFAULT_OIL_INTERVAL_MI: 5000,

    created: function() {
        this.root = this.canvas[0];
        this.values = {};
        this.raw = {};
        this.page = 0;
        this.rawMode = false;
        this.confirmUntil = 0;

        this.pages = [this.renderEngine, this.renderTrip, this.renderService];

        this.el = document.createElement('div');
        this.el.className = 'k-root gt';
        this.root.appendChild(this.el);

        this.watch('coolant', VehicleData.temperature.coolant);
        this.watch('intake', VehicleData.temperature.intake);
        this.watch('outside', VehicleData.temperature.outside);
        this.watch('fuel', VehicleData.fuel.position);
        this.watch('economy', VehicleData.fuel.averageconsumption);
        this.watch('odometer', VehicleData.vehicle.odometer);
        this.watch('battery', VehicleData.vehicle.batterylevel);

        this.render();
    },

    watch: function(key, field) {
        this.subscribe(field, function(value) {
            var num = parseFloat(value);
            this.raw[key] = value;
            if (isNaN(num)) return;
            var cal = this.calibration[key];
            this.values[key] = cal ? num * cal.scale + cal.offset : num;
            this.render();
        }.bind(this));
    },

    onControllerEvent: function(eventId) {
        switch (eventId) {
            case 'cw':
                this.page = (this.page + 1) % this.pages.length;
                break;
            case 'ccw':
                this.page = (this.page + this.pages.length - 1) % this.pages.length;
                break;
            case 'leftStart':
                this.rawMode = !this.rawMode;
                break;
            case 'upStart':
            case 'downStart':
                if (this.page === 2) {
                    var interval = this.oilInterval() + (eventId === 'upStart' ? 500 : -500);
                    this.save('oilInterval', Math.max(1000, Math.min(15000, interval)));
                }
                break;
            case 'selectStart':
                if (this.page === 2) this.logOilChange();
                break;
        }
        this.render();
    },

    /* ---------- helpers ---------- */

    isMetric: function() {
        return this.getRegion() !== 'na';
    },

    temp: function(c) {
        if (c === undefined) return '--';
        return this.isMetric() ? Math.round(c) + '°C' : Math.round(c * 9 / 5 + 32) + '°F';
    },

    distance: function(km) {
        return this.isMetric() ? km : km * 0.621371;
    },

    distanceUnit: function() {
        return this.isMetric() ? 'km' : 'mi';
    },

    // CASDK's set() throws if nothing was stored yet (storage loads as null)
    save: function(key, value) {
        if (!this.getStorage()) this.__storage = {};
        this.set(key, value);
    },

    oilInterval: function() {
        return this.get('oilInterval', this.DEFAULT_OIL_INTERVAL_MI);
    },

    logOilChange: function() {
        var now = new Date().getTime();
        if (this.values.odometer === undefined) return;
        if (now < this.confirmUntil) {
            this.save('oilOdo', this.values.odometer);
            this.confirmUntil = 0;
        } else {
            this.confirmUntil = now + 3000;
            setTimeout(this.render.bind(this), 3100);
        }
    },

    fmt: function(n, digits) {
        if (n === undefined) return '--';
        return n.toFixed(digits || 0);
    },

    /* ---------- rendering ---------- */

    // [number, unit] so the number can be big and the unit small
    tempParts: function(c) {
        if (c === undefined) return ['--', ''];
        return this.isMetric() ? [Math.round(c), '°C'] : [Math.round(c * 9 / 5 + 32), '°F'];
    },

    PAGE_TITLES: [['機関', 'ENGINE'], ['旅', 'TRIP'], ['整備', 'SERVICE']],

    render: function() {
        if (!this.el) return;
        var title = this.rawMode ? ['生データ', 'RAW VALUES'] : this.PAGE_TITLES[this.page];
        var body = this.rawMode ? this.renderRaw() : this.pages[this.page].call(this);
        var dots = '';
        for (var i = 0; i < this.pages.length; i++) {
            dots += '<i class="' + (i === this.page ? 'on' : '') + '"></i>';
        }
        this.el.innerHTML =
            '<div class="k-ribbon"><b>' + title[0] + '</b><i>' + title[1] + '</i></div>' +
            '<div class="k-side">計<br>器<br>盤</div>' +
            body +
            '<div class="k-dots">' + dots + '</div>';
    },

    renderEngine: function() {
        var c = this.values.coolant, state = 'cold', jp = '暖機中', en = 'WARMING UP · GO EASY', pct = 0;
        if (c === undefined) {
            state = 'none'; jp = '待機中'; en = 'WAITING FOR DATA';
        } else {
            pct = Math.max(0, Math.min(100, (c - 20) / (this.WARM_AT - 20) * 100));
            if (c >= this.HOT_AT) { state = 'hot'; jp = 'オーバーヒート'; en = 'OVERHEATING · PULL OVER'; }
            else if (c >= this.WARM_AT) { state = 'warm'; jp = '準備完了'; en = 'ENGINE WARM · READY'; }
            else if (c >= this.COLD_BELOW) { state = 'mid'; jp = 'もう少し'; en = 'ALMOST WARM'; }
        }
        var t = this.tempParts(c), intake = this.tempParts(this.values.intake), outside = this.tempParts(this.values.outside);
        return '<div class="engine ' + state + '">' +
            '<div class="ring"></div>' +
            '<div class="k-sun"></div>' +
            '<div class="sun-text"><span class="k-jp">水温</span><b class="k-num">' + t[0] + '</b><em>' + t[1] + '</em>' +
                '<i>COOLANT</i></div>' +
            '<div class="status"><b class="k-jp">' + jp + '</b><i>' + en + '</i></div>' +
            '<div class="k-bar warm-bar"><div style="width:' + pct + '%"></div></div>' +
            '<div class="k-card mini m1"><div class="k-label">吸気<i>INTAKE</i></div>' +
                '<b class="k-num">' + intake[0] + '<em>' + intake[1] + '</em></b></div>' +
            '<div class="k-card mini m2"><div class="k-label">外気<i>OUTSIDE</i></div>' +
                '<b class="k-num">' + outside[0] + '<em>' + outside[1] + '</em></b></div>' +
        '</div>';
    },

    renderTrip: function() {
        var econ = this.values.economy, econText = '--', econUnit = this.isMetric() ? 'L/100km' : 'MPG';
        if (econ !== undefined && econ > 0) {
            econText = this.isMetric() ? econ.toFixed(1) : (235.215 / econ).toFixed(1);
        }
        var fuel = this.values.fuel, outside = this.tempParts(this.values.outside);
        return '<div class="trip">' +
            this.card('c1', '燃料', 'FUEL', this.fmt(fuel), '%',
                '<div class="k-bar"><div style="width:' + (fuel || 0) + '%"></div></div>') +
            this.card('c2', '燃費', 'AVG ECONOMY', econText, econUnit) +
            this.card('c3', '電池', 'BATTERY', this.fmt(this.values.battery), '') +
            this.card('c4', '外気', 'OUTSIDE', outside[0], outside[1]) +
        '</div>';
    },

    card: function(pos, jp, en, value, unit, extra) {
        return '<div class="k-card cell ' + pos + '"><div class="k-label">' + jp + '<i>' + en + '</i></div>' +
            '<b class="k-num">' + value + '<em>' + unit + '</em></b>' + (extra || '') + '</div>';
    },

    renderService: function() {
        var odo = this.values.odometer, unit = this.distanceUnit(), interval = this.oilInterval();
        var last = this.get('oilOdo');
        var main = '--', sub = 'Press knob twice to log an oil change', state = 'none', stamp = '';
        if (odo !== undefined && last !== undefined) {
            var left = Math.round(interval - this.distance(odo - last));
            main = Math.abs(left).toLocaleString() + '<em>' + unit + '</em>';
            sub = left >= 0 ? 'until the next oil change' : 'OVERDUE · change the oil soon';
            state = left < 0 ? 'due' : (left < 500 ? 'soon' : 'ok');
            stamp = left < 0 ? '要交換' : (left < 500 ? '間近' : '良好');
        } else if (odo === undefined) {
            sub = 'Waiting for odometer';
        }
        if (new Date().getTime() < this.confirmUntil) sub = 'Press again to confirm oil change';
        return '<div class="service ' + state + '">' +
            '<div class="k-card big-card">' +
                '<div class="k-label">オイル交換<i>OIL CHANGE</i></div>' +
                '<b class="k-num">' + main + '</b>' +
                '<div class="sub">' + sub + '</div>' +
                '<div class="interval"><span class="k-jp">間隔</span> ' + interval.toLocaleString() + ' ' + unit +
                    '<i>INTERVAL · knob up/down</i></div>' +
            '</div>' +
            (stamp ? '<div class="k-stamp">' + stamp + '</div>' : '') +
        '</div>';
    },

    renderRaw: function() {
        var rows = '';
        for (var key in this.calibration) {
            rows += '<tr><td>' + key + '</td><td>' +
                (this.raw[key] === undefined ? '--' : this.raw[key]) + '</td></tr>';
        }
        return '<div class="k-card raw"><table>' + rows + '</table><i>knob left to exit</i></div>';
    }
}));
