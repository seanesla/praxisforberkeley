import express from 'express';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';

const router = express.Router();

// Check all required tables
router.get('/tables', async (req, res) => {
  const requiredTables = [
    'documents',
    'notes',
    'flashcard_sets',
    'flashcards',
    'mind_maps',
    'mind_map_nodes',
    'mind_map_edges',
    'podcast_sessions',
    'podcast_transcripts',
    'socratic_sessions',
    'socratic_questions',
    'socratic_responses'
  ];

  const tableStatus: Record<string, boolean> = {};
  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        // Table doesn't exist
        tableStatus[table] = false;
        missingTables.push(table);
      } else {
        tableStatus[table] = true;
      }
    } catch (err) {
      tableStatus[table] = false;
      missingTables.push(table);
    }
  }

  const allTablesExist = missingTables.length === 0;

  res.status(allTablesExist ? 200 : 503).json({
    status: allTablesExist ? 'healthy' : 'unhealthy',
    tables: tableStatus,
    missingTables,
    message: allTablesExist 
      ? 'All required tables exist' 
      : `Missing tables: ${missingTables.join(', ')}`
  });
});

// Check specific podcast tables
router.get('/podcast', async (req, res) => {
  try {
    // Check podcast_sessions table
    const { error: sessionsError } = await supabase
      .from('podcast_sessions')
      .select('id')
      .limit(1);
    
    // Check podcast_transcripts table
    const { error: transcriptsError } = await supabase
      .from('podcast_transcripts')
      .select('id')
      .limit(1);

    const sessionsExist = !sessionsError || sessionsError.code !== '42P01';
    const transcriptsExist = !transcriptsError || transcriptsError.code !== '42P01';
    const allExist = sessionsExist && transcriptsExist;

    res.status(allExist ? 200 : 503).json({
      status: allExist ? 'healthy' : 'unhealthy',
      tables: {
        podcast_sessions: sessionsExist,
        podcast_transcripts: transcriptsExist
      },
      message: allExist 
        ? 'Podcast tables are ready' 
        : 'Podcast tables are missing. Please run the SQL from PODCAST_SETUP.md'
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check podcast tables'
    });
  }
});

export default router;