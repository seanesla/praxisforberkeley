# Podcast & Socratic Tables Migration Guide

## Steps to Run the Migration

### 1. Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** section (usually in the left sidebar)

### 2. Run the Migration
1. Click on "New Query" or the "+" button to create a new SQL query
2. Copy the entire contents of `backend/src/migrations/run-all-migrations.sql`
3. Paste it into the SQL editor
4. Click "Run" or press Ctrl/Cmd + Enter

### 3. Verify the Migration
After running the migration, verify it worked by running this query:

```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('podcast_sessions', 'podcast_transcripts', 'socratic_sessions', 'socratic_exchanges')
ORDER BY table_name;
```

You should see all four tables listed.

### 4. Test the Podcast Feature
1. Restart your backend server if it's running
2. Navigate to the podcast page in your frontend
3. The 500 error should now be resolved

## What This Migration Does

### Podcast Tables
- **podcast_sessions**: Stores podcast session information (user, document, status, etc.)
- **podcast_transcripts**: Stores the conversation transcript between user and AI

### Socratic Dialogue Tables
- **socratic_sessions**: Stores Socratic dialogue session information
- **socratic_exchanges**: Stores Q&A exchanges within each session

### Security Features
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Proper foreign key relationships to maintain data integrity

## Troubleshooting

### If you get an error about missing tables
The migration assumes `documents` table exists. If it doesn't, run the full database setup first.

### If you get permission errors
Make sure you're running the SQL as a database admin user in Supabase.

### If the error persists after migration
1. Check the backend logs for more details
2. Ensure your Supabase environment variables are correctly set
3. Verify the backend can connect to Supabase using the `/api/test-supabase` endpoint

## Alternative: Manual Table Creation

If the combined migration fails, you can run each table creation separately:

1. First run the podcast tables from `backend/src/migrations/015_create_podcast_tables.sql`
2. Then run the Socratic tables from `backend/src/migrations/016_create_socratic_tables.sql`

Each file can be run independently in the Supabase SQL editor.