import { SeedConfig } from './index';
import { v4 as uuidv4 } from 'uuid';

export async function seedExercises(supabase: any, config: SeedConfig) {
  console.log('  Creating exercises data...');

  // Get demo user and documents
  const { data: demoUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'demo@praxis.edu')
    .single();

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, subject')
    .eq('user_id', demoUser.id);

  if (!demoUser || !documents || documents.length === 0) {
    console.error('Demo user or documents not found!');
    return;
  }

  // Create exercises
  const exercises = await createExercises(supabase, demoUser.id, documents);
  
  // Create exercise sessions
  await createExerciseSessions(supabase, demoUser.id, documents, exercises);
  
  // Create performance tracking
  await createPerformanceData(supabase, demoUser.id, exercises);
}

async function createExercises(supabase: any, userId: string, documents: any[]) {
  console.log('    Creating exercises...');
  const allExercises: any[] = [];
  
  for (const doc of documents.slice(0, 15)) { // Create exercises for first 15 documents
    const docExercises = generateExercisesForDocument(userId, doc);
    
    for (const exercise of docExercises) {
      const { data, error } = await supabase
        .from('exercises')
        .insert(exercise)
        .select()
        .single();
      
      if (!error && data) {
        allExercises.push(data);
      }
    }
  }
  
  console.log(`      ✓ Created ${allExercises.length} exercises`);
  return allExercises;
}

function generateExercisesForDocument(userId: string, document: any): any[] {
  const exercises: any[] = [];
  const exerciseTemplates = getExerciseTemplates(document.subject);
  
  // Multiple choice exercises
  for (let i = 0; i < 3; i++) {
    const template = exerciseTemplates.multipleChoice[i % exerciseTemplates.multipleChoice.length];
    exercises.push({
      id: uuidv4(),
      document_id: document.id,
      user_id: userId,
      exercise_type: 'multiple_choice',
      question: template.question,
      correct_answer: { answer: template.correct },
      options: {
        choices: template.options,
        randomize: true,
      },
      hints: template.hints,
      explanation: template.explanation,
      points: 10,
      time_limit: 120,
      difficulty: template.difficulty,
      concepts: template.concepts,
      skills: template.skills,
      metadata: {
        source: document.title,
        topic: template.topic,
      },
      created_at: getRandomDate(30),
    });
  }
  
  // Fill in the blank exercises
  for (let i = 0; i < 2; i++) {
    const template = exerciseTemplates.fillBlank[i % exerciseTemplates.fillBlank.length];
    exercises.push({
      id: uuidv4(),
      document_id: document.id,
      user_id: userId,
      exercise_type: 'fill_blank',
      question: template.question,
      correct_answer: { answers: template.answers },
      options: { case_sensitive: false },
      hints: template.hints,
      explanation: template.explanation,
      points: 15,
      time_limit: 90,
      difficulty: template.difficulty,
      concepts: template.concepts,
      skills: ['recall', 'terminology'],
      metadata: {
        source: document.title,
        blanks_count: template.answers.length,
      },
      created_at: getRandomDate(30),
    });
  }
  
  // True/False exercises
  for (let i = 0; i < 4; i++) {
    const template = exerciseTemplates.trueFalse[i % exerciseTemplates.trueFalse.length];
    exercises.push({
      id: uuidv4(),
      document_id: document.id,
      user_id: userId,
      exercise_type: 'true_false',
      question: template.statement,
      correct_answer: { answer: template.isTrue },
      options: null,
      hints: [`Think about ${template.concept}`],
      explanation: template.explanation,
      points: 5,
      time_limit: 60,
      difficulty: 0.3,
      concepts: [template.concept],
      skills: ['comprehension', 'judgment'],
      metadata: {
        source: document.title,
      },
      created_at: getRandomDate(30),
    });
  }
  
  // Short answer exercise
  const shortAnswerTemplate = exerciseTemplates.shortAnswer[0];
  exercises.push({
    id: uuidv4(),
    document_id: document.id,
    user_id: userId,
    exercise_type: 'short_answer',
    question: shortAnswerTemplate.question,
    correct_answer: {
      keywords: shortAnswerTemplate.keywords,
      sample_answer: shortAnswerTemplate.sampleAnswer,
    },
    options: {
      max_words: 100,
      min_words: 20,
    },
    hints: shortAnswerTemplate.hints,
    explanation: shortAnswerTemplate.explanation,
    points: 25,
    time_limit: 300,
    difficulty: 0.7,
    concepts: shortAnswerTemplate.concepts,
    skills: ['analysis', 'synthesis', 'communication'],
    metadata: {
      source: document.title,
      requires_manual_grading: false,
    },
    created_at: getRandomDate(30),
  });
  
  return exercises;
}

