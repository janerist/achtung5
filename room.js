var _ = require('underscore'),
    util = require('util'),
    Game = require('./servergame');

var Player = function(nickname, color) {
  this.nickname = nickname;
  this.color = color;
  this.score = 0;
};

var Room = function(id) {
  this.id = id;
  this.players = {};
  this.colors = [
    '#ff0000', // red
    '#00ff00', // green
    '#0000ff', // blue
    '#ffff00', // yellow
    '#00ffff', // cyan
    '#ffffff', // white
    '#ff00ff', // pink
    '#ff8000' // orange
  ];

  // possible states: pregame, preRound, round, postgame
  this.state = 'pregame';

  this.game = new Game();
  this.scoreLimit = 0;
  this.round = 0;

  var that = this;

  this.game.on('snapshot', function(snapshot) {
    that.emit('snapshot', snapshot);
  });

  this.game.on('playerDead', function(nickname) {
    var player = that.players[nickname];
    var points = _.size(that.game.curves) - that.game.curvesAlive;

    if (player) {
      player.score += points;
    }

    that.emit('playerDead', nickname, points);
  });

  this.game.on('winner', function(nickname) {
    var player = that.players[nickname];
    var points = _.size(that.game.curves);
    if (player) {
      player.score += points;
    }

    that.emit('roundEnded', nickname, points);
    that._endRound();
  });
};

Room.MAX_PLAYERS = 8;
Room.REQUIRED_PLAYERS = 2;
Room.ROUND_COUNTDOWN_DURATION = 5;
Room.GAME_OVER_COUNTDOWN_DURATION = 10;

util.inherits(Room, require('events').EventEmitter);

Room.prototype.getPlayerCount = function() {
  return _.size(this.players);
};

Room.prototype.isFull = function() {
  return this.getPlayerCount() == Room.MAX_PLAYERS;
};

Room.prototype.addPlayer = function(nickname) {
  if (this.isFull()) {
    throw Error('The room is full');
  }

  var color = this.colors.splice(0, 1)[0];

  var player = new Player(nickname, color);
  this.players[nickname] = player;

  if (this.state == 'pregame' && this.getPlayerCount() >= Room.REQUIRED_PLAYERS) {
      this._startNewRound();
  }

  return player;
};

Room.prototype.removePlayer = function(nickname) {
  var player = this.players[nickname];
  if (player) {
    delete this.players[nickname];
    this.colors.splice(0, 0, player.color);

    if (this.getPlayerCount() < Room.REQUIRED_PLAYERS) {
      if (this.game.isRunning) {
        this.game.stop();
      }

      if (this.state != 'pregame') {
        this.state = 'pregame';
        this._reset();
      }
    }
  }
};

Room.prototype._startNewRound = function() {
  _.each(this.players, function(p) {
    p.isDead = false;
  });

  this.state = 'preround';
  this.emit('roundStarting', Room.ROUND_COUNTDOWN_DURATION);

  var countdownTimeLeft = Room.ROUND_COUNTDOWN_DURATION;

  var that = this;
  this.countdownInterval = setInterval(function() {
    countdownTimeLeft = countdownTimeLeft - 1;
    if (countdownTimeLeft === 0) {
      clearInterval(that.countdownInterval);
      that.state = 'round';
      that.scoreLimit = 10 * (that.getPlayerCount() - 1);
      that.round = that.round + 1;

      that.game.start(that.players);

      that.emit('roundStarted');
    } else {
      that.emit('countdown', countdownTimeLeft);
    }
  }, 1000);
};

Room.prototype._endRound = function() {
  var maxScore = _.max(this.players, function(p) { return p.score; }).score;
  if (maxScore >= this.scoreLimit) {
    // one or more players have reached the score limit
    // if only one player has the max score, he wins
    // otherwise, start a new round
    var leaders = _.filter(this.players, function(p) { return p.score == maxScore;});
    if (leaders.length == 1) {
      var winnerOfGame = this.players[leaders[0].nickname];
      this._endGame(winnerOfGame);
    } else {
      this._startNewRound();
    }
  } else {
    this._startNewRound();
  }
};

Room.prototype._endGame = function(winner) {
  this.state = 'postgame';
  this.emit('gameEnded', winner.nickname);

  var that = this;

  var countdownTimeLeft = Room.GAME_OVER_COUNTDOWN_DURATION;
  this.countdownInterval = setInterval(function() {
    countdownTimeLeft = countdownTimeLeft - 1;
    if (countdownTimeLeft === 0) {
      clearInterval(that.countdownInterval);
      _.each(that.players, function(p) {
        p.score = 0;
      });

      that.round = 0;
      that._startNewRound();
    } else {
      that.emit('countdown', countdownTimeLeft);
    }
  }, 1000);
};

Room.prototype._reset = function() {
  _.each(this.players, function(p) {
    p.score = 0;
  });

  this.round = 0;
  clearInterval(this.countdownInterval);
  this.emit('reset');
};

Room.prototype.setInput = function(nickname, input) {
  var curve = this.game.curves[nickname];
  if (!curve) {
    return;
  }

  if (input == 'leftKeyDown') {
    curve.isLeftKeyDown = true;
  } else if (input == 'rightKeyDown') {
    curve.isRightKeyDown = true;
  } else if (input == 'leftKeyUp') {
    curve.isLeftKeyDown = false;
  } else if (input == 'rightKeyUp') {
    curve.isRightKeyDown = false;
  }
};

module.exports = Room;
