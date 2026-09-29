/**
 * Road Trip: colors in every US state you drive in (CASDK custom application)
 *
 * Pages (rotate the knob):
 *   MAP    - US map with visited states filled in, current state outlined
 *   STATS  - states visited, farthest from home, highest elevation, newest state
 *
 * Entering a state for the first time shows a "NEW STATE" banner (no interaction needed).
 * Home is set automatically from the first GPS fix. To move it: on the STATS page,
 * while parked, press the knob twice.
 *
 * ES5 only. The map is drawn once per change on a 2D canvas, never in a loop.
 */

CustomApplicationsHandler.register("app.roadtrip", new CustomApplication({

    require: {
        js: ['states.js'],
        css: ['app.css'],
        images: {}
    },

    settings: {
        title: 'Road Trip',
        statusbar: true,
        statusbarIcon: false,
        hasLeftButton: false,
        hasMenuCaret: false,
        hasRightArc: false
    },

    LOOKUP_MS: 5000,        // at most one state lookup every 5 s
    BANNER_MS: 8000,
    MOVING_KMH: 3,

    created: function() {
        var root = this.canvas[0];
        this.el = document.createElement('div');
        this.el.className = 'rt';
        root.appendChild(this.el);

        this.page = 0;
        this.fix = {};
        this.current = null;
        this.lastLookup = 0;
        this.moving = false;
        this.confirmUntil = 0;
        this.banner = null;

        this.byAbbr = {};
        for (var i = 0; i < ROADTRIP_STATES.length; i++) this.byAbbr[ROADTRIP_STATES[i].a] = ROADTRIP_STATES[i];

        // latitude and longitude arrive separately; only look up once both have updated
        this.subscribe(VehicleData.gps.latitude, function(v) { this.fix.lat = parseFloat(v); this.fix.newLat = true; this.onFix(); }.bind(this));
        this.subscribe(VehicleData.gps.longitude, function(v) { this.fix.lon = parseFloat(v); this.fix.newLon = true; this.onFix(); }.bind(this));
        this.subscribe(VehicleData.gps.altitude, function(v) { this.onAltitude(parseFloat(v)); }.bind(this));
        this.subscribe(VehicleData.vehicle.speed, function(v) { this.moving = parseFloat(v) > this.MOVING_KMH; }.bind(this));

        this.render();
    },

    save: function(key, value) {
        if (!this.getStorage()) this.__storage = {};
        this.set(key, value);
    },

    visited: function() {
        return this.get('visited', {});
    },

    visitedCount: function() {
        var n = 0, v = this.visited();
        for (var k in v) if (k !== 'DC') n++;
        return n;
    },

    /* ---------- GPS ---------- */

    validFix: function() {
        var f = this.fix;
        return !isNaN(f.lat) && !isNaN(f.lon) && f.lat > 15 && f.lat < 75 && f.lon > -180 && f.lon < -60;
    },

    onFix: function() {
        if (!this.validFix() || !this.fix.newLat || !this.fix.newLon) return;
        var now = new Date().getTime();
        if (now - this.lastLookup < this.LOOKUP_MS) return;
        this.lastLookup = now;
        this.fix.newLat = this.fix.newLon = false;

        if (!this.get('home')) this.save('home', {lat: this.fix.lat, lon: this.fix.lon});

        var state = this.locate(this.fix.lon, this.fix.lat);
        if (state && state !== this.current) {
            this.current = state;
            var v = this.visited();
            if (!v[state.a]) {
                v[state.a] = this.today();
                this.save('visited', v);
                this.save('newest', state.a);
                if (state.a !== 'DC') this.showBanner(state);
            }
            this.render();
        }
        this.trackFarthest();
    },

    onAltitude: function(meters) {
        if (isNaN(meters) || !this.validFix()) return;
        var best = this.get('highest');
        if (!best || meters > best.m) {
            this.save('highest', {m: meters, a: this.current ? this.current.a : ''});
            if (this.page === 1) this.render();
        }
    },

    trackFarthest: function() {
        var home = this.get('home');
        var km = this.distanceKm(home.lat, home.lon, this.fix.lat, this.fix.lon);
        var best = this.get('farthest');
        if (!best || km > best.km) {
            this.save('farthest', {km: km, a: this.current ? this.current.a : ''});
        }
    },

    distanceKm: function(lat1, lon1, lat2, lon2) {
        var r = Math.PI / 180;
        var a = Math.sin((lat2 - lat1) * r / 2), b = Math.sin((lon2 - lon1) * r / 2);
        var h = a * a + Math.cos(lat1 * r) * Math.cos(lat2 * r) * b * b;
        return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
    },

    // check the current state first (usually still inside it), then everything else by bounding box
    locate: function(lon, lat) {
        if (this.current && this.inside(this.current, lon, lat)) return this.current;
        for (var i = 0; i < ROADTRIP_STATES.length; i++) {
            var s = ROADTRIP_STATES[i];
            if (s === this.current) continue;
            if (lon < s.b[0] || lat < s.b[1] || lon > s.b[2] || lat > s.b[3]) continue;
            if (this.inside(s, lon, lat)) return s;
        }
        return null;
    },

    inside: function(state, x, y) {
        for (var r = 0; r < state.g.length; r++) {
            var ring = state.g[r], hit = false;
            for (var i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
                var xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
                if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
            }
            if (hit) return true;
        }
        return false;
    },

    today: function() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    },

    /* ---------- controls ---------- */

    onControllerEvent: function(eventId) {
        switch (eventId) {
            case 'cw':
            case 'ccw':
                this.page = this.page ? 0 : 1;
                break;
            case 'selectStart':
                if (this.page === 1 && !this.moving && this.validFix()) {
                    var now = new Date().getTime();
                    if (now < this.confirmUntil) {
                        this.save('home', {lat: this.fix.lat, lon: this.fix.lon});
                        this.save('farthest', {km: 0, a: this.current ? this.current.a : ''});
                        this.confirmUntil = 0;
                    } else {
                        this.confirmUntil = now + 3000;
                        setTimeout(this.render.bind(this), 3100);
                    }
                }
                break;
        }
        this.render();
    },

    showBanner: function(state) {
        this.banner = state;
        clearTimeout(this.bannerTimer);
        this.bannerTimer = setTimeout(function() { this.banner = null; this.render(); }.bind(this), this.BANNER_MS);
    },

    /* ---------- rendering ---------- */

    isMetric: function() {
        return this.getRegion() !== 'na';
    },

    render: function() {
        if (!this.el) return;
        var count = this.visitedCount();
        var where = this.current ? this.current.n : (this.validFix() ? 'Outside the US' : 'Waiting for GPS');

        if (this.page === 0) {
            this.el.innerHTML = '<canvas width="' + ROADTRIP_MAP.w + '" height="' + ROADTRIP_MAP.h + '"></canvas>' +
                '<div class="strip"><b>' + count + '</b> / 50 states<span>' + where + '</span></div>';
            this.drawMap(this.el.getElementsByTagName('canvas')[0]);
        } else {
            this.el.innerHTML = this.statsHtml(count);
        }

        if (this.banner) {
            this.el.innerHTML += '<div class="banner"><small>NEW STATE!</small>' + this.banner.n +
                '<small>#' + count + ' of 50</small></div>';
        }
    },

    drawMap: function(canvas) {
        if (!canvas || !canvas.getContext) return;
        var ctx = canvas.getContext('2d'), v = this.visited();
        ctx.lineJoin = 'round';
        for (var i = 0; i < ROADTRIP_STATES.length; i++) {
            var s = ROADTRIP_STATES[i], isCurrent = s === this.current;
            ctx.fillStyle = v[s.a] ? '#c8102e' : '#1d1f24';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            this.tracePath(ctx, s);
            ctx.fill();
            ctx.stroke();
        }
        if (this.current) {  // outline the current state last so it sits on top
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2.5;
            this.tracePath(ctx, this.current);
            ctx.stroke();
        }
    },

    tracePath: function(ctx, s) {
        ctx.beginPath();
        for (var r = 0; r < s.s.length; r++) {
            var ring = s.s[r];
            ctx.moveTo(ring[0], ring[1]);
            for (var i = 2; i < ring.length; i += 2) ctx.lineTo(ring[i], ring[i + 1]);
            ctx.closePath();
        }
    },

    statsHtml: function(count) {
        var far = this.get('farthest'), high = this.get('highest'), newest = this.get('newest');
        var metric = this.isMetric();
        var farText = far ? Math.round(metric ? far.km : far.km * 0.621371).toLocaleString() + (metric ? ' km' : ' mi') : '--';
        var highText = high ? Math.round(metric ? high.m : high.m * 3.28084).toLocaleString() + (metric ? ' m' : ' ft') : '--';
        var home = new Date().getTime() < this.confirmUntil ? 'Press again to set home here' :
            (this.moving ? 'Home: set from first GPS fix' : 'Press knob twice to set home here');

        return '<div class="stats">' +
            this.cell('STATES', count + '<em>/ 50</em>', newest && this.byAbbr[newest] ? 'newest: ' + this.byAbbr[newest].n : '') +
            this.cell('FARTHEST FROM HOME', farText, far && far.a && this.byAbbr[far.a] ? 'in ' + this.byAbbr[far.a].n : '') +
            this.cell('HIGHEST POINT', highText, high && high.a && this.byAbbr[high.a] ? 'in ' + this.byAbbr[high.a].n : '') +
            this.cell('NOW IN', this.current ? this.current.a : '--', this.current ? this.current.n : '') +
            '</div><div class="hint">' + home + '</div>';
    },

    cell: function(label, value, sub) {
        return '<div class="cell"><span>' + label + '</span><b>' + value + '</b><i>' + sub + '</i></div>';
    }
}));