async function createExerciseSessions(
  supabase: any,
  userId: string,
  documents: any[],
  exercises: any[]
) {
  console.log('    Creating exercise sessions...');
  let totalSessions = 0;
  
  // Create sessions over the last 30 days
  for (let daysAgo = 30; daysAgo >= 0; daysAgo -= 2) {
    if (Math.random() < 0.6) { // 60% chance of exercise session every 2 days
      const sessionDoc = documents[Math.floor(Math.random() * Math.min(documents.length, 10))];
      const sessionExercises = exercises
        .filter(e => e.document_id === sessionDoc.id)
        .slice(0, Math.floor(Math.random() * 5) + 3);
      
      if (sessionExercises.length > 0) {
        const session = await createSession(
          supabase,
          userId,
          sessionDoc.id,
          sessionExercises,
          daysAgo
        );
        if (session) totalSessions++;
      }
    }
  }
  
  console.log(`      ✓ Created ${totalSessions} exercise sessions`);
}

async function createSession(
  supabase: any,
  userId: string,
  documentId: string,
  exercises: any[],
  daysAgo: number
) {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - daysAgo);
  startTime.setHours(14 + Math.floor(Math.random() * 6)); // Afternoon/evening sessions
  
  const correctAnswers = Math.floor(exercises.length * (0.5 + Math.random() * 0.4));
  const duration = exercises.length * (60 + Math.floor(Math.random() * 60));
  
  const performanceByType: any = {};
  const exerciseTypes = [...new Set(exercises.map(e => e.exercise_type))];
  
  for (const type of exerciseTypes) {
    const typeExercises = exercises.filter(e => e.exercise_type === type);
    const typeCorrect = Math.floor(typeExercises.length * (correctAnswers / exercises.length));
    performanceByType[type] = {
      attempted: typeExercises.length,
      correct: typeCorrect,
      accuracy: typeCorrect / typeExercises.length,
      avg_time: Math.floor(duration / exercises.length),
    };
  }
  
  const sessionData = {
    id: uuidv4(),
    user_id: userId,
    document_id: documentId,
    exercises_completed: exercises.length,
    correct_answers: correctAnswers,
    total_points_earned: exercises
      .slice(0, correctAnswers)
      .reduce((sum, e) => sum + e.points, 0),
    performance_by_type: performanceByType,
    duration_seconds: duration,
    started_at: startTime.toISOString(),
    completed_at: new Date(startTime.getTime() + duration * 1000).toISOString(),
  };
  
  const { data: session, error } = await supabase
    .from('exercise_sessions')
    .insert(sessionData)
    .select()
    .single();
  
  if (!error && session) {
    // Create individual exercise attempts
    for (const exercise of exercises) {
      const isCorrect = Math.random() < (correctAnswers / exercises.length);
      const attemptTime = Math.floor(exercise.time_limit * (0.3 + Math.random() * 0.7));
      
      await supabase.from('exercise_attempts').insert({
        id: uuidv4(),
        session_id: session.id,
        exercise_id: exercise.id,
        user_id: userId,
        is_correct: isCorrect,
        points_earned: isCorrect ? exercise.points : 0,
        time_spent: attemptTime,
        attempts_count: isCorrect ? 1 : Math.floor(Math.random() * 3) + 1,
        hints_used: isCorrect ? 0 : Math.floor(Math.random() * exercise.hints.length),
        answer_given: generateAnswer(exercise, isCorrect),
        created_at: startTime.toISOString(),
      });
    }
    
    return session;
  }
  
  return null;
}

