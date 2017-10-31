# Botkit Studio Advanced Analytics

This module enables the advanced analytics and extended metrics available in Botkit Studio.

To enable these features in a Botkit Studio-powered app, install this module with npm, and add it to your Botkit code. This will enable your app to send metrics data to the Botkit Studio APIs.

```
npm install --save botkit-studio-metrics
```

Add the following to your code AFTER you initialize your Botkit controller:

```
require('botkit-studio-metrics')(controller);
```

[More information about using Botkit Studio analytics tools can be found here](https://botkit.groovehq.com/knowledge_base/topics/enable-advanced-botkit-studio-analytics-in-your-bot)
