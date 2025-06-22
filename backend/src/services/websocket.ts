import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export function initializeWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.userId = decoded.id;
      socket.data.email = decoded.email;
      
      next();
    } catch (err) {
      logger.error('WebSocket authentication error:', err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.data.email}`);
    
    // Join user-specific room
    socket.join(`user:${socket.data.userId}`);
    
    // Handle real-time note editing
    socket.on('noteEdit', (data) => {
      // Broadcast to other clients of the same user
      socket.to(`user:${socket.data.userId}`).emit('noteUpdated', data);
    });
    
    // Handle collaborative features
    socket.on('joinDocument', (documentId) => {
      socket.join(`document:${documentId}`);
      socket.to(`document:${documentId}`).emit('userJoined', {
        userId: socket.data.userId,
        email: socket.data.email
      });
    });
    
    socket.on('leaveDocument', (documentId) => {
      socket.leave(`document:${documentId}`);
      socket.to(`document:${documentId}`).emit('userLeft', {
        userId: socket.data.userId
      });
    });
    
    // Handle cursor position for collaborative editing
    socket.on('cursorPosition', (data) => {
      socket.to(`document:${data.documentId}`).emit('cursorUpdate', {
        userId: socket.data.userId,
        position: data.position
      });
    });
    
    // Handle real-time AI suggestions
    socket.on('requestSuggestions', async (data) => {
      // This will be handled by the AI service
      socket.emit('suggestionsUpdate', { 
        noteId: data.noteId,
        suggestions: [] 
      });
    });
    
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.data.email}`);
    });
  });

  return io;
}

export { io };