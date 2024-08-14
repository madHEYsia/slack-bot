
const knowledgeBase = {
    "how to reset password": "To reset your password, click on 'Forgot Password' on the login page.",
    "error 500": "Error 500 is usually a server-side issue. Please try again later.",
    // Add more knowledge base entries as needed
};

function fetchFromKnowledgeBase(query) {
    for (const key in knowledgeBase) {
        if (query.toLowerCase().includes(key.toLowerCase())) {
            return { answer: knowledgeBase[key], confidence: 0.9 };
        }
    }
    return { answer: "I'm not sure about that.", confidence: 0.3 };
}

module.exports = { fetchFromKnowledgeBase };
            