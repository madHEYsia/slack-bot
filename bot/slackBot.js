const { App, ExpressReceiver } = require('@slack/bolt');
const { slackBotToken, slackSigningSecret, confidenceThreshold } = require('./config');
const { fetchFromKnowledgeBase } = require('./knowledgeBase');
const { createJiraTicket } = require('./jira');
const { analyzeMessageWithOpenAI } = require('./openaiAnalyzer');

// Initialize your Bolt app with the bot token and signing secret

const app = new App({
  token: slackBotToken,
  signingSecret: slackSigningSecret
});

// Initialize ExpressReceiver for custom routes
const receiver = new ExpressReceiver({
    signingSecret: slackSigningSecret
});

receiver.router.post('/slack/events', (req, res) => {
    const slackSignature = req.headers['x-slack-signature'];
    const requestTimestamp = req.headers['x-slack-request-timestamp'];
    const requestBody = req.body.toString('utf8');

    // Ensure the signature and timestamp headers are present
    if (!slackSignature || !requestTimestamp) {
        console.error('Missing Slack signature or timestamp');
        return res.status(400).send('Verification failed');
    }

    // Step 1: Verify the timestamp is within the allowed timeframe (e.g., 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - requestTimestamp) > 60 * 5) {
        console.error('Request timestamp is out of range');
        return res.status(400).send('Verification failed');
    }

    // Step 2: Create the signature base string as 'v0:{timestamp}:{body}'
    const sigBasestring = `v0:${requestTimestamp}:${requestBody}`;

    // Step 3: Hash the base string using the signing secret as the key
    const hmac = crypto.createHmac('sha256', slackSigningSecret);
    const hash = hmac.update(sigBasestring).digest('hex');
    const mySignature = `v0=${hash}`;

    // Step 4: Compare the computed signature with the signature in the request header
    const isVerified = crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature));

    if (isVerified) {
        console.log('Request verified successfully');

        // Check if the request contains the challenge parameter
        if (req.body && req.body.challenge) {
          // Respond with the challenge value to verify the endpoint
          res.status(200).send(req.body.challenge);
        } else {
          // Handle other cases (if any)
          res.status(400).send('Invalid request');
        }
    } else {
        console.error('Signature verification failed');
        res.status(400).send('Verification failed');
    }
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
