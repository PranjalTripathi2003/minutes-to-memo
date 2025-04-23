# Minutes to Memo Application

This application allows users to record audio and transcribe it using Deepgram's Whisper model.

## Transcription Service

The application uses Deepgram for transcription with the Whisper model. The implementation:

1. When a user requests transcription of a recording, the app downloads the audio file from storage
2. The audio file is sent directly to Deepgram's API for transcription using the Whisper model
3. The transcription result is saved in the database immediately
4. No callback mechanism is needed as the transcription happens synchronously

## Environment Variables

The following environment variables should be set:

```
# Deepgram API Key
DEEPGRAM_API_KEY=your-deepgram-api-key
```

The default API key is set to `50999766bb949572be783c65771c0b3b52d29621`, but it's recommended to set your own in production.

## Database Setup

Before using the application, you need to set up the database tables. The application requires three tables:

1. `recordings` - Stores metadata about uploaded recordings
2. `transcriptions` - Stores the transcribed text for each recording
3. `summaries` - Stores generated summaries for each recording

To set up these tables:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of the `setup-db.sql` file from this project
4. Paste it into the SQL Editor
5. Click "Run" to execute the SQL and create the necessary tables

If you encounter errors about missing tables when using the application, this means the database hasn't been properly set up.

## Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Upload meeting recordings
- Transcribe audio to text
- Generate concise summaries
- Review and export summaries 