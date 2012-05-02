var _ = require('underscore'),
    util = require('util'),
    GameSimulation = require('./gamesimulation');

var Player = function(nickname, color) {
  this.nickname = nickname;
  this.color = color;
  this.score = 0;
  this.isPlaying = false;
  this.isDead = false;
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
    '#ffffff'  // white
  ];
  //possible states: pregame, preRound, round, postgame
  this.state = 'pregame';
  this.playerCountAtStartOfRound = 0;
  this.scoreLimit = 0;
  this.round = 0;

  var that = this;
  this.gameSimulation = new GameSimulation();
  this.gameSimulation.on('snapshot', function(snapshot) {
    that.emit('snapshot', snapshot);
  });
};

Room.MAX_PLAYERS = 6;
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

  // TODO: check if round is in progress

  var color = this.colors.splice(0, 1)[0];

  var player = new Player(nickname, color);
  this.players[nickname] = player;

  if (this.state == 'pregame' && this.getPlayerCount() > 1) {
      this._startNewRound();
  }

  return player;
};

Room.prototype.removePlayer = function(nickname) {
  var player = this.players[nickname];

  if (player) {
    delete this.players[nickname];
    this.colors.splice(0, 0, player.color);

    if (this.getPlayerCount() < 2) {
      if (this.state != 'pregame') {
        this.state = 'pregame';
        this._reset();
        this.gameSimulation.stop();
      }
    }
  }

  return player;
};

Room.prototype.setPlayerDead = function(nickname) {
  var player = this.players[nickname];
  if (player) {
    player.isDead = true;
    this.gameSimulation.curves[nickname].isActive = false;

    var playersAlive = _.filter(this.players, function(p) {
      return p.isPlaying && !p.isDead;
    });

    player.score = player.score + (this.playerCountAtStartOfRound - playersAlive.length);

    if (playersAlive.length == 1) {
      var winner = this.players[playersAlive[0].nickname];
      this._endRound(winner);
    }

    return player;
  }
};

Room.prototype._startNewRound = function() {
  _.each(this.players, function(p) {
    p.isDead = false;
  });

  var countdownTimeLeft = Room.ROUND_COUNTDOWN_DURATION;

  this.state = 'preround';
  this.emit('roundStarting', countdownTimeLeft);
  
  var that = this;
  this.countdownInterval = setInterval(function() {
    countdownTimeLeft = countdownTimeLeft - 1;
    if (countdownTimeLeft <= 0) {
      clearInterval(that.countdownInterval);
      that.state = 'round';
      that.playerCountAtStartOfRound = that.getPlayerCount();
      that.scoreLimit = 10 * (that.playerCountAtStartOfRound - 1);
      that.round = that.round + 1;

      that.gameSimulation.start(that.players);
    
      that.emit('roundStarted');
    } else {
      that.emit('countdown', countdownTimeLeft);
    }
  }, 1000);
};

Room.prototype._endRound = function(winner) {
  this.gameSimulation.stop();

  var points = this.playerCountAtStartOfRound;
  winner.score = winner.score + points;
  this.emit('roundEnded', winner.nickname, points);

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
    if (countdownTimeLeft <= 0) {
      clearInterval(that.countdownInterval);
      _.each(that.players, function(p) {
        p.isPlaying = false;
        p.isDead = false;
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
    p.isPlaying = false;
    p.isDead = false;
    p.score = 0;
  });

  this.round = 0;
  clearInterval(this.countdownInterval);
  this.emit('reset');
};

Room.prototype.addInput = function(nickname, input) {
  this.gameSimulation.addInput(nickname, input);
};

module.exports = Room;