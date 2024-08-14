
# Slack Bot for Jira Integration

## Overview
This bot listens to messages in a Slack channel, checks against a knowledge base, and, if necessary, creates a Jira ticket using the Jira API. It also uses OpenAI to analyze messages when the knowledge base doesn't have a confident answer.

## Setup

### 1. Clone the repository

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Set up your `.env` file with the necessary API keys.

### 4. Run the bot
```bash
npm start
```

## Files and Directories

- `bot/config.js`: Configuration and environment variables.
- `bot/knowledgeBase.js`: Dummy knowledge base and fetching logic.
- `bot/jira.js`: Functions for interacting with Jira API.
- `bot/openaiAnalyzer.js`: Functions for analyzing messages with OpenAI.
- `bot/slackBot.js`: The main bot logic.

