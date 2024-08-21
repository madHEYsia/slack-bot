
const axios = require('axios');
const { openaiApiKey } = require('./config');
const knowledgeEmbeddings = require('../knowledgeEmbeddings.json');

const openaiApiUrl = 'https://api.openai.com/v1/chat/completions';

const analyzeMessageWithOpenAI = async (message) => {
    const content = `Evaluate the following message and respond "Yes" if it describes a specific query or issue. Respond with only "Yes" or "No":\n\n"${message}"`;
    return axios.post(openaiApiUrl, {
        model: 'gpt-3.5-turbo-1106',
            messages: [
                {
                    role: 'user',
                    content
                }
            ],
        max_tokens: 100
    }, {
        headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
        }
    });
}

// Calculate cosine similarity
const cosineSimilarity = (vec1, vec2) => {
    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const normA = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (normA * normB);
}

// Find the most similar content chunk
const findMostSimilar = (queryEmbedding) => {
    let maxSimilarity = -1;
    let mostSimilarEntryId = null;

    for (const [id, embedding] of Object.entries(knowledgeEmbeddings)) {
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            mostSimilarEntryId = id;
        }
    }

    return { mostSimilarEntryId, maxSimilarity };
}

// (Optional) Summarize the content
const summarizeText = (query, text) => {
    return axios.post(openaiApiUrl, {
        model: 'gpt-3.5-turbo-1106',
            messages: [
                {
                    role: 'user',
                    content: `Provide concise answer to the user query using only the information from the provided reference content. Do not include any information outside of the reference.\n\nUser Query: ${query}\n\nReference Content: ${text}`
                }
            ],
        max_tokens: 500
    }, {
        headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
        }
    }).catch(error => {
        console.log("Summarisation error ", error);
        return error;
    });
}

module.exports = { analyzeMessageWithOpenAI, findMostSimilar, summarizeText, cosineSimilarity };
            
