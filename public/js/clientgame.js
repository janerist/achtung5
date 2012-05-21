var Game = function(width, height) {
  var self = this;

  this.width = width;
  this.height = height;

  this.curves = {};

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

    self.clearCanvas();
    self.isRunning = true;

    self.lastTime = Date.now();
    self.draw(self.lastTime);
  };

  this.stop = function() {
    self.isRunning = false;
    window.cancelAnimationFrame(self.raf);
  };

  this.addSnapshot = function(snapshot) {
    var diffX, diffY;
    $.each(snapshot, function(nick, s) {
      var curve = self.curves[nick];

      if (curve.isDead) {
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

      if (oldGapValue && !curve.gap) {
        curve.fillGap(s.gapLine, self.context);
      }
    });
  };

  this.draw = function(time) {
    var elapsedTime = (time - self.lastTime) / 1000;
    self.lastTime = time;
    self.raf = window.requestAnimationFrame(self.draw);

    $.each(self.curves, function(i, c) {
      if (!c.isDead) {
        c.draw(self.context, elapsedTime);
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
      c.isDead = true;
    }
  };
};

var Curve = function(color, width, height) {
  this.color = color;
  this.angle = 0.0;
  this.size = 3;
  this.speed = 88.0;
  this.steerSpeed = 3.5;
  this.isDead = false;

  this.width = width;
  this.height = height;

  this.gap = false;
};

Curve.prototype.draw = function(context, elapsedTime) {
  if (!(this.x && this.y)) {
    return;
  }

  var dx = Math.sin(this.angle * Math.PI / 180) * this.speed * elapsedTime;
  var dy = -Math.cos(this.angle * Math.PI / 180) * this.speed * elapsedTime;

  if (this.gap) {
    context.strokeStyle = '#555555';
  } else {
    context.strokeStyle = this.color;
  }

  context.lineWidth = this.size;
  context.lineCap = 'round';

  context.beginPath();
  context.moveTo((0.5 + this.x) << 0, (0.5 + this.y) << 0);
  context.lineTo((0.5 + this.x + dx) << 0, (0.5 + this.y + dy) << 0);
  context.stroke();

  this.x = this.x + dx;
  this.y = this.y + dy;
};

Curve.prototype.fillGap = function(gapLine, context) {
  context.strokeStyle = 'black';
  context.lineWidth = this.size + 4;
  context.beginPath();
  context.moveTo((0.5 + gapLine.startX) << 0, (0.5 + gapLine.startY) << 0);
  context.lineTo((0.5 + gapLine.endX) << 0, (0.5 + gapLine.endY) << 0);
  context.stroke();
};
