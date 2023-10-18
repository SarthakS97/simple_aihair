const express = require('express');
const { Storage } = require('@google-cloud/storage');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');
// const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config(); // Load environment variables from .env file

const app = express();
const PORT = 5000;
app.use(express.json());
app.use(fileUpload());

const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

const storage = new Storage({
    projectId: process.env.GOOGLE_PROJECT_ID,
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
});

const bucketName = 'avataryaidemo_bucket';

app.post('/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const file = req.files.file;
    const email = req.query.email;
    const fileName = generateFileName(file.name);

    // Upload the zip file to Google Cloud Storage
    const fileStream = storage.bucket(bucketName).file(fileName).createWriteStream();
    fileStream.on('error', (err) => {
        console.error('Error uploading file to Google Cloud Storage:', err);
        res.status(500).json({ error: 'Error uploading file' });
    });

    fileStream.on('finish', async () => {
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        res.json({ publicUrl });
        console.log('Public URL:', publicUrl);
        console.log('Email:', email);

        // Save email as a text file
        const emailFileName = email + '.txt';
        const emailFile = storage.bucket(bucketName).file(emailFileName).createWriteStream();
        emailFile.on('error', (err) => {
            console.error('Error saving email as a text file:', err);
        });

        emailFile.on('finish', () => {
            console.log('Email saved as a text file:', emailFileName);
        });

        emailFile.end(email);
    });

    fileStream.end(file.data);
});

function generateFileName(originalFileName) {
    const uniqueId = uuidv4(); // Generate a unique identifier
    const timestamp = Date.now(); // Current timestamp
    const randomString = Math.random().toString(36).substring(2, 15); // Random string

    // Combine all components to form a unique filename
    return `${uniqueId}-${timestamp}-${randomString}-${originalFileName}`;
}

app.use(express.static(path.join(__dirname, './simple_aihair/build')));
app.get('*', function (_, res) {
    res.sendFile(path.join(__dirname, './simple_aihair/build/index.html'), function (err) {
        res.status(500).send(err);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
