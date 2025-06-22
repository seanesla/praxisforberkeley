# Supabase Database Setup

Your Supabase credentials have been configured. Now you need to create the database tables.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/cukhgpykjwyhcsmokepb
2. Click on "SQL Editor" in the left sidebar
3. Copy the contents of `backend/src/database/init-tables.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute all the SQL statements

## Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
cd backend
supabase db push --db-url "postgresql://postgres:[YOUR-DB-PASSWORD]@db.cukhgpykjwyhcsmokepb.supabase.co:5432/postgres"
```

## Quick Test

After setting up the tables, you can test the authentication:

1. Open http://localhost:3000/login
2. Click "Sign Up" to create a new account
3. Use any email and password (e.g., test@example.com / password123)
4. You should be able to register and login

## Current Status

✅ Frontend server running on http://localhost:3000
✅ Backend server running on http://localhost:5001
✅ Supabase credentials configured
⏳ Database tables need to be created

Once the tables are created, all features will work!