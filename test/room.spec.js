var Room = require('../room'),
    should = require('should');

describe('when the room is initialized', function() {
  var room;
  beforeEach(function() {
    room = new Room('testroom');
  });

  it('should be in the "pregame" state', function() {
    room.state.should.equal('pregame');
  });

  it('should have zero players in it', function() {
    room.getPlayerCount().should.equal(0);
  });

  it('should have an id', function() {
    room.id.should.equal('testroom');
  });

  it('should have MAX_PLAYERS available colors', function() {
    room.colors.length.should.equal(Room.MAX_PLAYERS);
  });
});

describe('when a player is added to the room', function() {
  var room;

  beforeEach(function() {
    room = new Room('testroom');
  });

  it('should check if the room is full', function() {
    for (var i = 0; i < Room.MAX_PLAYERS; i++) {
      room.addPlayer('testplayer' + i);
    }

    (function() {
      room.addPlayer('foo');
    }).should.throw('The room is full');
  });

  it('should increase the player count', function() {
    room.addPlayer('foo');
    room.getPlayerCount().should.equal(1);
  });

  it('should assign a color to the player', function() {
    room.addPlayer('foo');
    room.players.foo.color.should.equal('#ff0000');
  });

  it('should assign an inital score to the player', function() {
    room.addPlayer('foo');
    room.players.foo.score.should.equal(0);
  });

  describe('when the room is in the "pregame" state', function() {
    beforeEach(function() {
      room.state = 'pregame';
    });

    describe('when there is 1 player in the room', function() {
      beforeEach(function() {
        room.addPlayer('player1');
      });

      it('should start a new round', function(done) {
        room.on('roundStarting', function() {
          room.state.should.equal('preround');
          done();
        });

        room.addPlayer('player2');
      });
    });
  });
});

describe('when a player is removed from the room', function() {
  var room;

  beforeEach(function() {
    room = new Room('testroom');
    room.addPlayer('player1');
  });

  it('should decrease the player count', function() {
    room.getPlayerCount().should.equal(1);
    room.removePlayer('player1');
    room.getPlayerCount().should.equal(0);
  });
});

