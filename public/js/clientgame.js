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
      self.curves[p.nickname] = new ClientCurve(p.color);
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

      if (!curve || curve.isDead) {
        return;
      }

      diffX = s.x - curve.x;
      if (Math.abs(diffX) > self.correctionThreshold) {
        curve.x = s.x;
      } else {
        curve.x = curve.x + diffX * self.smoothTime;
      }

      diffY = s.y - curve.y;
      if (Math.abs(diffY) > self.correctionThreshold) {
        curve.y = s.y;
      } else {
        curve.y = curve.y + diffY * self.smoothTime;
      }

      curve.angle = s.angle;
      curve.size = s.size;
      curve.speed = s.speed;
      curve.steerSpeed = s.steerSpeed;

      if (curve.gap && !s.gap) {
        curve.fillGap(self.context);
        curve.gapLine.length = 0;
      }

      curve.gap = s.gap;
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

var ClientCurve = function(color) {
  this.color = color;
  this.isDead = false;
  this.x = 0.0;
  this.y = 0.0;
  this.speed = 0.0;
  this.steerSpeed = 0.0;
  this.size = 0;
  this.angle = 0.0;
  this.gapLine = [];
};

ClientCurve.prototype.draw = function(context, elapsedTime) {
  var dx = Math.sin(this.angle * Math.PI / 180) * this.speed * elapsedTime;
  var dy = -Math.cos(this.angle * Math.PI / 180) * this.speed * elapsedTime;

  if (this.gap) {
    context.strokeStyle = '#555555';
    this.gapLine.push({
      x: this.x, y: this.y, dx: dx, dy: dy
    });
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

ClientCurve.prototype.fillGap = function(context) {
  context.strokeStyle = 'black';
  context.lineWidth = this.size + 1;
  context.beginPath();
  $.each(this.gapLine, function(i, g) {
    context.moveTo((0.5 + g.x) << 0, (0.5 + g.y) << 0);
    context.lineTo((0.5 + g.x + g.dx) << 0, (0.5 + g.y + g.dy) << 0);
  });

  context.stroke();
};
