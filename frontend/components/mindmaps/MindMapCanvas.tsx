'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import MindMapNode from './MindMapNode';
import { MindMapData, MindMapNode as MindMapNodeType } from '@/types';

const nodeTypes = {
  mindMapNode: MindMapNode,
};

interface MindMapCanvasProps {
  data: MindMapData;
  onDataChange?: (data: MindMapData) => void;
  editable?: boolean;
}

function MindMapCanvasContent({ data, onDataChange, editable = true }: MindMapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();

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
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#666' }
      }, eds));
    },
    [editable, setEdges]
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!editable || !onDataChange) return;
      
      const updatedNodes = nodes.map(n => ({
        ...n.data,
        position: { x: n.position.x, y: n.position.y }
      }));
      
      onDataChange({
        ...data,
        nodes: updatedNodes as MindMapNodeType[]
      });
    },
    [editable, nodes, data, onDataChange]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={editable ? onNodesChange : undefined}
        onEdgesChange={editable ? onEdgesChange : undefined}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
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
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function MindMapCanvas(props: MindMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MindMapCanvasContent {...props} />
    </ReactFlowProvider>
  );
}