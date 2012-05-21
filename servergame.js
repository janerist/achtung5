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
      self.curves[p.nickname] = new Curve();
      p.isPlaying = true;
    });

    self.isRunning = true;
    self.activeCurves = _.size(self.curves);

    grid = [];
    for (var y = 0; y < Game.HEIGHT; y += Curve.DEFAULT_SIZE) {
      var row = [];
      for (var x = 0; x < Game.WIDTH; x += Curve.DEFAULT_SIZE) {
        row.push(0);
      }
      grid.push(row);
    }

    self.updateInterval = setInterval(self.update, self.updateRate);
    self.snapshotInterval = setInterval(self.sendSnapshot, self.snapshotRate);
  };

  this.stop = function() {
    self.isRunning = false;
    clearInterval(self.updateInterval);
    clearInterval(self.snapshotInterval);
  };

  this.update = function() {
    _.each(self.curves, function(c, nickname) {
      if (c.isDead) {
        return;
      }

      c.update();

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

var Curve = function() {
  this.speed = Curve.DEFAULT_SPEED;
  this.steerSpeed = Curve.DEFAULT_STEERSPEED;
  this.size = Curve.DEFAULT_SIZE;
  this.x = Math.random() * Game.WIDTH;
  this.y = Math.random() * Game.HEIGHT;

  this.angle = 0;
  this.isDead = false;

  this.isLeftKeyDown = false;
  this.isRightKeyDown = false;

  this.gapDuration = -1;
  this.gapCooldown = Curve.GAP_INTERVAL;
  this.gapLine = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  };
  this.fillGap = false;
};

Curve.DEFAULT_SIZE = 3;
Curve.DEFAULT_SPEED = 1.3;
Curve.DEFAULT_STEERSPEED = 3.5;
Curve.GAP_INTERVAL = 180;
Curve.GAP_DURATION = 12;

Curve.prototype.update = function() {
  var dx = Math.sin(this.angle * Math.PI / 180) * this.speed;
  var dy = -Math.cos(this.angle * Math.PI / 180) * this.speed;

  if (this.isLeftKeyDown) {
    this.angle = this.angle - this.steerSpeed;
  }

  if (this.isRightKeyDown) {
    this.angle = this.angle + this.steerSpeed;
  }

  this.x = this.x + dx;
  this.y = this.y + dy;

  this.x = this.x < 0 ? Game.WIDTH : this.x;
  this.x = this.x > Game.WIDTH ? 0 : this.x;
  this.y = this.y < 0 ? Game.HEIGHT : this.y;
  this.y = this.y > Game.HEIGHT ? 0 : this.y;

  if (--this.gapCooldown === 0) {
    this.gapDuration = Curve.GAP_DURATION;
    this.gapLine.startX = this.x;
    this.gapLine.startY = this.y;
  }

  if (--this.gapDuration === 0) {
    this.gapCooldown = Curve.GAP_INTERVAL;
    this.gapLine.endX = this.x;
    this.gapLine.endY = this.y;
    this.fillGap = true;
  }

  if (this.gapCooldown > 0) {
    // collision detection
    var gridX = Math.round(this.x / Curve.DEFAULT_SIZE);
    var gridY = Math.round(this.y / Curve.DEFAULT_SIZE);

    if (withinBounds(gridX, gridY)) {
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

function withinBounds(x, y) {
  return x >= 0 && x < Game.WIDTH/Curve.DEFAULT_SIZE &&
    y >= 0 && y < Game.HEIGHT/Curve.DEFAULT_SIZE;
}

module.exports = Game;
