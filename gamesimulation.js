var _ = require('underscore'),
    util = require('util');

var grid = [];

var GameSimulation = function() {
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
    for (var y = 0; y < GameSimulation.HEIGHT; y += Curve.DEFAULT_SIZE) {
      var row = [];
      for (var x = 0; x < GameSimulation.WIDTH; x += Curve.DEFAULT_SIZE) {
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
      if (c.isActive) {
        c.update();
        if (!c.isActive) {
          if (self.activeCurves > 1) {
            self.emit('playerDead', nickname);
            self.activeCurves = self.activeCurves - 1;
          } else {
            c.isActive = true;
          }
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
    });

    self.emit('snapshot', snapshot);
  };
};

GameSimulation.WIDTH = 770;
GameSimulation.HEIGHT = 480;

util.inherits(GameSimulation, require('events').EventEmitter);

var Curve = function() {
  this.speed = Curve.DEFAULT_SPEED;
  this.steerSpeed = Curve.DEFAULT_STEERSPEED;
  this.size = Curve.DEFAULT_SIZE;
  this.x = Math.random() * GameSimulation.WIDTH;
  this.y = Math.random() * GameSimulation.HEIGHT;

  this.angle = 0;
  this.isActive = true;

  this.isLeftKeyDown = false;
  this.isRightKeyDown = false;

  this.gapDuration = 0;

  this.prepareNextGap();
};

Curve.DEFAULT_SIZE = 2;
Curve.DEFAULT_SPEED = 1.3;
Curve.DEFAULT_STEERSPEED = 3.5;
Curve.GAP_DURATION = 15;

Curve.prototype.update = function() {
  var dx = Math.sin(this.angle * Math.PI / 180) * this.speed;
  var dy = -Math.cos(this.angle * Math.PI / 180) * this.speed;

  if (this.isLeftKeyDown) {
    this.angle = this.angle - this.steerSpeed;
  }

  if (this.isRightKeyDown) {
    this.angle = this.angle + this.steerSpeed;
  }

  if (this.gapDuration > 0) {
    this.gapDuration = this.gapDuration - 1;
    if (this.gapDuration === 0) {
      this.prepareNextGap();
    }
  }

  this.x = this.x + dx;
  this.y = this.y + dy;

  this.x = this.x < 0 ? GameSimulation.WIDTH : this.x;
  this.x = this.x > GameSimulation.WIDTH ? 0 : this.x;
  this.y = this.y < 0 ? GameSimulation.HEIGHT : this.y;
  this.y = this.y > GameSimulation.HEIGHT ? 0 : this.y;

  if (this.gapDuration === 0) {
    var gridX = Math.round(this.x / Curve.DEFAULT_SIZE);
    var gridY = Math.round(this.y / Curve.DEFAULT_SIZE);

    if (withinBounds(gridX, gridY)) {
      grid[gridY][gridX] = 1;
    }
  }

  var collGridX = Math.round((this.x + dx*(Curve.DEFAULT_SIZE+1))/Curve.DEFAULT_SIZE);
  var collGridY = Math.round((this.y + dy*(Curve.DEFAULT_SIZE+1))/Curve.DEFAULT_SIZE);

  if (withinBounds(collGridX, collGridY)) {
    var val = grid[collGridY][collGridX];
    if (val === 1) {
        this.isActive = false;
    }
  }
};

Curve.prototype.prepareNextGap = function() {
  var that = this;

  setTimeout(function() {
      that.gapDuration = Curve.GAP_DURATION;
  }, 3000);
};

function withinBounds(x, y) {
  return x >= 0 && x < GameSimulation.WIDTH/Curve.DEFAULT_SIZE &&
    y >= 0 && y < GameSimulation.HEIGHT/Curve.DEFAULT_SIZE;
}

module.exports = GameSimulation;
