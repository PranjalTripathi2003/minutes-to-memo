const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint to receive a file URL and process it
app.post('/transcribe', async (req, res) => {
  try {
    console.log('Received POST request to /transcribe');
    console.log('Request body:', JSON.stringify(req.body));

    const { fileUrl, recordingId, callbackUrl } = req.body;

    if (!fileUrl || !recordingId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log(`Received transcription request for recording ${recordingId}`);

    // Download the file from the URL
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });

    const filename = path.join(__dirname, 'uploads', `${recordingId}-${Date.now()}.mp3`);
    const writer = fs.createWriteStream(filename);

    response.data.pipe(writer);

    writer.on('finish', () => {
      console.log(`File downloaded to ${filename}`);

      // Start transcription process with correct paths
      const whisperPath = '/home/ubuntu/whisper.cpp';
      const fullFilePath = path.resolve(filename);
      const outputFile = `${fullFilePath}.txt`;

      // Use the correct path to the executable and model
      const whisperCommand = `cd ${whisperPath} && ./build/bin/main -m ${whisperPath}/models/ggml-base.en.bin -f "${fullFilePath}" -otxt`;

      console.log(`Executing whisper command: ${whisperCommand}`);

      exec(whisperCommand, async (error, stdout, stderr) => {
        if (error) {
          console.error(`Transcription error: ${error.message}`);
          console.error(`Command stdout: ${stdout}`);
          console.error(`Command stderr: ${stderr}`);

          // Notify the application server about the failure if callback URL is provided
          if (callbackUrl) {
            try {
              console.log(`Attempting to send failure callback to: ${callbackUrl}`);
              await axios.post(callbackUrl, {
                recordingId,
                status: 'failed',
                error: error.message
              });
              console.log(`Sent failure notice to callback URL: ${callbackUrl}`);
            } catch (callbackError) {
              console.error(`Failed to send failure callback: ${callbackError.message}`);
              console.log("This error is expected if your application is running on localhost");
            }
          }

          return;
        }

        console.log(`Transcription completed for ${filename}`);
        console.log(`Whisper stdout: ${stdout}`);

        // Read the transcription output
        fs.readFile(outputFile, 'utf8', async (err, transcription) => {
          if (err) {
            console.error(`Error reading transcription file: ${err.message}`);
            return;
          }

          console.log(`Transcription: ${transcription.substring(0, 100)}...`);

          // Notify the application server about the completion if callback URL is provided
          if (callbackUrl) {
            try {
              console.log(`Attempting to send success callback to: ${callbackUrl}`);
              await axios.post(callbackUrl, {
                recordingId,
                transcription,
                status: 'completed'
              });

              console.log(`Sent transcription to callback URL: ${callbackUrl}`);
            } catch (callbackError) {
              console.error(`Failed to send callback: ${callbackError.message}`);
              console.log("This error is expected if your application is running on localhost");
              console.log("Transcription was successful, even though the callback failed");
            }
          }

          // Clean up files
          fs.unlink(filename, () => {});
          fs.unlink(outputFile, () => {});
        });
      });

      res.json({ message: 'Transcription started', recordingId });
    });

    writer.on('error', (err) => {
      console.error(`Error downloading file: ${err.message}`);
      res.status(500).json({ error: 'Failed to download file' });
    });
  } catch (error) {
    console.error(`Server error: ${error.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Transcription server listening on port ${port} on all interfaces`);
});