import { SeedConfig } from './index';
import { v4 as uuidv4 } from 'uuid';

export async function seedKnowledgeGaps(supabase: any, config: SeedConfig) {
  console.log('  Creating knowledge gaps data...');

  // Get demo user
  const { data: demoUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'demo@praxis.edu')
    .single();

  if (!demoUser) {
    console.error('Demo user not found!');
    return;
  }

  // Create knowledge gaps
  const gaps = await createKnowledgeGaps(supabase, demoUser.id);
  
  // Create learning paths
  await createLearningPaths(supabase, demoUser.id, gaps);
  
  // Create concept mastery data
  await createConceptMastery(supabase, demoUser.id);
}

async function createKnowledgeGaps(supabase: any, userId: string) {
  console.log('    Creating knowledge gaps...');
  
  const knowledgeGaps = [
    // Physics gaps
    {
      id: uuidv4(),
      user_id: userId,
      subject: 'Physics',
      topic: 'Quantum Field Theory',
      gap_type: 'conceptual',
      severity: 'high',
      description: 'Limited understanding of quantum field theoretical frameworks and Feynman diagrams',
      prerequisites: ['Quantum Mechanics', 'Special Relativity', 'Classical Field Theory'],
      detected_from: ['study_performance', 'document_analysis'],
      confidence_score: 0.85,
      created_at: getRandomDate(20),
    },
    {
      id: uuidv4(),
      user_id: userId,
      subject: 'Physics',
      topic: 'Statistical Mechanics',
      gap_type: 'computational',
      severity: 'medium',
      description: 'Difficulty with partition function calculations and ensemble theory',
      prerequisites: ['Thermodynamics', 'Probability Theory'],
      detected_from: ['exercise_performance'],
      confidence_score: 0.72,
      created_at: getRandomDate(15),
    },
    // Mathematics gaps
    {
      id: uuidv4(),
      user_id: userId,
      subject: 'Mathematics',
      topic: 'Measure Theory',
      gap_type: 'foundational',
      severity: 'high',
      description: 'Weak foundation in measure theory affecting advanced probability understanding',
      prerequisites: ['Real Analysis', 'Set Theory'],
      detected_from: ['document_analysis', 'concept_mapping'],
      confidence_score: 0.78,
      created_at: getRandomDate(25),
    },
    {
      id: uuidv4(),
      user_id: userId,
      subject: 'Mathematics',
      topic: 'Differential Geometry',
      gap_type: 'application',
      severity: 'medium',
      description: 'Struggling to apply differential geometry concepts to physics problems',
      prerequisites: ['Multivariable Calculus', 'Linear Algebra'],
      detected_from: ['cross_reference_analysis'],
      confidence_score: 0.68,
      created_at: getRandomDate(18),
    },
    // Computer Science gaps
    {
      id: uuidv4(),
      user_id: userId,
      subject: 'Computer Science',
      topic: 'Distributed Systems Design',
      gap_type: 'practical',
      severity: 'medium',
      description: 'Limited practical experience with distributed system architectures',
      prerequisites: ['Networking', 'Concurrent Programming', 'Database Systems'],
      detected_from: ['document_coverage'],
      confidence_score: 0.75,
      created_at: getRandomDate(12),
    },
    {
      id: uuidv4(),
      user_id: userId,
      subject: 'Computer Science',
      topic: 'Complexity Theory',
      gap_type: 'theoretical',
      severity: 'low',
      description: 'Basic understanding present but lacking depth in NP-completeness proofs',
      prerequisites: ['Algorithms', 'Discrete Mathematics'],
      detected_from: ['study_performance'],
      confidence_score: 0.62,
      created_at: getRandomDate(10),
    },
    // Biology gaps
    {
      id: uuidv4(),
      user_id: userId,
      subject: 'Biology',
      topic: 'Systems Biology',
      gap_type: 'interdisciplinary',
      severity: 'medium',
      description: 'Need to integrate computational methods with biological systems understanding',
      prerequisites: ['Molecular Biology', 'Bioinformatics', 'Dynamical Systems'],
      detected_from: ['document_analysis', 'concept_mapping'],
      confidence_score: 0.70,
      created_at: getRandomDate(8),
    },
    {
      id: uuidv4(),
      user_id: userId,
      subject: 'Biology',
      topic: 'Epigenetics',
      gap_type: 'emerging',
      severity: 'low',
      description: 'Keeping up with rapidly evolving field of epigenetic mechanisms',
      prerequisites: ['Genetics', 'Molecular Biology'],
      detected_from: ['document_recency'],
      confidence_score: 0.65,
      created_at: getRandomDate(5),
    },
  ];

  const createdGaps: any[] = [];
  for (const gap of knowledgeGaps) {
    const { data, error } = await supabase
      .from('knowledge_gaps')
      .insert(gap)
      .select()
      .single();
    
    if (!error && data) {
      createdGaps.push(data);
    }
  }

  console.log(`      ✓ Created ${createdGaps.length} knowledge gaps`);
  return createdGaps;
}

