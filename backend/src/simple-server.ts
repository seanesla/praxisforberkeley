import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { checkSupabaseConnection } from './config/supabase';
import authRoutes from './routes/auth';
import documentsRoutes from './routes/documents';
import notesRoutes from './routes/notes';
import aiRoutes from './routes/ai';
import commandRoutes from './routes/command';
import flashcardsRoutes from './routes/flashcards';
import mindmapsRoutes from './routes/mindmaps';
import logger, { stream } from './utils/logger';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream }));

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
app.use('/api/auth', authRoutes);
logger.info('✓ Auth routes registered');
app.use('/api/documents', documentsRoutes);
logger.info('✓ Documents routes registered');
app.use('/api/notes', notesRoutes);
logger.info('✓ Notes routes registered');
app.use('/api/ai', aiRoutes);
logger.info('✓ AI routes registered');
app.use('/api/command', commandRoutes);
logger.info('✓ Command routes registered');
app.use('/api/flashcards', flashcardsRoutes);
logger.info('✓ Flashcards routes registered');
app.use('/api/mindmaps', mindmapsRoutes);
logger.info('✓ Mindmaps routes registered');

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