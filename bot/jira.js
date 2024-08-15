
const axios = require('axios');
const { jiraEmail, jiraProj, jiraApiToken, jiraBaseUrl } = require('./config');

const createJiraTicket = async (summary, description, assignee) => {
    try {
        const response = await axios.post(
            `${jiraBaseUrl}/rest/api/3/issue`,
            {
                fields: {
                    project: {
                        key: jiraProj
                    },
                    summary: summary,
                    description: {
                        "type": "doc",
                        "version": 1,
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": description
                                    }
                                ]
                            }
                        ]
                    },
                    issuetype: {
                        name: "Initiative"
                    }
                    // assignee: { name: assignee },  // Map your assignee here
                }
            },
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Issue created successfully:', response.data);
    } catch (error) {
        console.error('Error creating issue:', error.response ? error.response.data : error.message);
    }
};

module.exports = { createJiraTicket };
            
