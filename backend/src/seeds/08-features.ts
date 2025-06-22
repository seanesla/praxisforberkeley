import { SeedConfig } from './index';
import { v4 as uuidv4 } from 'uuid';

export async function seedAdditionalFeatures(supabase: any, config: SeedConfig) {
  console.log('  Creating additional features data...');

  // Get demo user and documents
  const { data: demoUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'demo@praxis.edu')
    .single();

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', demoUser.id)
    .limit(20);

  if (!demoUser || !documents || documents.length === 0) {
    console.error('Demo user or documents not found!');
    return;
  }

  // Create citation networks (already partially done in documents)
  await enhanceCitationNetwork(supabase, documents);
  
  // Create cross-document insights
  await createCrossDocumentInsights(supabase, demoUser.id, documents);
  
  // Create podcast sessions
  await createPodcastSessions(supabase, demoUser.id, documents);
  
  // Create Socratic dialogues
  await createSocraticDialogues(supabase, demoUser.id, documents);
  
  // Create generated reports
  await createReports(supabase, demoUser.id, documents);
  
  // Create mind maps
  await createMindMaps(supabase, demoUser.id, documents);
  
  // Create document DNA profiles
  await createDocumentDNA(supabase, documents);
}

async function enhanceCitationNetwork(supabase: any, documents: any[]) {
  console.log('    Enhancing citation network...');
  
  // Add citation metadata
  for (const doc of documents) {
    const citationProfile = {
      id: uuidv4(),
      document_id: doc.id,
      citation_count: doc.citation_count || Math.floor(Math.random() * 100),
      citations_per_year: Math.floor((doc.citation_count || 50) / 3),
      h_index: Math.floor(Math.random() * 20) + 5,
      field_weighted_citation_impact: 1.2 + Math.random() * 0.8,
      citation_velocity: Math.random() * 2,
      most_cited_sections: ['Introduction', 'Methods', 'Results'],
      co_citation_clusters: generateCoCitationClusters(doc.subject),
      created_at: new Date().toISOString(),
    };
    
    await supabase.from('citation_profiles').insert(citationProfile);
  }
  
  // Create citation paths between documents
  for (let i = 0; i < documents.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 5, documents.length); j++) {
      if (Math.random() < 0.3) {
        const path = {
          id: uuidv4(),
          source_document_id: documents[i].id,
          target_document_id: documents[j].id,
          path_length: Math.floor(Math.random() * 3) + 1,
          path_strength: Math.random(),
          intermediate_documents: [],
          created_at: new Date().toISOString(),
        };
        
        await supabase.from('citation_paths').insert(path);
      }
    }
  }
}

async function createCrossDocumentInsights(supabase: any, userId: string, documents: any[]) {
  console.log('    Creating cross-document insights...');
  
  // Group documents by subject
  const subjectGroups: { [key: string]: any[] } = {};
  documents.forEach(doc => {
    if (!subjectGroups[doc.subject]) {
      subjectGroups[doc.subject] = [];
    }
    subjectGroups[doc.subject].push(doc);
  });
  
  for (const [subject, subjectDocs] of Object.entries(subjectGroups)) {
    if (subjectDocs.length >= 2) {
      const insight = {
        id: uuidv4(),
        user_id: userId,
        document_ids: subjectDocs.map(d => d.id),
        insight_type: 'theme_analysis',
        title: `Common Themes in ${subject} Research`,
        summary: generateInsightSummary(subject),
        themes: generateThemes(subject),
        connections: generateConnections(subjectDocs),
        confidence_score: 0.75 + Math.random() * 0.2,
        created_at: getRandomDate(10),
      };
      
      await supabase.from('cross_document_insights').insert(insight);
    }
  }
  
  // Create interdisciplinary insights
  if (Object.keys(subjectGroups).length >= 2) {
    const interdisciplinaryInsight = {
      id: uuidv4(),
      user_id: userId,
      document_ids: documents.slice(0, 10).map(d => d.id),
      insight_type: 'interdisciplinary',
      title: 'Interdisciplinary Research Connections',
      summary: 'Analysis reveals surprising connections between different fields of study',
      themes: [
        { theme: 'Mathematical Methods in Biology', strength: 0.8 },
        { theme: 'Computational Approaches in Physics', strength: 0.75 },
        { theme: 'Quantum Effects in Biological Systems', strength: 0.6 },
      ],
      connections: [
        { from: 'Physics', to: 'Computer Science', strength: 0.9 },
        { from: 'Mathematics', to: 'Biology', strength: 0.7 },
      ],
      confidence_score: 0.82,
      created_at: getRandomDate(5),
    };
    
    await supabase.from('cross_document_insights').insert(interdisciplinaryInsight);
  }
}

