import { SeedConfig } from './index';
import { v4 as uuidv4 } from 'uuid';

export async function seedStudyData(supabase: any, config: SeedConfig) {
  console.log('  Creating study data...');

  // Get demo user and documents
  const { data: demoUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'demo@praxis.edu')
    .single();

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, subject, content')
    .eq('user_id', demoUser.id)
    .limit(20);

  if (!demoUser || !documents || documents.length === 0) {
    console.error('Demo user or documents not found!');
    return;
  }

  // Create flashcard sets
  const flashcardSets = await createFlashcardSets(supabase, demoUser.id, documents);
  
  // Create flashcards
  const flashcards = await createFlashcards(supabase, flashcardSets, documents);
  
  // Create study cards (spaced repetition data)
  const studyCards = await createStudyCards(supabase, demoUser.id, flashcards);
  
  // Create study history
  await createStudyHistory(supabase, demoUser.id, flashcardSets, studyCards);
  
  // Create study streaks
  await createStudyStreaks(supabase, demoUser.id);
}

async function createFlashcardSets(supabase: any, userId: string, documents: any[]) {
  console.log('    Creating flashcard sets...');
  const sets: any[] = [];
  
  // Group documents by subject
  const subjects = [...new Set(documents.map(d => d.subject))];
  
  for (const subject of subjects) {
    const subjectDocs = documents.filter(d => d.subject === subject);
    
    const setData = {
      id: uuidv4(),
      user_id: userId,
      name: `${subject} Fundamentals`,
      description: `Core concepts and key points from ${subject} papers`,
      visibility: 'private',
      card_count: 0, // Will update later
      created_at: getRandomDate(60),
    };
    
    const { data, error } = await supabase
      .from('flashcard_sets')
      .insert(setData)
      .select()
      .single();
    
    if (!error && data) {
      sets.push({ ...data, documents: subjectDocs });
    }
  }
  
  // Create a mixed set
  const mixedSet = {
    id: uuidv4(),
    user_id: userId,
    name: 'Interdisciplinary Review',
    description: 'Mixed concepts from all subjects for comprehensive review',
    visibility: 'private',
    card_count: 0,
    created_at: getRandomDate(30),
  };
  
  const { data: mixedData } = await supabase
    .from('flashcard_sets')
    .insert(mixedSet)
    .select()
    .single();
  
  if (mixedData) {
    sets.push({ ...mixedData, documents });
  }
  
  console.log(`      ✓ Created ${sets.length} flashcard sets`);
  return sets;
}

async function createFlashcards(supabase: any, flashcardSets: any[], documents: any[]) {
  console.log('    Creating flashcards...');
  const allFlashcards: any[] = [];
  
  for (const set of flashcardSets) {
    const setDocuments = set.documents || [];
    const flashcardsForSet: any[] = [];
    
    // Create different types of flashcards
    for (const doc of setDocuments.slice(0, 5)) { // Limit to 5 docs per set
      // Basic Q&A cards
      flashcardsForSet.push(...createBasicCards(set.id, doc));
      
      // Cloze cards
      flashcardsForSet.push(...createClozeCards(set.id, doc));
      
      // Multiple choice cards
      flashcardsForSet.push(...createMultipleChoiceCards(set.id, doc));
    }
    
    // Insert flashcards
    for (const card of flashcardsForSet) {
      const { data, error } = await supabase
        .from('flashcards')
        .insert(card)
        .select()
        .single();
      
      if (!error && data) {
        allFlashcards.push(data);
      }
    }
    
    // Update card count
    await supabase
      .from('flashcard_sets')
      .update({ card_count: flashcardsForSet.length })
      .eq('id', set.id);
  }
  
  console.log(`      ✓ Created ${allFlashcards.length} flashcards`);
  return allFlashcards;
}

