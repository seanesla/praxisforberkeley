import { SeedConfig } from './index';
import { v4 as uuidv4 } from 'uuid';

export async function seedAnalytics(supabase: any, config: SeedConfig) {
  console.log('  Creating analytics data...');

  // Get demo user and related data
  const { data: demoUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'demo@praxis.edu')
    .single();

  const { data: documents } = await supabase
    .from('documents')
    .select('id')
    .eq('user_id', demoUser.id);

  if (!demoUser || !documents || documents.length === 0) {
    console.error('Demo user or documents not found!');
    return;
  }

  // Create page views
  await createPageViews(supabase, demoUser.id);
  
  // Create document activity
  await createDocumentActivity(supabase, demoUser.id, documents);
  
  // Create search history
  await createSearchHistory(supabase, demoUser.id);
  
  // Create feature usage
  await createFeatureUsage(supabase, demoUser.id);
  
  // Create user sessions
  await createUserSessions(supabase, demoUser.id);
}

async function createPageViews(supabase: any, userId: string) {
  console.log('    Creating page view analytics...');
  
  const pages = [
    { path: '/dashboard', title: 'Dashboard', category: 'main' },
    { path: '/documents', title: 'Documents', category: 'content' },
    { path: '/flashcards', title: 'Flashcards', category: 'study' },
    { path: '/study', title: 'Study Session', category: 'study' },
    { path: '/mindmaps', title: 'Mind Maps', category: 'visualization' },
    { path: '/exercises', title: 'Exercises', category: 'practice' },
    { path: '/search', title: 'Search', category: 'discovery' },
    { path: '/analytics', title: 'Analytics', category: 'insights' },
    { path: '/settings', title: 'Settings', category: 'account' },
  ];
  
  const pageViews = [];
  
  // Generate realistic page view patterns over 30 days
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const viewsForDay = getViewsForDay(daysAgo);
    
    for (let i = 0; i < viewsForDay; i++) {
      const page = pages[Math.floor(Math.random() * pages.length)];
      const viewTime = getRandomTimeOnDay(daysAgo);
      
      pageViews.push({
        id: uuidv4(),
        user_id: userId,
        page_path: page.path,
        page_title: page.title,
        page_category: page.category,
        session_id: generateSessionId(userId, viewTime),
        duration_seconds: getDurationForPage(page.category),
        referrer: getReferrer(page.path),
        device_type: getDeviceType(),
        browser: getBrowser(),
        screen_resolution: getScreenResolution(),
        created_at: viewTime.toISOString(),
      });
    }
  }
  
  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < pageViews.length; i += batchSize) {
    const batch = pageViews.slice(i, i + batchSize);
    await supabase.from('page_views').insert(batch);
  }
  
  console.log(`      ✓ Created ${pageViews.length} page views`);
}

async function createDocumentActivity(supabase: any, userId: string, documents: any[]) {
  console.log('    Creating document activity...');
  
  const activities = [];
  const activityTypes = ['view', 'edit', 'download', 'share', 'annotate'];
  
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const activitiesForDay = Math.floor(Math.random() * 10) + 3;
    
    for (let i = 0; i < activitiesForDay; i++) {
      const doc = documents[Math.floor(Math.random() * documents.length)];
      const activityTime = getRandomTimeOnDay(daysAgo);
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      
      activities.push({
        id: uuidv4(),
        user_id: userId,
        document_id: doc.id,
        activity_type: activityType,
        duration_seconds: activityType === 'view' ? Math.floor(Math.random() * 600) + 60 : null,
        metadata: generateActivityMetadata(activityType),
        created_at: activityTime.toISOString(),
      });
    }
  }
  
  await supabase.from('document_activities').insert(activities);
  console.log(`      ✓ Created ${activities.length} document activities`);
}

async function createSearchHistory(supabase: any, userId: string) {
  console.log('    Creating search history...');
  
  const searchQueries = [
    // Physics queries
    'quantum entanglement explained',
    'wave function collapse',
    'special relativity time dilation',
    'dark matter detection methods',
    'higgs boson discovery',
    'string theory dimensions',
    'quantum computing applications',
    
    // Mathematics queries
    'differential equations solutions',
    'topology homeomorphism',
    'linear algebra eigenvalues',
    'calculus integration techniques',
    'number theory prime distribution',
    'graph theory algorithms',
    
    // Computer Science queries
    'machine learning neural networks',
    'distributed systems consensus',
    'algorithm complexity analysis',
    'database normalization',
    'cryptography RSA',
    'compiler design phases',
    
    // Biology queries
    'DNA replication process',
    'protein folding mechanisms',
    'CRISPR gene editing',
    'cellular respiration steps',
    'evolution natural selection',
    'neuron action potential',
    
    // Cross-disciplinary
    'physics mathematics relationship',
    'computational biology applications',
    'quantum biology photosynthesis',
    'mathematical modeling epidemiology',
  ];
  
  const searches = [];
  
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const searchesForDay = Math.floor(Math.random() * 8) + 1;
    
    for (let i = 0; i < searchesForDay; i++) {
      const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
      const searchTime = getRandomTimeOnDay(daysAgo);
      
      searches.push({
        id: uuidv4(),
        user_id: userId,
        query,
        results_count: Math.floor(Math.random() * 50) + 5,
        clicked_results: Math.floor(Math.random() * 3),
        search_type: Math.random() < 0.7 ? 'semantic' : 'keyword',
        filters_used: generateSearchFilters(),
        execution_time_ms: Math.floor(Math.random() * 500) + 100,
        created_at: searchTime.toISOString(),
      });
    }
  }
  
  await supabase.from('search_history').insert(searches);
  console.log(`      ✓ Created ${searches.length} search queries`);
}