async function createPerformanceData(supabase: any, userId: string, exercises: any[]) {
  console.log('    Creating performance tracking data...');
  
  // Group exercises by concept
  const conceptGroups: { [key: string]: any[] } = {};
  for (const exercise of exercises) {
    for (const concept of exercise.concepts) {
      if (!conceptGroups[concept]) {
        conceptGroups[concept] = [];
      }
      conceptGroups[concept].push(exercise);
    }
  }
  
  // Create performance metrics for each concept
  for (const [concept, conceptExercises] of Object.entries(conceptGroups)) {
    const totalAttempts = Math.floor(conceptExercises.length * (1.5 + Math.random()));
    const successfulAttempts = Math.floor(totalAttempts * (0.5 + Math.random() * 0.4));
    
    await supabase.from('exercise_performance').insert({
      id: uuidv4(),
      user_id: userId,
      concept,
      total_exercises: conceptExercises.length,
      total_attempts: totalAttempts,
      successful_attempts: successfulAttempts,
      average_accuracy: successfulAttempts / totalAttempts,
      average_time_per_exercise: Math.floor(Math.random() * 120) + 30,
      difficulty_breakdown: {
        easy: { attempts: Math.floor(totalAttempts * 0.4), success_rate: 0.8 + Math.random() * 0.2 },
        medium: { attempts: Math.floor(totalAttempts * 0.4), success_rate: 0.6 + Math.random() * 0.2 },
        hard: { attempts: Math.floor(totalAttempts * 0.2), success_rate: 0.4 + Math.random() * 0.3 },
      },
      improvement_trend: Math.random() * 0.2 + 0.1, // 10-30% improvement
      last_practiced: getRandomDate(5),
      created_at: getRandomDate(30),
    });
  }
  
  // Create recommendations
  const recommendations = [
    {
      user_id: userId,
      recommendation_type: 'practice_focus',
      title: 'Focus on Quantum Mechanics Problems',
      description: 'Your accuracy in quantum mechanics exercises is below 60%. Practice more problems on wave functions and uncertainty principles.',
      priority: 'high',
      related_concepts: ['quantum mechanics', 'wave functions', 'uncertainty principle'],
      action_items: [
        'Complete 10 quantum mechanics exercises',
        'Review wave function normalization',
        'Practice uncertainty calculations',
      ],
    },
    {
      user_id: userId,
      recommendation_type: 'difficulty_adjustment',
      title: 'Ready for Advanced Calculus Challenges',
      description: 'Your performance on medium calculus problems is excellent. Try more advanced integration techniques.',
      priority: 'medium',
      related_concepts: ['calculus', 'integration', 'differential equations'],
      action_items: [
        'Attempt hard-level calculus problems',
        'Explore multivariable calculus',
        'Try real-world application problems',
      ],
    },
    {
      user_id: userId,
      recommendation_type: 'review_needed',
      title: 'Review Linear Algebra Fundamentals',
      description: 'It has been 2 weeks since you last practiced linear algebra. A quick review would help maintain your skills.',
      priority: 'low',
      related_concepts: ['linear algebra', 'matrices', 'eigenvalues'],
      action_items: [
        'Complete a review session',
        'Practice matrix operations',
        'Solve eigenvalue problems',
      ],
    },
  ];
  
  for (const rec of recommendations) {
    await supabase.from('exercise_recommendations').insert({
      id: uuidv4(),
      ...rec,
      created_at: getRandomDate(7),
    });
  }
}

