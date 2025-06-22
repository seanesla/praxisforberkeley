import { AIService } from './ai/aiService';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  MindMap,
  MindMapData,
  MindMapNode,
  MindMapConnection,
  MindMapLayout,
  GenerateMindMapRequest,
  GenerateMindMapResponse
} from '../types/ai-features';

export class MindMapService {
  /**
   * Generate a mind map from document content
   */
  static async generateMindMap(
    userId: string,
    content: string,
    title: string,
    options?: {
      maxDepth?: number;
      maxNodes?: number;
      layout?: MindMapLayout;
    }
  ): Promise<MindMapData> {
    logger.info('Generating mind map from document', { userId, title });
    
    try {
      const maxDepth = options?.maxDepth || 4;
      const maxNodes = options?.maxNodes || 50;
      
      // Extract key concepts and structure
      const concepts = await this.extractConcepts(content, userId);
      const structure = await this.analyzeDocumentStructure(content, title, userId);
      
      // Build mind map data
      const mindMapData = await this.buildMindMapData(
        title,
        concepts,
        structure,
        { maxDepth, maxNodes }
      );
      
      // Apply layout if specified
      if (options?.layout) {
        mindMapData.layout = options.layout;
      }
      
      return mindMapData;
    } catch (error) {
      logger.error('Error generating mind map', { error, userId, title });
      throw error;
    }
  }
  
  /**
   * Extract key concepts from document content
   */
  private static async extractConcepts(
    content: string,
    userId: string
  ): Promise<Array<{ text: string; importance: number; related: string[] }>> {
    logger.debug('Extracting concepts for mind map');
    
    const prompt = `Extract key concepts from this document for a mind map. For each concept:
    1. Identify the main term or phrase
    2. Rate its importance (0-1)
    3. List related concepts
    
    Focus on:
    - Main topics and subtopics
    - Key terms and definitions
    - Important relationships
    - Hierarchical structures
    
    Document:
    ${content.substring(0, 4000)}
    
    Return as JSON array: [{ "text": "concept", "importance": 0.8, "related": ["concept1", "concept2"] }]
    Maximum 30 concepts.`;
    
    try {
      const response = await AIService.generateResponse(userId, {
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at extracting and organizing concepts for visual mind maps.' 
          },
          { role: 'user', content: prompt }
        ]
      });
      
