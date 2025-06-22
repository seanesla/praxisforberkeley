'use client';

import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
  Connection,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActionLibrary } from './ActionLibrary';
import { TriggerConfig } from './TriggerConfig';
import { 
  PlayIcon, 
  ArrowDownTrayIcon, 
  TrashIcon,
  CogIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface WorkflowCanvasProps {
  workflowId?: string;
  userId: string;
  onSave?: (workflow: any) => void;
}

const nodeTypes = {
  trigger: ({ data }: any) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-500 text-white">
      <div className="flex items-center space-x-2">
        <BoltIcon className="w-4 h-4" />
        <span className="text-sm font-semibold">{data.label}</span>
      </div>
    </div>
  ),
  action: ({ data }: any) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-500 text-white">
      <div className="flex items-center space-x-2">
        <CogIcon className="w-4 h-4" />
        <span className="text-sm font-semibold">{data.label}</span>
      </div>
    </div>
  ),
};

export function WorkflowCanvas({ workflowId, userId, onSave }: WorkflowCanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: { label: 'Manual Trigger' },
    },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showActionLibrary, setShowActionLibrary] = useState(false);
  const [showTriggerConfig, setShowTriggerConfig] = useState(false);
  const [workflowName, setWorkflowName] = useState('New Workflow');

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    if (node.type === 'trigger') {
      setShowTriggerConfig(true);
    }
  }, []);

  const addAction = (action: any) => {
    const newNode: Node = {
      id: `action_${Date.now()}`,
      type: 'action',
      position: { x: 250, y: nodes.length * 100 + 50 },
      data: { label: action.name, ...action },
    };

    setNodes((nds) => [...nds, newNode]);
    
    // Auto-connect to previous node
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      setEdges((eds) => [...eds, {
        id: `e${lastNode.id}-${newNode.id}`,
        source: lastNode.id,
        target: newNode.id,
        animated: true,
      }]);
    }
    
    setShowActionLibrary(false);
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === 'trigger') return; // Can't delete trigger
    
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const saveWorkflow = async () => {
    const workflow = {
      name: workflowName,
      trigger: nodes.find(n => n.type === 'trigger')?.data,
      actions: nodes
        .filter(n => n.type === 'action')
        .map(n => ({
          id: n.id,
          ...n.data
        })),
      flow_data: {
        nodes,
        edges
      }
    };

    try {
      const response = await fetch('/api/workflow/workflows', {
        method: workflowId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(workflow)
      });

      if (response.ok) {
        const data = await response.json();
        onSave?.(data.workflow);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  const testWorkflow = async () => {
    try {
      const response = await fetch(`/api/workflow/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Workflow execution started:', data);
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>

        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-xl font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none px-2 py-1"
          />
          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowActionLibrary(true)}>
              <CogIcon className="w-4 h-4 mr-2" />
              Add Action
            </Button>
            <Button variant="outline" onClick={testWorkflow}>
              <PlayIcon className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button variant="default" onClick={saveWorkflow}>
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Node Properties */}
        {selectedNode && selectedNode.type === 'action' && (
          <Card className="absolute bottom-4 right-4 p-4 w-80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selectedNode.data.label}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteNode(selectedNode.id)}
                  className="text-red-500"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">{selectedNode.data.description}</p>
                {/* Action-specific configuration */}
                {selectedNode.data.config && (
                  <div className="border-t pt-2">
                    <p className="font-medium mb-2">Configuration</p>
                    <pre className="bg-gray-50 p-2 rounded text-xs">
                      {JSON.stringify(selectedNode.data.config, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Side Panels */}
      {showActionLibrary && (
        <ActionLibrary
          onSelect={addAction}
          onClose={() => setShowActionLibrary(false)}
        />
      )}

      {showTriggerConfig && selectedNode?.type === 'trigger' && (
        <TriggerConfig
          trigger={selectedNode.data}
          onChange={(trigger) => {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === 'trigger' ? { ...n, data: trigger } : n
              )
            );
          }}
          onClose={() => setShowTriggerConfig(false)}
        />
      )}
    </div>
  );
}

export function WorkflowCanvasProvider(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
}