function createBasicCards(setId: string, document: any): any[] {
  const cards: any[] = [];
  const concepts = getConceptsForSubject(document.subject);
  
  for (let i = 0; i < 5; i++) {
    const concept = concepts[i % concepts.length];
    cards.push({
      id: uuidv4(),
      set_id: setId,
      card_type: 'basic',
      front: concept.question,
      back: concept.answer,
      difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
      tags: [document.subject.toLowerCase(), concept.topic],
      metadata: {
        source_document: document.id,
        concept: concept.topic,
      },
      created_at: getRandomDate(45),
    });
  }
  
  return cards;
}

function createClozeCards(setId: string, document: any): any[] {
  const cards: any[] = [];
  const clozeSentences = getClozeForSubject(document.subject);
  
  for (let i = 0; i < 3; i++) {
    const cloze = clozeSentences[i % clozeSentences.length];
    cards.push({
      id: uuidv4(),
      set_id: setId,
      card_type: 'cloze',
      front: cloze.sentence.replace(cloze.deletion, '{{c1::...}}'),
      back: cloze.deletion,
      cloze_deletions: [cloze.deletion],
      difficulty: 'medium',
      tags: [document.subject.toLowerCase(), 'definition'],
      metadata: {
        source_document: document.id,
        full_sentence: cloze.sentence,
      },
      created_at: getRandomDate(45),
    });
  }
  
  return cards;
}

function createMultipleChoiceCards(setId: string, document: any): any[] {
  const cards: any[] = [];
  const mcQuestions = getMultipleChoiceForSubject(document.subject);
  
  for (let i = 0; i < 2; i++) {
    const mc = mcQuestions[i % mcQuestions.length];
    cards.push({
      id: uuidv4(),
      set_id: setId,
      card_type: 'multiple_choice',
      front: mc.question,
      back: mc.correct,
      options: mc.options,
      difficulty: 'hard',
      tags: [document.subject.toLowerCase(), 'conceptual'],
      metadata: {
        source_document: document.id,
        explanation: mc.explanation,
      },
      created_at: getRandomDate(45),
    });
  }
  
  return cards;
}

async function createStudyCards(supabase: any, userId: string, flashcards: any[]) {
  console.log('    Creating study cards (spaced repetition data)...');
  const studyCards: any[] = [];
  
  for (const flashcard of flashcards) {
    // Simulate different learning states
    const learningState = Math.random();
    let studyCard: any;
    
    if (learningState < 0.3) {
      // Well-learned cards
      studyCard = {
        id: uuidv4(),
        flashcard_id: flashcard.id,
        user_id: userId,
        repetitions: Math.floor(Math.random() * 10) + 5,
        ease_factor: 2.5 + Math.random(),
        interval: Math.floor(Math.random() * 30) + 20,
        next_review_date: getFutureDate(Math.floor(Math.random() * 30)),
        last_reviewed_at: getRandomDate(5),
        total_reviews: Math.floor(Math.random() * 20) + 10,
        successful_reviews: Math.floor(Math.random() * 18) + 8,
        failed_reviews: Math.floor(Math.random() * 3),
        average_response_time: Math.floor(Math.random() * 5000) + 2000,
        average_quality: 3.5 + Math.random(),
      };
    } else if (learningState < 0.6) {
      // Learning cards
      studyCard = {
        id: uuidv4(),
        flashcard_id: flashcard.id,
        user_id: userId,
        repetitions: Math.floor(Math.random() * 5) + 1,
        ease_factor: 2.3 + Math.random() * 0.2,
        interval: Math.floor(Math.random() * 7) + 1,
        next_review_date: getFutureDate(Math.floor(Math.random() * 7)),
        last_reviewed_at: getRandomDate(3),
        total_reviews: Math.floor(Math.random() * 10) + 3,
        successful_reviews: Math.floor(Math.random() * 7) + 2,
        failed_reviews: Math.floor(Math.random() * 3) + 1,
        average_response_time: Math.floor(Math.random() * 8000) + 4000,
        average_quality: 2.5 + Math.random(),
      };
    } else {
      // New or difficult cards
      studyCard = {
        id: uuidv4(),
        flashcard_id: flashcard.id,
        user_id: userId,
        repetitions: Math.floor(Math.random() * 2),
        ease_factor: 2.0 + Math.random() * 0.3,
        interval: 1,
        next_review_date: getFutureDate(Math.random() < 0.5 ? 0 : 1),
        last_reviewed_at: Math.random() < 0.5 ? getRandomDate(1) : null,
        total_reviews: Math.floor(Math.random() * 3),
        successful_reviews: Math.floor(Math.random() * 2),
        failed_reviews: Math.floor(Math.random() * 2),
        average_response_time: Math.floor(Math.random() * 10000) + 5000,
        average_quality: 1.5 + Math.random(),
      };
    }
    
    const { data, error } = await supabase
      .from('study_cards')
      .insert(studyCard)
      .select()
      .single();
    
    if (!error && data) {
      studyCards.push(data);
    }
  }
  
  console.log(`      ✓ Created ${studyCards.length} study cards`);
  return studyCards;
}

