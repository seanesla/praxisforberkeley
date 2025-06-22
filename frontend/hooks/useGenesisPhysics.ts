import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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

interface UseGenesisPhysicsOptions {
  enabled?: boolean;
  serverUrl?: string;
  onUpdate?: (update: PhysicsUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useGenesisPhysics({
  enabled = true,
  serverUrl = 'http://localhost:5001',
  onUpdate,
  onConnect,
  onDisconnect,
  onError
}: UseGenesisPhysicsOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<PhysicsUpdate['metrics'] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<PhysicsUpdate | null>(null);
  
  // Connect to physics server via Node.js bridge
  useEffect(() => {
    if (!enabled) return;
    
    const socket = io(`${serverUrl}/physics`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Connected to Genesis physics bridge');
      setIsConnected(true);
      onConnect?.();
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from Genesis physics bridge');
      setIsConnected(false);
      onDisconnect?.();
    });
    
    socket.on('physics:update', (update: PhysicsUpdate) => {
      setLastUpdate(update);
      setMetrics(update.metrics || null);
      onUpdate?.(update);
    });
    
    socket.on('error', (error: Error) => {
      console.error('Genesis physics error:', error);
      onError?.(error);
    });
    
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, serverUrl, onUpdate, onConnect, onDisconnect, onError]);
  
  // Send command to physics engine
  const sendCommand = useCallback((command: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('physics:command', command);
    }
  }, []);
  
  // Physics control methods
  const applyForce = useCallback((bodyId: string, force: [number, number, number]) => {
    sendCommand({
      type: 'apply_force',
      body_id: bodyId,
      force
    });
  }, [sendCommand]);
  
  const setPosition = useCallback((bodyId: string, position: [number, number, number]) => {
    sendCommand({
      type: 'set_position',
      body_id: bodyId,
      position
    });
  }, [sendCommand]);
  
  const setVelocity = useCallback((bodyId: string, velocity: [number, number, number]) => {
    sendCommand({
      type: 'set_velocity',
      body_id: bodyId,
      velocity
    });
  }, [sendCommand]);
  
  // REST API methods via fetch
  const resetSimulation = useCallback(async () => {
    try {
      const response = await fetch(`${serverUrl}/api/physics/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset simulation');
      }
    } catch (error) {
      console.error('Reset simulation error:', error);
      onError?.(error as Error);
    }
  }, [serverUrl, onError]);
  
  const pauseSimulation = useCallback(async () => {
    try {
      const response = await fetch(`${serverUrl}/api/physics/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to pause simulation');
      }
    } catch (error) {
      console.error('Pause simulation error:', error);
      onError?.(error as Error);
    }
  }, [serverUrl, onError]);
  
  const resumeSimulation = useCallback(async () => {
    try {
      const response = await fetch(`${serverUrl}/api/physics/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to resume simulation');
      }
    } catch (error) {
      console.error('Resume simulation error:', error);
      onError?.(error as Error);
    }
  }, [serverUrl, onError]);
  
  const addBody = useCallback(async (bodyConfig: any): Promise<string | null> => {
    try {
      const response = await fetch(`${serverUrl}/api/physics/add_body`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(bodyConfig)
      });
      
      if (!response.ok) {
        throw new Error('Failed to add body');
      }
      
      const result = await response.json();
      return result.body_id;
    } catch (error) {
      console.error('Add body error:', error);
      onError?.(error as Error);
      return null;
    }
  }, [serverUrl, onError]);
  
  const removeBody = useCallback(async (bodyId: string) => {
    try {
      const response = await fetch(`${serverUrl}/api/physics/remove_body/${bodyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove body');
      }
    } catch (error) {
      console.error('Remove body error:', error);
      onError?.(error as Error);
    }
  }, [serverUrl, onError]);
  
  const addConstraint = useCallback(async (constraintConfig: any): Promise<string | null> => {
    try {
      const response = await fetch(`${serverUrl}/api/physics/add_constraint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(constraintConfig)
      });
      
      if (!response.ok) {
        throw new Error('Failed to add constraint');
      }
      
      const result = await response.json();
      return result.constraint_id;
    } catch (error) {
      console.error('Add constraint error:', error);
      onError?.(error as Error);
      return null;
    }
  }, [serverUrl, onError]);
  
  const loadPreset = useCallback(async (presetName: string) => {
    try {
      const response = await fetch(`${serverUrl}/api/physics/load_preset/${presetName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load preset');
      }
    } catch (error) {
      console.error('Load preset error:', error);
      onError?.(error as Error);
    }
  }, [serverUrl, onError]);
  
  return {
    // State
    isConnected,
    metrics,
    lastUpdate,
    
    // Real-time controls
    applyForce,
    setPosition,
    setVelocity,
    sendCommand,
    
    // Simulation controls
    resetSimulation,
    pauseSimulation,
    resumeSimulation,
    
    // Object management
    addBody,
    removeBody,
    addConstraint,
    
    // Presets
    loadPreset
  };
}