
const axios = require('axios');
const { jiraApiToken, jiraBaseUrl } = require('./config');

async function createJiraTicket(summary, description, assignee) {
    const url = `${jiraBaseUrl}/rest/api/3/issue`;
    const payload = {
        fields: {
            project: { key: 'PROJECT_KEY' },  // Replace with your project key
            summary: summary,
            description: description,
            issuetype: { name: 'Bug' },
            assignee: { name: assignee },  // Map your assignee here
        }
    };

    const response = await axios.post(url, payload, {
        headers: {
            'Authorization': `Bearer ${jiraApiToken}`,
            'Content-Type': 'application/json',
        }
    });

    return response.data;
}

module.exports = { createJiraTicket };
            