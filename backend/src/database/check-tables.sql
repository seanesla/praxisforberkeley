-- Check if flashcards table exists and what columns it has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'flashcards'
ORDER BY ordinal_position;