async function createFeatureUsage(supabase: any, userId: string) {
  console.log('    Creating feature usage data...');
  
  const features = [
    { name: 'flashcard_generation', category: 'ai' },
    { name: 'document_summary', category: 'ai' },
    { name: 'mindmap_creation', category: 'visualization' },
    { name: 'exercise_generation', category: 'ai' },
    { name: 'spaced_repetition', category: 'study' },
    { name: 'citation_network', category: 'analysis' },
    { name: 'knowledge_gap_analysis', category: 'insights' },
    { name: 'workflow_execution', category: 'automation' },
    { name: 'report_generation', category: 'export' },
    { name: 'collaboration_invite', category: 'social' },
  ];
  
  const usageData = [];
  
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const featuresUsedToday = features.filter(() => Math.random() < 0.4);
    
    for (const feature of featuresUsedToday) {
      const usageCount = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < usageCount; i++) {
        const usageTime = getRandomTimeOnDay(daysAgo);
        
        usageData.push({
          id: uuidv4(),
          user_id: userId,
          feature_name: feature.name,
          feature_category: feature.category,
          usage_count: 1,
          success: Math.random() < 0.95,
          duration_ms: Math.floor(Math.random() * 5000) + 500,
          metadata: generateFeatureMetadata(feature.name),
          created_at: usageTime.toISOString(),
        });
      }
    }
  }
  
  await supabase.from('feature_usage').insert(usageData);
  console.log(`      ✓ Created ${usageData.length} feature usage records`);
}

async function createUserSessions(supabase: any, userId: string) {
  console.log('    Creating user sessions...');
  
  const sessions = [];
  const locations = [
    { ip: '192.168.1.100', location: 'San Francisco, CA', timezone: 'America/Los_Angeles' },
    { ip: '10.0.0.50', location: 'Berkeley, CA', timezone: 'America/Los_Angeles' },
    { ip: '172.16.0.25', location: 'Stanford, CA', timezone: 'America/Los_Angeles' },
  ];
  
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const sessionsForDay = getSessionsForDay(daysAgo);
    
    for (let i = 0; i < sessionsForDay; i++) {
      const sessionStart = getRandomTimeOnDay(daysAgo);
      const duration = getSessionDuration();
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      sessions.push({
        id: generateSessionId(userId, sessionStart),
        user_id: userId,
        started_at: sessionStart.toISOString(),
        ended_at: new Date(sessionStart.getTime() + duration * 1000).toISOString(),
        duration_seconds: duration,
        ip_address: location.ip,
        location: location.location,
        timezone: location.timezone,
        user_agent: getUserAgent(),
        device_type: getDeviceType(),
        pages_viewed: Math.floor(Math.random() * 20) + 5,
        actions_performed: Math.floor(Math.random() * 30) + 10,
        created_at: sessionStart.toISOString(),
      });
    }
  }
  
  await supabase.from('user_sessions').insert(sessions);
  console.log(`      ✓ Created ${sessions.length} user sessions`);
}

// Helper functions
function getViewsForDay(daysAgo: number): number {
  // More recent days have more views
  if (daysAgo === 0) return Math.floor(Math.random() * 30) + 20;
  if (daysAgo <= 3) return Math.floor(Math.random() * 25) + 15;
  if (daysAgo <= 7) return Math.floor(Math.random() * 20) + 10;
  if (daysAgo <= 14) return Math.floor(Math.random() * 15) + 5;
  return Math.floor(Math.random() * 10) + 3;
}

function getSessionsForDay(daysAgo: number): number {
  // Typically 1-3 sessions per day
  if (daysAgo === 0) return 2;
  if (daysAgo <= 7) return Math.random() < 0.8 ? 2 : 1;
  return Math.random() < 0.6 ? 1 : 0;
}

function getRandomTimeOnDay(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  // Simulate realistic usage patterns
  const hour = weightedHourSelection();
  const minute = Math.floor(Math.random() * 60);
  
  date.setHours(hour, minute, 0, 0);
  return date;
}

function weightedHourSelection(): number {
  const weights = [
    1, 1, 1, 1, 1, 1, 2, 3,    // 0-7 (early morning)
    4, 3, 3, 2, 3, 4, 4, 3,    // 8-15 (work hours)
    4, 5, 6, 7, 8, 6, 4, 2     // 16-23 (evening)
  ];
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let hour = 0; hour < weights.length; hour++) {
    random -= weights[hour];
    if (random <= 0) return hour;
  }
  
  return 20; // Default evening time
}

