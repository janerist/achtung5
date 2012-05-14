var nickname,
    game,
    statusArea = new StatusViewModel(),
    scoreboard = new ScoreboardViewModel(),
    chat = new ChatViewModel();

ko.applyBindings(statusArea, document.getElementById('statusline'));
ko.applyBindings(scoreboard, document.getElementById('scoreboard'));

ko.applyBindings(chat, document.getElementById('chatarea'));

ko.applyBindings(scoreboard, document.getElementById('finalresults'));
ko.applyBindings(statusArea, document.getElementById('finalresults-footer'));

window.keydown = {};

$(document).keydown(function(e) {
  var code = e.keyCode ? e.keyCode : e.which;
  if (code == 37 && !keydown.left) {
    keydown.left = true;
    if (game.isRunning) {
      socket.emit('leftKeyDown');
    }
  }

  if (code == 39 && !keydown.right) {
    keydown.right = true;
    if (game.isRunning) {
      socket.emit('rightKeyDown');
    }
  }
});

$(document).keyup(function(e) {
  var code = e.keyCode ? e.keyCode : e.which;
  if (code == 37 && keydown.left) {
    keydown.left = false;
    if (game.isRunning) {
      socket.emit('leftKeyUp');
    }
  }

  if (code == 39 && keydown.right) {
    keydown.right = false;
    if (game.isRunning) {
      socket.emit('rightKeyUp');
    }
  }
});

$('#nickname').on('keyup', function(e) {
  if (e.keyCode == 13) {
    setNickname();
  }
});

$('#joinbutton').on('click', setNickname);

statusArea.setStatus('Awaiting nickname...');
askForNickname();

function askForNickname() {
  $('#nicknamemodal').modal({
      keyboard: false,
      show: true,
      backdrop: 'static'
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

    // Players
    $.each(room.players, function(i, player) {
      scoreboard.addPlayer(player);
    });

    // Set status
    switch (room.state) {
      case 'pregame':
        statusArea.setStatus('Waiting for more players to join...');
        break;
      case 'preround':
        statusArea.setStatus('New round starting...GET READY!');
        break;
      case 'round':
        statusArea.setStatus('Round ' + room.round + ' in progress. \
You will join the game next round.');
        break;
      case 'postgame':
        statusArea.setStatus('Starting new game...');
        break;
    }

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
    $('#gamecanvas')
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

function playerLeft(nickname) {
  scoreboard.removePlayer(nickname);
  chat.addAnnouncement(nickname + ' has left the room.');
  scrollToBottom();
}

function playerDead(nickname, points) {
  scoreboard.setPlayerDead(nickname, points);
  game.setPlayerDead(nickname);
}

function chatMessage(from, message) {
  chat.addChatMessage(from, message);
  scrollToBottom();
}

function roundStarting(countdownTime) {
  statusArea.setStatus('New round starting...GET READY!');
  statusArea.setCountdown(countdownTime);

  closeFinalResultsModal();
}

function roundStarted(round, scoreLimit) {
  if (round == 1) {
    scoreboard.resetForGame();
  } else {
    scoreboard.resetForRound();
  }

  statusArea.setCountdown(0);
  statusArea.setStatus('Round ' + round + ' in progress');

  scoreboard.setRoundNumber(round);
  scoreboard.setScoreLimit(scoreLimit);

  game.start(scoreboard.players());
}

function roundEnded(winner, points) {
  scoreboard.setWinner(winner, points);
  scoreboard.setRoundNumber(0);

  game.stop();
  game.displayWinner(winner);
}

function gameEnded(winner) {
  game.stop();
  game.clearCanvas();

  statusArea.setStatus('Game over. Starting new game...');
  showFinalResultsModal();
}

function reset() {
  statusArea.setStatus('Waiting for more players to join...');
  scoreboard.resetForGame();
  statusArea.setCountdown(0);

  game.stop();
  game.clearCanvas();
  closeFinalResultsModal();

  chat.addAnnouncement('The room was reset due to lack of players.');
}

function scrollToBottom() {
  var chatScroll = document.getElementById('chatscroll');
  chatScroll.scrollTop = chatScroll.scrollHeight;
}

function showFinalResultsModal() {
  $('#finalresultsmodal').modal({
      keyboard: false,
      show: true,
      backdrop: 'static'
  });
}

function closeFinalResultsModal() {
  $('#finalresultsmodal').modal('hide');
}
