
const openai = require('openai');
const { openaiApiKey } = require('./config');

openai.apiKey = openaiApiKey;

async function analyzeMessageWithOpenAI(message) {
    const prompt = `Analyze this message and classify whether it describes a bug or not: "${message}"`;
    const response = await openai.Completion.create({
        engine: 'davinci',
        prompt: prompt,
        max_tokens: 50
    });

    return response.choices[0].text.trim().toLowerCase().includes('bug');
}

module.exports = { analyzeMessageWithOpenAI };
            