var request = require('request');
var md5 = require('md5');
module.exports = function(controller, options) {

  if (!options) {
    options = {
      debug: false,
      always_update: false,
    }
  }

  var bot_metrics_url_base = controller.config.studio_command_uri || 'https://api.botkit.ai';

  var debug = options.debug;

  var BotMetrics = {

    callAPI: function(url, payload, cb) {

      var options = {
        rejectUnauthorized: false,
        url: bot_metrics_url_base + url + '?access_token=' + controller.config.studio_token,
        method: 'POST',
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      };

      if (controller.config.studio_token) {


        request(options, function(err, res, body) {

          if (err) {
            return cb(err);
          }

          if (res.statusCode === 202) {
            return cb(null, {});
          }



          try {
            json = JSON.parse(body);
          } catch (e) {
            return cb(e);
          }
          if (json.error) {
            if (res.statusCode === 401) {
              console.error(json.error);
            }
            return cb(json.error);
          } else if (json.errors) {
            if (res.statusCode === 401) {
              console.error(json.errors[0]);
            }
            return cb(json.errors[0]);
          } else {
            return cb(null, json.data);
          }

        });
      }
    },
    receiveEvent: function(bot, message) {

      var that = this;

      var payload = {
        instance_uid: bot.identity.id,
        provider: 'generic',
        event: {
          text: message.text,
          event_type: 'message',
          is_for_bot: true,
          is_from_bot: false,
          is_im: false,
          timestamp: new Date(),
          user_id: message.user,
        }
      }

      if (debug) {
        console.log('Send event', payload);
      }

      that.callAPI('/api/v2/stats/events', payload, function(err, res) {
        if (err) {
          if (debug) console.error('METRICS ERROR', err);
        } else {
          if (res.messages) {
            for (var m = 0; m < res.messages.length; m++) {
              if (res.messages[m].code == 'bot_user_not_found') {
                that.user(bot, message);
              }

              if (res.messages[m].code == 'bot_instance_not_found') {
                that.instance(bot, message);
              }
            }
          }
        }
      });
    },
    sendEvent: function(bot, message) {

      var that = this;

      var payload = {
        instance_uid: bot.identity.id, // slack team id
        provider: 'generic',
        event: {
          text: message.text,
          event_type: 'message',
          is_for_bot: false,
          is_from_bot: true,
          is_im: false,
          timestamp: new Date(),
          user_id: message.to,
        }
      }

      if (debug) {
        console.log('Send event', payload);
      }

      that.callAPI('/api/v2/stats/events', payload, function(err, res) {
        if (err) {
          if (debug) console.error('METRICS ERROR', err);
        } else {
          if (res.messages) {
            for (var m = 0; m < res.messages.length; m++) {
              if (res.messages[m].code == 'bot_user_not_found') {
                that.user(bot, {
                  user: message.to,
                  channel: message.channel
                });
              }

              if (res.messages[m].code == 'bot_instance_not_found') {
                that.instance(bot, message);
              }
            }
          }
        }
      });
    },
    user: function(bot, message) {

      var that = this;
      if (bot.getMessageUser) {
        bot.getMessageUser(message).then(function(profile) {

          var payload = {
            instance_uid: bot.identity.id,
            uid: message.user,
            attributes: {
              id: profile.id,
              profile_pic_url: null,
              email: profile.email || 'unknown',
              nickname: profile.username || 'unknown',
              first_name: profile.first_name || 'unknown',
              last_name: profile.last_name || 'unknown',
              full_name: profile.full_name || 'unknown',
              gender: profile.gender || 'unknown',
              timezone: profile.timezone || "America/Los_Angeles",
              timezone_offset: profile.timezone_offset || null,
            }
          }

          if (debug) {
            console.log('Send user', payload);
          }

          that.callAPI('/api/v2/stats/bot_users', payload, function(err, res) {
            if (err) {
              if (debug) console.error('Error in bot user metrics API: ', err);
            }
          });
        }).catch(function(err) {
          if (err) {
            if (debug) console.error('Error in bot user metrics API: ', err);
          }
        });
      }
    },
    instance: function(bot, message) {
      var that = this;
      var payload = {
        uid: bot.identity.id,
        attributes: {
          name: bot.identity.name,
          id: bot.identity.id,
        }
      }

      if (bot.getInstanceInfo) {
        bot.getInstanceInfo().then(function(instance) {

          payload.attributes.name = instance.identity.name;
          payload.attributes.id = instance.identity.id;
          payload.attributes.team_name = instance.team.name;
          payload.attributes.team_url = instance.team.url;
          payload.attributes.team_id = instance.team.id;

          if (debug) {
            console.log('Send instance', payload);
          }

          that.callAPI('/api/v2/stats/instances', payload, function(err, res) {
            if (err) {
              if (debug) console.error('Error in bot instance metrics API: ', err);
            }
          });
        }).catch(function(err) {
          if (err) {
            if (debug) console.error('Error in bot instance metrics API: ', err);
          }
        });
      } else {
        if (debug) {
          console.log('Send instance', payload);
        }

        that.callAPI('/api/v2/stats/instances', payload, function(err, res) {
          if (err) {
            if (debug) console.error('Error in bot instance metrics API: ', err);
          }
        });
      }
    }

  }

  controller.middleware.heard.use(function(bot, message, next) {
    BotMetrics.receiveEvent(bot, message);
    if (options.always_update) {
      BotMetrics.user(bot, message);
      BotMetrics.instance(bot, message);
    }
    next();
  });

  controller.middleware.triggered.use(function(bot, message, next) {
    var relevant_events = ['message_received', 'direct_message', 'direct_mention', 'mention', 'ambient', 'facebook_postback', 'interactive_message_callback', 'invoke'];
    if (message && message.type && relevant_events.indexOf(message.type) != -1) {
      BotMetrics.receiveEvent(bot, message);
      if (options.always_update) {
        BotMetrics.user(bot, message);
        BotMetrics.instance(bot, message);
      }
    }
    next();
  });

  controller.middleware.send.use(function(bot, message, next) {
    BotMetrics.sendEvent(bot, message);
    if (options.always_update) {
      BotMetrics.instance(bot, message);
    }
    next();
  });

  return BotMetrics;

}
