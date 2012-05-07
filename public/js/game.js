
var Game = function(width, height) {
  var self = this;

  this.width = width;
  this.height = height;

  this.curves = {};

  this.drawRate = 1000.0/60.0;
  this.smoothTime = 0.1;
  this.correctionThreshold = 3;

  this.canvas = document.getElementById('gamecanvas');
  this.context = this.canvas.getContext('2d');

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
    var diffX, diffY;
    $.each(snapshot, function(nickname, s) {
      var curve = self.curves[nickname];
      
      if (!curve.isActive) {
        return;
      }
      
      if (!curve.x) {
        curve.x = s.x;
      } else {
        diffX = s.x - curve.x;
        if (Math.abs(diffX) > self.correctionThreshold) {
          curve.x = s.x;
        } else {
          curve.x = curve.x + diffX * self.smoothTime;
        }
      }

      if (!curve.y) {
        curve.y = s.y;
      } else {
        diffY = s.y - curve.y;
        if (Math.abs(diffY) > self.correctionThreshold) {
          curve.y = s.y;
        } else {
          curve.y = curve.y + diffY * self.smoothTime;
        }
      }
      
      curve.gap = s.gap;
      curve.angle = s.angle;
    });
  };

  this.draw = function() {
    $.each(self.curves, function(i, c) {
      if (c.isActive) {
        c.draw(self.context);
      }
    });
  };

  this.clearCanvas = function() {
    self.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  this.setPlayerDead = function(nickname) {
    var c = self.curves[nickname];
    if (c) {
      c.isActive = false;
    }
  };
 
};

var collisionThreshold = 255;

var Curve = function(color, width, height) {
  this.color = color;
  this.angle = 0.0;
  this.size = 3;
  this.speed = 0.9;
  this.steerSpeed = 3.0;
  this.isActive = true;

  this.width = width;
  this.height = height;

  this.checkCollision = false;
  this.gap = false;
};

Curve.prototype.draw = function(context) {
  if (!(this.x && this.y)) {
    return;
  }

  var dx = Math.sin(this.angle * Math.PI / 180) * this.speed;
  var dy = -Math.cos(this.angle * Math.PI / 180) * this.speed;

  if (this.checkCollision) {
    var imagedata = context.getImageData(this.x + (dx*2), this.y + (dy*2), 1, 1);
    if (imagedata.data[3] >= collisionThreshold) {
      this.isActive = false;
      socket.emit('dead');
    }
  }
 
  if (!this.gap) {
    context.fillStyle = this.color;
    context.strokeStyle = context.fillStyle;
    context.lineWidth = this.size;
    context.lineCap = 'round';
    
    context.beginPath();
    context.moveTo(this.x, this.y);
    context.lineTo(this.x + dx, this.y + dy);
    context.stroke();
  }
  
  this.x = this.x + dx;
  this.y = this.y + dy;
};