async function createPodcastSessions(supabase: any, userId: string, documents: any[]) {
  console.log('    Creating podcast sessions...');
  
  const topics = [
    { title: 'Understanding Quantum Mechanics', duration: 1800 },
    { title: 'Deep Dive into Machine Learning', duration: 2400 },
    { title: 'The Beauty of Mathematics', duration: 1500 },
    { title: 'Exploring Genetic Engineering', duration: 2100 },
  ];
  
  for (const topic of topics) {
    const relevantDocs = documents.filter(() => Math.random() < 0.3).slice(0, 3);
    
    if (relevantDocs.length > 0) {
      const session = {
        id: uuidv4(),
        user_id: userId,
        document_ids: relevantDocs.map(d => d.id),
        title: topic.title,
        duration_seconds: topic.duration,
        audio_url: `/audio/podcast-${uuidv4()}.mp3`,
        transcript: generatePodcastTranscript(topic.title),
        highlights: generatePodcastHighlights(),
        interaction_points: generateInteractionPoints(topic.duration),
        completed: Math.random() < 0.7,
        progress_seconds: Math.floor(topic.duration * Math.random()),
        created_at: getRandomDate(20),
      };
      
      await supabase.from('podcast_sessions').insert(session);
    }
  }
}

async function createSocraticDialogues(supabase: any, userId: string, documents: any[]) {
  console.log('    Creating Socratic dialogues...');
  
  const dialogueTopics = [
    'What is the nature of reality in quantum mechanics?',
    'How does consciousness emerge from neural activity?',
    'What are the ethical implications of AI?',
    'Is mathematics discovered or invented?',
  ];
  
  for (const topic of dialogueTopics) {
    const dialogue = {
      id: uuidv4(),
      user_id: userId,
      document_id: documents[Math.floor(Math.random() * documents.length)].id,
      topic,
      dialogue_history: generateDialogueHistory(topic),
      current_depth: Math.floor(Math.random() * 5) + 1,
      concepts_explored: generateExploredConcepts(topic),
      insights_gained: generateInsights(topic),
      duration_seconds: Math.floor(Math.random() * 1800) + 600,
      completed: Math.random() < 0.6,
      created_at: getRandomDate(15),
    };
    
    await supabase.from('socratic_dialogues').insert(dialogue);
  }
}

async function createReports(supabase: any, userId: string, documents: any[]) {
  console.log('    Creating generated reports...');
  
  const reportTypes = [
    {
      type: 'literature_review',
      title: 'Comprehensive Literature Review: Quantum Computing',
      template: 'academic_review',
    },
    {
      type: 'progress_report',
      title: 'Monthly Learning Progress Report',
      template: 'progress_summary',
    },
    {
      type: 'knowledge_synthesis',
      title: 'Knowledge Synthesis: Cross-Disciplinary Insights',
      template: 'synthesis_report',
    },
  ];
  
  for (const reportType of reportTypes) {
    const report = {
      id: uuidv4(),
      user_id: userId,
      document_ids: documents.slice(0, Math.floor(Math.random() * 5) + 3).map(d => d.id),
      report_type: reportType.type,
      title: reportType.title,
      template_used: reportType.template,
      content: generateReportContent(reportType.type),
      format: 'markdown',
      page_count: Math.floor(Math.random() * 20) + 5,
      word_count: Math.floor(Math.random() * 5000) + 2000,
      sections: generateReportSections(reportType.type),
      export_formats: ['pdf', 'docx', 'html'],
      created_at: getRandomDate(10),
    };
    
    await supabase.from('generated_reports').insert(report);
  }
}

async function createMindMaps(supabase: any, userId: string, documents: any[]) {
  console.log('    Creating mind maps...');
  
  for (const doc of documents.slice(0, 10)) {
    const mindmap = {
      id: uuidv4(),
      user_id: userId,
      document_id: doc.id,
      title: `${doc.subject} Concepts Map`,
      description: `Visual representation of key concepts from ${doc.title}`,
      node_count: Math.floor(Math.random() * 30) + 15,
      edge_count: Math.floor(Math.random() * 40) + 20,
      max_depth: Math.floor(Math.random() * 4) + 3,
      layout_type: ['hierarchical', 'force-directed', 'radial'][Math.floor(Math.random() * 3)],
      nodes: generateMindMapNodes(doc.subject),
      edges: generateMindMapEdges(),
      style_config: {
        node_colors: { primary: '#8B5CF6', secondary: '#EC4899' },
        edge_style: 'curved',
        font_family: 'Inter',
      },
      created_at: getRandomDate(20),
      updated_at: getRandomDate(5),
    };
    
    await supabase.from('mindmaps').insert(mindmap);
  }
}

