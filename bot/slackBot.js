const { App } = require('@slack/bolt');
const { slackBotToken, slackSigningSecret, confidenceThreshold } = require('./config');
const { fetchFromKnowledgeBase } = require('./knowledgeBase');
const { createJiraTicket } = require('./jira');
const { analyzeMessageWithOpenAI } = require('./openaiAnalyzer');

// Initialize your Bolt app with the bot token and signing secret

const app = new App({
  token: slackBotToken,
  signingSecret: slackSigningSecret
});

app.message(async ({ message, say }) => {
  try {
    console.log("Message ", message);
    const text = message.text;
    const channel = message.channel;

    // Step 1: Check the knowledge base
    const knowledgeBaseResult = fetchFromKnowledgeBase(text);

    if (knowledgeBaseResult.confidence >= confidenceThreshold) {
      await say({ text: knowledgeBaseResult.answer });
    } else {
      const isBug = await analyzeMessageWithOpenAI(text);
      if (isBug) {
        const jiraResponse = await createJiraTicket(
          'Bug reported in Slack',
          text,
          'appropriate_assignee'  // Replace with the appropriate assignee logic
        );
        await say({ text: `Jira ticket created: ${jiraResponse.key}` });
      } else {
        await say({ text: "I couldn't determine the issue from your message. Please provide more details." });
      }
    }
  } catch (error) {
    console.error('Error handling Slack message:', error);
    await say({ text: 'An error occurred while processing your message.' });
  }
});

// Start your app
(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
  } catch (error) {
    console.error('Failed to start Bolt app:', error);
  }
})();
