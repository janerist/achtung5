var GameSimulation = require('./gamesimulation');

var Curve = function(width, height) {
  this.width = width;
  this.height = height;

  this.speed = 2.2;
  this.steerSpeed = 5.4;
  this.x = Math.random() * width;
  this.y = Math.random() * height;
  console.log(width);
  console.log(height);
  this.angle = 0.0;
  this.isActive = true;

  this.isLeftKeyDown = false;
  this.isRightKeyDown = false;
};

Curve.COLLISION_THRESHOLD = 200;

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

  this.x = this.x < 0 ? this.width : this.x;
  this.x = this.x > this.width ? 0 : this.x;
  this.y = this.y < 0 ? this.height : this.y;
  this.y = this.y > this.height ? 0 : this.y;
};

module.exports = Curve;