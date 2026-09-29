/**
 * Kodo: a car pet that lives in the dash (CASDK custom application)
 *
 * Kodo's mood comes from how the car is treated:
 *   + smooth driving, being petted (parked), getting an oil change
 *   - harsh acceleration/braking, revving hard on a cold engine
 *   hungry when fuel is low, sick when the oil change is overdue (from GT Dash),
 *   cold/hot from the outside temperature, sleepy late at night
 * Kodo levels up with every mile driven together.
 *
 * Kodo only notices driving while its app is on screen (CASDK sends data to the visible app only).
 *
 * Controls: press knob to pet (parked only), rotate knob to flip between Kodo and stats.
 * ES5 only. The frame loop just blinks and bobs; it stops when the app is not on screen.
 */

CustomApplicationsHandler.register("app.carpet", new CustomApplication({

    require: {
        js: [],
        css: ['app.css'],
        images: {}
    },

    settings: {
        title: 'Kodo',
        statusbar: true,
        statusbarIcon: false,
        hasLeftButton: false,
        hasMenuCaret: false,
        hasRightArc: false
    },

    HARSH_KMH_PER_S: 13,     // ~0.37 g change in one second
    COLD_REV_RPM: 3500,
    COLD_C: 60,
    MOVING_KMH: 3,
    MILES_PER_LEVEL: 250,
    LOW_FUEL: 12,

    LINES: {
        sick:     ['I feel yucky... oil change?', 'My oil is overdue!', 'Fresh oil please...'],
        hungry:   ['So hungry... gas station?', 'Tank is almost empty!', 'Feed me fuel!'],
        ouch:     ['Whoa, easy!', 'Ouch! Gentle please', 'That was rough!'],
        coldrev:  ['Brr, let me warm up first!', 'Too many revs, I\'m still cold!'],
        sleepy:   ['Zzz... late drive?', 'So sleepy...', 'Night owl mode'],
        cold:     ['Brrr, it\'s freezing!', 'Scarf weather!', 'Cozy heater time'],
        hot:      ['Phew, it\'s hot!', 'A/C on please!', 'Melting...'],
        ecstatic: ['Best. Drive. Ever!', 'Zoom-zoom!', 'You drive so smooth!'],
        happy:    ['Nice and smooth!', 'Happy to ride along', 'Where to next?'],
        meh:      ['Doing okay.', 'Smooth driving makes me happy', 'Could use a pat...'],
        grumpy:   ['Hmph.', 'Too many hard stops...', 'Be nicer to me!'],
        petted:   ['Hehe!', 'Aww, thanks!', 'Love you too!']
    },

    created: function() {
        var root = this.canvas[0];
        this.el = document.createElement('div');
        this.el.className = 'kodo';
        root.appendChild(this.el);

        this.data = {};
        this.page = 0;
        this.lastSpeed = null;
        this.eventMood = null;
        this.eventUntil = 0;
        this.coldRevCooldown = 0;
        this.lineIndex = 0;
        this.frame = 0;

        if (this.get('happiness') === undefined) this.save('happiness', 65);

        this.watch('speed', VehicleData.vehicle.speed, this.onSpeed);
        this.watch('rpm', VehicleData.vehicle.rpm, this.onRpm);
        this.watch('coolant', VehicleData.temperature.coolant);
        this.watch('outside', VehicleData.temperature.outside);
        this.watch('fuel', VehicleData.fuel.position);
        this.watch('odometer', VehicleData.vehicle.odometer, this.onOdometer);

        this.build();
        this.render();
    },

    focused: function() {
        if (!this.timer) this.timer = setInterval(this.tick.bind(this), 250);
    },

    lost: function() {
        clearInterval(this.timer);
        this.timer = null;
        this.lastSpeed = null;
    },

    watch: function(key, field, handler) {
        this.subscribe(field, function(value) {
            var num = parseFloat(value);
            if (isNaN(num)) return;
            this.data[key] = num;
            if (handler) handler.call(this, num);
        }.bind(this));
    },

    save: function(key, value) {
        if (!this.getStorage()) this.__storage = {};
        this.set(key, value);
    },

    happiness: function() {
        return this.get('happiness', 65);
    },

    nudge: function(amount) {
        this.save('happiness', Math.max(0, Math.min(100, this.happiness() + amount)));
    },

    react: function(mood, ms) {
        this.eventMood = mood;
        this.eventUntil = new Date().getTime() + ms;
        this.lineIndex = Math.floor(Math.random() * this.LINES[mood].length);
        this.render();
    },

    /* ---------- car data ---------- */

    // CASDK only sends data to the app on screen, so skip deltas that span a gap in updates
    onSpeed: function(kmh) {
        var now = new Date().getTime();
        if (this.lastSpeed !== null && now - this.lastSpeedAt < 1500) {
            var delta = Math.abs(kmh - this.lastSpeed);
            if (delta >= this.HARSH_KMH_PER_S) {
                this.nudge(-6);
                this.save('harshTotal', this.get('harshTotal', 0) + 1);
                this.react('ouch', 6000);
            } else if (kmh > this.MOVING_KMH) {
                this.nudge(0.03);   // ~+2 per smooth minute
            }
        }
        this.lastSpeed = kmh;
        this.lastSpeedAt = now;
    },

    onRpm: function(rpm) {
        var now = new Date().getTime();
        if (rpm > this.COLD_REV_RPM && this.data.coolant !== undefined && this.data.coolant < this.COLD_C &&
            now > this.coldRevCooldown) {
            this.coldRevCooldown = now + 30000;
            this.nudge(-8);
            this.react('coldrev', 6000);
        }
    },

    onOdometer: function(km) {
        if (this.get('adoptedKm') === undefined) this.save('adoptedKm', km);
        this.checkOilChange();
        this.render();
    },

    // GT Dash stores its oil data under its own app id; a new oilOdo means an oil change was logged
    gtdash: function() {
        try { return JSON.parse(localStorage.getItem('app.gtdash')) || {}; } catch (e) { return {}; }
    },

    checkOilChange: function() {
        var oilOdo = this.gtdash().oilOdo;
        if (oilOdo !== undefined && oilOdo !== this.get('seenOilOdo')) {
            if (this.get('seenOilOdo') !== undefined) {
                this.nudge(20);
                this.react('ecstatic', 8000);
            }
            this.save('seenOilOdo', oilOdo);
        }
    },

    oilOverdue: function() {
        var g = this.gtdash(), km = this.data.odometer;
        if (g.oilOdo === undefined || km === undefined) return false;
        var interval = g.oilInterval || 5000;
        var driven = this.isMetric() ? km - g.oilOdo : (km - g.oilOdo) * 0.621371;
        return driven > interval;
    },

    isMetric: function() {
        return this.getRegion() !== 'na';
    },

    moving: function() {
        return (this.data.speed || 0) > this.MOVING_KMH;
    },

    /* ---------- mood ---------- */

    mood: function() {
        var now = new Date();
        if (this.eventMood && now.getTime() < this.eventUntil) return this.eventMood;
        if (this.oilOverdue()) return 'sick';
        if (this.data.fuel !== undefined && this.data.fuel < this.LOW_FUEL) return 'hungry';
        var hour = now.getHours();
        if ((hour >= 23 || hour < 5) && !this.moving()) return 'sleepy';
        if (this.data.outside !== undefined && this.data.outside <= 0) return 'cold';
        if (this.data.outside !== undefined && this.data.outside >= 33) return 'hot';
        var h = this.happiness();
        if (h >= 80) return 'ecstatic';
        if (h >= 55) return 'happy';
        if (h >= 30) return 'meh';
        return 'grumpy';
    },

    // the face shape for each mood
    FACE: {
        sick: 'sad', hungry: 'sad', ouch: 'shock', coldrev: 'shock', sleepy: 'sleep', cold: 'meh',
        hot: 'meh', ecstatic: 'grin', happy: 'smile', meh: 'meh', grumpy: 'sad', petted: 'grin'
    },

    level: function() {
        var km = this.data.odometer, start = this.get('adoptedKm');
        if (km === undefined || start === undefined) return {level: 1, into: 0};
        var miles = (km - start) * 0.621371;
        return {level: Math.floor(miles / this.MILES_PER_LEVEL) + 1, into: (miles % this.MILES_PER_LEVEL) / this.MILES_PER_LEVEL, miles: miles};
    },

    /* ---------- controls ---------- */

    onControllerEvent: function(eventId) {
        switch (eventId) {
            case 'cw':
            case 'ccw':
                this.page = this.page ? 0 : 1;
                break;
            case 'selectStart':
                if (this.moving()) break;
                var hour = Math.floor(new Date().getTime() / 3600000);
                if (this.get('petHour') !== hour) { this.save('petHour', hour); this.save('pets', 0); }
                if (this.get('pets', 0) < 5) {   // petting helps, but only a little per hour
                    this.save('pets', this.get('pets', 0) + 1);
                    this.nudge(3);
                }
                this.react('petted', 2500);
                this.hearts = 8;
                break;
        }
        this.render();
    },

    /* ---------- rendering ---------- */

    build: function() {
        this.el.innerHTML =
            '<div class="stage">' +
                '<div class="bubble"></div>' +
                '<div class="pet">' +
                    '<div class="body"><div class="belly"></div>' +
                        '<div class="eye l"><i></i></div><div class="eye r"><i></i></div>' +
                        '<div class="cheek l"></div><div class="cheek r"></div>' +
                        '<div class="mouth"></div>' +
                        '<div class="scarf"></div><div class="drop"></div><div class="zzz">z Z</div>' +
                    '</div>' +
                    '<div class="foot l"></div><div class="foot r"></div>' +
                    '<div class="heart">&#10084;</div>' +
                '</div>' +
                '<div class="shadow"></div>' +
            '</div>' +
            '<div class="meter"><span>MOOD</span><div class="bar"><div></div></div>' +
                '<span class="lvl"></span></div>' +
            '<div class="stats"></div>';
        this.$ = {
            stage: this.el.getElementsByClassName('stage')[0],
            pet: this.el.getElementsByClassName('pet')[0],
            bubble: this.el.getElementsByClassName('bubble')[0],
            fill: this.el.getElementsByClassName('bar')[0].firstChild,
            lvl: this.el.getElementsByClassName('lvl')[0],
            stats: this.el.getElementsByClassName('stats')[0]
        };
    },

    render: function() {
        if (!this.$) return;
        var mood = this.mood(), lines = this.LINES[mood], lv = this.level();
        this.$.pet.className = 'pet face-' + this.FACE[mood] + ' mood-' + mood;
        this.$.bubble.innerHTML = lines[this.lineIndex % lines.length];
        this.$.fill.style.width = Math.round(this.happiness()) + '%';
        this.$.lvl.innerHTML = 'LV ' + lv.level;

        var showStats = this.page === 1;
        this.$.stage.style.display = showStats ? 'none' : 'block';
        this.$.stats.style.display = showStats ? 'block' : 'none';
        if (showStats) {
            var dist = lv.miles === undefined ? '--' : Math.round(this.isMetric() ? lv.miles / 0.621371 : lv.miles).toLocaleString();
            this.$.stats.innerHTML =
                this.cell('LEVEL', lv.level, Math.round(lv.into * 100) + '% to next') +
                this.cell('TOGETHER', dist, this.isMetric() ? 'km driven' : 'miles driven') +
                this.cell('MOOD', Math.round(this.happiness()), 'out of 100') +
                this.cell('HARSH MOMENTS', this.get('harshTotal', 0), 'since we met');
        }
    },

    cell: function(label, value, sub) {
        return '<div class="cell"><span>' + label + '</span><b>' + value + '</b><i>' + sub + '</i></div>';
    },

    // 4 frames per second: blink, bob, hearts, and rotate speech lines every ~12 s
    tick: function() {
        this.frame++;
        var pet = this.$.pet;
        var blink = this.frame % 16 === 0;
        var bob = Math.floor(this.frame / 2) % 2 === 0;
        pet.style.top = (bob ? 0 : 4) + 'px';
        if (blink) pet.className += ' blink';
        else pet.className = pet.className.replace(' blink', '');

        if (this.hearts > 0) {
            this.hearts--;
            pet.className = pet.className.replace(' loved', '') + (this.hearts > 0 ? ' loved' : '');
        }
        if (this.frame % 48 === 0) {
            this.lineIndex++;
            this.checkOilChange();
            this.render();
        } else if (this.eventMood && new Date().getTime() >= this.eventUntil) {
            this.eventMood = null;
            this.render();
        }
    }
}));
