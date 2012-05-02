var express = require('express'),
    app = express.createServer(),
    io = require('socket.io').listen(app),
    _ = require('underscore'),
    util = require('util'),
    Room = require('./room'),
    GameSimulation = require('./gamesimulation');

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

app.configure('production', function() {
  app.use(express.errorHandler());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'ooosecret'}));
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

var port = process.env.PORT || 8080;
app.listen(port);

var rooms = {
  room1: new Room('room1'),
  room2: new Room('room2'),
  room3: new Room('room3')
};

_.each(rooms, function(room) {
  room.on('roundStarting', function(countdownTime) {
    io.sockets.in(room.id)
      .emit('roundStarting', room.state, countdownTime);
  });

  room.on('roundStarted', function() {
    io.sockets.in(room.id)
      .emit('roundStarted', room.state, room.round, room.scoreLimit);
  });

  room.on('roundEnded', function(winner, points) {
    io.sockets.in(room.id)
      .emit('roundEnded', room.state, winner, points);
  });

  room.on('gameEnded', function(winner) {
    io.sockets.in(room.id)
      .emit('gameEnded', room.state, winner);
  });
  
  room.on('countdown', function(timeLeft) {
    io.sockets.in(room.id)
      .emit('countdown', timeLeft);
  });

  room.on('reset', function() {
    io.sockets.in(room.id)
      .emit('reset', room.state);
  });

  room.on('snapshot', function(snapshot) {
    io.sockets.in(room.id)
      .emit('snapshot', snapshot);
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
      roomId: room.id,
      nickname: req.session ? req.session.nickname : null
    });
  }
});

app.post('/setnickname', function(req, res) {
  if (req.session) {
    req.session.nickname = req.body.nickname;
  }
  res.send();
});

app.post('/forgetnickname', function(req, res) {
  if (req.session) {
    delete req.session.nickname;
  }
  res.send();
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
      width: GameSimulation.WIDTH,
      height: GameSimulation.HEIGHT,
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

    var player = room.removePlayer(socket.nickname);
    if (!player) {
      return;
    }

    socket.broadcast.to(room.id).emit('playerLeft', player);

    sendRoomUpdate(room);
  });

  socket.on('chatmessage', function(from, message) {
    if (!socket.roomId) {
      return;
    }

    socket.broadcast.to(socket.roomId).emit('chatmessage', from, message);
  });

  socket.on('dead', function() {
    var room = rooms[socket.roomId];
    var player = room.players[socket.nickname];
    var score = player.score;
    room.setPlayerDead(socket.nickname);

    var points = player.score - score;

    io.sockets.in(socket.roomId).emit('playerDead', socket.nickname, points);
  });

  socket.on('input', function(input) {
    var room = rooms[socket.roomId];
    if (!room) {
      return;
    }

    room.addInput(socket.nickname, input);
  });
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