var _ = require('underscore'),
    util = require('util'),
    Curve = require('./curve');

var GameSimulation = function() {
  var self = this;

  this.isRunning = false;
  this.curves = {};

  this.updateRate = 1000.0/33.0;
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
          angle: c.angle
      };
    });

    self.emit('snapshot', snapshot);
  };
};

GameSimulation.WIDTH = 770;
GameSimulation.HEIGHT = 480;

util.inherits(GameSimulation, require('events').EventEmitter);

module.exports = GameSimulation;