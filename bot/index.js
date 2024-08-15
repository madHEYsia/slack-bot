const express = require('express');
const crypto = require('crypto');
const { App } = require('@slack/bolt');
const { slackBotToken, slackSigningSecret } = require('./config');

const expressApp = express();

// Middleware to capture the raw body
expressApp.use((req, res, next) => {
    let data = '';
    req.on('data', (chunk) => {
        data += chunk;
    });
    req.on('end', () => {
        req.rawBody = data;
        next();
    });
});

// Middleware for verifying Slack requests
function verifySlackRequest(req, res, next) {
    const slackSignature = req.headers['x-slack-signature'];
    const slackRequestTimestamp = req.headers['x-slack-request-timestamp'];

    console.log("slackSignature:", slackSignature);
    console.log("slackRequestTimestamp:", slackRequestTimestamp);
    console.log("requestBody:", req.rawBody);

    if (!slackSignature || !slackRequestTimestamp || !req.rawBody) {
        return res.status(400).send('Missing signature, timestamp, or body');
    }

    const time = Math.floor(new Date().getTime() / 1000);
    if (Math.abs(time - slackRequestTimestamp) > 300) { // 5-minute window
        return res.status(400).send('Request timeout');
    }

    const sigBasestring = `v0:${slackRequestTimestamp}:${req.rawBody}`;
    const mySignature = `v0=${crypto.createHmac('sha256', slackSigningSecret)
                                      .update(sigBasestring, 'utf8')
                                      .digest('hex')}`;

    if (crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'))) {
        next();
    } else {
        return res.status(400).send('Verification failed');
    }
}

// Apply the signature verification middleware
expressApp.use(verifySlackRequest);

// Define a route to handle Slack's event subscription verification
expressApp.post('/slack/events', (req, res) => {
    console.log("req.body ---> ", req.body);
    if (req.body && req.body.challenge) {
        res.status(200).send(req.body.challenge);
    } else {
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
        const expressPort = process.env.EXPRESS_PORT || 3001;
        expressApp.listen(expressPort, () => {
            console.log(`Express server is running on port ${expressPort}`);
        });

        const slackPort = process.env.SLACK_PORT || 3000;
        await slackApp.start(slackPort);
        console.log('⚡️ Bolt app is running!');
    } catch (error) {
        console.error('Failed to start Bolt app or Express server:', error);
    }
})();
