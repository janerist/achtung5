var Game = function(width, height) {
  var self = this;

  this.width = width;
  this.height = height;

  this.curves = {};

  this.drawRate = 1000.0/60.0;
  this.smoothTime = 0.25;
  this.correctionThreshold = 3;

  this.canvas = document.getElementById('gamecanvas');
  this.context = this.canvas.getContext('2d');

  this.isRunning = false;

  this.start = function(players) {
    self.curves = {};
    $.each(players, function(i, p) {
      self.curves[p.nickname] = new Curve(p.color, self.width, self.height);
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
    $.each(snapshot, function(nick, s) {
      var curve = self.curves[nick];

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

      curve.angle = s.angle;

      var oldGapValue = curve.gap;
      curve.gap = s.gap;

      if (!oldGapValue && curve.gap) {
        curve.onGapStart();
      }

      if (oldGapValue && !curve.gap) {
        curve.onGapEnd();
      }
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

  this.displayWinner = function(winner) {
    self.context.font = "bold 20px sans-serif";
    self.context.textAlign = 'center';
    self.context.textBaseline = 'middle';

    self.context.fillStyle = '#555';
    self.context.fillText(winner + ' wins the round!', self.width/2, self.height/2);

    self.context.fillStyle = 'white';
    self.context.fillText(winner + ' wins the round!', self.width/2 - 2, self.height/2 - 2);
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
  this.speed = 1.3;
  this.steerSpeed = 3.5;
  this.isActive = true;

  this.width = width;
  this.height = height;

  this.gap = false;
  this.fillGap = false;
  this.gapLine = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  };
};

Curve.prototype.draw = function(context) {
  if (!(this.x && this.y)) {
    return;
  }

  var dx = Math.sin(this.angle * Math.PI / 180) * this.speed;
  var dy = -Math.cos(this.angle * Math.PI / 180) * this.speed;

  if (this.fillGap) {
    context.strokeStyle = 'black';
    context.lineWidth = this.size + 4;
    context.beginPath();
    context.moveTo(this.gapLine.startX, this.gapLine.startY);
    context.lineTo(this.gapLine.endX, this.gapLine.endY);
    context.stroke();

    this.fillGap = false;
  }

  if (this.gap) {
    context.strokeStyle = '#555555';
  } else {
    context.strokeStyle = this.color;
  }

  context.lineWidth = this.size;
  context.lineCap = 'round';

  context.beginPath();
  context.moveTo(this.x, this.y);
  context.lineTo(this.x + dx, this.y + dy);
  context.stroke();

  this.x = this.x + dx;
  this.y = this.y + dy;
};

Curve.prototype.onGapStart = function() {
  this.gapLine.startX = this.x;
  this.gapLine.startY = this.y;
};

Curve.prototype.onGapEnd = function() {
  this.gapLine.endX = this.x;
  this.gapLine.endY = this.y;
  this.fillGap = true;
};