async function createStudyHistory(supabase: any, userId: string, flashcardSets: any[], studyCards: any[]) {
  console.log('    Creating study history...');
  let totalSessions = 0;
  let totalReviews = 0;
  
  // Create sessions over the last 30 days
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    // Simulate realistic study patterns
    const studyProbability = getStudyProbability(daysAgo);
    
    if (Math.random() < studyProbability) {
      // Morning session
      if (Math.random() < 0.3) {
        const session = await createStudySession(
          supabase, userId, flashcardSets, studyCards, daysAgo, 'morning'
        );
        if (session) {
          totalSessions++;
          totalReviews += session.reviews;
        }
      }
      
      // Evening session (more likely)
      if (Math.random() < 0.7) {
        const session = await createStudySession(
          supabase, userId, flashcardSets, studyCards, daysAgo, 'evening'
        );
        if (session) {
          totalSessions++;
          totalReviews += session.reviews;
        }
      }
    }
  }
  
  console.log(`      ✓ Created ${totalSessions} study sessions with ${totalReviews} total reviews`);
}

async function createStudySession(
  supabase: any,
  userId: string,
  flashcardSets: any[],
  studyCards: any[],
  daysAgo: number,
  timeOfDay: 'morning' | 'evening'
) {
  const set = flashcardSets[Math.floor(Math.random() * flashcardSets.length)];
  const sessionCards = studyCards
    .filter(() => Math.random() < 0.3)
    .slice(0, Math.floor(Math.random() * 20) + 10);
  
  if (sessionCards.length === 0) return null;
  
  const sessionDate = new Date();
  sessionDate.setDate(sessionDate.getDate() - daysAgo);
  
  if (timeOfDay === 'morning') {
    sessionDate.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
  } else {
    sessionDate.setHours(18 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60));
  }
  
  const correctAnswers = Math.floor(sessionCards.length * (0.6 + Math.random() * 0.3));
  const duration = sessionCards.length * (30 + Math.floor(Math.random() * 20));
  
  const sessionData = {
    id: uuidv4(),
    user_id: userId,
    flashcard_set_id: set.id,
    session_type: 'spaced_repetition',
    cards_studied: sessionCards.length,
    cards_mastered: Math.floor(correctAnswers * 0.3),
    cards_learning: Math.floor(sessionCards.length * 0.5),
    cards_relearning: Math.floor(sessionCards.length * 0.2),
    correct_answers: correctAnswers,
    duration_seconds: duration,
    performance_data: {
      accuracy: correctAnswers / sessionCards.length,
      average_response_time: Math.floor(duration / sessionCards.length),
      difficulty_breakdown: {
        easy: Math.floor(sessionCards.length * 0.3),
        medium: Math.floor(sessionCards.length * 0.5),
        hard: Math.floor(sessionCards.length * 0.2),
      },
    },
    started_at: sessionDate.toISOString(),
    completed_at: new Date(sessionDate.getTime() + duration * 1000).toISOString(),
  };
  
  const { data: session, error } = await supabase
    .from('study_sessions')
    .insert(sessionData)
    .select()
    .single();
  
  if (!error && session) {
    // Create individual reviews
    for (const card of sessionCards) {
      const quality = Math.random() < (correctAnswers / sessionCards.length) 
        ? Math.floor(Math.random() * 2) + 3  // Success: 3-5
        : Math.floor(Math.random() * 2) + 1; // Failure: 1-2
      
      await supabase.from('study_reviews').insert({
        id: uuidv4(),
        session_id: session.id,
        study_card_id: card.id,
        quality,
        response_time: Math.floor(Math.random() * 10000) + 2000,
        prev_ease_factor: card.ease_factor,
        prev_interval: card.interval,
        prev_repetitions: card.repetitions,
        new_ease_factor: calculateNewEaseFactor(card.ease_factor, quality),
        new_interval: calculateNewInterval(card.interval, quality, card.ease_factor),
        new_repetitions: card.repetitions + 1,
        created_at: sessionDate.toISOString(),
      });
    }
    
    return { session, reviews: sessionCards.length };
  }
  
  return null;
}

