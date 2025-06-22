import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required for seeding');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Demo users
const demoUsers = [
  {
    email: 'demo@praxislearning.com',
    password: 'DemoPass123!',
    name: 'Demo User',
    role: 'student',
  },
  {
    email: 'alice@berkeley.edu',
    password: 'AlicePass123!',
    name: 'Alice Johnson',
    role: 'student',
  },
  {
    email: 'bob@berkeley.edu',
    password: 'BobPass123!',
    name: 'Bob Smith',
    role: 'student',
  },
];

// Sample documents
const sampleDocuments = [
  {
    title: 'Introduction to Machine Learning',
    content: `
# Introduction to Machine Learning

Machine Learning (ML) is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.

## Types of Machine Learning

### 1. Supervised Learning
- Uses labeled training data
- Examples: Classification, Regression
- Algorithms: Decision Trees, Neural Networks, SVM

### 2. Unsupervised Learning
- Works with unlabeled data
- Examples: Clustering, Dimensionality Reduction
- Algorithms: K-Means, PCA, Autoencoders

### 3. Reinforcement Learning
- Learns through interaction with environment
- Examples: Game AI, Robotics
- Algorithms: Q-Learning, Policy Gradient

## Key Concepts

**Training Data**: The dataset used to train the model
**Features**: Input variables used for prediction
**Labels**: Target output in supervised learning
**Model**: The learned mapping from inputs to outputs
**Overfitting**: When model performs well on training data but poorly on new data
**Underfitting**: When model is too simple to capture patterns

## Common Applications
- Image Recognition
- Natural Language Processing
- Recommendation Systems
- Fraud Detection
- Medical Diagnosis
    `,
    type: 'pdf',
    tags: ['machine learning', 'AI', 'computer science'],
  },
  {
    title: 'Quantum Mechanics Fundamentals',
    content: `
# Quantum Mechanics Fundamentals

## Introduction
Quantum mechanics is the fundamental theory that describes the behavior of matter and energy at the atomic and subatomic scale.

## Key Principles

### 1. Wave-Particle Duality
- Particles exhibit both wave and particle properties
- De Broglie wavelength: λ = h/p
- Double-slit experiment demonstrates this duality

### 2. Heisenberg Uncertainty Principle
- ΔxΔp ≥ ħ/2
- Cannot simultaneously know exact position and momentum
- Fundamental limit, not measurement limitation

### 3. Schrödinger Equation
- iħ(∂ψ/∂t) = Ĥψ
- Describes quantum state evolution
- Solutions are wavefunctions

### 4. Quantum Superposition
- Particles can exist in multiple states simultaneously
- Measurement causes wavefunction collapse
- Basis for quantum computing

## Applications
- Semiconductors and transistors
- Lasers
- MRI machines
- Quantum computers
    `,
    type: 'pdf',
    tags: ['physics', 'quantum mechanics', 'science'],
  },
  {
    title: 'Organic Chemistry: Reactions and Mechanisms',
    content: `
# Organic Chemistry: Reactions and Mechanisms

## Introduction
Organic chemistry is the study of carbon-containing compounds and their reactions.

## Major Reaction Types

### 1. Substitution Reactions
- SN1: Unimolecular, carbocation intermediate
- SN2: Bimolecular, concerted mechanism
- Factors: Leaving group, nucleophile, solvent

### 2. Elimination Reactions
- E1: Unimolecular, carbocation intermediate
- E2: Bimolecular, concerted mechanism
- Zaitsev's rule: More substituted alkene favored

### 3. Addition Reactions
- Electrophilic addition to alkenes
- Markovnikov's rule
- Anti-Markovnikov addition (peroxide effect)

### 4. Oxidation-Reduction
- Alcohols → Aldehydes/Ketones → Carboxylic acids
- Common oxidizing agents: KMnO4, CrO3, PCC
- Common reducing agents: LiAlH4, NaBH4

## Reaction Mechanisms
Understanding electron movement through curved arrows
- Nucleophiles: electron-rich species
- Electrophiles: electron-poor species
- Transition states and intermediates
    `,
    type: 'pdf',
    tags: ['chemistry', 'organic chemistry', 'reactions'],
  },
];