async function createDocumentDNA(supabase: any, documents: any[]) {
  console.log('    Creating document DNA profiles...');
  
  for (const doc of documents) {
    const dnaProfile = {
      id: uuidv4(),
      document_id: doc.id,
      readability_score: 60 + Math.random() * 30,
      complexity_score: 0.3 + Math.random() * 0.6,
      topic_diversity: Math.random(),
      citation_density: Math.random() * 0.3,
      methodology_rigor: 0.6 + Math.random() * 0.3,
      innovation_score: Math.random(),
      writing_style: {
        formality: 0.7 + Math.random() * 0.2,
        clarity: 0.6 + Math.random() * 0.3,
        technical_depth: 0.5 + Math.random() * 0.4,
      },
      content_structure: {
        intro_length: 0.15,
        methods_length: 0.25,
        results_length: 0.35,
        discussion_length: 0.25,
      },
      key_metrics: {
        sentences_per_paragraph: 4 + Math.floor(Math.random() * 3),
        words_per_sentence: 15 + Math.floor(Math.random() * 10),
        unique_terms: Math.floor(Math.random() * 500) + 200,
      },
      similar_documents: documents
        .filter(d => d.id !== doc.id && d.subject === doc.subject)
        .slice(0, 3)
        .map(d => d.id),
      created_at: new Date().toISOString(),
    };
    
    await supabase.from('document_dna').insert(dnaProfile);
  }
}

// Helper functions
function generateCoCitationClusters(subject: string): any[] {
  const clusters = {
    'Physics': ['Quantum Theory', 'Particle Physics', 'Cosmology'],
    'Mathematics': ['Analysis', 'Algebra', 'Topology'],
    'Computer Science': ['Machine Learning', 'Systems', 'Theory'],
    'Biology': ['Molecular', 'Cellular', 'Ecology'],
  };
  
  return (clusters[subject] || clusters['Physics']).map(cluster => ({
    name: cluster,
    size: Math.floor(Math.random() * 20) + 5,
    centrality: Math.random(),
  }));
}

function generateInsightSummary(subject: string): string {
  const summaries = {
    'Physics': 'Analysis reveals convergence on quantum information theory as a unifying framework across multiple research areas.',
    'Mathematics': 'Recent papers show increasing application of topological methods to solve classical problems.',
    'Computer Science': 'Machine learning techniques are being integrated across all subfields, from systems to theory.',
    'Biology': 'Interdisciplinary approaches combining computation and experimentation are yielding breakthrough insights.',
  };
  
  return summaries[subject] || summaries['Physics'];
}

function generateThemes(subject: string): any[] {
  const themes = {
    'Physics': [
      { theme: 'Quantum Information', strength: 0.85, documents: 5 },
      { theme: 'Emergent Phenomena', strength: 0.72, documents: 3 },
      { theme: 'Symmetry Breaking', strength: 0.68, documents: 4 },
    ],
    'Mathematics': [
      { theme: 'Topological Methods', strength: 0.78, documents: 4 },
      { theme: 'Computational Approaches', strength: 0.71, documents: 3 },
      { theme: 'Abstract Structures', strength: 0.82, documents: 5 },
    ],
    'Computer Science': [
      { theme: 'Deep Learning', strength: 0.90, documents: 6 },
      { theme: 'Distributed Computing', strength: 0.75, documents: 4 },
      { theme: 'Algorithm Optimization', strength: 0.80, documents: 5 },
    ],
    'Biology': [
      { theme: 'Systems Biology', strength: 0.77, documents: 4 },
      { theme: 'Genomic Analysis', strength: 0.83, documents: 5 },
      { theme: 'Evolutionary Dynamics', strength: 0.69, documents: 3 },
    ],
  };
  
  return themes[subject] || themes['Physics'];
}

function generateConnections(documents: any[]): any[] {
  const connections = [];
  
  for (let i = 0; i < Math.min(documents.length - 1, 5); i++) {
    connections.push({
      from: documents[i].id,
      to: documents[i + 1].id,
      type: ['citation', 'thematic', 'methodological'][Math.floor(Math.random() * 3)],
      strength: Math.random(),
    });
  }
  
  return connections;
}

function generatePodcastTranscript(title: string): string {
  return `Welcome to today's deep dive into "${title}". We'll explore the fundamental concepts, recent developments, and practical applications in this fascinating field...`;
}

function generatePodcastHighlights(): any[] {
  return [
    { timestamp: 120, text: 'Key insight about fundamental principles' },
    { timestamp: 450, text: 'Breakthrough discovery discussion' },
    { timestamp: 780, text: 'Practical applications explained' },
    { timestamp: 1200, text: 'Future directions and open questions' },
  ];
}