async function createLearningPaths(supabase: any, userId: string, gaps: any[]) {
  console.log('    Creating learning paths...');
  
  for (const gap of gaps) {
    const pathData = {
      id: uuidv4(),
      user_id: userId,
      gap_id: gap.id,
      path_name: `Master ${gap.topic}`,
      description: `Structured learning path to address ${gap.topic} knowledge gap`,
      estimated_duration_days: gap.severity === 'high' ? 60 : gap.severity === 'medium' ? 30 : 14,
      difficulty_level: gap.severity,
      status: ['active', 'planned', 'in_progress'][Math.floor(Math.random() * 3)],
      created_at: gap.created_at,
    };
    
    const { data: path, error } = await supabase
      .from('learning_paths')
      .insert(pathData)
      .select()
      .single();
    
    if (!error && path) {
      // Create milestones for the path
      await createPathMilestones(supabase, path, gap);
      
      // Create recommended resources
      await createPathResources(supabase, path.id, gap);
    }
  }
}

async function createPathMilestones(supabase: any, path: any, gap: any) {
  const milestoneCount = gap.severity === 'high' ? 5 : gap.severity === 'medium' ? 3 : 2;
  const milestones = [];
  
  for (let i = 0; i < milestoneCount; i++) {
    const progress = (i / milestoneCount) * 100;
    const milestone = {
      id: uuidv4(),
      path_id: path.id,
      title: getMilestoneTitle(gap.topic, i, milestoneCount),
      description: getMilestoneDescription(gap.topic, i),
      order_index: i,
      required_mastery_score: 70 + (i * 5),
      is_completed: progress < 40,
      completed_at: progress < 40 ? getRandomDate(10 - i * 2) : null,
      estimated_hours: 10 + (i * 5),
      actual_hours: progress < 40 ? 8 + (i * 4) + Math.floor(Math.random() * 5) : null,
    };
    
    milestones.push(milestone);
  }
  
  await supabase.from('learning_milestones').insert(milestones);
}

async function createPathResources(supabase: any, pathId: string, gap: any) {
  const resources = [
    {
      id: uuidv4(),
      path_id: pathId,
      resource_type: 'textbook',
      title: `Introduction to ${gap.topic}`,
      author: 'Leading Expert',
      url: `https://example.com/textbook/${gap.topic.toLowerCase().replace(/\s+/g, '-')}`,
      description: `Comprehensive textbook covering fundamental concepts of ${gap.topic}`,
      difficulty: 'beginner',
      estimated_hours: 20,
      is_completed: Math.random() < 0.3,
    },
    {
      id: uuidv4(),
      path_id: pathId,
      resource_type: 'video_course',
      title: `${gap.topic} Masterclass`,
      author: 'Online University',
      url: `https://example.com/course/${gap.topic.toLowerCase().replace(/\s+/g, '-')}`,
      description: `Video lecture series on ${gap.topic} with practical examples`,
      difficulty: 'intermediate',
      estimated_hours: 15,
      is_completed: Math.random() < 0.2,
    },
    {
      id: uuidv4(),
      path_id: pathId,
      resource_type: 'research_paper',
      title: `Recent Advances in ${gap.topic}`,
      author: 'Various Authors',
      url: `https://arxiv.org/example/${gap.topic.toLowerCase().replace(/\s+/g, '-')}`,
      description: `Collection of recent research papers in ${gap.topic}`,
      difficulty: 'advanced',
      estimated_hours: 10,
      is_completed: false,
    },
  ];
  
  await supabase.from('learning_resources').insert(resources);
}