// Flashcard sets with cards
const flashcardSets = [
  {
    title: 'Machine Learning Basics',
    description: 'Essential ML concepts and algorithms',
    cards: [
      { front: 'What is supervised learning?', back: 'Learning from labeled training data where the desired output is known' },
      { front: 'Define overfitting', back: 'When a model performs well on training data but poorly on new, unseen data' },
      { front: 'What is gradient descent?', back: 'An optimization algorithm that iteratively adjusts parameters to minimize a loss function' },
      { front: 'Explain cross-validation', back: 'A technique to assess model performance by splitting data into training and validation sets multiple times' },
      { front: 'What is a neural network?', back: 'A computing system inspired by biological neural networks, consisting of interconnected nodes (neurons) in layers' },
    ],
  },
  {
    title: 'Quantum Physics Terms',
    description: 'Key quantum mechanics terminology',
    cards: [
      { front: 'What is wave-particle duality?', back: 'The concept that particles exhibit both wave and particle properties depending on the observation' },
      { front: 'State Heisenberg Uncertainty Principle', back: 'ΔxΔp ≥ ħ/2 - Cannot simultaneously know exact position and momentum of a particle' },
      { front: 'What is quantum superposition?', back: 'The ability of particles to exist in multiple states simultaneously until measured' },
      { front: 'Define wavefunction', back: 'A mathematical function that describes the quantum state of a particle or system' },
      { front: 'What is quantum entanglement?', back: 'A phenomenon where particles become correlated such that the state of one instantly affects the other' },
    ],
  },
  {
    title: 'Organic Chemistry Reactions',
    description: 'Common organic reaction mechanisms',
    cards: [
      { front: 'What is an SN2 reaction?', back: 'Bimolecular nucleophilic substitution with concerted mechanism and inversion of configuration' },
      { front: 'State Markovnikov\'s rule', back: 'In addition of HX to alkenes, H adds to the carbon with more hydrogens' },
      { front: 'What is a carbocation?', back: 'A positively charged carbon atom with only six electrons in its valence shell' },
      { front: 'Define elimination reaction', back: 'A reaction where atoms or groups are removed from a molecule, typically forming a double bond' },
      { front: 'What is a nucleophile?', back: 'An electron-rich species that donates electrons to form a chemical bond' },
    ],
  },
];

// Exercises
const exercises = [
  {
    type: 'multiple_choice',
    question: 'Which machine learning algorithm is best for classification with non-linear boundaries?',
    options: ['Linear Regression', 'Support Vector Machine with RBF kernel', 'K-Means Clustering', 'PCA'],
    correct_answer: 1,
    explanation: 'SVM with RBF kernel can handle non-linear classification boundaries effectively',
    difficulty: 'medium',
  },
  {
    type: 'fill_blank',
    question: 'The _____ principle states that you cannot simultaneously know the exact position and momentum of a particle.',
    correct_answer: 'Heisenberg Uncertainty',
    explanation: 'The Heisenberg Uncertainty Principle is a fundamental concept in quantum mechanics',
    difficulty: 'easy',
  },
  {
    type: 'true_false',
    question: 'In an SN1 reaction, the rate depends on the concentration of both the substrate and nucleophile.',
    correct_answer: false,
    explanation: 'SN1 reactions are unimolecular - the rate depends only on substrate concentration',
    difficulty: 'medium',
  },
  {
    type: 'short_answer',
    question: 'Explain the difference between supervised and unsupervised learning.',
    sample_answer: 'Supervised learning uses labeled training data where the desired output is known, while unsupervised learning works with unlabeled data to find patterns or structure.',
    difficulty: 'medium',
  },
];

// Helper functions
async function createUser(userData: any) {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      name: userData.name,
    },
  });

  if (authError) {
    console.error(`Error creating user ${userData.email}:`, authError);
    return null;
  }

  // Create user record in users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
    })
    .select()
    .single();

  if (userError) {
    console.error(`Error creating user record for ${userData.email}:`, userError);
    return null;
  }

  console.log(`✅ Created user: ${userData.email}`);
  return user;
}

async function seedUsers() {
  console.log('👥 Seeding demo users...');
  const users = [];
  
  for (const userData of demoUsers) {
    const user = await createUser(userData);
    if (user) users.push(user);
  }
  
  return users;
}

