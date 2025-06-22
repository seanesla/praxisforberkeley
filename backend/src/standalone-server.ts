import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './utils/logger.js';

// ES Modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    message: 'Praxis backend (standalone) is running',
    timestamp: new Date().toISOString()
  });
});

// API endpoints
app.get('/api/test', (_req: Request, res: Response) => {
  res.json({ 
    status: 'success',
    message: 'Praxis API is running in standalone mode',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = join(__dirname, '../../frontend/.next');
  app.use(express.static(frontendPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(join(frontendPath, 'index.html'));
  });
}

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({
    error: {
      message: err?.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
});

// Start server
const startServer = (): void => {
  app.listen(PORT, () => {
    logger.info(`🚀 Standalone server running on port ${PORT}`);
    logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔌 API test endpoint: http://localhost:${PORT}/api/test`);
  });
};

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
