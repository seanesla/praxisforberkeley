# Praxis Demo Guide

## Quick Start

Follow these steps to set up and run the complete Praxis demo:

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

The backend will start on http://localhost:5001

### 2. Start the Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:3000

### 3. Seed Demo Data

In another terminal:

```bash
cd backend
npm run seed:demo
```

This will create:
- Demo user account (demo@praxis.edu / demo123456)
- 50+ academic documents
- 1000+ flashcard reviews
- Complete activity history

### 4. Access the Demo

1. Open http://localhost:3000
2. Log in with:
   - Email: `demo@praxis.edu`
   - Password: `demo123456`

## Feature Showcase

### 📚 Document Management
- Upload and organize academic papers
- AI-powered summaries and insights
- Citation network visualization

### 🎯 Study Tools
- Spaced repetition flashcards
- Adaptive learning algorithms
- Performance tracking

### 🧠 AI Features
- Knowledge gap analysis
- Exercise generation
- Socratic dialogue mode
- Podcast-style discussions

### 📊 Analytics
- Comprehensive learning metrics
- Progress visualization
- Custom reports

### 🔄 Automation
- Workflow builder
- Scheduled tasks
- Batch processing

## Demo Scenarios

### Scenario 1: Student Research Workflow
1. Upload a research paper
2. Generate flashcards automatically
3. Study with spaced repetition
4. Track learning progress

### Scenario 2: Knowledge Synthesis
1. Upload multiple related papers
2. View citation network
3. Generate cross-document insights
4. Create comprehensive report

### Scenario 3: Interactive Learning
1. Start a Socratic dialogue
2. Explore concepts deeply
3. Generate exercises
4. Review in podcast mode

## Test Accounts

Besides the main demo account, you can use:

- **Alice** (Physics researcher): alice@praxis.edu / alice123456
- **Bob** (Math professor): bob@praxis.edu / bob123456
- **Carol** (CS student): carol@praxis.edu / carol123456

## Performance Testing

Run the performance check:

```bash
./check-performance.sh
```

## Full Test Suite

Run all tests:

```bash
./run-all-tests.sh
```

## Troubleshooting

### Backend not starting
- Check if port 5001 is available
- Ensure PostgreSQL is running
- Verify .env configuration

### Frontend build errors
- Clear .next directory: `rm -rf .next`
- Clear node_modules and reinstall

### Seed data issues
- Run with clean flag: `npm run seed:clean`
- Check Supabase connection

## Key Features to Demonstrate

1. **AI-Powered Learning**
   - Smart flashcard generation
   - Adaptive difficulty
   - Personalized recommendations

2. **Research Tools**
   - Citation network analysis
   - Cross-document insights
   - Knowledge gap detection

3. **Interactive Modes**
   - Socratic dialogue
   - Podcast discussions
   - Exercise practice

4. **Productivity Features**
   - Workflow automation
   - Batch processing
   - Smart search

5. **Analytics & Insights**
   - Learning progress tracking
   - Performance metrics
   - Custom reports

## Demo Tips

- Start with document upload to show immediate value
- Demonstrate AI features for "wow" factor
- Show spaced repetition for learning efficiency
- Highlight analytics for progress tracking
- End with workflow automation for power users

## Support

For issues or questions about the demo:
1. Check the error logs in the console
2. Verify all services are running
3. Ensure demo data was seeded successfully
4. Review the README for detailed setup instructions