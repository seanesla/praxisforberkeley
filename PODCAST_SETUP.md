# Podcast Feature Setup Guide

## Issue: Podcast Tables Missing

The podcast feature requires two database tables that need to be created in Supabase:
- `podcast_sessions`
- `podcast_transcripts`

## Solution

### Step 1: Create Tables in Supabase

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL from `backend/src/utils/setup-podcast-tables.ts` or run:
   ```bash
   cd backend
   npx ts-node src/utils/setup-podcast-tables.ts
   ```
4. The script will output the required SQL if tables are missing
5. Execute the SQL in Supabase SQL Editor

### Step 2: Verify Tables

After creating tables, verify they exist:
```bash
cd backend
npx ts-node src/utils/setup-podcast-tables.ts
```

You should see: "Podcast tables exist and are accessible!"

### Step 3: Restart Backend

After creating tables, restart your backend server:
```bash
npm run dev
```

## Microphone Permissions

The podcast feature requires microphone access. The app will:
1. Check if running in a secure context (HTTPS or localhost)
2. Request microphone permissions when recording starts
3. Show appropriate error messages if permissions are denied

### Browser Requirements:
- Must be accessed via HTTPS or localhost
- User must grant microphone permissions
- Browser must support MediaRecorder API

## Testing

1. Navigate to `/podcast` route
2. Select a document or start general conversation
3. Click the microphone button to start recording
4. Grant microphone permissions when prompted
5. Speak your message
6. Click stop to process the audio

## Troubleshooting

### "500 Internal Server Error" on /api/podcast/start
- Tables don't exist in database
- Follow Step 1 above to create tables

### "Microphone permissions denied"
- Ensure using HTTPS or localhost
- Check browser settings for microphone permissions
- Try in incognito/private mode to reset permissions

### "NotAllowedError: Permission denied"
- User denied microphone access
- Browser blocking microphone access
- Not using secure context (HTTPS)