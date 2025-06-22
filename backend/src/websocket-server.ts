import { Server } from 'socket.io';
import { createServer } from 'http';
import logger from './utils/logger';
import { physicsBridge } from './services/physicsbridge';
import { authenticateSocketToken } from './middleware/auth';

export function setupWebSocketServer(app: any) {
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Physics namespace
  const physicsNamespace = io.of('/physics');
  
  // Middleware for authentication
  physicsNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const user = await authenticateSocketToken(token);
      if (!user) {
        return next(new Error('Invalid token'));
      }
      
      socket.data.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });
  
  // Handle physics connections
  physicsNamespace.on('connection', (socket) => {
    logger.info(`Physics client connected: ${socket.id}`);
    
    // Connect to Genesis physics server
    if (!physicsBridge.isConnectedToGenesis()) {
      physicsBridge.connect().catch(error => {
        logger.error('Failed to connect to Genesis:', error);
      });
    }
    
    // Forward physics updates to client
    const updateHandler = (update: any) => {
      socket.emit('physics:update', update);
    };
    
    physicsBridge.on('update', updateHandler);
    
    // Handle client commands
    socket.on('physics:command', async (command) => {
      try {
        physicsBridge.sendCommand(command);
      } catch (error) {
        logger.error('Physics command error:', error);
        socket.emit('physics:error', { message: 'Command failed' });
      }
    });
    
    // Handle preset loading
    socket.on('physics:load_preset', async (presetName) => {
      try {
        await physicsBridge.loadPreset(presetName);
        socket.emit('physics:preset_loaded', { preset: presetName });
      } catch (error) {
        logger.error('Load preset error:', error);
        socket.emit('physics:error', { message: 'Failed to load preset' });
      }
    });
    
    // Handle simulation control
    socket.on('physics:reset', async () => {
      try {
        await physicsBridge.resetSimulation();
        socket.emit('physics:reset_complete');
      } catch (error) {
        logger.error('Reset error:', error);
        socket.emit('physics:error', { message: 'Failed to reset simulation' });
      }
    });
    
    socket.on('physics:pause', async () => {
      try {
        await physicsBridge.pauseSimulation();
        socket.emit('physics:paused');
      } catch (error) {
        logger.error('Pause error:', error);
        socket.emit('physics:error', { message: 'Failed to pause simulation' });
      }
    });
    
    socket.on('physics:resume', async () => {
      try {
        await physicsBridge.resumeSimulation();
        socket.emit('physics:resumed');
      } catch (error) {
        logger.error('Resume error:', error);
        socket.emit('physics:error', { message: 'Failed to resume simulation' });
      }
    });
    
    // Clean up on disconnect
    socket.on('disconnect', () => {
      logger.info(`Physics client disconnected: ${socket.id}`);
      physicsBridge.removeListener('update', updateHandler);
      
      // If no more clients, disconnect from Genesis
      if (physicsNamespace.sockets.size === 0) {
        physicsBridge.disconnect();
      }
    });
  });
  
  // Regular socket.io namespace for other real-time features
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
  
  return { server, io };
}