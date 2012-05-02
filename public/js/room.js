var game,
    statusArea = new StatusViewModel(),
    scoreboard = new ScoreboardViewModel(),
    chat = new ChatViewModel();

ko.applyBindings(statusArea, document.getElementById('statusline'));
ko.applyBindings(scoreboard, document.getElementById('scoreboard'));
ko.applyBindings(chat, document.getElementById('chatarea'));

$('#nickname').on('keyup', function(e) {
  if (e.keyCode == 13) {
    setNickname();
  }
});

$('#joinbutton').on('click', setNickname);

if (!nickname) {
  statusArea.setStatus('Awaiting nickname...');
  askForNickname();
} else {
  $('#nickname').val(nickname);
  init();
}

function askForNickname() {
  $('#nicknamemodal').modal({
      keyboard: false,
      show: true
  });

  $('#nickname').focus();
}

function setNickname() {
  nickname = $.trim($('#nickname').val());
  if (!nickname) {
    alert('Please enter a nickname.');
    return;
  }
  
  $('#nicknamemodal').modal('hide');
  init();
}

function init() {
  statusArea.setStatus('Attempting to join room...');

  socket.emit('joinRoom', roomId, nickname, function(error, room) {
    if (error) {
      alert(error);
      statusArea.setStatus(error);
      askForNickname();
      return;
    }

    // Store nickname in session
    $.post('/setnickname', $.param({ nickname: nickname}));
    $('#navnick').show();
    $('#navnick span').first().html(nickname);

    // Set game status
    setStatus(room.state, room.round, room.scoreLimit);

    // Players
    $.each(room.players, function(i, player) {
      scoreboard.addPlayer(player);
    });

    // Chat
    $('#chatinput').on('keyup', function(e) {
      if (e.keyCode == 13) {
        var val = $.trim($(this).val());
        if (val) {
          socket.emit('chatmessage', nickname, val);
          chat.addChatMessage(nickname, val);
          scrollToBottom();
          $(this).val('');
        }
      }
    });

    // Set canvas dimensions
    $('#gamecanvas').css({
      width: room.width + 'px',
      height: room.height + 'px'
    })
    .prop('width', room.width)
    .prop('height', room.height)
    .fadeIn();

    game = new Game(room.width, room.height);

    // Events
    socket.on('playerJoined', playerJoined);
    socket.on('playerLeft', playerLeft);
    socket.on('playerDead', playerDead);
    socket.on('chatmessage', chatMessage);

    socket.on('roundStarting', roundStarting);
    socket.on('roundStarted', roundStarted);
    socket.on('roundEnded', roundEnded);
    socket.on('gameEnded', gameEnded);
    socket.on('countdown', statusArea.setCountdown);
    socket.on('reset', reset);

    socket.on('snapshot', game.addSnapshot);

    $('#chatinput').focus();
  });
}

function playerJoined(player) {
  scoreboard.addPlayer(player);
  chat.addAnnouncement(player.nickname + ' has joined the room.');
  scrollToBottom();
}

function playerLeft(player) {
  scoreboard.removePlayer(player);
  chat.addAnnouncement(player.nickname + ' has left the room.');
  scrollToBottom();
}

function playerDead(nickname, points) {
  scoreboard.setPlayerDead(nickname, points);
}

function chatMessage(from, message) {
  chat.addChatMessage(from, message);
  scrollToBottom();
}

function roundStarting(state, countdownTime) {
  setStatus(state);
  statusArea.setCountdown(countdownTime);
}

function roundStarted(state, round, scoreLimit) {
  if (round == 1) {
    scoreboard.resetForGame();
  } else {
    scoreboard.resetForRound();
  }
  
  scoreboard.setScoreLimit(scoreLimit);
  statusArea.hideCountdown();
  setStatus(state, round);

  game.start(scoreboard.players());
}

function roundEnded(state, winner, points) {
  scoreboard.setWinner(winner, points);
  scoreboard.setRoundNumber(0);
  setStatus(state);

  game.stop();
}

function gameEnded(state, winner) {
  setStatus(state);
  statusArea.hideCountdown();

  game.stop();
}

function reset(state) {
  setStatus(state);
  scoreboard.resetForGame();
  statusArea.hideCountdown();

  game.stop();
  game.clearCanvas();

  chat.addAnnouncement('The room was reset due to lack of players.');
}

function setStatus(state, round, scoreLimit) {
  if (state == 'pregame') {
    statusArea.setStatus('Waiting for more players to join...');
  } else if (state == 'preround') {
    statusArea.setStatus('New round starting...');
  } else if (state == 'round') {
    statusArea.setStatus('Round ' + round + ' in progress');
  } else if (state == 'postgame') {
    statusArea.setStatus('Game over. Starting new game...');
  }

  if (round) {
    scoreboard.setRoundNumber(round);
  }

  if (scoreLimit) {
    scoreboard.setScoreLimit(scoreLimit);
  }
}

function scrollToBottom() {
  var chatScroll = document.getElementById('chatscroll');
  chatScroll.scrollTop = chatScroll.scrollHeight;
}

