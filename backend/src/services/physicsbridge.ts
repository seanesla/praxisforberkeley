import WebSocket from 'ws';
import { EventEmitter } from 'events';
import logger from '../utils/logger';

interface PhysicsUpdate {
  timestamp: number;
  bodies: Array<{
    id: string;
    position: [number, number, number];
    rotation: [number, number, number, number];
    velocity?: [number, number, number];
    metadata?: any;
  }>;
  annotations?: Array<{
    targetId: string;
    updates: any;
  }>;
  metrics?: {
    fps: number;
    bodyCount: number;
    constraintCount: number;
    simulationTime: number;
  };
}

interface PhysicsCommand {
  type: string;
  [key: string]: any;
}

export class PhysicsBridge extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private messageQueue: PhysicsCommand[] = [];
  private genesisUrl: string;

  constructor(genesisUrl: string = 'ws://localhost:8001/ws') {
    super();
    this.genesisUrl = genesisUrl;
  }

  async connect(): Promise<void> {
    try {
      logger.info(`Connecting to Genesis physics server at ${this.genesisUrl}`);
      
      this.ws = new WebSocket(this.genesisUrl);
      
      this.ws.on('open', () => {
        logger.info('Connected to Genesis physics server');
        this.isConnected = true;
        this.emit('connected');
        
        // Send any queued messages
        this.flushMessageQueue();
      });
      
      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const update = JSON.parse(data.toString()) as PhysicsUpdate;
          this.emit('update', update);
        } catch (error) {
          logger.error('Failed to parse physics update:', error);
        }
      });
      
      this.ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.emit('error', error);
      });
      
      this.ws.on('close', () => {
        logger.info('Disconnected from Genesis physics server');
        this.isConnected = false;
        this.emit('disconnected');
        
        // Attempt to reconnect
        this.scheduleReconnect();
      });
      
    } catch (error) {
      logger.error('Failed to connect to Genesis server:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      logger.info('Attempting to reconnect to Genesis server...');
      this.connect();
    }, this.reconnectInterval);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const command = this.messageQueue.shift();
      if (command) {
        this.sendCommand(command);
      }
    }
  }

  sendCommand(command: PhysicsCommand): void {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify(command));
      } catch (error) {
        logger.error('Failed to send command:', error);
        this.messageQueue.push(command);
      }
    } else {
      // Queue the message for when we reconnect
      this.messageQueue.push(command);
    }
  }

  // Physics control methods
  applyForce(bodyId: string, force: [number, number, number]): void {
    this.sendCommand({
      type: 'apply_force',
      body_id: bodyId,
      force
    });
  }

  setPosition(bodyId: string, position: [number, number, number]): void {
    this.sendCommand({
      type: 'set_position',
      body_id: bodyId,
      position
    });
  }

  setVelocity(bodyId: string, velocity: [number, number, number]): void {
    this.sendCommand({
      type: 'set_velocity',
      body_id: bodyId,
      velocity
    });
  }

  // REST API calls to Genesis server
  async resetSimulation(): Promise<void> {
    const response = await fetch('http://localhost:8001/api/physics/reset', {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to reset simulation');
    }
  }

  async pauseSimulation(): Promise<void> {
    const response = await fetch('http://localhost:8001/api/physics/pause', {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to pause simulation');
    }
  }

  async resumeSimulation(): Promise<void> {
    const response = await fetch('http://localhost:8001/api/physics/resume', {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to resume simulation');
    }
  }

  async addBody(bodyConfig: any): Promise<string> {
    const response = await fetch('http://localhost:8001/api/physics/add_body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyConfig)
    });
    
    if (!response.ok) {
      throw new Error('Failed to add body');
    }
    
    const result = await response.json();
    return result.body_id;
  }

  async removeBody(bodyId: string): Promise<void> {
    const response = await fetch(`http://localhost:8001/api/physics/remove_body/${bodyId}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove body');
    }
  }

  async addConstraint(constraintConfig: any): Promise<string> {
    const response = await fetch('http://localhost:8001/api/physics/add_constraint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(constraintConfig)
    });
    
    if (!response.ok) {
      throw new Error('Failed to add constraint');
    }
    
    const result = await response.json();
    return result.constraint_id;
  }

  async loadPreset(presetName: string): Promise<void> {
    const response = await fetch(`http://localhost:8001/api/physics/load_preset/${presetName}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to load preset');
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  isConnectedToGenesis(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const physicsBridge = new PhysicsBridge();