// Helper functions
function getExerciseTemplates(subject: string) {
  const templates: { [key: string]: any } = {
    Physics: {
      multipleChoice: [
        {
          question: "A particle moves with constant acceleration. If its initial velocity is 5 m/s and acceleration is 2 m/s², what is its velocity after 3 seconds?",
          correct: "11 m/s",
          options: ["11 m/s", "8 m/s", "15 m/s", "6 m/s"],
          hints: ["Use the equation v = u + at", "Initial velocity u = 5 m/s, acceleration a = 2 m/s², time t = 3 s"],
          explanation: "Using v = u + at: v = 5 + (2 × 3) = 5 + 6 = 11 m/s",
          difficulty: 0.3,
          concepts: ["kinematics", "constant acceleration"],
          skills: ["calculation", "formula application"],
          topic: "Classical Mechanics",
        },
        {
          question: "In the photoelectric effect, what happens when the frequency of incident light is increased?",
          correct: "The maximum kinetic energy of ejected electrons increases",
          options: [
            "The maximum kinetic energy of ejected electrons increases",
            "More electrons are ejected",
            "The work function decreases",
            "No change occurs"
          ],
          hints: ["Einstein's photoelectric equation: K.E. = hf - φ", "Higher frequency means higher photon energy"],
          explanation: "According to Einstein's equation, K.E.max = hf - φ. Increasing frequency increases the photon energy and thus the maximum kinetic energy.",
          difficulty: 0.5,
          concepts: ["quantum mechanics", "photoelectric effect"],
          skills: ["conceptual understanding", "application"],
          topic: "Quantum Physics",
        },
      ],
      fillBlank: [
        {
          question: "The law of conservation of _____ states that the total _____ in an isolated system remains constant.",
          answers: ["energy", "energy"],
          hints: ["Think about what quantity is conserved in physics", "This is one of the fundamental conservation laws"],
          explanation: "Energy cannot be created or destroyed, only transformed from one form to another.",
          difficulty: 0.2,
          concepts: ["conservation laws", "energy"],
        },
      ],
      trueFalse: [
        {
          statement: "Light behaves both as a wave and as a particle.",
          isTrue: true,
          concept: "wave-particle duality",
          explanation: "This is the principle of wave-particle duality, fundamental to quantum mechanics.",
        },
        {
          statement: "The speed of light in vacuum depends on the observer's reference frame.",
          isTrue: false,
          concept: "special relativity",
          explanation: "The speed of light in vacuum is constant in all reference frames, a postulate of special relativity.",
        },
      ],
      shortAnswer: [
        {
          question: "Explain the concept of entropy and its relationship to the second law of thermodynamics.",
          keywords: ["disorder", "increase", "isolated system", "spontaneous", "irreversible"],
          sampleAnswer: "Entropy is a measure of disorder or randomness in a system. The second law of thermodynamics states that the entropy of an isolated system always increases in spontaneous processes, making them irreversible.",
          hints: ["Consider what happens to organization over time", "Think about why we can't unscramble an egg"],
          explanation: "Entropy quantifies the number of possible microscopic states of a system. Natural processes tend toward maximum entropy.",
          concepts: ["thermodynamics", "entropy", "second law"],
        },
      ],
    },
    Mathematics: {
      multipleChoice: [
        {
          question: "What is the derivative of f(x) = x³ - 2x² + 5x - 1?",
          correct: "3x² - 4x + 5",
          options: ["3x² - 4x + 5", "x² - 4x + 5", "3x² - 2x + 5", "3x² - 4x"],
          hints: ["Apply the power rule to each term", "d/dx(xⁿ) = n·xⁿ⁻¹"],
          explanation: "Using the power rule: f'(x) = 3x² - 4x + 5",
          difficulty: 0.3,
          concepts: ["calculus", "derivatives"],
          skills: ["differentiation", "algebraic manipulation"],
          topic: "Differential Calculus",
        },
      ],
      fillBlank: [
        {
          question: "The fundamental theorem of _____ states that differentiation and _____ are inverse operations.",
          answers: ["calculus", "integration"],
          hints: ["This theorem connects two major operations in calculus"],
          explanation: "The fundamental theorem of calculus links derivatives and integrals.",
          difficulty: 0.4,
          concepts: ["calculus", "fundamental theorem"],
        },
      ],
      trueFalse: [
        {
          statement: "Every continuous function is differentiable.",
          isTrue: false,
          concept: "continuity and differentiability",
          explanation: "A function can be continuous but not differentiable, like |x| at x=0.",
        },
      ],
      shortAnswer: [
        {
          question: "Describe the difference between a vector space and a metric space.",
          keywords: ["linear operations", "distance", "addition", "scalar multiplication", "norm"],
          sampleAnswer: "A vector space has operations of addition and scalar multiplication satisfying certain axioms. A metric space has a distance function satisfying positivity, symmetry, and triangle inequality. Vector spaces focus on algebraic structure while metric spaces focus on geometric structure.",
          hints: ["Vector spaces involve algebraic operations", "Metric spaces involve distance measurement"],
          explanation: "These are different mathematical structures with different purposes and properties.",
          concepts: ["linear algebra", "topology", "abstract spaces"],
        },
      ],
    },
    "Computer Science": {
      multipleChoice: [
        {
          question: "What is the time complexity of merge sort in the worst case?",
          correct: "O(n log n)",
          options: ["O(n log n)", "O(n²)", "O(n)", "O(log n)"],
          hints: ["Merge sort divides the problem in half recursively", "Consider the merge step complexity"],
          explanation: "Merge sort consistently divides the array in half (log n levels) and merges in O(n) time at each level.",
          difficulty: 0.4,
          concepts: ["algorithms", "sorting", "complexity analysis"],
          skills: ["complexity analysis", "algorithm understanding"],
          topic: "Algorithms",
        },
      ],
      fillBlank: [
        {
          question: "In object-oriented programming, _____ is the ability of objects to take multiple forms, while _____ is the bundling of data and methods.",
          answers: ["polymorphism", "encapsulation"],
          hints: ["Think about OOP principles", "One allows multiple behaviors, one hides implementation"],
          explanation: "Polymorphism and encapsulation are fundamental OOP concepts.",
          difficulty: 0.3,
          concepts: ["OOP", "polymorphism", "encapsulation"],
        },
      ],
      trueFalse: [
        {
          statement: "A hash table always provides O(1) lookup time.",
          isTrue: false,
          concept: "data structures",
          explanation: "Hash tables provide O(1) average case, but O(n) worst case due to collisions.",
        },
      ],
      shortAnswer: [
        {
          question: "Explain the difference between supervised and unsupervised learning in machine learning.",
          keywords: ["labeled data", "unlabeled", "classification", "clustering", "patterns"],
          sampleAnswer: "Supervised learning uses labeled training data to learn a mapping from inputs to outputs, used for classification and regression. Unsupervised learning finds patterns in unlabeled data, used for clustering and dimensionality reduction.",
          hints: ["Consider the type of training data used", "Think about the goals of each approach"],
          explanation: "The key difference is whether the training data includes correct answers (labels).",
          concepts: ["machine learning", "supervised learning", "unsupervised learning"],
        },
      ],
    },
    Biology: {
      multipleChoice: [
        {
          question: "Which organelle is responsible for producing ATP in eukaryotic cells?",
          correct: "Mitochondria",
          options: ["Mitochondria", "Chloroplast", "Ribosome", "Golgi apparatus"],
          hints: ["This organelle is called the powerhouse of the cell", "It performs cellular respiration"],
          explanation: "Mitochondria produce ATP through oxidative phosphorylation during cellular respiration.",
          difficulty: 0.2,
          concepts: ["cell biology", "cellular respiration", "organelles"],
          skills: ["recall", "identification"],
          topic: "Cell Biology",
        },
      ],
      fillBlank: [
        {
          question: "DNA replication is _____ because each new double helix contains one original strand and one newly synthesized strand.",
          answers: ["semi-conservative"],
          hints: ["Half of the original DNA is conserved", "Meselson-Stahl experiment proved this"],
          explanation: "Semi-conservative replication preserves one original strand in each daughter molecule.",
          difficulty: 0.4,
          concepts: ["molecular biology", "DNA replication"],
        },
      ],
      trueFalse: [
        {
          statement: "All mutations are harmful to organisms.",
          isTrue: false,
          concept: "genetics",
          explanation: "Mutations can be beneficial, neutral, or harmful. Many mutations have no effect.",
        },
      ],
      shortAnswer: [
        {
          question: "Describe the process of natural selection and its role in evolution.",
          keywords: ["variation", "inheritance", "selection pressure", "fitness", "adaptation"],
          sampleAnswer: "Natural selection occurs when organisms with favorable traits have better survival and reproduction rates. These traits are inherited by offspring, leading to changes in population characteristics over time. This drives evolution and adaptation to environments.",
          hints: ["Consider Darwin's observations", "Think about survival of the fittest"],
          explanation: "Natural selection is the mechanism by which evolution occurs through differential reproduction.",
          concepts: ["evolution", "natural selection", "adaptation"],
        },
      ],
    },
  };
  
  return templates[subject] || templates["Physics"];
}

