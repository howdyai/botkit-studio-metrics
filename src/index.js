module.exports = function(controller, options) {

  if (!options) {
    options = {
      debug: false,
      always_update: false,
    }
  }

  var BotMetrics = {

    callAPI: function(url, payload, cb) {
      return cb();
    },
    receiveEvent: function(bot, message) {
    },
    sendEvent: function(bot, message) {
    },
    user: function(bot, message) {
    },
    instance: function(bot, message) {
    }

  }

  return BotMetrics;

}