async function createConceptMastery(supabase: any, userId: string) {
  console.log('    Creating concept mastery data...');
  
  const concepts = [
    // Physics concepts
    { subject: 'Physics', name: 'Classical Mechanics', mastery: 85, lastAssessed: getRandomDate(5) },
    { subject: 'Physics', name: 'Quantum Mechanics', mastery: 72, lastAssessed: getRandomDate(3) },
    { subject: 'Physics', name: 'Electromagnetism', mastery: 78, lastAssessed: getRandomDate(7) },
    { subject: 'Physics', name: 'Thermodynamics', mastery: 80, lastAssessed: getRandomDate(4) },
    { subject: 'Physics', name: 'Special Relativity', mastery: 68, lastAssessed: getRandomDate(10) },
    
    // Mathematics concepts
    { subject: 'Mathematics', name: 'Calculus', mastery: 90, lastAssessed: getRandomDate(2) },
    { subject: 'Mathematics', name: 'Linear Algebra', mastery: 85, lastAssessed: getRandomDate(6) },
    { subject: 'Mathematics', name: 'Probability Theory', mastery: 75, lastAssessed: getRandomDate(8) },
    { subject: 'Mathematics', name: 'Abstract Algebra', mastery: 65, lastAssessed: getRandomDate(12) },
    { subject: 'Mathematics', name: 'Real Analysis', mastery: 70, lastAssessed: getRandomDate(9) },
    
    // Computer Science concepts
    { subject: 'Computer Science', name: 'Algorithms', mastery: 88, lastAssessed: getRandomDate(3) },
    { subject: 'Computer Science', name: 'Data Structures', mastery: 92, lastAssessed: getRandomDate(1) },
    { subject: 'Computer Science', name: 'Machine Learning', mastery: 76, lastAssessed: getRandomDate(5) },
    { subject: 'Computer Science', name: 'Database Systems', mastery: 82, lastAssessed: getRandomDate(7) },
    { subject: 'Computer Science', name: 'Operating Systems', mastery: 70, lastAssessed: getRandomDate(11) },
    
    // Biology concepts
    { subject: 'Biology', name: 'Cell Biology', mastery: 78, lastAssessed: getRandomDate(4) },
    { subject: 'Biology', name: 'Genetics', mastery: 74, lastAssessed: getRandomDate(6) },
    { subject: 'Biology', name: 'Molecular Biology', mastery: 72, lastAssessed: getRandomDate(8) },
    { subject: 'Biology', name: 'Ecology', mastery: 68, lastAssessed: getRandomDate(10) },
    { subject: 'Biology', name: 'Evolution', mastery: 80, lastAssessed: getRandomDate(5) },
  ];
  
  for (const concept of concepts) {
    const masteryData = {
      id: uuidv4(),
      user_id: userId,
      concept_name: concept.name,
      subject: concept.subject,
      mastery_level: concept.mastery / 100,
      confidence_score: (concept.mastery + Math.random() * 10 - 5) / 100,
      total_practice_time: Math.floor(concept.mastery * 2 + Math.random() * 50),
      last_assessed: concept.lastAssessed,
      assessment_count: Math.floor(Math.random() * 20) + 5,
      strengths: generateStrengths(concept.name),
      weaknesses: generateWeaknesses(concept.name, concept.mastery),
      improvement_rate: (Math.random() * 0.1 + 0.05), // 5-15% improvement rate
      created_at: getRandomDate(60),
    };
    
    await supabase.from('concept_mastery').insert(masteryData);
  }
  
  // Create mastery history for trend tracking
  await createMasteryHistory(supabase, userId, concepts);
}

async function createMasteryHistory(supabase: any, userId: string, concepts: any[]) {
  const history = [];
  
  for (const concept of concepts.slice(0, 10)) { // Top 10 concepts
    // Create 30 days of history
    for (let daysAgo = 30; daysAgo >= 0; daysAgo -= 3) {
      const historicalMastery = concept.mastery - (daysAgo * 0.5) + Math.random() * 5;
      
      history.push({
        id: uuidv4(),
        user_id: userId,
        concept_name: concept.name,
        mastery_level: Math.max(0, Math.min(100, historicalMastery)) / 100,
        recorded_at: getRandomDate(daysAgo),
      });
    }
  }
  
  await supabase.from('mastery_history').insert(history);
}

// Helper functions
function getMilestoneTitle(topic: string, index: number, total: number): string {
  const progressTerms = ['Foundation', 'Core Concepts', 'Advanced Topics', 'Practical Applications', 'Mastery'];
  return `${topic}: ${progressTerms[Math.min(index, progressTerms.length - 1)]}`;
}

function getMilestoneDescription(topic: string, index: number): string {
  const descriptions = [
    `Build foundational understanding of ${topic} principles and terminology`,
    `Develop proficiency with core ${topic} concepts and basic applications`,
    `Explore advanced ${topic} theories and complex problem-solving`,
    `Apply ${topic} knowledge to real-world scenarios and research`,
    `Achieve mastery level understanding and contribute to ${topic} discourse`,
  ];
  return descriptions[Math.min(index, descriptions.length - 1)];
}

function generateStrengths(conceptName: string): string[] {
  const strengthsPool = [
    'Strong theoretical foundation',
    'Good problem-solving skills',
    'Consistent practice habits',
    'Quick comprehension',
    'Excellent retention',
    'Practical application ability',
  ];
  
  const count = Math.floor(Math.random() * 2) + 2;
  return strengthsPool.sort(() => Math.random() - 0.5).slice(0, count);
}

function generateWeaknesses(conceptName: string, mastery: number): string[] {
  if (mastery > 85) return [];
  
  const weaknessesPool = [
    'Complex problem application',
    'Mathematical rigor',
    'Conceptual connections',
    'Advanced techniques',
    'Speed of execution',
    'Edge case handling',
  ];
  
  const count = mastery < 70 ? 3 : mastery < 80 ? 2 : 1;
  return weaknessesPool.sort(() => Math.random() - 0.5).slice(0, count);
}

function getRandomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
}

export async function cleanupKnowledgeGaps(supabase: any) {
  await supabase.from('mastery_history').delete().gte('created_at', '2020-01-01');
  await supabase.from('concept_mastery').delete().gte('created_at', '2020-01-01');
  await supabase.from('learning_resources').delete().gte('created_at', '2020-01-01');
  await supabase.from('learning_milestones').delete().gte('created_at', '2020-01-01');
  await supabase.from('learning_paths').delete().gte('created_at', '2020-01-01');
  await supabase.from('knowledge_gaps').delete().gte('created_at', '2020-01-01');
}