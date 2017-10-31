# Botkit Studio Advanced Analytics

This module enables the advanced analytics and extended metrics available in [Botkit Studio](https://studio.botkit.ai).

To enable these features in a Botkit Studio-powered app, install this module with npm, and add it to your Botkit code. This will enable your app to send metrics data to the Botkit Studio APIs.

```
npm install --save botkit-studio-metrics
```

Add the following to your code AFTER you initialize your Botkit controller:

```
var controller = Botkit.slackbot();
require('botkit-studio-metrics')(controller);
```

[More information about using Botkit Studio analytics tools can be found here](https://botkit.groovehq.com/knowledge_base/categories/metrics-7)

## Options

Enable debug output:

```
require('botkit-studio-metrics')(controller, {debug: true});
```

By default, this module will only send user profile and bot instance information
the _first time_ an event is received.  To update this information _every time_ an event is received, include the `always_update` option:

```
require('botkit-studio-metrics')(controller,{always_update: true});
```

## Data collection

With this module installed and enabled, your Botkit application will automatically
send a copy of any message your bot sends or receives to Botkit Studio's analytics
API, as well as user profile information and information about each bot instance.

Where applicable, ensure that your terms of service and privacy policy reflect this data collection.
