const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const { linksToScan } = require("./urls");
const { openaiApiKey } = require('../bot/config');
require('dotenv').config();

const openaiApiUrl = 'https://api.openai.com/v1/chat/completions';
const openaiEmbeddingUrl = 'https://api.openai.com/v1/embeddings';
const blogEntries = [];
let knowledgeEmbeddings = {};

// Function to call OpenAI API to summarize or split content into sections
async function splitContentIntoChunks(content) {
    const response = await axios.post(
        openaiApiUrl,
        {
            model: 'gpt-3.5-turbo-1106',
            messages: [
                {
                    role: 'user',
                    content: `Please break down the following content into high-level logical chunks based on context and concept. The goal is to create 2-3 distinct sections where each chunk represents a separate and self-contained idea or topic. Ensure that each chunk is independent, with no continuation from the previous chunk. If the content cannot be clearly divided into multiple chunks or content is below 100 characters, keep it as a single chunk. 

                    Do not add, remove, or alter the content—simply divide it into logical sections. 

                    Response format: Strictly return the chunks as an array of strings. Example: ["<chunk_1>", "<chunk_2>"] where chunk_1 and chunk_2 are strings and not arrays.

                    Content:
                    ${content}`
                }
            ],
            max_tokens: 1500, // Adjust tokens based on content size
            temperature: 0.5,
        },
        {
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
            },
        }
    );

    const chunks = response.data.choices[0].message.content;

    return chunks; // Splitting by double newline assuming OpenAI returns sections separated by double newline
}

// Function to process multiple blog entries
async function processBlogs() {
    const knowledgeBase = [];

    for (const [index, entry] of blogEntries.entries()) {
        // console.log(`Processing blog ${index + 1} of ${blogEntries.length}...`);
        // const chunks = await splitContentIntoChunks(entry);
        // const parsedChunks = JSON.parse(chunks);
        // parsedChunks.forEach((chunk, idx) => {
        //     knowledgeBase.push({ id: `${index + 1}-${idx + 1}`, content: chunk.trim() });
        // });
        knowledgeBase.push({ id: `${index + 1}`, content: entry.trim() });
    }

    return knowledgeBase;
}

const fetchContent = async (urlEndpoint) => {
    const url = 'https://help.regie.ai' + urlEndpoint;
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    const html = await response.text();

    // Parse the HTML string using JSDOM    
    const dom = new JSDOM(html);

    // Use the window.document object from JSDOM to query the DOM
    const document = dom.window.document;

    // Select all divs with the class "content-block" and h1 within the document
    const contentBlocks = document.querySelectorAll('div.content-block');
    const Header = document.querySelectorAll('h1')[0]?.textContent || '';

    // Extract the inner text from each selected div
    const contentTexts = Array.from(contentBlocks).map(div => div.textContent.trim().replaceAll(".", ". ").replaceAll('\"', '"'));
    return `${Header}. ${contentTexts.join("")}`;
};

const fetchContentParallel = (offset, limit) => {
    var promises = [];
    for (let i = offset; i < Math.min(offset + limit, linksToScan.length); i++) {
        promises.push(fetchContent(linksToScan[i]));
    }
    return Promise.all(promises);
};

const fetchAllBlogContent = () => new Promise((res, rej) => {
    const innerExec = (offset) => {
        fetchContentParallel(offset, 10).then(response => {
            blogEntries.push(...response);
            if (offset <= linksToScan.length)
                innerExec(offset + 10);
            else
                res();
        });
    }
    innerExec(0);
});

// Function to get embeddings
const getEmbedding = (text) => {
    return axios.post(openaiEmbeddingUrl, {
        input: text,
        model: "text-embedding-ada-002"
    }, {
        headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            // Extract the embedding from the response
            return response.data.data[0].embedding;
        })
        .catch(error => {
            console.error('Error generating embedding:', error);
            throw error; // Re-throw the error to be handled by the caller
        });
}

// Generate and store embeddings for the knowledge base
const generateKnowledgeEmbeddings = (knowledgeBase) => {
    const embeddingPromises = knowledgeBase.map((entry, index) => {
        return getEmbedding(entry.content)
            .then(embedding => {
                console.log(`Embedding ${index + 1} of ${knowledgeBase.length}...`);
                knowledgeEmbeddings[entry.id] = embedding;
            });
    });

    // Return a promise that resolves when all embeddings are generated
    return Promise.all(embeddingPromises)
        .then(() => {
            console.log('All embeddings generated');
            fs.writeFileSync('knowledgeEmbeddings.json', JSON.stringify(knowledgeEmbeddings, null, 2));
            return knowledgeEmbeddings;
        })
        .catch(error => {
            console.error('Error generating knowledge embeddings:', error);
            throw error; // Re-throw the error to be handled by the caller
        });
}

const startKnowledgeBaseSetup = () => {
    if(knowledgeBase.length)
        return;
    fetchAllBlogContent()
    .then(() => {
        return processBlogs();
    })
    .then((knowledgeBase) => {
        fs.writeFileSync('knowledgeBase.json', JSON.stringify(knowledgeBase, null, 2));
        return generateKnowledgeEmbeddings(knowledgeBase);
    })
    .catch(error => {
        console.log("KnowledgeBase setup failed with error ", error);
    });
};

// Export the function so it can be called explicitly
module.exports = { getEmbedding, startKnowledgeBaseSetup };
