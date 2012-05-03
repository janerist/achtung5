
var Game = function(width, height) {
  var self = this;

  this.width = width;
  this.height = height;

  this.curves = {};

  this.drawRate = 1000.0/33.0;
  this.correctionThreshold = 7.0;

  this.canvas = document.getElementById('gamecanvas');
  this.context = this.canvas.getContext('2d');

  this.snapshotCounter = 0;

  this.isRunning = false;

  this.start = function(players) {
    self.curves = {};
    $.each(players, function(i, p) {
      self.curves[p.nickname] = new Curve(p.color, width, height);
      if (nickname == p.nickname) {
        self.curves[p.nickname].checkCollision = true;
      }
    });

    self.drawInterval = setInterval(self.draw, self.drawRate);
    self.clearCanvas();
    self.isRunning = true;
  };

  this.stop = function() {
    clearInterval(self.drawInterval);
    self.isRunning = false;
  };

  this.addSnapshot = function(snapshot) {
    $.each(snapshot, function(nickname, s) {
      var curve = self.curves[nickname];
      
      if (!curve.x) {
        curve.x = s.x;
      } else {
        if (Math.abs(s.x - curve.x) >= this.correctionThreshold) {
          curve.x = s.x;
        }
      }

      if (!curve.y) {
        curve.y = s.y;
      } else {
        if (Math.abs(s.y - curve.y) >= this.correctionThreshold) {
          curve.y = s.y;
        }
      }
      
      curve.angle = s.angle;
    });

    self.snapshotCounter = self.snapshotCounter + 1;
  };

  this.draw = function() {
    $.each(self.curves, function(i, c) {
      if (c.isActive) {
        c.draw(self.context);
      }
    });
  };

  this.clearCanvas = function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };
 
};

var collisionThreshold = 175;

var Curve = function(color, width, height) {
  this.color = color;
  this.angle = 0.0;
  this.size = 3;
  this.speed = 2.2;
  this.steerSpeed = 5.4;
  this.isActive = true;

  this.width = width;
  this.height = height;

  this.checkCollision = false;
};

Curve.prototype.draw = function(context) {
  if (!(this.x && this.y)) {
    return;
  }

  var dx = Math.sin(this.angle * Math.PI / 180) * this.speed;
  var dy = -Math.cos(this.angle * Math.PI / 180) * this.speed;

  if (this.checkCollision) {
    var imagedata = context.getImageData(this.x + dx, this.y + dy, 1, 1);
    if (imagedata.data[3] > collisionThreshold) {
      this.isActive = false;
      socket.emit('dead');
    }
  }

  context.fillStyle = this.color;
  context.strokeStyle = this.color;
  context.lineWidth = this.size;

  context.beginPath();
  context.moveTo(this.x, this.y);
  context.lineTo(this.x + dx, this.y + dy);
  context.stroke();

  this.x = this.x + dx;
  this.y = this.y + dy;

  this.x = this.x < 0 ? this.width : this.x;
  this.x = this.x > this.width ? 0 : this.x;
  this.y = this.y < 0 ? this.height : this.y;
  this.y = this.y > this.height ? 0 : this.y;
};




