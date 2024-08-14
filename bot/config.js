
require('dotenv').config();

module.exports = {
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    jiraApiToken: process.env.JIRA_API_TOKEN,
    jiraBaseUrl: process.env.JIRA_BASE_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
    confidenceThreshold: 0.7,
};
            