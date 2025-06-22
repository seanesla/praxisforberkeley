'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionMode,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '../ui/button';
import { toast } from 'react-hot-toast';
import { 
  DocumentTextIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

interface NetworkData {
  nodes: any[];
  edges: any[];
}

interface CitationNodeData {
  label: string;
  type: 'document' | 'citation' | 'author';
  metadata: any;
}

const nodeTypes = {
  document: ({ data }: { data: CitationNodeData }) => (
    <div className="p-4 bg-gray-800 border border-purple-500 rounded-lg shadow-lg">
      <div className="flex items-center mb-2">
        <DocumentTextIcon className="w-5 h-5 text-purple-400 mr-2" />
        <span className="text-xs text-purple-400 font-medium">Document</span>
      </div>
      <div className="text-white font-medium text-sm max-w-[200px] truncate">
        {data.label}
      </div>
      {data.metadata?.citationCount > 0 && (
        <div className="text-xs text-gray-400 mt-2">
          {data.metadata.citationCount} citations
        </div>
      )}
    </div>
  ),
  
  citation: ({ data }: { data: CitationNodeData }) => (
    <div className="p-3 bg-gray-800 border border-blue-500 rounded-lg shadow-lg">
      <div className="flex items-center mb-1">
        <LinkIcon className="w-4 h-4 text-blue-400 mr-1" />
        <span className="text-xs text-blue-400">Citation</span>
      </div>
      <div className="text-white text-xs max-w-[150px] truncate">
        {data.label}
      </div>
      {data.metadata?.year && (
        <div className="text-xs text-gray-500 mt-1">
          {data.metadata.year}
        </div>
      )}
    </div>
  ),
  
  author: ({ data }: { data: CitationNodeData }) => (
    <div className="p-2 bg-gray-800 border border-green-500 rounded-full shadow-lg">
      <div className="text-white text-xs font-medium">
        {data.label}
      </div>
    </div>
  )
};

export function CitationNetwork({ documentIds }: { documentIds?: string[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadNetwork();
  }, [documentIds]);

  const loadNetwork = async () => {
    try {
      const response = await fetch('/api/citation-network/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ document_ids: documentIds })
      });

      if (!response.ok) throw new Error('Failed to load citation network');

      const data: NetworkData = await response.json();
      
      // Convert to ReactFlow format
      const flowNodes: Node[] = data.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: { x: node.x || 0, y: node.y || 0 },
        data: {
          label: node.label,
          type: node.type,
          metadata: node.metadata
        }
      }));

      const flowEdges: Edge[] = data.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: edge.type === 'cites',
        style: {
          stroke: getEdgeColor(edge.type),
          strokeWidth: edge.weight * 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getEdgeColor(edge.type)
        },
        data: edge.metadata
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Error loading citation network:', error);
      toast.error('Failed to load citation network');
    } finally {
      setLoading(false);
    }
  };

  const analyzeClusters = async () => {
    setAnalyzing(true);

    try {
      const response = await fetch('/api/citation-network/analyze-clusters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to analyze clusters');

      const data = await response.json();
      toast.success(`Found ${data.clusters.length} citation clusters`);
      
      // Highlight clusters with different colors
      highlightClusters(data.clusters);
    } catch (error) {
      console.error('Error analyzing clusters:', error);
      toast.error('Failed to analyze citation clusters');
    } finally {
      setAnalyzing(false);
    }
  };

  const highlightClusters = (clusters: any[]) => {
    const clusterColors = [
      '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'
    ];

    const nodeClusterMap = new Map<string, number>();
    
    clusters.forEach((cluster, index) => {
      cluster.members?.forEach((member: any) => {
        nodeClusterMap.set(`doc_${member.document_id}`, index);
      });
    });

    setNodes(nodes => nodes.map(node => {
      const clusterIndex = nodeClusterMap.get(node.id);
      if (clusterIndex !== undefined) {
        return {
          ...node,
          style: {
            ...node.style,
            backgroundColor: clusterColors[clusterIndex % clusterColors.length] + '20',
            borderColor: clusterColors[clusterIndex % clusterColors.length],
            borderWidth: 2
          }
        };
      }
      return node;
    }));
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    // Could show node details in a sidebar
  }, []);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const getEdgeColor = (type: string) => {
    switch (type) {
      case 'cites': return '#8B5CF6';
      case 'extends': return '#10B981';
      case 'contradicts': return '#EF4444';
      case 'supports': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-900 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeClusters}
            disabled={analyzing}
          >
            <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
            {analyzing ? 'Analyzing...' : 'Find Clusters'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Reset zoom and center
              const reactFlowInstance = (window as any).reactFlowInstance;
              reactFlowInstance?.fitView();
            }}
          >
            <ArrowsPointingInIcon className="w-4 h-4 mr-2" />
            Fit View
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded mr-2" />
            <span className="text-gray-400">Cites</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2" />
            <span className="text-gray-400">Extends</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2" />
            <span className="text-gray-400">Contradicts</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2" />
            <span className="text-gray-400">Supports</span>
          </div>
        </div>
      </div>

      {/* Network Visualization */}
      <div className="h-[600px] bg-gray-900 rounded-lg border border-gray-800">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-right"
          onInit={(instance) => {
            (window as any).reactFlowInstance = instance;
          }}
        >
          <Background color="#374151" gap={16} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'document': return '#8B5CF6';
                case 'citation': return '#3B82F6';
                case 'author': return '#10B981';
                default: return '#6B7280';
              }
            }}
            style={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151'
            }}
          />
        </ReactFlow>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-2">Selected Node</h3>
          <p className="text-gray-400">ID: {selectedNode}</p>
          {/* Add more node details here */}
        </div>
      )}
    </div>
  );
}