      const concepts = JSON.parse(response.content);
      return Array.isArray(concepts) ? concepts : [];
    } catch (error) {
      logger.error('Error extracting concepts', error);
      return this.fallbackConceptExtraction(content);
    }
  }
  
  /**
   * Analyze document structure for mind map organization
   */
  private static async analyzeDocumentStructure(
    content: string,
    title: string,
    userId: string
  ): Promise<any> {
    logger.debug('Analyzing document structure');
    
    const prompt = `Analyze the structure of this document to create a mind map hierarchy:
    
    Document Title: ${title}
    Content:
    ${content.substring(0, 3000)}
    
    Identify:
    1. Main sections and their hierarchy
    2. Key relationships between topics
    3. Logical flow and connections
    4. Natural groupings of concepts
    
    Return as JSON: {
      "mainTopics": ["topic1", "topic2"],
      "hierarchy": { "topic1": ["subtopic1", "subtopic2"] },
      "connections": [{ "from": "topic1", "to": "topic2", "type": "relates" }]
    }`;
    
    try {
      const response = await AIService.generateResponse(userId, {
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at analyzing document structure and creating hierarchical organizations.' 
          },
          { role: 'user', content: prompt }
        ]
      });
      
      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Error analyzing structure', error);
      return {
        mainTopics: [title],
        hierarchy: {},
        connections: []
      };
    }
  }
  
  /**
   * Build mind map data structure
   */
  private static async buildMindMapData(
    title: string,
    concepts: Array<{ text: string; importance: number; related: string[] }>,
    structure: any,
    options: { maxDepth: number; maxNodes: number }
  ): Promise<MindMapData> {
    logger.debug('Building mind map data structure');
    
    const nodes: MindMapNode[] = [];
    const connections: MindMapConnection[] = [];
    const nodeMap = new Map<string, string>(); // concept text -> node id
    
    // Create root node
    const rootId = uuidv4();
    nodes.push({
      id: rootId,
      text: title,
      type: 'root',
      position: { x: 0, y: 0 },
      expanded: true,
      metadata: { level: 0 }
    });
    nodeMap.set(title.toLowerCase(), rootId);
    
    // Create nodes for main topics
    let nodeCount = 1;
    let currentDepth = 1;
    
    for (const mainTopic of structure.mainTopics || []) {
      if (nodeCount >= options.maxNodes) break;
      
      const mainNodeId = uuidv4();
      const concept = concepts.find(c => 
        c.text.toLowerCase().includes(mainTopic.toLowerCase()) ||
        mainTopic.toLowerCase().includes(c.text.toLowerCase())
      );
      
      nodes.push({
        id: mainNodeId,
        text: mainTopic,
        type: 'main',
        position: this.calculatePosition(nodeCount, currentDepth),
        expanded: true,
        metadata: { 
          level: 1,
          importance: concept?.importance || 0.7
        }
      });
      
      connections.push({
        source: rootId,
        target: mainNodeId,
        type: 'hierarchy'
      });
      
      nodeMap.set(mainTopic.toLowerCase(), mainNodeId);
      nodeCount++;
      
      // Add subtopics
      const subtopics = structure.hierarchy[mainTopic] || [];
      for (const subtopic of subtopics) {
        if (nodeCount >= options.maxNodes || currentDepth >= options.maxDepth) break;
        
        const subNodeId = uuidv4();
        const subConcept = concepts.find(c => 
          c.text.toLowerCase().includes(subtopic.toLowerCase())
        );
        
        nodes.push({
          id: subNodeId,
          text: subtopic,
          type: 'sub',
          position: this.calculatePosition(nodeCount, currentDepth + 1),
          expanded: false,
          metadata: { 
            level: 2,
            importance: subConcept?.importance || 0.5
          }
        });
        
        connections.push({
          source: mainNodeId,
          target: subNodeId,
          type: 'hierarchy'
        });
        
        nodeMap.set(subtopic.toLowerCase(), subNodeId);
        nodeCount++;
      }
    }
    
    // Add cross-connections from structure
    for (const conn of structure.connections || []) {
      const sourceId = nodeMap.get(conn.from.toLowerCase());
      const targetId = nodeMap.get(conn.to.toLowerCase());
      
      if (sourceId && targetId) {
        connections.push({
          source: sourceId,
          target: targetId,
          type: conn.type || 'association',
          style: {
            dashArray: '5 5',
            color: '#999'
          }
        });
      }
    }
    
    // Add theme
    const theme = {
      name: 'default',
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 14
    };
    
    return {
      nodes,
      connections,
      layout: {
        type: 'radial',
        direction: 'TB',
        spacing: { x: 150, y: 100 }
      },
      theme
    };
  }
  
  /**
   * Calculate node position based on layout
   */
  private static calculatePosition(
    index: number,
    depth: number
  ): { x: number; y: number } {
    // Simple radial layout calculation
    const angle = (index * Math.PI * 2) / 8; // 8 nodes per circle
    const radius = depth * 200; // 200px per level
    
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  }
  
  /**
   * Fallback concept extraction using simple heuristics
   */
  private static fallbackConceptExtraction(content: string): Array<{ 
    text: string; 
    importance: number; 
    related: string[] 
  }> {
    const concepts: Array<{ text: string; importance: number; related: string[] }> = [];
    
    // Extract potential concepts using patterns
    const patterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, // Proper nouns
      /\b(?:is|are|means|refers to|defined as)\s+([^,.]+)/gi, // Definitions
      /\b(?:includes?|consists? of|comprises?)\s+([^,.]+)/gi, // Components
      /^(?:\d+\.|\*|\-)\s*(.+)$/gm // List items
    ];
    
    const extractedTerms = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        const term = match.replace(/^(?:\d+\.|\*|\-)\s*/, '').trim();
        if (term.length > 3 && term.length < 50) {
          extractedTerms.add(term);
        }
      });
    });
    
    // Convert to concept objects
    Array.from(extractedTerms).slice(0, 30).forEach((term, index) => {
      concepts.push({
        text: term,
        importance: 1 - (index / 30), // Decreasing importance
        related: []
      });
    });
    
    return concepts;
  }
  
  /**
   * Update existing mind map
   */
  static async updateMindMap(
    userId: string,
    mindMapId: string,
    updates: Partial<MindMapData>
  ): Promise<boolean> {
    logger.info('Updating mind map', { userId, mindMapId });
    
    try {
      const { error } = await supabase
        .from('mind_maps')
        .update({
          data: updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', mindMapId)
        .eq('user_id', userId);
      
      if (error) {
        logger.error('Error updating mind map', error);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating mind map', error);
      return false;
    }
  }
  
  /**
   * Export mind map to different formats
   */
  static async exportMindMap(
    mindMapData: MindMapData,
    format: 'json' | 'mermaid' | 'svg'
  ): Promise<string> {
    logger.debug('Exporting mind map', { format });
    
    switch (format) {
      case 'json':
        return JSON.stringify(mindMapData, null, 2);
        
      case 'mermaid':
        return this.exportToMermaid(mindMapData);
        
      case 'svg':
        // This would require a more complex implementation
        logger.warn('SVG export not yet implemented');
        return '';
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  /**
   * Export mind map to Mermaid format
   */
  private static exportToMermaid(data: MindMapData): string {
    let mermaid = 'mindmap\n  root((Root))\n';
    
    // Build hierarchy
    const processed = new Set<string>();
    const nodeById = new Map(data.nodes.map(n => [n.id, n]));
    
    const buildMermaidNode = (nodeId: string, indent: number): string => {
      if (processed.has(nodeId)) return '';
      processed.add(nodeId);
      
      const node = nodeById.get(nodeId);
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
      mermaid = `mindmap\n  root((${rootNode.text}))\n`;
      
      const children = data.connections
        .filter(c => c.source === rootNode.id && c.type === 'hierarchy')
        .map(c => c.target);
      
      for (const childId of children) {
        mermaid += buildMermaidNode(childId, 2);
      }
    }
    
    return mermaid;
  }
  
  /**
   * Generate mind map from multiple documents
   */
  static async generateCompositeMindMap(
    userId: string,
    documentIds: string[],
    title: string
  ): Promise<MindMapData> {
    logger.info('Generating composite mind map', { userId, documentCount: documentIds.length });
    
    try {
      // Fetch all documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id, title, content')
        .in('id', documentIds)
        .eq('user_id', userId);
      
      if (!documents || documents.length === 0) {
        throw new Error('No documents found');
      }
      
      // Combine content with document markers
      const combinedContent = documents
        .map(doc => `[Document: ${doc.title}]\n${doc.content}`)
        .join('\n\n---\n\n');
      
      // Generate mind map with special handling for multiple documents
      const mindMapData = await this.generateMindMap(
        userId,
        combinedContent,
        title,
        { maxNodes: 80, maxDepth: 5 }
      );
      
      // Add document source metadata to nodes
      mindMapData.nodes.forEach(node => {
        if (node.metadata) {
          node.metadata.sourceDocuments = documentIds;
        }
      });
      
      return mindMapData;
    } catch (error) {
      logger.error('Error generating composite mind map', error);
      throw error;
    }
  }
}