async function seedDocuments(users: any[]) {
  console.log('📄 Seeding documents...');
  const documents = [];
  
  for (const doc of sampleDocuments) {
    const userId = users[Math.floor(Math.random() * users.length)].id;
    
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: doc.title,
        content: doc.content,
        type: doc.type,
        tags: doc.tags,
        embeddings_generated: true,
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating document ${doc.title}:`, error);
    } else {
      console.log(`✅ Created document: ${doc.title}`);
      documents.push(data);
    }
  }
  
  return documents;
}

async function seedFlashcards(users: any[]) {
  console.log('🎴 Seeding flashcards...');
  
  for (const set of flashcardSets) {
    const userId = users[Math.floor(Math.random() * users.length)].id;
    
    // Create flashcard set
    const { data: setData, error: setError } = await supabase
      .from('flashcard_sets')
      .insert({
        user_id: userId,
        title: set.title,
        description: set.description,
      })
      .select()
      .single();
    
    if (setError) {
      console.error(`Error creating flashcard set ${set.title}:`, setError);
      continue;
    }
    
    console.log(`✅ Created flashcard set: ${set.title}`);
    
    // Create flashcards
    for (const card of set.cards) {
      const { error: cardError } = await supabase
        .from('flashcards')
        .insert({
          set_id: setData.id,
          front: card.front,
          back: card.back,
        });
      
      if (cardError) {
        console.error('Error creating flashcard:', cardError);
      }
    }
    
    // Initialize study cards for spaced repetition
    const { data: cards } = await supabase
      .from('flashcards')
      .select('id')
      .eq('set_id', setData.id);
    
    if (cards) {
      for (const card of cards) {
        await supabase
          .from('study_cards')
          .insert({
            flashcard_id: card.id,
            user_id: userId,
            repetitions: Math.floor(Math.random() * 5),
            ease_factor: 2.5 + Math.random() * 0.5,
            interval: Math.floor(Math.random() * 7) + 1,
            next_review_date: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
      }
    }
  }
}

async function seedExercises(documents: any[]) {
  console.log('📝 Seeding exercises...');
  
  for (const exercise of exercises) {
    const document = documents[Math.floor(Math.random() * documents.length)];
    
    const { error } = await supabase
      .from('exercises')
      .insert({
        document_id: document.id,
        type: exercise.type,
        question: exercise.question,
        options: exercise.options || null,
        correct_answer: exercise.correct_answer,
        explanation: exercise.explanation,
        difficulty: exercise.difficulty,
        topic: document.tags[0],
      });
    
    if (error) {
      console.error('Error creating exercise:', error);
    } else {
      console.log(`✅ Created ${exercise.type} exercise`);
    }
  }
}

async function seedKnowledgeGaps(users: any[], documents: any[]) {
  console.log('🔍 Seeding knowledge gaps...');
  
  const gapTypes = ['prerequisite', 'conceptual', 'application', 'retention'];
  const concepts = [
    'Neural Network Architecture',
    'Quantum Superposition',
    'SN2 Reaction Mechanism',
    'Gradient Descent Optimization',
    'Wave Function Collapse',
  ];
  
  for (let i = 0; i < 10; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const document = documents[Math.floor(Math.random() * documents.length)];
    
    const { error } = await supabase
      .from('knowledge_gaps')
      .insert({
        user_id: user.id,
        gap_type: gapTypes[Math.floor(Math.random() * gapTypes.length)],
        concept: concepts[Math.floor(Math.random() * concepts.length)],
        severity: Math.random() * 0.7 + 0.3, // 0.3 to 1.0
        description: `Gap identified in understanding of ${concepts[Math.floor(Math.random() * concepts.length)]}`,
        detected_from: {
          documents: [document.id],
          timestamp: new Date().toISOString(),
        },
        resources: [
          { type: 'video', url: 'https://example.com/tutorial', title: 'Tutorial Video' },
          { type: 'article', url: 'https://example.com/article', title: 'Detailed Article' },
        ],
      });
    
    if (error) {
      console.error('Error creating knowledge gap:', error);
    }
  }
  
  console.log('✅ Created knowledge gaps');
}

async function seedWorkspaces(users: any[], documents: any[]) {
  console.log('📂 Seeding workspaces...');
  
  const workspaceNames = ['Research Project', 'Study Group', 'Thesis Work'];
  
  for (const name of workspaceNames) {
    const owner = users[Math.floor(Math.random() * users.length)];
    const collaborators = users.filter(u => u.id !== owner.id).slice(0, 2);
    
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        name,
        owner_id: owner.id,
        description: `Collaborative workspace for ${name.toLowerCase()}`,
        settings: {
          allow_comments: true,
          require_approval: false,
          auto_save: true,
        },
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating workspace ${name}:`, error);
      continue;
    }
    
    console.log(`✅ Created workspace: ${name}`);
    
    // Add collaborators
    for (const collaborator of collaborators) {
      await supabase
        .from('workspace_collaborators')
        .insert({
          workspace_id: workspace.id,
          user_id: collaborator.id,
          role: 'editor',
          permissions: ['read', 'write', 'comment'],
        });
    }
    
    // Add documents to workspace
    const workspaceDocs = documents.slice(0, 2);
    for (const doc of workspaceDocs) {
      await supabase
        .from('workspace_documents')
        .insert({
          workspace_id: workspace.id,
          document_id: doc.id,
          added_by: owner.id,
        });
    }
  }
}

