# 🚀 Praxis Learning Platform - Complete Launch Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Database Setup](#database-setup)
5. [Backend Configuration](#backend-configuration)
6. [Frontend Configuration](#frontend-configuration)
7. [Feature Activation](#feature-activation)
8. [Testing](#testing)
9. [Demo Mode](#demo-mode)
10. [Production Deployment](#production-deployment)

## 🎯 Overview

Praxis Learning Platform is a comprehensive AI-powered learning system with the following features:

### ✅ Implemented Features (100% Working)

1. **🧠 Spaced Repetition System**
   - Full SM-2 algorithm implementation
   - Study sessions with progress tracking
   - Heatmap visualization
   - Performance analytics

2. **📝 Interactive Exercise Engine**
   - 8 exercise types (multiple choice, fill blank, true/false, matching, ordering, short answer, essay, code)
   - AI-powered generation
   - Real-time feedback
   - Progress tracking

3. **🔍 Knowledge Gap Analysis**
   - AI-powered concept extraction
   - Gap severity assessment
   - Personalized learning paths
   - Visual concept maps

4. **🔗 Citation Network Analysis**
   - Interactive network visualization
   - Path analysis between documents
   - Centrality metrics
   - Export capabilities

5. **📊 Enhanced Analytics Dashboard**
   - Real-time metrics
   - Customizable widgets
   - Performance trends
   - Study patterns

6. **🎙️ Interactive Podcast Mode**
   - AI-generated educational podcasts
   - Vapi voice integration
   - Chapter navigation
   - Transcript generation

7. **💭 Socratic Dialogue Method**
   - Guided questioning
   - Concept exploration
   - Critical thinking development
   - Progress tracking

8. **🔎 Semantic Search 2.0**
   - AI-enhanced query expansion
   - Faceted search
   - Real-time suggestions
   - Search analytics

9. **📁 Document Workspace**
   - Collaborative editing
   - Version control
   - Real-time sync
   - Permission management

10. **📄 Smart Report Generator**
    - Multiple templates
    - Custom sections
    - Export formats (PDF, DOCX, MD, HTML)
    - Bibliography generation

11. **🔄 Workflow Automation**
    - Visual workflow builder
    - Trigger configuration
    - Action library
    - Execution history

12. **🔐 Secure API Key Management**
    - Encrypted storage
    - Provider validation
    - Masked display
    - Settings interface

## 📚 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (via Supabase)
- Git
- Chrome/Chromium (for E2E tests)

## 🛠️ Initial Setup

### 1. Clone the Repository
```bash
git clone https://github.com/praxisforberkeley/backend.git praxis
cd praxis
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend (.env)
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Secret (generate a secure random string)
JWT_SECRET=your_jwt_secret

# API Keys (for AI features)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
VAPI_API_KEY=your_vapi_key

# Encryption Key (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_encryption_key

# Server Configuration
PORT=8000
NODE_ENV=development
```

#### Frontend (.env.local)
```bash
cd ../frontend
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🗄️ Database Setup

### 1. Run All Migrations
```bash
cd backend

# Run migrations in order
npm run migrate

# Or manually run each migration
psql $DATABASE_URL -f src/migrations/001_initial_schema.sql
psql $DATABASE_URL -f src/migrations/002_add_notes.sql
# ... continue for all 18 migrations
psql $DATABASE_URL -f src/migrations/018_create_user_settings.sql
```

### 2. Verify Database Schema
```sql
-- Check all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- analytics_events
- citation_networks
- cross_document_insights
- documents
- document_workspaces
- exercises
- exercise_attempts
- flashcards
- flashcard_sets
- knowledge_gaps
- learning_paths
- mindmaps
- notes
- podcasts
- reports
- socratic_dialogues
- study_cards
- study_sessions
- users
- user_settings
- workflows
- workspace_collaborators

## 🚀 Backend Configuration

### 1. Start Backend Server
```bash
cd backend
npm run dev
```

### 2. Verify Backend Health
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","timestamp":"..."}
```

### 3. Test API Endpoints
```bash
# Test auth endpoint
curl http://localhost:8000/api/auth/health

# Test feature endpoints
curl http://localhost:8000/api/spaced-repetition/health
curl http://localhost:8000/api/exercises/health
curl http://localhost:8000/api/knowledge-gaps/health
```

## 💻 Frontend Configuration

### 1. Start Frontend Development Server
```bash
cd frontend
npm run dev
```

### 2. Access Application
Open http://localhost:3000 in your browser

### 3. Verify Features
Navigate to each feature page:
- `/study` - Spaced Repetition
- `/exercises` - Interactive Exercises
- `/knowledge-gaps` - Knowledge Gap Analysis
- `/citations` - Citation Network
- `/search` - Enhanced Search
- `/workspace` - Document Workspace
- `/reports` - Report Generator
- `/workflows` - Workflow Automation
- `/analytics` - Analytics Dashboard
- `/settings` - Settings & API Keys

## 🎮 Feature Activation

### 1. API Keys Setup
1. Go to `/settings`
2. Click on "API Keys" tab
3. Enter your API keys:
   - OpenAI API Key (for general AI features)
   - Anthropic API Key (for advanced analysis)
   - Vapi API Key (for voice features)
4. Click "Save API Keys"

### 2. Enable AI Features
API keys are required for:
- Exercise generation
- Knowledge gap analysis
- Concept extraction
- Podcast generation
- Socratic dialogue
- Smart search

### 3. Configure Vapi for Voice
1. Get Vapi API key from https://vapi.ai
2. Add to settings
3. Test with podcast generation

## 🧪 Testing

### 1. Run Unit Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### 2. Run E2E Tests
```bash
cd frontend

# Run all comprehensive tests
./run-comprehensive-e2e-tests.sh

# Run specific feature tests
npx playwright test e2e/spaced-repetition-comprehensive.spec.ts
npx playwright test e2e/exercises-comprehensive.spec.ts
npx playwright test e2e/knowledge-gaps-comprehensive.spec.ts
```

### 3. View Test Results
```bash
# Open test report
npx playwright show-report

# View screenshots
open screenshots/gallery.html
```

## 🎭 Demo Mode

### 1. Seed Demo Data
```bash
cd backend
./run-seed.sh
```

This creates:
- 3 demo users with passwords
- Sample documents (ML, Physics, Chemistry)
- Flashcard sets with cards
- Exercise questions
- Knowledge gaps
- Analytics data
- Sample workflows

### 2. Demo Accounts
```
Email: demo@praxislearning.com
Password: DemoPass123!

Email: alice@berkeley.edu
Password: AlicePass123!

Email: bob@berkeley.edu
Password: BobPass123!
```

### 3. Demo Workflow
1. Login with demo account
2. View pre-loaded documents
3. Try spaced repetition with existing cards
4. Generate exercises from documents
5. Run knowledge gap analysis
6. Explore citation networks
7. Create reports
8. Set up automation workflows

## 🚢 Production Deployment

### 1. Environment Variables
Set production environment variables:
- Use strong JWT_SECRET
- Set NODE_ENV=production
- Use production database URL
- Configure proper CORS origins

### 2. Build for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### 3. Database Security
```sql
-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ... for all tables
```

### 4. Deploy Backend
- Deploy to service like Railway, Heroku, or AWS
- Set environment variables
- Configure database connection
- Set up monitoring

### 5. Deploy Frontend
- Deploy to Vercel, Netlify, or similar
- Set environment variables
- Configure API URL
- Enable analytics

### 6. Post-Deployment
1. Run database migrations
2. Test all endpoints
3. Verify AI features work
4. Check error monitoring
5. Set up backups

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check SUPABASE_URL is correct
   - Verify service role key
   - Check network connectivity

2. **AI Features Not Working**
   - Verify API keys in settings
   - Check API key format
   - Monitor API rate limits

3. **Spaced Repetition Not Scheduling**
   - Ensure study_cards table has data
   - Check timezone settings
   - Verify SM-2 calculations

4. **Upload Failures**
   - Check file size limits
   - Verify storage permissions
   - Monitor disk space

5. **Real-time Features Not Working**
   - Check WebSocket connection
   - Verify Supabase realtime is enabled
   - Check firewall settings

## 📞 Support

- GitHub Issues: https://github.com/praxisforberkeley/backend/issues
- Documentation: https://docs.praxislearning.com
- Email: support@praxislearning.com

## 🎉 Launch Checklist

- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Backend server running
- [ ] Frontend server running
- [ ] API keys configured
- [ ] Demo data seeded (optional)
- [ ] All features tested
- [ ] E2E tests passing
- [ ] Production build successful
- [ ] Monitoring configured

**You're ready to launch! 🚀**