'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Connection,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  NodeDragHandler,
  OnNodesChange,
  OnEdgesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import MindMapNode from './MindMapNode';
import { MindMapData, MindMapNode as MindMapNodeType } from '@/types';
import { usePhysicsEngine } from '@/hooks/usePhysicsEngine';
import { 
  PhysicsBody, 
  Forces, 
  vec2, 
  PHYSICS_PRESETS,
  Spring,
  PhysicsConfig
} from '@/lib/physics';
import PhysicsControlPanel from './PhysicsControlPanel';
import ForceVisualizer from './ForceVisualizer';

const nodeTypes = {
  mindMapNode: MindMapNode,
};

interface MindMapCanvasPhysicsProps {
  data: MindMapData;
  onDataChange?: (data: MindMapData) => void;
  editable?: boolean;
  physicsEnabled?: boolean;
  physicsPreset?: keyof typeof PHYSICS_PRESETS;
}

function MindMapCanvasPhysicsContent({ 
  data, 
  onDataChange, 
  editable = true,
  physicsEnabled = true,
  physicsPreset = 'forceDirected'
}: MindMapCanvasPhysicsProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showForces, setShowForces] = useState(false);
  const [physicsConfig, setPhysicsConfig] = useState<Partial<PhysicsConfig>>(PHYSICS_PRESETS[physicsPreset]);
  const { fitView, getNode, getNodes, getEdges } = useReactFlow();
  const isDraggingRef = useRef<string | null>(null);
  
  // Initialize physics engine
  const physics = usePhysicsEngine({
    config: {
      ...physicsConfig,
      bounds: {
        min: { x: -2000, y: -2000 },
        max: { x: 2000, y: 2000 }
      }
    },
    onUpdate: (engine) => {
      if (!physicsEnabled || isDraggingRef.current) return;
      
      // Update node positions from physics
      const bodies = engine.getBodies();
      setNodes((currentNodes) => 
        currentNodes.map(node => {
          const body = bodies.find(b => b.id === node.id);
          if (body && !body.fixed) {
            return {
              ...node,
              position: {
                x: body.position.x,
                y: body.position.y
              }
            };
          }
          return node;
        })
      );
    },
    autoStart: physicsEnabled
  });
  
  // Sync ReactFlow nodes with physics bodies
  useEffect(() => {
    if (!physicsEnabled) return;
    
    // Clear existing physics state
    physics.reset();
    physics.clearForces();
    
    // Add physics bodies for nodes
    data.nodes.forEach(node => {
      const body: PhysicsBody = {
        id: node.id,
        position: node.position || { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: node.type === 'root' ? 3 : node.type === 'main' ? 2 : 1,
        radius: node.type === 'root' ? 30 : node.type === 'main' ? 25 : 20,
        fixed: false,
        damping: 0.1,
        charge: 1,
        metadata: node
      };
      physics.addBody(body);
    });
    
    // Add springs for connections
    data.connections.forEach((conn, index) => {
      const spring: Spring = {
        id: `spring-${conn.source}-${conn.target}`,
        bodyA: conn.source,
        bodyB: conn.target,
        restLength: 150,
        stiffness: 0.2,
        damping: 0.1
      };
      physics.addSpring(spring);
    });
    
    // Add forces based on preset
    if (physicsPreset === 'forceDirected') {
      physics.addForce(Forces.repulsion(1000));
      physics.addForce(Forces.spring([])); // Springs are handled internally
      physics.addForce(Forces.centerAttraction({ x: 0, y: 0 }, 0.01));
      physics.addForce(Forces.drag(0.02));
    } else if (physicsPreset === 'gravity') {
      physics.addForce(Forces.gravity({ x: 0, y: 300 }));
      physics.addForce(Forces.repulsion(500));
      physics.addForce(Forces.spring([]));
      physics.addForce(Forces.drag(0.01));
    } else if (physicsPreset === 'space') {
      physics.addForce(Forces.nbodyGravity(100));
      physics.addForce(Forces.drag(0.001));
    }
    
    // Start physics simulation
    if (physicsEnabled) {
      physics.start();
    }
    
    return () => {
      physics.stop();
    };
  }, [data, physicsEnabled, physicsPreset]);
  
  // Convert MindMapData to ReactFlow format
  useEffect(() => {
    const flowNodes: Node[] = data.nodes.map(node => ({
      id: node.id,
      type: 'mindMapNode',
      position: node.position || { x: 0, y: 0 },
      data: {
        ...node,
        onToggleExpand: handleToggleExpand
      }
    }));

    const flowEdges: Edge[] = data.connections.map((conn, index) => ({
      id: `${conn.source}-${conn.target}-${index}`,
      source: conn.source,
      target: conn.target,
      type: conn.type === 'association' ? 'step' : 'smoothstep',
      animated: conn.type === 'association',
      style: {
        stroke: conn.style?.color || '#666',
        strokeWidth: conn.style?.width || 2,
        strokeDasharray: conn.style?.dashArray
      },
      label: conn.label
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [data, setNodes, setEdges]);

  // Auto-layout on initial load
  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [fitView]);

  const handleToggleExpand = useCallback((nodeId: string) => {
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              expanded: !node.data.expanded
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!editable) return;
      
      // Add edge to ReactFlow
      setEdges((eds) => {
        const newEdge: Edge = {
          id: `${params.source}-${params.target}`,
          source: params.source!,
          target: params.target!,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#666' }
        };
        return [...eds, newEdge];
      });
      
      // Add spring to physics
      if (physicsEnabled && params.source && params.target) {
        const spring: Spring = {
          id: `spring-${params.source}-${params.target}`,
          bodyA: params.source,
          bodyB: params.target,
          restLength: 150,
          stiffness: 0.2,
          damping: 0.1
        };
        physics.addSpring(spring);
      }
    },
    [editable, physicsEnabled, setEdges, physics]
  );

  const onNodeDragStart: NodeDragHandler = useCallback((event, node) => {
    if (physicsEnabled) {
      isDraggingRef.current = node.id;
      physics.updateBody(node.id, { fixed: true });
    }
  }, [physicsEnabled, physics]);

  const onNodeDrag: NodeDragHandler = useCallback((event, node) => {
    if (physicsEnabled) {
      physics.setPosition(node.id, node.position);
      physics.setVelocity(node.id, { x: 0, y: 0 });
    }
  }, [physicsEnabled, physics]);

  const onNodeDragStop: NodeDragHandler = useCallback(
    (event, node) => {
      if (physicsEnabled) {
        physics.updateBody(node.id, { fixed: false });
        isDraggingRef.current = null;
      }
      
      if (!editable || !onDataChange) return;
      
      const updatedNodes = getNodes().map(n => ({
        ...n.data,
        position: { x: n.position.x, y: n.position.y }
      }));
      
      onDataChange({
        ...data,
        nodes: updatedNodes as MindMapNodeType[]
      });
    },
    [editable, physicsEnabled, data, onDataChange, physics, getNodes]
  );
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (physicsEnabled && event.shiftKey) {
      // Apply impulse on shift+click
      const impulse = {
        x: (Math.random() - 0.5) * 500,
        y: (Math.random() - 0.5) * 500
      };
      physics.applyImpulse(node.id, impulse);
    }
  }, [physicsEnabled, physics]);
  
  const handlePhysicsConfigChange = useCallback((newConfig: Partial<PhysicsConfig>) => {
    setPhysicsConfig(newConfig);
    physics.updateConfig(newConfig);
  }, [physics]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={editable ? onNodesChange : undefined}
        onEdgesChange={editable ? onEdgesChange : undefined}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background 
          variant="dots" 
          gap={16} 
          size={1} 
          color="#333"
        />
        <Controls 
          showZoom={true}
          showFitView={true}
          showInteractive={editable}
        />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.data.type) {
              case 'root': return '#8B5CF6';
              case 'main': return '#3B82F6';
              case 'sub': return '#10B981';
              default: return '#6B7280';
            }
          }}
          maskColor="rgb(0, 0, 0, 0.8)"
          className="bg-gray-800"
        />
        
        <Panel position="top-left" className="bg-transparent">
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-purple-500/20 rounded-full text-xs">
              Root
            </div>
            <div className="px-3 py-1 bg-blue-500/20 rounded-full text-xs">
              Main
            </div>
            <div className="px-3 py-1 bg-green-500/20 rounded-full text-xs">
              Sub
            </div>
            <div className="px-3 py-1 bg-gray-500/20 rounded-full text-xs">
              Detail
            </div>
          </div>
          {physicsEnabled && (
            <div className="mt-2 text-xs text-gray-400">
              Shift+Click to apply impulse • Drag to move nodes
            </div>
          )}
        </Panel>
        
        {showForces && physicsEnabled && (
          <ForceVisualizer bodies={physics.getBodies()} />
        )}
      </ReactFlow>
      
      {physicsEnabled && (
        <PhysicsControlPanel
          config={physicsConfig}
          metrics={physics.metrics}
          onConfigChange={handlePhysicsConfigChange}
          onToggleForces={() => setShowForces(!showForces)}
          showForces={showForces}
          isRunning={physics.isRunning}
          onPlayPause={() => physics.isRunning ? physics.stop() : physics.start()}
          onReset={() => {
            physics.reset();
            // Re-initialize with original data
            window.location.reload(); // Simple reset for now
          }}
        />
      )}
    </div>
  );
}

export default function MindMapCanvasPhysics(props: MindMapCanvasPhysicsProps) {
  return (
    <ReactFlowProvider>
      <MindMapCanvasPhysicsContent {...props} />
    </ReactFlowProvider>
  );
}