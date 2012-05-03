var Player = function(player) {
  this.nickname = player.nickname;
  this.score = ko.observable(player.score);
  this.color = player.color;
  this.status = ko.observable('');
  this.pointsThisRound = ko.observable(-1);
};

var ScoreboardViewModel = function() {
  var self = this;

  this.players = ko.observableArray([]);
  this.scoreLimit = ko.observable(0);
  this.roundNumber = ko.observable(0);

  this.addPlayer = function(player) {
    self.players.push(new Player(player));
  };

  this.removePlayer = function(nickname) {
    self.players.remove(function(p) {
        return p.nickname == nickname;
    });

    self._sortPlayers();
  };

  this.setPlayerDead = function(nickname, points) {
    $.each(self.players(), function(i, p) {
      if (p.nickname == nickname) {
        p.status('DEAD');
        p.score(p.score() + points);
        p.pointsThisRound(points);
      }
    });

    self._sortPlayers();
  };

  this.setWinner = function(nickname, points) {
    $.each(self.players(), function(i, p) {
      if (p.nickname == nickname) {
        p.score(p.score() + points);
        p.pointsThisRound(points);
        p.status('WINNER');
      }
    });

    self._sortPlayers();
  };

  this.resetForRound = function() {
    $.each(self.players(), function(i, p) {
      p.status('');
      p.pointsThisRound(-1);
    });
  };

  this.resetForGame = function() {
    $.each(self.players(), function(i, p) {
      p.status('');
      p.pointsThisRound(-1);
      p.score(0);
    });

    self.scoreLimit(0);
    self.roundNumber(0);
  };

  this.setScoreLimit = function(scoreLimit) {
    self.scoreLimit(scoreLimit);
  };

  this.setRoundNumber = function(round) {
    self.roundNumber(round);
  };

  this._sortPlayers = function() {
    self.players.sort(function(left, right) {
      if (left.score() < right.score()) {
        return 1;
      } else if (left.score() > right.score()) {
        return -1;
      } else {
        return 0;
      }
    });
  };
};
