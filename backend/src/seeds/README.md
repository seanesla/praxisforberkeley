# Demo Seed Data System

This directory contains the comprehensive seed data system for the Praxis application demo environment.

## Overview

The seed system creates realistic demo data across all features of the application, including:

- **Users**: Demo user account (demo@praxis.edu) and test collaborators
- **Documents**: 50+ academic papers across Physics, Mathematics, Computer Science, and Biology
- **Study Data**: 1000+ flashcard reviews with realistic spaced repetition patterns
- **Knowledge Gaps**: Detected gaps and personalized learning paths
- **Exercises**: 100+ practice problems with performance tracking
- **Workflows**: Pre-configured automation workflows with execution history
- **Analytics**: 30 days of realistic usage data
- **Additional Features**: Citation networks, cross-document insights, podcast sessions, etc.

## Usage

### Basic Commands

```bash
# Run all seed modules
npm run seed

# Run with demo mode (shows credentials)
npm run seed:demo

# Clean existing data first, then seed
npm run seed:clean

# Run specific modules only
npm run seed:specific -- --modules users,documents
```

### Available Modules

1. **users** - Creates demo user accounts and preferences
2. **documents** - Generates academic papers with metadata
3. **study-data** - Creates flashcards and study history
4. **knowledge-gaps** - Generates gap analysis and learning paths
5. **exercises** - Creates practice problems and sessions
6. **workflows** - Sets up automation workflows
7. **analytics** - Generates 30 days of usage data
8. **features** - Creates data for additional features

## Demo Credentials

After running the seed script, you can log in with:

- **Email**: demo@praxis.edu
- **Password**: demo123456

Additional test users:
- alice@praxis.edu (password: alice123456)
- bob@praxis.edu (password: bob123456)
- carol@praxis.edu (password: carol123456)

## Data Characteristics

### Realistic Patterns

The seed data simulates realistic usage patterns:

- **Study Sessions**: Morning (7-9 AM) and evening (6-10 PM) peaks
- **Weekly Patterns**: Higher activity on weekdays
- **Performance Curves**: Gradual improvement over time
- **Spaced Repetition**: Follows SM-2 algorithm patterns
- **Document Activity**: Recent documents have more activity

### Subject Distribution

Documents are evenly distributed across subjects:
- Physics: Quantum mechanics, relativity, particle physics
- Mathematics: Topology, analysis, number theory
- Computer Science: ML/AI, algorithms, distributed systems
- Biology: Genetics, molecular biology, ecology

### Performance Metrics

The seed data includes:
- Study accuracy: 60-90% success rates
- Exercise completion: Realistic difficulty progression
- Knowledge gaps: High, medium, and low severity
- Analytics: Page views, feature usage, search queries

## Development

### Adding New Seed Modules

1. Create a new file in `src/seeds/` (e.g., `09-new-feature.ts`)
2. Export a seed function and optional cleanup function:

```typescript
export async function seedNewFeature(supabase: any, config: SeedConfig) {
  // Implementation
}

export async function cleanupNewFeature(supabase: any) {
  // Cleanup implementation
}
```

3. Add the module to `index.ts`:

```typescript
import { seedNewFeature, cleanupNewFeature } from './09-new-feature';

const seedModules: SeedModule[] = [
  // ... existing modules
  { name: 'new-feature', run: seedNewFeature, cleanup: cleanupNewFeature },
];
```

### Best Practices

1. **Idempotency**: Check for existing data before creating
2. **Realistic Data**: Use plausible values and patterns
3. **Performance**: Insert data in batches when possible
4. **Cleanup**: Provide cleanup functions for all modules
5. **Documentation**: Document any special data relationships

## Troubleshooting

### Common Issues

1. **"User already exists" error**
   - The demo user was already created
   - Use `npm run seed:clean` to remove existing data first

2. **Foreign key violations**
   - Ensure modules run in the correct order
   - Users must be created before documents, etc.

3. **Slow performance**
   - The seed script creates thousands of records
   - Expected runtime: 2-5 minutes for full seed

### Debugging

Enable verbose mode to see detailed progress:

```bash
npm run seed -- --verbose
```

Check the Supabase dashboard to verify data creation.