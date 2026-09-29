/**
 * Minimal stand-in for the Mazda CASDK framework so custom apps can run in a desktop browser.
 * Implements only what our apps use: register, subscribe, get/set storage, getRegion, canvas and controller events.
 */

var Sim = {
    region: 'na',
    app: null,
    values: {}
};

var VehicleData = {
    vehicle: {
        speed: {id: 'VDTVehicleSpeed'},
        rpm: {id: 'VDTEngineSpeed'},
        odometer: {id: 'VDTCOdocount'},
        batterylevel: {id: 'VDTCBattery_StateOfCharge'}
    },
    fuel: {
        position: {id: 'VDTFuelGaugePosition'},
        averageconsumption: {id: 'VDTDrv1AvlFuelE'}
    },
    temperature: {
        outside: {id: 'VDTCOut-CarTemperature'},
        intake: {id: 'VDTDR_IntakeAirTemp'},
        coolant: {id: 'PIDEngineCoolantTemperature'}
    },
    gps: {
        latitude: {id: 'GPSLatitude'},
        longitude: {id: 'GPSLongitude'},
        heading: {id: 'GPSHeading'},
        altitude: {id: 'GPSAltitude'}
    }
};

var DataTransform = {
    toMPH: function(kmh) { return Math.round(kmh * 0.621371); }
};

function CustomApplication(definition) {
    for (var key in definition) this[key] = definition[key];
    this.__subscriptions = {};
    this.__storage = null;
}

CustomApplication.prototype.subscribe = function(field, callback) {
    this.__subscriptions[field.id.toLowerCase()] = callback;
};

CustomApplication.prototype.getRegion = function() { return Sim.region; };
CustomApplication.prototype.getStorage = function() { return this.__storage; };

CustomApplication.prototype.get = function(name, fallback) {
    return this.__storage && this.__storage[name] !== undefined ? this.__storage[name] : fallback;
};

CustomApplication.prototype.set = function(name, value) {
    this.__storage[name] = value;  // throws on null storage, like the real CASDK
    try { localStorage.setItem(this.id, JSON.stringify(this.__storage)); } catch (e) {}
};

var CustomApplicationsHandler = {
    register: function(id, app) {
        app.id = id;
        Sim.app = app;
        try { app.__storage = JSON.parse(localStorage.getItem(id)); } catch (e) {}

        var canvas = document.getElementById('canvas');
        canvas.setAttribute('app', id);
        app.canvas = [canvas];
        document.getElementById('title').textContent = app.settings.title;

        // like the real CASDK: load the app's extra scripts before created()
        var scripts = (app.require && app.require.js) || [];
        var base = '../apps/' + id + '/';
        (function next(i) {
            if (i >= scripts.length) {
                app.created();
                if (app.focused) app.focused();
                Sim.replay();
                return;
            }
            var tag = document.createElement('script');
            tag.src = base + scripts[i];
            tag.onload = function() { next(i + 1); };
            document.head.appendChild(tag);
        })(0);
    }
};

Sim.push = function(field, value) {
    Sim.values[field.id] = value;
    var cb = Sim.app && Sim.app.__subscriptions[field.id.toLowerCase()];
    if (cb) cb(value);
};

// values pushed before the app finished loading are re-sent once it is ready
Sim.replay = function() {
    for (var id in Sim.values) {
        var cb = Sim.app.__subscriptions[id.toLowerCase()];
        if (cb) cb(Sim.values[id]);
    }
};

Sim.controller = function(eventId) {
    if (Sim.app && Sim.app.onControllerEvent) Sim.app.onControllerEvent(eventId);
};

Sim.setRegion = function(region) {
    Sim.region = region;
    if (Sim.app && Sim.app.render) Sim.app.render();
};

Sim.resetStorage = function() {
    try { localStorage.removeItem(Sim.app.id); } catch (e) {}
    Sim.app.__storage = null;
    location.reload();
};
