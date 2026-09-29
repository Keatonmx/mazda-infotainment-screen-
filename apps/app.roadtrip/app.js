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
        css: ['theme/kodo.css', 'app.css'],
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
        this.el.className = 'k-root rt';
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
        var html = '<div class="k-ribbon"><b>' + (this.page === 0 ? '旅の記録' : '記録') + '</b><i>' +
            (this.page === 0 ? 'ROAD TRIP' : 'RECORDS') + '</i></div>' +
            '<div class="k-side">旅<br>路</div>';

        if (this.page === 0) {
            html += '<canvas width="' + Math.round(ROADTRIP_MAP.w * this.MAP_SCALE) + '" height="' +
                Math.round(ROADTRIP_MAP.h * this.MAP_SCALE) + '"></canvas>' +
                '<div class="strip"><b class="k-num">' + count + '</b><span class="of">/ 50</span>' +
                '<span class="k-label">州<i>STATES</i></span>' +
                '<span class="k-label now">現在地<i>NOW</i></span><span class="where">' + where + '</span></div>';
        } else {
            html += this.statsHtml(count);
        }

        if (this.banner) {
            html += '<div class="k-card banner"><div class="k-stamp">制<br>覇</div>' +
                '<div class="bt"><span class="k-jp">新しい州！</span><i>NEW STATE</i>' +
                '<b class="k-num">' + this.banner.n + '</b><em>#' + count + ' / 50</em></div></div>';
        }
        this.el.innerHTML = html;
        if (this.page === 0) this.drawMap(this.el.getElementsByTagName('canvas')[0]);
    },

    MAP_SCALE: 0.88,

    drawMap: function(canvas) {
        if (!canvas || !canvas.getContext) return;
        var ctx = canvas.getContext('2d'), v = this.visited();
        ctx.scale(this.MAP_SCALE, this.MAP_SCALE);
        ctx.lineJoin = 'round';
        for (var i = 0; i < ROADTRIP_STATES.length; i++) {
            var s = ROADTRIP_STATES[i], isCurrent = s === this.current;
            ctx.fillStyle = v[s.a] ? '#c8102e' : '#221f2a';
            ctx.strokeStyle = '#0c0b10';
            ctx.lineWidth = 1;
            this.tracePath(ctx, s);
            ctx.fill();
            ctx.stroke();
        }
        if (this.current) {  // outline the current state last so it sits on top
            ctx.strokeStyle = '#d4a857';
            ctx.lineWidth = 3;
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
        var farText = far ? Math.round(metric ? far.km : far.km * 0.621371).toLocaleString() + '<em>' + (metric ? 'km' : 'mi') + '</em>' : '--';
        var highText = high ? Math.round(metric ? high.m : high.m * 3.28084).toLocaleString() + '<em>' + (metric ? 'm' : 'ft') + '</em>' : '--';
        var home = new Date().getTime() < this.confirmUntil ? 'Press again to set home here' :
            (this.moving ? 'Home: set from first GPS fix' : 'Press knob twice to set home here');
        var name = function(a) { return a && this.byAbbr[a] ? this.byAbbr[a].n : ''; }.bind(this);

        return this.cell('c1', '州', 'STATES', count + '<em>/ 50</em>', newest ? 'newest: ' + name(newest) : '') +
            this.cell('c2', '最遠', 'FARTHEST FROM HOME', farText, far && far.a ? 'in ' + name(far.a) : '') +
            this.cell('c3', '最高地点', 'HIGHEST POINT', highText, high && high.a ? 'in ' + name(high.a) : '') +
            this.cell('c4', '現在地', 'NOW IN', this.current ? this.current.a : '--', this.current ? this.current.n : '') +
            '<div class="hint">' + home + '</div>';
    },

    cell: function(pos, jp, en, value, sub) {
        return '<div class="k-card cell ' + pos + '"><div class="k-label">' + jp + '<i>' + en + '</i></div>' +
            '<b class="k-num">' + value + '</b><span class="sub">' + sub + '</span></div>';
    }
}));
