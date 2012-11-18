var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    _ = require('underscore'),
    util = require('util'),
    Room = require('./room'),
    Game = require('./servergame');

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', { layout: false });
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true}));
});

app.configure('debug', function() {
  Room.REQUIRED_PLAYERS = 1;
  Room.ROUND_COUNTDOWN_DURATION = 2;
  Room.GAME_OVER_COUNTDOWN_DURATION = 2;
});

app.configure('production', function() {
  app.use(express.errorHandler());
});

io.configure(function() {
});

io.configure('production', function() {
  io.enable('browser client minification');
  io.enable('browser client etag');
  io.enable('browser client gzip');
  io.set('log level', 1);
  io.set('transports', [
      'websocket',
      'flashsocket',
      'htmlfile',
      'xhr-polling',
      'jsonp-polling'
  ]);
});

var port = process.env['PORT_WWW'] || 3000;
console.log('using port ' + port);
server.listen(port);

var rooms = {
  room1: new Room('room1'),
  room2: new Room('room2'),
  room3: new Room('room3')
};

_.each(rooms, function(room) {
  room.on('roundStarting', function(countdownTime) {
    io.sockets.in(room.id)
      .emit('roundStarting', countdownTime);
  });

  room.on('roundStarted', function() {
    io.sockets.in(room.id)
      .emit('roundStarted', room.round, room.scoreLimit);
  });

  room.on('roundEnded', function(winner, points) {
    io.sockets.in(room.id)
      .emit('roundEnded', winner, points);
  });

  room.on('gameEnded', function(winner) {
    io.sockets.in(room.id)
      .emit('gameEnded', winner);
  });

  room.on('countdown', function(timeLeft) {
    io.sockets.in(room.id)
      .emit('countdown', timeLeft);
  });

  room.on('reset', function() {
    io.sockets.in(room.id)
      .emit('reset');
  });

  room.on('snapshot', function(snapshot) {
    io.sockets.in(room.id)
      .volatile.emit('snapshot', snapshot);
  });

  room.on('playerDead', function(nickname, points) {
    io.sockets.in(room.id).emit('playerDead', nickname, points);
  });
});

app.get('/', function(req, res) {
  res.render('index', {
    nickname: req.session ? req.session.nickname : null
  });
});

app.get('/rooms/:room', function(req, res) {
  var room = rooms[req.params.room];
  if (!room) {
    res.redirect('/');
  } else {
    res.render('room', {
      roomId: room.id
    });
  }
});

io.sockets.on('connection', function(socket) {
  socket.on('getRooms', function() {
    socket.join('home');
    socket.emit('rooms', _.map(rooms, function(room) {
      return {
        id: room.id,
        maxPlayers: Room.MAX_PLAYERS,
        players: _.map(room.players, function(player, nickname) {
          return {
            nickname: nickname
          };
        })
      };
    }));
  });

  socket.on('joinRoom', function(roomId, nickname, fn) {
    var room = rooms[roomId],
        msg;

    if (!room) {
      msg = 'no room with id ' + roomId;
      fn(msg);
      return;
    }

    if (room.players[nickname]) {
      msg = nickname + ' is already in this room. \
Please choose a different nickname.';
      fn(msg);
      return;
    }

    if (room.isFull()) {
      msg = roomId + ' is full ';
      fn(msg);
      return;
    }

    if (nickname.length > 20) {
      msg = 'The nickname is too long. Maximum 20 characters.';
      fn(msg);
      return;
    }

    socket.nickname = nickname;
    socket.roomId = roomId;
    socket.join(roomId);

    var player = room.addPlayer(nickname);

    fn(null, {
      state: room.state,
      round: room.round,
      scoreLimit: room.scoreLimit,
      width: Game.WIDTH,
      height: Game.HEIGHT,
      players: room.players
    });

    socket.broadcast.to(roomId).emit('playerJoined', player);

    sendRoomUpdate(room);
  });

  socket.on('disconnect', function() {
    if (!socket.roomId) {
      return;
    }

    var room = rooms[socket.roomId];
    if (!room) {
      return;
    }

    room.removePlayer(socket.nickname);
    socket.broadcast.to(room.id).emit('playerLeft', socket.nickname);
    sendRoomUpdate(room);
  });

  socket.on('chatmessage', function(from, message) {
    if (!socket.roomId) {
      return;
    }

    socket.broadcast.to(socket.roomId).emit('chatmessage', from, message);
  });

  socket.on('leftKeyDown', function() {
    setInput(socket.nickname, 'leftKeyDown');
  });

  socket.on('rightKeyDown', function() {
    setInput(socket.nickname, 'rightKeyDown');
  });

  socket.on('leftKeyUp', function() {
    setInput(socket.nickname, 'leftKeyUp');
  });

  socket.on('rightKeyUp', function() {
    setInput(socket.nickname, 'rightKeyUp');
  });

  function setInput(nickname, input) {
    var room = rooms[socket.roomId];
    if (!room) {
      return;
    }

    room.setInput(nickname, input);
  }
});

function sendRoomUpdate (room) {
  io.sockets.in('home').emit('roomUpdate', {
    id: room.id,
    maxPlayers: Room.MAX_PLAYERS,
    players: _.map(room.players, function(player, nickname) {
      return {
        nickname: nickname
      };
    })
  });
}
