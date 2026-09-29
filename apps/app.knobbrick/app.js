/**
 * Knob Breakout: a brick breaker played with the commander knob (CASDK custom application)
 *
 * Controls:
 *   Rotate knob   move paddle
 *   Press knob    launch ball / restart after game over
 *
 * Safety: the game pauses automatically whenever the car is moving.
 *
 * Plain DOM elements and ES5 only, so it runs on the CMU's old browser.
 * The frame loop only runs while the app is on screen.
 */

CustomApplicationsHandler.register("app.knobbrick", new CustomApplication({

    require: {
        js: [],
        css: ['app.css'],
        images: {}
    },

    settings: {
        title: 'Knob Breakout',
        statusbar: true,
        statusbarIcon: false,
        hasLeftButton: false,
        hasMenuCaret: false,
        hasRightArc: false
    },

    W: 800,
    H: 416,
    COLS: 8,
    ROWS: 5,
    BRICK_W: 90,
    BRICK_H: 22,
    BRICK_GAP: 6,
    BRICK_TOP: 56,
    PADDLE_W: 120,
    PADDLE_H: 14,
    BALL: 14,
    KNOB_STEP: 55,       // paddle pixels per knob click
    FRAME_MS: 33,        // ~30 fps
    MOVING_KMH: 3,       // above this the game locks

    created: function() {
        var root = this.canvas[0];
        this.el = document.createElement('div');
        this.el.className = 'bo';
        root.appendChild(this.el);

        this.hud = this.add('hud', '');
        this.message = this.add('msg', '');
        this.paddle = this.add('paddle', '');
        this.ball = this.add('ball', '');

        this.bricks = [];
        for (var r = 0; r < this.ROWS; r++) {
            for (var c = 0; c < this.COLS; c++) {
                var b = this.add('brick row' + r, '');
                var margin = (this.W - (this.COLS * this.BRICK_W + (this.COLS - 1) * this.BRICK_GAP)) / 2;
                b.style.left = (margin + c * (this.BRICK_W + this.BRICK_GAP)) + 'px';
                b.style.top = (this.BRICK_TOP + r * (this.BRICK_H + this.BRICK_GAP)) + 'px';
                this.bricks.push({el: b, x: parseFloat(b.style.left), y: parseFloat(b.style.top), alive: true});
            }
        }

        this.moving = false;
        this.best = this.get('best', 0);

        this.subscribe(VehicleData.vehicle.speed, function(kmh) {
            var moving = parseFloat(kmh) > this.MOVING_KMH;
            if (moving !== this.moving) {
                this.moving = moving;
                this.draw();
            }
        }.bind(this));

        this.newGame();
    },

    focused: function() {
        if (!this.timer) this.timer = setInterval(this.step.bind(this), this.FRAME_MS);
    },

    lost: function() {
        clearInterval(this.timer);
        this.timer = null;
    },

    add: function(className, html) {
        var d = document.createElement('div');
        d.className = className;
        d.innerHTML = html;
        this.el.appendChild(d);
        return d;
    },

    save: function(key, value) {
        if (!this.getStorage()) this.__storage = {};
        this.set(key, value);
    },

    /* ---------- game state ---------- */

    newGame: function() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.resetBricks();
        this.resetBall();
    },

    resetBricks: function() {
        for (var i = 0; i < this.bricks.length; i++) {
            this.bricks[i].alive = true;
            this.bricks[i].el.style.visibility = 'visible';
        }
        this.bricksLeft = this.bricks.length;
    },

    resetBall: function() {
        this.state = 'ready';
        this.paddleX = (this.W - this.PADDLE_W) / 2;
        this.paddleTarget = this.paddleX;
        this.speed = 6 + this.level;
        this.stickBall();
        this.draw();
    },

    stickBall: function() {
        this.bx = this.paddleX + this.PADDLE_W / 2 - this.BALL / 2;
        this.by = this.paddleY() - this.BALL - 1;
    },

    paddleY: function() {
        return this.H - 34;
    },

    launch: function() {
        var angle = (Math.random() * 0.8 - 0.4);
        this.dx = this.speed * Math.sin(angle);
        this.dy = -this.speed * Math.cos(angle);
        this.state = 'play';
    },

    onControllerEvent: function(eventId) {
        switch (eventId) {
            case 'cw':
            case 'rightStart':
                this.paddleTarget = Math.min(this.W - this.PADDLE_W, this.paddleTarget + this.KNOB_STEP);
                break;
            case 'ccw':
            case 'leftStart':
                this.paddleTarget = Math.max(0, this.paddleTarget - this.KNOB_STEP);
                break;
            case 'selectStart':
                if (this.moving) break;
                if (this.state === 'ready') this.launch();
                else if (this.state === 'over') this.newGame();
                break;
        }
        this.draw();
    },

    /* ---------- frame loop ---------- */

    step: function() {
        if (this.moving || this.state === 'over') return;

        // ease paddle toward the knob target so it glides instead of jumping
        this.paddleX += (this.paddleTarget - this.paddleX) * 0.5;

        if (this.state === 'ready') {
            this.stickBall();
            this.draw();
            return;
        }

        this.bx += this.dx;
        this.by += this.dy;

        // walls
        if (this.bx <= 0) { this.bx = 0; this.dx = Math.abs(this.dx); }
        if (this.bx >= this.W - this.BALL) { this.bx = this.W - this.BALL; this.dx = -Math.abs(this.dx); }
        if (this.by <= 40) { this.by = 40; this.dy = Math.abs(this.dy); }

        // paddle: bounce angle depends on where the ball hits
        var py = this.paddleY();
        if (this.dy > 0 && this.by + this.BALL >= py && this.by + this.BALL <= py + this.PADDLE_H + this.speed &&
            this.bx + this.BALL >= this.paddleX && this.bx <= this.paddleX + this.PADDLE_W) {
            var hit = (this.bx + this.BALL / 2 - this.paddleX) / this.PADDLE_W;   // 0..1
            var angle = (hit - 0.5) * 2.1;                                          // about ±60°
            this.dx = this.speed * Math.sin(angle);
            this.dy = -this.speed * Math.cos(angle);
            this.by = py - this.BALL;
        }

        // bricks
        for (var i = 0; i < this.bricks.length; i++) {
            var b = this.bricks[i];
            if (!b.alive) continue;
            if (this.bx + this.BALL > b.x && this.bx < b.x + this.BRICK_W &&
                this.by + this.BALL > b.y && this.by < b.y + this.BRICK_H) {
                b.alive = false;
                b.el.style.visibility = 'hidden';
                this.bricksLeft--;
                this.score += 10 * this.level;

                // bounce off the side we came in from
                var fromSide = (this.bx + this.BALL - this.dx <= b.x) || (this.bx - this.dx >= b.x + this.BRICK_W);
                if (fromSide) this.dx = -this.dx; else this.dy = -this.dy;
                break;
            }
        }

        if (this.bricksLeft === 0) {
            this.level++;
            this.resetBricks();
            this.resetBall();
            return;
        }

        // missed
        if (this.by > this.H) {
            this.lives--;
            if (this.lives <= 0) {
                this.state = 'over';
                if (this.score > this.best) {
                    this.best = this.score;
                    this.save('best', this.best);
                }
            } else {
                this.resetBall();
                return;
            }
        }

        this.draw();
    },

    /* ---------- drawing ---------- */

    draw: function() {
        this.paddle.style.left = Math.round(this.paddleX) + 'px';
        this.paddle.style.top = this.paddleY() + 'px';
        this.ball.style.left = Math.round(this.bx) + 'px';
        this.ball.style.top = Math.round(this.by) + 'px';
        this.ball.style.display = this.state === 'over' ? 'none' : 'block';

        var hearts = '';
        for (var i = 0; i < this.lives; i++) hearts += '&#9679; ';
        this.hud.innerHTML = '<span>SCORE ' + this.score + '</span>' +
            '<span>LEVEL ' + this.level + '</span>' +
            '<span class="lives">' + hearts + '</span>' +
            '<span>BEST ' + this.best + '</span>';

        var msg = '';
        if (this.moving) msg = 'PAUSED<small>Parked only - resumes when you stop</small>';
        else if (this.state === 'ready') msg = '<small>Rotate knob to aim &middot; press to launch</small>';
        else if (this.state === 'over') msg = 'GAME OVER<small>Press knob to play again</small>';
        this.message.innerHTML = msg;
        this.message.style.display = msg ? 'block' : 'none';
        this.el.className = 'bo' + (this.moving ? ' locked' : '');
    }
}));
