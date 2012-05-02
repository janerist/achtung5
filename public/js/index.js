var Room = function(room) {
  this.id = room.id;
  this.maxPlayers = room.maxPlayers;
  this.players = ko.observableArray(room.players);
  this.isFull = ko.computed(function() {
      return this.players().length == this.maxPlayers;
  }, this);
};

var RoomListViewModel = function() {
  var self = this;

  this.rooms = ko.observableArray([]);
  
  this.addRoom = function(room) {
    self.rooms.push(new Room(room));
  };

  this.updateRoom = function(room) {
    $.each(self.rooms(), function(i, r) {
      if (r.id == room.id) {
        r.players(room.players);
        return;
      }
    });
  };
};

var viewModel = new RoomListViewModel();
ko.applyBindings(viewModel);

var socket = io.connect();
socket.emit('getRooms');

socket.on('rooms', function(rooms) {
  $.each(rooms, function(i, room) {
    viewModel.addRoom(room);
    $('#' + room.id).popover({
      content: function() { return $('#popover-' + room.id).html(); },
      offset: 10,
      placement: 'bottom'
    });
  });
  
  $('#rooms').show();
  $('#loadingrooms').hide();
});

socket.on('roomUpdate', function(room) {
  viewModel.updateRoom(room);
});

