// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { App } = require('@slack/bolt');
const { slackBotToken, slackSigningSecret, confidenceThreshold } = require('./config');
const { fetchFromKnowledgeBase } = require('./knowledgeBase');
const { createJiraTicket } = require('./jira');

// Initialize the Express app
const expressApp = express();

// Use body-parser middleware to parse JSON requests
expressApp.use(bodyParser.json());

// Define a route to handle Slack's event subscription verification
expressApp.post('/slack/events', (req, res) => {
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

const postOnSlack = async (text, say, client, prevMsg) => {
    if(prevMsg) {
        await client.chat.update({
            channel: prevMsg.channel,
            ts: prevMsg.ts,
            text: text
        });
    } else {
        await say({ text: text });
    }
}

// Define message event handler
slackApp.message(async ({ message, say, client }) => {
    try {
        console.log("Message ", message);
        const text = message?.text || message?.message?.text;
        if(!text) return;

        const channel = message.channel;
        const prevMsg = message.previous_message;
    
        // Step 1: Check the knowledge base
        const knowledgeBaseResult = fetchFromKnowledgeBase(text);
    
        if (knowledgeBaseResult.confidence >= confidenceThreshold) {
            postOnSlack(knowledgeBaseResult.answer, say, client, prevMsg);
        } else {
            const jiraResponse = await createJiraTicket(
              'Bug reported in Slack',
              text,
              'appropriate_assignee'  // Replace with the appropriate assignee logic
            );
            if(jiraResponse)
                postOnSlack(`Jira ticket created: ${jiraResponse.key}.\nTicket url: ${jiraResponse.self}`, say, client, prevMsg);
            else 
                postOnSlack(`Jira ticket creation failed`, say, client, prevMsg);
        }
    } catch (error) {
        console.error('Error handling Slack message:', error);
        postOnSlack(`An error occurred while processing your message.`, say);
    }
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