async function createStudyStreaks(supabase: any, userId: string) {
  console.log('    Creating study streaks...');
  
  // Calculate streaks based on session history
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  
  if (!sessions || sessions.length === 0) return;
  
  // Calculate current and longest streak
  const studyDays = new Set(
    sessions.map(s => new Date(s.started_at).toDateString())
  );
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate = new Date();
  
  // Check streak from today backwards
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    
    if (studyDays.has(checkDate.toDateString())) {
      if (i <= 1) currentStreak++;
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else if (i <= 1) {
      // Current streak broken
      break;
    } else {
      tempStreak = 0;
    }
  }
  
  const streakData = {
    id: uuidv4(),
    user_id: userId,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_study_date: new Date().toISOString().split('T')[0],
    total_study_days: studyDays.size,
    streak_data: Array.from(studyDays).map(date => ({
      date,
      studied: true,
    })),
  };
  
  await supabase.from('study_streaks').insert(streakData);
  console.log(`      ✓ Created study streak: ${currentStreak} days current, ${longestStreak} days best`);
}

// Helper functions
function getRandomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
}

function getFutureDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString();
}

function getStudyProbability(daysAgo: number): number {
  // Higher probability of recent study
  if (daysAgo <= 3) return 0.9;
  if (daysAgo <= 7) return 0.8;
  if (daysAgo <= 14) return 0.7;
  return 0.5;
}

function calculateNewEaseFactor(oldEF: number, quality: number): number {
  // SM-2 algorithm
  const newEF = oldEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(1.3, newEF);
}

function calculateNewInterval(oldInterval: number, quality: number, easeFactor: number): number {
  if (quality < 3) return 1;
  if (oldInterval === 1) return 6;
  return Math.round(oldInterval * easeFactor);
}

function getConceptsForSubject(subject: string): any[] {
  const concepts: { [key: string]: any[] } = {
    "Physics": [
      { topic: "quantum mechanics", question: "What is the Heisenberg Uncertainty Principle?", answer: "It states that the position and momentum of a particle cannot both be precisely determined at the same time." },
      { topic: "relativity", question: "What is time dilation?", answer: "The phenomenon where time passes at different rates for observers in different reference frames." },
      { topic: "thermodynamics", question: "What is entropy?", answer: "A measure of disorder or randomness in a system, which tends to increase over time." },
    ],
    "Mathematics": [
      { topic: "calculus", question: "What is the fundamental theorem of calculus?", answer: "It links the concept of differentiation and integration, showing they are inverse operations." },
      { topic: "linear algebra", question: "What is an eigenvalue?", answer: "A scalar value that, when multiplied by an eigenvector, gives the same result as applying a linear transformation to that vector." },
      { topic: "topology", question: "What is a homeomorphism?", answer: "A continuous function between topological spaces that has a continuous inverse function." },
    ],
    "Computer Science": [
      { topic: "algorithms", question: "What is the time complexity of quicksort?", answer: "O(n log n) average case, O(n²) worst case." },
      { topic: "machine learning", question: "What is overfitting?", answer: "When a model learns the training data too well, including noise, and performs poorly on new data." },
      { topic: "databases", question: "What is ACID in databases?", answer: "Atomicity, Consistency, Isolation, Durability - properties that guarantee reliable transaction processing." },
    ],
    "Biology": [
      { topic: "genetics", question: "What is CRISPR?", answer: "A gene-editing technology that uses a protein called Cas9 to cut and modify DNA sequences." },
      { topic: "cell biology", question: "What is the function of mitochondria?", answer: "The powerhouse of the cell, producing ATP through cellular respiration." },
      { topic: "evolution", question: "What is natural selection?", answer: "The process where organisms with favorable traits are more likely to survive and reproduce." },
    ],
  };
  
  return concepts[subject] || concepts["Physics"];
}