async function seedAnalytics(users: any[]) {
  console.log('📊 Seeding analytics data...');
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  for (const user of users) {
    // Create study sessions
    for (let i = 0; i < 20; i++) {
      const sessionDate = new Date(
        thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
      );
      
      await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          started_at: sessionDate.toISOString(),
          ended_at: new Date(sessionDate.getTime() + Math.random() * 60 * 60 * 1000).toISOString(),
          cards_studied: Math.floor(Math.random() * 30) + 10,
          average_rating: Math.random() * 2 + 2,
          retention_rate: Math.random() * 0.3 + 0.7,
        });
    }
    
    // Create analytics events
    const eventTypes = ['page_view', 'feature_use', 'document_upload', 'flashcard_create'];
    
    for (let i = 0; i < 50; i++) {
      const eventDate = new Date(
        thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
      );
      
      await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          event_data: {
            page: '/dashboard',
            duration: Math.floor(Math.random() * 300),
          },
          created_at: eventDate.toISOString(),
        });
    }
  }
  
  console.log('✅ Created analytics data');
}

async function seedWorkflows(users: any[]) {
  console.log('🔄 Seeding workflows...');
  
  const workflows = [
    {
      name: 'Daily Study Reminder',
      description: 'Send reminder when cards are due for review',
      trigger: { type: 'schedule', schedule: '0 9 * * *' },
      actions: [
        { type: 'check_due_cards', config: {} },
        { type: 'send_notification', config: { channel: 'email' } },
      ],
    },
    {
      name: 'Document Analysis Pipeline',
      description: 'Automatically analyze new documents',
      trigger: { type: 'event', event: 'document_uploaded' },
      actions: [
        { type: 'generate_embeddings', config: {} },
        { type: 'extract_concepts', config: {} },
        { type: 'create_flashcards', config: { count: 10 } },
      ],
    },
  ];
  
  for (const workflow of workflows) {
    const user = users[Math.floor(Math.random() * users.length)];
    
    const { error } = await supabase
      .from('workflows')
      .insert({
        user_id: user.id,
        name: workflow.name,
        description: workflow.description,
        trigger: workflow.trigger,
        actions: workflow.actions,
        enabled: true,
      });
    
    if (error) {
      console.error(`Error creating workflow ${workflow.name}:`, error);
    } else {
      console.log(`✅ Created workflow: ${workflow.name}`);
    }
  }
}

// Main seed function
async function seed() {
  console.log('🌱 Starting demo data seed...');
  console.log('================================');
  
  try {
    // Seed users first
    const users = await seedUsers();
    if (users.length === 0) {
      console.error('❌ No users created, aborting seed');
      return;
    }
    
    // Seed documents
    const documents = await seedDocuments(users);
    
    // Seed other data
    await seedFlashcards(users);
    await seedExercises(documents);
    await seedKnowledgeGaps(users, documents);
    await seedWorkspaces(users, documents);
    await seedAnalytics(users);
    await seedWorkflows(users);
    
    console.log('');
    console.log('✅ Demo data seeding completed successfully!');
    console.log('================================');
    console.log('');
    console.log('Demo accounts created:');
    console.log('----------------------');
    demoUsers.forEach(user => {
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Password: ${user.password}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run seed
seed().then(() => {
  console.log('🎉 Seed script finished');
  process.exit(0);
});