function generateInteractionPoints(duration: number): any[] {
  const points = [];
  const numPoints = Math.floor(duration / 300); // One every 5 minutes
  
  for (let i = 0; i < numPoints; i++) {
    points.push({
      timestamp: (i + 1) * 300,
      type: ['question', 'reflection', 'quiz'][Math.floor(Math.random() * 3)],
      content: 'Interactive element to engage with the material',
    });
  }
  
  return points;
}

function generateDialogueHistory(topic: string): any[] {
  return [
    { role: 'assistant', content: `Let's explore: ${topic}` },
    { role: 'user', content: 'I think it depends on how we define the terms...' },
    { role: 'assistant', content: 'Interesting perspective. Can you elaborate on your definition?' },
    { role: 'user', content: 'Well, from my understanding...' },
  ];
}

function generateExploredConcepts(topic: string): string[] {
  const concepts = [
    'fundamental assumptions',
    'logical implications',
    'counter-arguments',
    'practical applications',
    'philosophical foundations',
  ];
  
  return concepts.sort(() => Math.random() - 0.5).slice(0, 3);
}

function generateInsights(topic: string): string[] {
  return [
    'Understanding requires questioning basic assumptions',
    'Multiple valid perspectives exist on this topic',
    'The answer depends on the framework we choose',
  ];
}

function generateReportContent(reportType: string): string {
  const templates = {
    literature_review: '# Literature Review\n\n## Abstract\nThis comprehensive review examines recent advances...\n\n## Introduction\n...',
    progress_report: '# Learning Progress Report\n\n## Executive Summary\nSignificant progress has been made...\n\n## Key Achievements\n...',
    knowledge_synthesis: '# Knowledge Synthesis\n\n## Overview\nThis report synthesizes insights from multiple domains...\n\n## Key Findings\n...',
  };
  
  return templates[reportType] || templates.literature_review;
}

function generateReportSections(reportType: string): any[] {
  const sections = {
    literature_review: [
      { title: 'Introduction', pages: 2 },
      { title: 'Methodology', pages: 1 },
      { title: 'Results', pages: 5 },
      { title: 'Discussion', pages: 3 },
      { title: 'Conclusion', pages: 1 },
    ],
    progress_report: [
      { title: 'Executive Summary', pages: 1 },
      { title: 'Learning Metrics', pages: 3 },
      { title: 'Achievements', pages: 2 },
      { title: 'Recommendations', pages: 1 },
    ],
    knowledge_synthesis: [
      { title: 'Overview', pages: 1 },
      { title: 'Cross-Domain Analysis', pages: 4 },
      { title: 'Synthesis', pages: 3 },
      { title: 'Implications', pages: 2 },
    ],
  };
  
  return sections[reportType] || sections.literature_review;
}

function generateMindMapNodes(subject: string): any[] {
  const centralConcepts = {
    'Physics': ['Quantum Mechanics', 'Forces', 'Energy', 'Matter'],
    'Mathematics': ['Algebra', 'Analysis', 'Geometry', 'Logic'],
    'Computer Science': ['Algorithms', 'Data', 'Systems', 'Theory'],
    'Biology': ['Cells', 'Evolution', 'Genetics', 'Ecology'],
  };
  
  const concepts = centralConcepts[subject] || centralConcepts['Physics'];
  const nodes = [
    { id: 'root', label: subject, level: 0, x: 400, y: 300 },
  ];
  
  concepts.forEach((concept, i) => {
    const angle = (i / concepts.length) * 2 * Math.PI;
    nodes.push({
      id: `node-${i}`,
      label: concept,
      level: 1,
      x: 400 + Math.cos(angle) * 150,
      y: 300 + Math.sin(angle) * 150,
    });
  });
  
  return nodes;
}

function generateMindMapEdges(): any[] {
  return [
    { source: 'root', target: 'node-0' },
    { source: 'root', target: 'node-1' },
    { source: 'root', target: 'node-2' },
    { source: 'root', target: 'node-3' },
  ];
}

function getRandomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
}

export async function cleanupAdditionalFeatures(supabase: any) {
  await supabase.from('document_dna').delete().gte('created_at', '2020-01-01');
  await supabase.from('mindmaps').delete().gte('created_at', '2020-01-01');
  await supabase.from('generated_reports').delete().gte('created_at', '2020-01-01');
  await supabase.from('socratic_dialogues').delete().gte('created_at', '2020-01-01');
  await supabase.from('podcast_sessions').delete().gte('created_at', '2020-01-01');
  await supabase.from('cross_document_insights').delete().gte('created_at', '2020-01-01');
  await supabase.from('citation_paths').delete().gte('created_at', '2020-01-01');
  await supabase.from('citation_profiles').delete().gte('created_at', '2020-01-01');
}