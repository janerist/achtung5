var Message = function() {
  this.type = null;
  this.from = null;
  this.message = null;
};

var ChatViewModel = function() {
  var self = this;

  this.messages = ko.observableArray([]);

  this.addChatMessage = function(from, message) {
    var msg = new Message();
    msg.type = 'chatmessage';
    msg.from = from;
    msg.message = message;

    self.messages.push(msg);
  };

  this.addAnnouncement = function(message) {
    var msg = new Message();
    msg.type = 'announcement';
    msg.message = message;

    self.messages.push(msg);
  };

  this.limitMessages = ko.computed(function() {
    while (self.messages().length > ChatViewModel.MESSAGES_TO_KEEP) {
      self.messages.remove(self.messages()[0]);
    }
  });
};

ChatViewModel.MESSAGES_TO_KEEP = 50;
