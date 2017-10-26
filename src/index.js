var request = require('request');
var md5 = require('md5');
module.exports = function(controller) {

  var bot_metrics_url_base = controller.config.studio_command_uri || 'https://api.botkit.ai';

  var debug = true;

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

          // console.log('METRICS RESPONSE IS', body);
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
            return cb(json.error);
          } else if (json.errors) {
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
        instance_uid: botHash(bot),
        provider: 'generic',
        event: {
          text: message.text,
          event_type: 'message',
          is_for_bot: true,
          is_from_bot: false,
          is_im: false,
          timestamp: new Date(),
          user_id: message.user + controller.config.studio_token,
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
        instance_uid: botHash(bot), // slack team id
        provider: 'generic',
        event: {
          text: message.text,
          event_type: 'message',
          is_for_bot: false,
          is_from_bot: true,
          is_im: false,
          timestamp: new Date(),
          user_id: message.to + controller.config.studio_token,
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
            instance_uid: botHash(bot),
            uid: message.user + controller.config.studio_token,
            attributes: {
              platform_id: profile.id,
              profile_pic_url: null,
              email: profile.email,
              nickname: profile.username,
              first_name: profile.first_name,
              last_name: profile.last_name,
              full_name: profile.full_name,
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
            console.log('RESPONSE FROM BOT_USERS', res);
          });
        });
      }
    },
    instance: function(bot, message) {
      var that = this;
      var payload = {
        uid: botHash(bot),
        attributes: {
          name: bot.identity.name,
        }
      }

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



  /* generate an anonymous hash to uniquely identify this bot instance */
  function botHash(bot) {
    var x = '';
    switch (bot.type) {
      case 'slack':
        if (bot.config.token) {
          x = md5(bot.config.token);
        } else {
          x = 'non-rtm-bot';
        }
        break;

      case 'teams':
        x = md5(bot.identity.id);
        break;

      case 'fb':
        x = md5(bot.botkit.config.access_token);
        break;

      case 'twilioipm':
        x = md5(bot.config.TWILIO_IPM_SERVICE_SID);
        break;

      case 'twiliosms':
        x = md5(bot.botkit.config.account_sid);
        break;


      case 'ciscospark':
        x = md5(bot.botkit.config.ciscospark_access_token);
        break;

      default:
        x = 'unknown-bot-type';
        break;
    }
    return x + controller.config.studio_token;
  };


  controller.middleware.heard.use(function(bot, message, next) {
    BotMetrics.receiveEvent(bot, message);
    next();
  });

  controller.middleware.triggered.use(function(bot, message, next) {
    var relevant_events = ['message_received', 'direct_message', 'direct_mention', 'mention', 'ambient', 'facebook_postback', 'interactive_message_callback', 'invoke'];
    if (message && message.type && relevant_events.indexOf(message.type) != -1) {
      BotMetrics.receiveEvent(bot, message);
    }
  });

  controller.middleware.send.use(function(bot, message, next) {
    BotMetrics.sendEvent(bot, message);
    next();
  });


}
