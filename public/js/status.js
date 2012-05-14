var StatusViewModel = function() {
    this.status = ko.observable('');
    this.countdown = ko.observable('');

    var self = this;

    this.setStatus = function(statusText) {
        self.status(statusText);
    };

    this.setCountdown = function(timeLeft) {
        self.countdown(timeLeft.toString());
    };
};
