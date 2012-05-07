var _ = require('underscore'),
    util = require('util');

var GameSimulation = function() {
  var self = this;

  this.isRunning = false;
  this.curves = {};

  this.updateRate = 1000.0/60.0;
  this.snapshotRate = 1000.0/20.0;
  
  this.start = function(players) {
    self.curves = {};
    _.each(players, function(p) {
      self.curves[p.nickname] = new Curve(GameSimulation.WIDTH, GameSimulation.HEIGHT);
      p.isPlaying = true;
    });

    self.isRunning = true;

    self.updateInterval = setInterval(self.update, self.updateRate);
    self.snapshotInterval = setInterval(self.sendSnapshot, self.snapshotRate);
  };

  this.stop = function() {
    self.isRunning = false;
    clearInterval(self.updateInterval);
    clearInterval(self.snapshotInterval);
  };

  this.update = function() {
    _.each(self.curves, function(c) {
      if (c.isActive) {
        c.update();
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
          gap: c.gap > 0
      };
    });

    self.emit('snapshot', snapshot);
  };
};

GameSimulation.WIDTH = 770;
GameSimulation.HEIGHT = 480;

util.inherits(GameSimulation, require('events').EventEmitter);

var Curve = function() {
  this.speed = 0.9;
  this.steerSpeed = 3.0;
  this.x = Math.random() * GameSimulation.WIDTH;
  this.y = Math.random() * GameSimulation.HEIGHT;

  this.angle = 0;
  this.gap = 0;
  this.isActive = true;

  this.isLeftKeyDown = false;
  this.isRightKeyDown = false;

  this.gapDuration = 13;
  this.prepareNextGap();
};

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

  this.x = this.x < 0 ? GameSimulation.WIDTH : this.x;
  this.x = this.x > GameSimulation.WIDTH ? 0 : this.x;
  this.y = this.y < 0 ? GameSimulation.HEIGHT : this.y;
  this.y = this.y > GameSimulation.HEIGHT ? 0 : this.y;

  if (this.gap > 0) {
    this.gap = this.gap - 1;
    if (this.gap === 0) {
      this.prepareNextGap();
    }
  }
};

Curve.prototype.prepareNextGap = function() {
  var that = this;
  setTimeout(function() {
    // don't create gap if player is turning
    if (that.isLeftKeyDown || that.isRightKeyDown) {
      that.prepareNextGap();
    } else {
      that.gap = that.gapDuration;
    }
  }, 3000 + Math.random()*1000);
};

module.exports = GameSimulation;