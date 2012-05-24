var _ = require('underscore'),
    util = require('util');

var grid = [];

var Game = function() {
  var self = this;

  this.isRunning = false;
  this.curves = {};

  this.updateRate = 1000.0/60.0;
  this.snapshotRate = 1000.0/20.0;

  this.activeCurves = 0;

  this.start = function(players) {
    self.curves = {};
    _.each(players, function(p) {
      self.curves[p.nickname] = new ServerCurve();
      p.isPlaying = true;
    });

    self.isRunning = true;
    self.activeCurves = _.size(self.curves);

    grid = [];
    for (var y = 0; y < Game.HEIGHT; y += ServerCurve.DEFAULT_SIZE) {
      var row = [];
      for (var x = 0; x < Game.WIDTH; x += ServerCurve.DEFAULT_SIZE) {
        row.push(0);
      }
      grid.push(row);
    }

    self.lastTime = Date.now();
    self.updateInterval = setInterval(self.update, self.updateRate);
    self.snapshotInterval = setInterval(self.sendSnapshot, self.snapshotRate);
  };

  this.stop = function() {
    self.isRunning = false;
    clearInterval(self.updateInterval);
    clearInterval(self.snapshotInterval);
  };

  this.update = function() {
    var time = Date.now();
    var elapsedTime = (time - self.lastTime) / 1000;
    self.lastTime = time;

    _.each(self.curves, function(c, nickname) {
      if (c.isDead) {
        return;
      }

      c.update(elapsedTime);

      if (c.isDead) {
        if (self.activeCurves > 1) {
          self.emit('playerDead', nickname);
          self.activeCurves = self.activeCurves - 1;
        } else {
          c.isDead = false;
        }
      }
    });
  };

  this.sendSnapshot = function() {
    var snapshot = {};
    _.each(self.curves, function(c, nickname) {
        snapshot[nickname] = {
          x: c.x,
          y: c.y,
          angle: c.angle,
          size: c.size,
          speed: c.speed,
          steerSpeed: c.steerSpeed,
          gap: c.gapDuration > 0
      };

      if (c.fillGap) {
        snapshot[nickname].gapLine = c.gapLine;
        c.fillGap = false;
      }
    });

    self.emit('snapshot', snapshot);
  };
};

Game.WIDTH = 770;
Game.HEIGHT = 480;

util.inherits(Game, require('events').EventEmitter);

var ServerCurve = function() {
  this.speed = ServerCurve.DEFAULT_SPEED;
  this.steerSpeed = ServerCurve.DEFAULT_STEERSPEED;
  this.size = ServerCurve.DEFAULT_SIZE;
  this.x = Math.random() * Game.WIDTH;
  this.y = Math.random() * Game.HEIGHT;

  this.angle = 0;
  this.isDead = false;

  this.isLeftKeyDown = false;
  this.isRightKeyDown = false;

  this.gapDuration = -1;
  this.gapCooldown = ServerCurve.GAP_INTERVAL;
  this.gapLine = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  };
  this.fillGap = false;
};

ServerCurve.DEFAULT_SIZE = 3;
ServerCurve.DEFAULT_SPEED = 88.0;
ServerCurve.DEFAULT_STEERSPEED = 3.5;
ServerCurve.GAP_INTERVAL = 180;
ServerCurve.GAP_DURATION = 12;

ServerCurve.prototype.update = function(elapsedTime) {
  var dx = Math.sin(this.angle * Math.PI / 180) * this.speed * elapsedTime;
  var dy = -Math.cos(this.angle * Math.PI / 180) * this.speed * elapsedTime;

  if (this.isLeftKeyDown) {
    this.angle = this.angle - this.steerSpeed;
  }

  if (this.isRightKeyDown) {
    this.angle = this.angle + this.steerSpeed;
  }

  this.x = this.x + dx;
  this.y = this.y + dy;

  if (this.gapDuration > 1 &&
    (this.x < 0 || this.x > Game.WIDTH || this.y < 0 || this.y > Game.HEIGHT)) {
    this.gapDuration = 1;
  }

  if (--this.gapCooldown === 0) {
    this.gapDuration = ServerCurve.GAP_DURATION;
    this.gapLine.startX = this.x;
    this.gapLine.startY = this.y;
  }

  if (--this.gapDuration === 0) {
    this.gapCooldown = ServerCurve.GAP_INTERVAL;
    this.gapLine.endX = this.x;
    this.gapLine.endY = this.y;
    this.fillGap = true;
  }

  this.x = this.x < 0 ? Game.WIDTH : this.x;
  this.x = this.x > Game.WIDTH ? 0 : this.x;
  this.y = this.y < 0 ? Game.HEIGHT : this.y;
  this.y = this.y > Game.HEIGHT ? 0 : this.y;

  if (this.gapCooldown > 0) {
    // collision detection
    var gridX = Math.round(this.x / ServerCurve.DEFAULT_SIZE);
    var gridY = Math.round(this.y / ServerCurve.DEFAULT_SIZE);

    if (gridX >= 0 && gridX < Game.WIDTH/ServerCurve.DEFAULT_SIZE &&
      gridY >= 0 && gridY < Game.HEIGHT/ServerCurve.DEFAULT_SIZE) {
      if (grid[gridY][gridX] === 1 && gridX == this.prevGridX && gridY == this.prevGridY) {
        return;
      } else {
        grid[gridY][gridX] += 1;
        if (grid[gridY][gridX] > 1) {
          this.isDead = true;
        } else {
          this.prevGridX = gridX;
          this.prevGridY = gridY;
        }
      }
    }
  }
};

module.exports = Game;