function generateAnswer(exercise: any, isCorrect: boolean): any {
  switch (exercise.exercise_type) {
    case 'multiple_choice':
      if (isCorrect) {
        return { selected: exercise.correct_answer.answer };
      } else {
        const wrongOptions = exercise.options.choices.filter(
          (opt: string) => opt !== exercise.correct_answer.answer
        );
        return { selected: wrongOptions[Math.floor(Math.random() * wrongOptions.length)] };
      }
      
    case 'fill_blank':
      if (isCorrect) {
        return { answers: exercise.correct_answer.answers };
      } else {
        return {
          answers: exercise.correct_answer.answers.map((answer: string) =>
            Math.random() < 0.7 ? answer + 's' : 'incorrect'
          ),
        };
      }
      
    case 'true_false':
      return { answer: isCorrect ? exercise.correct_answer.answer : !exercise.correct_answer.answer };
      
    case 'short_answer':
      if (isCorrect) {
        return { text: exercise.correct_answer.sample_answer };
      } else {
        return { text: "This is an incomplete answer that misses key concepts." };
      }
      
    default:
      return { answer: "N/A" };
  }
}

function getRandomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
}

export async function cleanupExercises(supabase: any) {
  await supabase.from('exercise_recommendations').delete().gte('created_at', '2020-01-01');
  await supabase.from('exercise_performance').delete().gte('created_at', '2020-01-01');
  await supabase.from('exercise_attempts').delete().gte('created_at', '2020-01-01');
  await supabase.from('exercise_sessions').delete().gte('created_at', '2020-01-01');
  await supabase.from('exercises').delete().gte('created_at', '2020-01-01');
}