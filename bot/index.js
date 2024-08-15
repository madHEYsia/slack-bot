// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { App } = require('@slack/bolt');
const { slackBotToken, slackSigningSecret } = require('./config');

// Initialize the Express app
const expressApp = express();

// Middleware for verifying Slack requests
function verifySlackRequest(req, res, next) {
    const slackSignature = req.headers['x-slack-signature'];
    const slackRequestTimestamp = req.headers['x-slack-request-timestamp'];
    const requestBody = req.rawBody;

    console.log("slackSignature:", slackSignature);
    console.log("slackRequestTimestamp:", slackRequestTimestamp);
    console.log("requestBody:", requestBody);

    if (!slackSignature || !slackRequestTimestamp || !requestBody) {
        return res.status(400).send('Missing signature, timestamp, or body');
    }

    const time = Math.floor(new Date().getTime() / 1000);
    if (Math.abs(time - slackRequestTimestamp) > 300) { // 5-minute window
        return res.status(400).send('Request timeout');
    }

    const sigBasestring = 'v0:' + slackRequestTimestamp + ':' + requestBody;
    const mySignature = 'v0=' + crypto.createHmac('sha256', slackSigningSecret)
                                      .update(sigBasestring, 'utf8')
                                      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'))) {
        next();
    } else {
        return res.status(400).send('Verification failed');
    }
}

// Use the middleware to capture the raw body
expressApp.use(bodyParser.json({
    verify: (req, res, buf, encoding) => {
        req.rawBody = buf && buf.length ? buf.toString(encoding || 'utf8') : '';
    }
}));

// Use the signature verification middleware
expressApp.use(verifySlackRequest);

// Define a route to handle Slack's event subscription verification
expressApp.post('/slack/events', (req, res) => {
    console.log("req.body ---> ", req.body);
    // Check if the request contains a challenge parameter
    if (req.body && req.body.challenge) {
        // Respond with the challenge value
        res.status(200).send(req.body.challenge);
    } else {
        // Respond with a 400 status if the challenge parameter is missing
        res.status(400).send('Invalid request');
    }
});

// Initialize the Slack Bolt app
const slackApp = new App({
  token: slackBotToken,
  signingSecret: slackSigningSecret
});

// Define message event handler
slackApp.message(async ({ message, say }) => {
    console.log("Message ", message);
    await say({ text: 'BOT TESTING ...' });
});

// Start both Express and Slack Bolt app on different ports
(async () => {
  try {
    // Start the Express server on port 3001
    const expressPort = process.env.EXPRESS_PORT || 3001;
    expressApp.listen(expressPort, () => {
      console.log(`Express server is running on port ${expressPort}`);
    });

    // Start the Slack Bolt app on port 3000
    const slackPort = process.env.SLACK_PORT || 3000;
    await slackApp.start(slackPort);
    console.log('⚡️ Bolt app is running!');
  } catch (error) {
    console.error('Failed to start Bolt app or Express server:', error);
  }
})();
