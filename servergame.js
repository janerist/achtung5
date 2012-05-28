var _ = require('underscore'),
    util = require('util'),
    collisionGrid,
    collisionGridCellSize,
    collisionGridWidth,
    collisionGridHeight;

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
    });

    self.isRunning = true;
    self.curvesAlive = _.size(self.curves);

    collisionGridCellSize = ServerCurve.DEFAULT_SIZE;
    collisionGridWidth = Game.WIDTH / collisionGridCellSize;
    collisionGridHeight = Game.HEIGHT / collisionGridCellSize;

    if (typeof collisionGrid !== 'undefined') {
      collisionGrid.length = 0;
    } else {
      collisionGrid = [];
    }

    for (var y = 0; y < Game.HEIGHT; y += collisionGridCellSize) {
      var row = [];
      for (var x = 0; x < Game.WIDTH; x += collisionGridCellSize) {
        row.push(0);
      }
      collisionGrid.push(row);
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
        if (self.curvesAlive > 1) {
          self.curvesAlive = self.curvesAlive - 1;
          self.emit('playerDead', nickname);
        } else {
          c.isDead = false;
        }
      }
    });

    if (self.curvesAlive == 1) {
      self.stop();

      var winner = _.filter(self.curves, function(c, nick) {
        c.nickname = nick;
        return !c.isDead;
      })[0].nickname;

      self.emit('winner', winner);
    }
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
ServerCurve.DEFAULT_STEERSPEED = 245.0;
ServerCurve.GAP_INTERVAL = 180;
ServerCurve.GAP_DURATION = 12;

ServerCurve.prototype.update = function(elapsedTime) {
  var dx = Math.sin(this.angle * Math.PI / 180) * this.speed * elapsedTime;
  var dy = -Math.cos(this.angle * Math.PI / 180) * this.speed * elapsedTime;

  if (this.isLeftKeyDown) {
    this.angle = this.angle - (this.steerSpeed * elapsedTime);
  }

  if (this.isRightKeyDown) {
    this.angle = this.angle + (this.steerSpeed * elapsedTime);
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
    var gridX = 0.5 + this.x / collisionGridCellSize << 0;
    var gridY = 0.5 + this.y / collisionGridCellSize << 0;

    if (gridX < 0 || gridX >= collisionGridWidth ||
      gridY < 0 || gridY >= collisionGridHeight) {
      return;
    }

    var gridValue = collisionGrid[gridY][gridX];
    if (gridX == this.prevGridX && gridY == this.prevGridY && gridValue === 1) {
      return;
    }

    gridValue++;
    this.prevGridX = gridX;
    this.prevGridY = gridY;
    collisionGrid[gridY][gridX] = gridValue;

    if (gridValue > 1) {
      this.isDead = true;
    }
  }
};

module.exports = Game;
