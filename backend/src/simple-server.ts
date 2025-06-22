import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { checkSupabaseConnection } from './config/supabase';
import { securityConfig, configureSecurityMiddleware } from './config/security';
import { standardLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import documentsRoutes from './routes/documents';
import notesRoutes from './routes/notes';
import aiRoutes from './routes/ai';
// import commandRoutes from './routes/command';
import flashcardsRoutes from './routes/flashcards';
import mindmapsRoutes from './routes/mindmaps';
import podcastRoutes from './routes/podcast';
import socraticRoutes from './routes/socratic';
import healthRoutes from './routes/health';
// import spacedRepetitionRoutes from './routes/spaced-repetition';
import exercisesRoutes from './routes/exercises';
import knowledgeGapRoutes from './routes/knowledge-gap';
import citationNetworkRoutes from './routes/citation-network';
import searchV2Routes from './routes/search-v2';
import reportsRoutes from './routes/reports';
import workflowRoutes from './routes/workflow';
import analyticsV2Routes from './routes/analytics-v2';
// import documentDNARoutes from './routes/document-dna';
import crossDocumentRoutes from './routes/cross-document';
import workspaceRoutes from './routes/workspace';
import logger, { stream } from './utils/logger';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Apply security configurations
configureSecurityMiddleware(app);

// CORS configuration
app.use(cors(securityConfig.cors));

// Request size limits
app.use(express.json({ limit: securityConfig.requestLimits.json }));
app.use(express.urlencoded({ 
  extended: true, 
  limit: securityConfig.requestLimits.urlencoded 
}));
app.use(express.raw({ limit: securityConfig.requestLimits.raw }));
app.use(express.text({ limit: securityConfig.requestLimits.text }));

// Logging
app.use(morgan('combined', { stream }));

// Apply standard rate limiting to all routes
app.use('/api', standardLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Praxis backend is running',
    timestamp: new Date().toISOString()
  });
});

// Supabase connection test
app.get('/api/test-supabase', async (_req, res) => {
  try {
    const isConnected = await checkSupabaseConnection();
    
    if (isConnected) {
      res.json({ 
        status: 'connected',
        message: 'Successfully connected to Supabase'
      });
    } else {
      res.status(503).json({ 
        status: 'disconnected',
        message: 'Failed to connect to Supabase'
      });
    }
  } catch (error) {
    logger.error('Supabase connection test error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error testing Supabase connection'
    });
  }
});

// Routes
logger.info('Registering routes...');
app.use('/api/health', healthRoutes);
logger.info('✓ Health routes registered');
app.use('/api/auth', authRoutes);
logger.info('✓ Auth routes registered');
app.use('/api/documents', documentsRoutes);
logger.info('✓ Documents routes registered');
app.use('/api/notes', notesRoutes);
logger.info('✓ Notes routes registered');
app.use('/api/ai', aiRoutes);
logger.info('✓ AI routes registered');
// app.use('/api/command', commandRoutes);
logger.info('✓ Command routes registered');
app.use('/api/flashcards', flashcardsRoutes);
logger.info('✓ Flashcards routes registered');
app.use('/api/mindmaps', mindmapsRoutes);
logger.info('✓ Mindmaps routes registered');
app.use('/api/podcast', podcastRoutes);
logger.info('✓ Podcast routes registered');
app.use('/api/socratic', socraticRoutes);
logger.info('✓ Socratic routes registered');
// app.use('/api/spaced-repetition', spacedRepetitionRoutes);
logger.info('✓ Spaced Repetition routes registered');
app.use('/api/exercises', exercisesRoutes);
logger.info('✓ Exercises routes registered');
app.use('/api/knowledge-gap', knowledgeGapRoutes);
logger.info('✓ Knowledge Gap routes registered');
app.use('/api/citation-network', citationNetworkRoutes);
logger.info('✓ Citation Network routes registered');
app.use('/api/search/v2', searchV2Routes);
logger.info('✓ Search V2 routes registered');
app.use('/api/reports', reportsRoutes);
logger.info('✓ Reports routes registered');
app.use('/api/workflow', workflowRoutes);
logger.info('✓ Workflow routes registered');
app.use('/api/analytics/v2', analyticsV2Routes);
logger.info('✓ Analytics V2 routes registered');
// app.use('/api/document-dna', documentDNARoutes);
logger.info('✓ Document DNA routes registered');
app.use('/api/cross-document', crossDocumentRoutes);
logger.info('✓ Cross Document routes registered');
app.use('/api/workspace', workspaceRoutes);
logger.info('✓ Workspace routes registered');

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ 
    error: {
      message: 'Not found',
      code: 'ROUTE_NOT_FOUND'
    }
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      logger.warn('Warning: Could not connect to Supabase. Some features may not work.');
    } else {
      logger.info('Successfully connected to Supabase');
    }

    // Create reports directory
    const fs = await import('fs/promises');
    const path = await import('path');
    const reportsDir = path.join(process.cwd(), 'reports');
    try {
      await fs.mkdir(reportsDir, { recursive: true });
      logger.info('Reports directory ready');
    } catch (error) {
      logger.warn('Could not create reports directory:', error);
    }

    // Initialize workflow automation
    try {
      await import('./services/workflowAutomation');
      // WorkflowAutomationService initialization would go here if needed
      logger.info('Workflow automation service loaded');
    } catch (error) {
      logger.warn('Could not load workflow automation:', error);
    }

    app.listen(PORT, () => {
      logger.info(`✨ Praxis backend server running on port ${PORT}`);
      logger.info(`📍 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();