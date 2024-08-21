// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { App } = require('@slack/bolt');
const knowledgeBase = require("../knowledgeBase.json");
const { slackBotToken, slackSigningSecret, confidenceThreshold } = require('./config');
const { createJiraTicket, deleteJiraTicket } = require('./jira');
const { getEmbedding } = require('../Scrapping/process');
const { findMostSimilar, summarizeText, analyzeMessageWithOpenAI } = require('./openaiAnalyzer');

// Initialize the Express app
const expressApp = express();

// Can be moved to external redis to avoid in-memory server crash and proper expiry
const Hash = {};

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

const postOnSlack = async (text, say, client, message, prevJiraKey) => {
    const channel = message?.channel;
    const prevMsg = message?.previous_message;
    if (prevMsg) {
        const response = await client.chat.update({
            channel,
            ts: Hash[prevMsg.ts]?.ts,
            text
        });
        const { ts } = response?.message?.edited || {};
        await deleteJiraTicket(Hash[prevMsg?.edited?.ts || prevMsg?.ts]?.prevJiraKey);
        Hash[message.ts] = { ts, prevJiraKey };
    } else {
        const response = await say({ text: text });
        const { ts } = response;
        Hash[message.ts] = { ts, prevJiraKey };
    }
};

const analyseMsg = (text, say, client, message) => {
    getEmbedding(text)
        .then((queryEmbedding) => {
            const { mostSimilarEntryId, maxSimilarity } = findMostSimilar(queryEmbedding);

            if (maxSimilarity > confidenceThreshold) {  // Adjust threshold as needed
                const matchingContent = knowledgeBase.find(entry => entry.id == mostSimilarEntryId);
                console.log("maxSimilarity, matchingContent ", maxSimilarity, matchingContent);
                return matchingContent ? summarizeText(matchingContent.content) : null;
            }
            return null;
        })
        .then((matchingResponse) => {
            const parsedResponse = matchingResponse?.data?.choices?.[0]?.message?.content;
            if (parsedResponse && !parsedResponse.toLowerCase().includes('sorry')) {
                postOnSlack(parsedResponse, say, client, message);
                return null;
            } else {
                return createJiraTicket(
                    'Bug reported in Slack',
                    text,
                    'appropriate_assignee'  // Replace with the appropriate assignee logic
                );
            }
        })
        .then((res) => {
            if (res !== null) {
                const jiraResponse = res;
                if (jiraResponse)
                    postOnSlack(`Jira ticket created: ${jiraResponse.key}.\nTicket url: ${jiraResponse.self}`, say, client, message, jiraResponse.key);
                else
                    postOnSlack(`Jira ticket creation failed`, say, client, message);
            }
        })
        .catch((err) => {
            console.error('Error handling Slack message or JIRA ticket:', err);
            postOnSlack(`An error occurred while processing your message.`, say, client, message);
        })
}

// Define message event handler
slackApp.message(async ({ message, say, client }) => {
    try {
        const text = message?.text || message?.message?.text;
        const botResponse = message?.message?.bot_id;
        const isThreadMsg = message?.thread_ts || message?.message?.thread_ts;
        if (!text || botResponse || isThreadMsg) return;

        console.log("==================");
        console.log("Message ", message);
        console.log("==================");

        analyzeMessageWithOpenAI(text)
            .then((response) => {
                const isQuery = response?.data?.choices?.[0]?.message?.content?.includes('Yes');
                if (isQuery)
                    analyseMsg(text, say, client, message);
                else
                    console.log(`Not a query: ${text}`);
            })
            .catch(error => {
                console.log("Error in catch ", error)
            })
    } catch (error) {
        console.error('Error handling processing msg:', error);
        postOnSlack(`An error occurred while processing your message.`, say, client, message);
    }
});

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
})()
