const axios = require('axios');
const { jiraEmail, jiraProj, jiraApiToken, jiraBaseUrl } = require('./config');

// Function to create a Jira ticket
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

        return response.data; // This will contain the issue key
    } catch (error) {
        console.error('Error creating issue:', error.response ? error.response.data : error.message);
        return null;
    }
};

// Function to delete a Jira ticket using its key
const deleteJiraTicket = async (issueKey) => {
    try {
        const response = await axios.delete(
            `${jiraBaseUrl}/rest/api/3/issue/${issueKey}`,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`,
                    'Accept': 'application/json'
                }
            }
        );

        console.log(`Issue ${issueKey} deleted successfully`);
        return response.data;
    } catch (error) {
        console.error('Error deleting issue:', error.response ? error.response.data : error.message);
        return null;
    }
};

module.exports = { createJiraTicket, deleteJiraTicket };
