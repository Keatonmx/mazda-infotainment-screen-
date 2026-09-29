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
        css: ['app.css'],
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

    // Warm-up thresholds in °C
    COLD_BELOW: 60,
    WARM_AT: 80,

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
        this.el.className = 'gt';
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

    render: function() {
        if (!this.el) return;
        var body = this.rawMode ? this.renderRaw() : this.pages[this.page].call(this);
        var dots = '';
        for (var i = 0; i < this.pages.length; i++) {
            dots += '<i class="' + (i === this.page ? 'on' : '') + '"></i>';
        }
        this.el.innerHTML = body + '<div class="dots">' + dots + '</div>';
    },

    renderEngine: function() {
        var c = this.values.coolant, state = 'cold', label = 'WARMING UP - GO EASY', pct = 0;
        if (c === undefined) {
            state = 'none'; label = 'WAITING FOR DATA';
        } else {
            pct = Math.max(0, Math.min(100, (c - 20) / (this.WARM_AT - 20) * 100));
            if (c >= this.WARM_AT) { state = 'warm'; label = 'ENGINE WARM - READY'; }
            else if (c >= this.COLD_BELOW) { state = 'mid'; label = 'ALMOST WARM'; }
        }
        return '<div class="page engine ' + state + '">' +
            '<div class="caption">COOLANT</div>' +
            '<div class="big">' + this.temp(c) + '</div>' +
            '<div class="bar"><div style="width:' + pct + '%"></div></div>' +
            '<div class="status">' + label + '</div>' +
            '<div class="row">' +
                '<div><span>INTAKE</span>' + this.temp(this.values.intake) + '</div>' +
                '<div><span>OUTSIDE</span>' + this.temp(this.values.outside) + '</div>' +
            '</div>' +
        '</div>';
    },

    renderTrip: function() {
        var econ = this.values.economy, econText = '--', econUnit = this.isMetric() ? 'L/100km' : 'MPG';
        if (econ !== undefined && econ > 0) {
            econText = this.isMetric() ? econ.toFixed(1) : (235.215 / econ).toFixed(1);
        }
        var fuel = this.values.fuel;
        return '<div class="page trip">' +
            '<div class="grid">' +
                '<div class="cell"><span>FUEL</span><b>' + this.fmt(fuel) + '%</b>' +
                    '<div class="bar small"><div style="width:' + (fuel || 0) + '%"></div></div></div>' +
                '<div class="cell"><span>AVG ECONOMY</span><b>' + econText + '</b><em>' + econUnit + '</em></div>' +
                '<div class="cell"><span>BATTERY</span><b>' + this.fmt(this.values.battery) + '</b></div>' +
                '<div class="cell"><span>OUTSIDE</span><b>' + this.temp(this.values.outside) + '</b></div>' +
            '</div>' +
        '</div>';
    },

    renderService: function() {
        var odo = this.values.odometer, unit = this.distanceUnit(), interval = this.oilInterval();
        var last = this.get('oilOdo');
        var main = '--', sub = 'Press knob twice to log an oil change', state = '';
        if (odo !== undefined && last !== undefined) {
            var left = Math.round(interval - this.distance(odo - last));
            main = Math.abs(left).toLocaleString() + ' ' + unit;
            sub = left >= 0 ? 'until oil change' : 'OVERDUE';
            state = left < 0 ? 'due' : (left < 500 ? 'soon' : '');
        } else if (odo === undefined) {
            sub = 'Waiting for odometer';
        }
        if (new Date().getTime() < this.confirmUntil) sub = 'Press again to confirm oil change';
        return '<div class="page service ' + state + '">' +
            '<div class="caption">OIL CHANGE</div>' +
            '<div class="big">' + main + '</div>' +
            '<div class="status">' + sub + '</div>' +
            '<div class="row"><div><span>INTERVAL (knob up/down)</span>' +
                interval.toLocaleString() + ' ' + unit + '</div></div>' +
        '</div>';
    },

    renderRaw: function() {
        var rows = '';
        for (var key in this.calibration) {
            rows += '<tr><td>' + key + '</td><td>' +
                (this.raw[key] === undefined ? '--' : this.raw[key]) + '</td></tr>';
        }
        return '<div class="page raw"><div class="caption">RAW VALUES (knob left to exit)</div>' +
            '<table>' + rows + '</table></div>';
    }
}));