function getClozeForSubject(subject: string): any[] {
  const clozes: { [key: string]: any[] } = {
    "Physics": [
      { sentence: "The speed of light in vacuum is 299,792,458 meters per second.", deletion: "299,792,458" },
      { sentence: "E=mc² shows the equivalence of mass and energy.", deletion: "mass and energy" },
    ],
    "Mathematics": [
      { sentence: "The derivative of sin(x) is cos(x).", deletion: "cos(x)" },
      { sentence: "A prime number is divisible only by 1 and itself.", deletion: "1 and itself" },
    ],
    "Computer Science": [
      { sentence: "Binary search has a time complexity of O(log n).", deletion: "O(log n)" },
      { sentence: "TCP provides reliable, ordered delivery of data.", deletion: "reliable, ordered" },
    ],
    "Biology": [
      { sentence: "DNA is composed of four nucleotide bases: A, T, G, and C.", deletion: "A, T, G, and C" },
      { sentence: "Photosynthesis converts light energy into chemical energy.", deletion: "chemical energy" },
    ],
  };
  
  return clozes[subject] || clozes["Physics"];
}

function getMultipleChoiceForSubject(subject: string): any[] {
  const questions: { [key: string]: any[] } = {
    "Physics": [
      {
        question: "Which particle mediates the electromagnetic force?",
        correct: "Photon",
        options: ["Photon", "W boson", "Gluon", "Graviton"],
        explanation: "Photons are the force carriers for electromagnetic interactions."
      },
    ],
    "Mathematics": [
      {
        question: "What is the value of i² (where i is the imaginary unit)?",
        correct: "-1",
        options: ["-1", "1", "0", "i"],
        explanation: "By definition, i² = -1, which is the fundamental property of imaginary numbers."
      },
    ],
    "Computer Science": [
      {
        question: "Which data structure uses LIFO (Last In, First Out)?",
        correct: "Stack",
        options: ["Stack", "Queue", "Array", "Tree"],
        explanation: "Stacks follow LIFO principle where the last element added is the first to be removed."
      },
    ],
    "Biology": [
      {
        question: "Which organelle is responsible for protein synthesis?",
        correct: "Ribosome",
        options: ["Ribosome", "Lysosome", "Peroxisome", "Golgi apparatus"],
        explanation: "Ribosomes are the cellular structures where proteins are synthesized."
      },
    ],
  };
  
  return questions[subject] || questions["Physics"];
}

export async function cleanupStudyData(supabase: any) {
  await supabase.from('study_reviews').delete().gte('created_at', '2020-01-01');
  await supabase.from('study_sessions').delete().gte('created_at', '2020-01-01');
  await supabase.from('study_streaks').delete().gte('created_at', '2020-01-01');
  await supabase.from('study_cards').delete().gte('created_at', '2020-01-01');
  await supabase.from('flashcards').delete().gte('created_at', '2020-01-01');
  await supabase.from('flashcard_sets').delete().gte('created_at', '2020-01-01');
}