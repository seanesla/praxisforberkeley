import { MindMap, MindMapData } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export const mindmapsApi = {
  // Get all mind maps for the authenticated user
  async getMindMaps(): Promise<MindMap[]> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_URL}/api/mindmaps`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch mind maps');
    }

    const data = await response.json();
    return data.mindMaps || [];
  },

  // Get a specific mind map
  async getMindMap(id: string): Promise<MindMap> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_URL}/api/mindmaps/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch mind map');
    }

    const data = await response.json();
    return data.mindMap;
  },

  // Create a new mind map
  async createMindMap(title: string, data: MindMapData, documentId?: string): Promise<MindMap> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_URL}/api/mindmaps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        data,
        document_id: documentId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create mind map');
    }

    const result = await response.json();
    return result.mindMap;
  },

  // Generate a mind map from a document
  async generateFromDocument(documentId: string): Promise<MindMap> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_URL}/api/mindmaps/generate/${documentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate mind map');
    }

    const data = await response.json();
    return data.mindMap;
  },

  // Update a mind map
  async updateMindMap(id: string, updates: { title?: string; data?: MindMapData }): Promise<MindMap> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_URL}/api/mindmaps/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update mind map');
    }

    const data = await response.json();
    return data.mindMap;
  },

  // Delete a mind map
  async deleteMindMap(id: string): Promise<void> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_URL}/api/mindmaps/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete mind map');
    }
  },

  // Export mind map to different formats
  async exportMindMap(mindMap: MindMap, format: 'json' | 'mermaid' | 'svg' | 'png'): Promise<Blob> {
    switch (format) {
      case 'json':
        const jsonStr = JSON.stringify(mindMap.data, null, 2);
        return new Blob([jsonStr], { type: 'application/json' });
      
      case 'mermaid':
        const mermaidStr = convertToMermaid(mindMap.data);
        return new Blob([mermaidStr], { type: 'text/plain' });
      
      case 'svg':
      case 'png':
        // These would require canvas rendering
        throw new Error(`Export to ${format} not yet implemented`);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
};

// Helper function to convert mind map to Mermaid format
function convertToMermaid(data: MindMapData): string {
  let mermaid = 'mindmap\n';
  const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
  const processed = new Set<string>();
  
  const buildMermaidNode = (nodeId: string, indent: number): string => {
    if (processed.has(nodeId)) return '';
    processed.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) return '';
    
    const spaces = '  '.repeat(indent);
    let result = `${spaces}${node.text}\n`;
    
    // Find children
    const children = data.connections
      .filter(c => c.source === nodeId && c.type === 'hierarchy')
      .map(c => c.target);
    
    for (const childId of children) {
      result += buildMermaidNode(childId, indent + 1);
    }
    
    return result;
  };
  
  // Find root node
  const rootNode = data.nodes.find(n => n.type === 'root');
  if (rootNode) {
    mermaid += `  root((${rootNode.text}))\n`;
    
    const children = data.connections
      .filter(c => c.source === rootNode.id && c.type === 'hierarchy')
      .map(c => c.target);
    
    for (const childId of children) {
      mermaid += buildMermaidNode(childId, 2);
    }
  }
  
  return mermaid;
}