function getDurationForPage(category: string): number {
  const durations: { [key: string]: [number, number] } = {
    'main': [30, 120],
    'content': [60, 600],
    'study': [300, 1800],
    'visualization': [120, 600],
    'practice': [300, 1200],
    'discovery': [60, 300],
    'insights': [120, 600],
    'account': [30, 180],
  };
  
  const [min, max] = durations[category] || [30, 120];
  return Math.floor(Math.random() * (max - min)) + min;
}

function getSessionDuration(): number {
  // Session durations in seconds (5 min to 2 hours)
  const minDuration = 300;
  const maxDuration = 7200;
  
  // Most sessions are 15-45 minutes
  const typical = 900 + Math.floor(Math.random() * 1800);
  
  // Sometimes longer sessions
  if (Math.random() < 0.2) {
    return typical + Math.floor(Math.random() * 3600);
  }
  
  return typical;
}

function generateSessionId(userId: string, time: Date): string {
  return `${userId}-${time.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getReferrer(currentPath: string): string {
  if (Math.random() < 0.3) return 'direct';
  
  const internalPages = ['/dashboard', '/documents', '/flashcards', '/search'];
  const referrer = internalPages[Math.floor(Math.random() * internalPages.length)];
  
  return referrer === currentPath ? '/dashboard' : referrer;
}

function getDeviceType(): string {
  const devices = ['desktop', 'mobile', 'tablet'];
  const weights = [0.7, 0.2, 0.1];
  
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < devices.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) return devices[i];
  }
  
  return 'desktop';
}

function getBrowser(): string {
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  const weights = [0.65, 0.20, 0.10, 0.05];
  
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < browsers.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) return browsers[i];
  }
  
  return 'Chrome';
}

function getScreenResolution(): string {
  const resolutions = ['1920x1080', '2560x1440', '1366x768', '1440x900', '3840x2160'];
  return resolutions[Math.floor(Math.random() * resolutions.length)];
}

function getUserAgent(): string {
  const browser = getBrowser();
  const device = getDeviceType();
  
  if (device === 'mobile') {
    return `Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1`;
  } else if (device === 'tablet') {
    return `Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1`;
  } else {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}/119.0.0.0 Safari/537.36`;
  }
}

function generateActivityMetadata(activityType: string): any {
  switch (activityType) {
    case 'view':
      return { 
        scroll_depth: Math.floor(Math.random() * 100),
        time_to_first_interaction: Math.floor(Math.random() * 5000),
      };
    case 'edit':
      return {
        changes_made: Math.floor(Math.random() * 10) + 1,
        auto_saved: Math.random() < 0.8,
      };
    case 'download':
      return {
        format: ['pdf', 'docx', 'txt'][Math.floor(Math.random() * 3)],
        file_size: Math.floor(Math.random() * 5000000) + 100000,
      };
    case 'share':
      return {
        share_type: ['link', 'email', 'collaboration'][Math.floor(Math.random() * 3)],
        recipients: Math.floor(Math.random() * 3) + 1,
      };
    case 'annotate':
      return {
        annotations_added: Math.floor(Math.random() * 5) + 1,
        highlight_count: Math.floor(Math.random() * 10),
      };
    default:
      return {};
  }
}

function generateSearchFilters(): any {
  const filters: any = {};
  
  if (Math.random() < 0.3) {
    filters.document_type = ['pdf', 'note', 'all'][Math.floor(Math.random() * 3)];
  }
  
  if (Math.random() < 0.2) {
    filters.date_range = ['week', 'month', 'year'][Math.floor(Math.random() * 3)];
  }
  
  if (Math.random() < 0.25) {
    filters.subject = ['Physics', 'Mathematics', 'Computer Science', 'Biology'][Math.floor(Math.random() * 4)];
  }
  
  return filters;
}

function generateFeatureMetadata(featureName: string): any {
  switch (featureName) {
    case 'flashcard_generation':
      return { cards_generated: Math.floor(Math.random() * 20) + 5 };
    case 'document_summary':
      return { summary_length: Math.floor(Math.random() * 500) + 200 };
    case 'mindmap_creation':
      return { nodes_created: Math.floor(Math.random() * 15) + 5 };
    case 'exercise_generation':
      return { exercises_created: Math.floor(Math.random() * 10) + 3 };
    case 'workflow_execution':
      return { workflow_type: 'document_processing' };
    default:
      return {};
  }
}

export async function cleanupAnalytics(supabase: any) {
  await supabase.from('user_sessions').delete().gte('created_at', '2020-01-01');
  await supabase.from('feature_usage').delete().gte('created_at', '2020-01-01');
  await supabase.from('search_history').delete().gte('created_at', '2020-01-01');
  await supabase.from('document_activities').delete().gte('created_at', '2020-01-01');
  await supabase.from('page_views').delete().gte('created_at', '2020-01-01');
}