const express = require('express');
const bodyParser = require('body-parser');

// Initialize the Express app
const app = express();

// Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());

// Define a route to handle Slack's event subscription verification
app.post('/slack/events', (req, res) => {
    // Check if the request contains a challenge parameter
    if (req.body && req.body.challenge) {
        // Respond with the challenge value
        res.status(200).send(req.body.challenge);
    } else {
        // Respond with a 400 status if the challenge parameter is missing
        res.status(400).send('Invalid request');
    }
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
