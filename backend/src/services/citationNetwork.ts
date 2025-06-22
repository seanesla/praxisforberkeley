import { supabase } from '../config/supabase';
import { AIService } from './ai/aiService';
import { logger } from '../utils/logger';

export interface Citation {
  id?: string;
  citation_text: string;
  citation_type?: string;
  authors?: string[];
  title?: string;
  publication_year?: number;
  publication_name?: string;
  doi?: string;
  url?: string;
}

export interface CitationRelationship {
  citing_document_id: string;
  cited_document_id?: string;
  citation_id?: string;
  relationship_type: string;
  strength: number;
  context?: string;
}

export interface CitationCluster {
  id?: string;
  cluster_name: string;
  cluster_type: string;
  document_count: number;
  citation_count: number;
  main_topics: string[];
  keywords: string[];
  layout_data?: any;
}

export interface NetworkNode {
  id: string;
  type: 'document' | 'citation' | 'author';
  label: string;
  metadata: any;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  metadata?: any;
}

export class CitationNetworkService {
  /**
   * Extract citations from document content using AI and patterns
   */
  static async extractCitations(documentId: string, userId: string): Promise<Citation[]> {
    try {
      // Get document content
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const content = document.content || '';
      const citations: Citation[] = [];
      
      // Use AI to extract citations
      const aiService = new AIService();
      const response = await aiService.generateResponse('system', {
        messages: [{
          role: 'user',
          content: `Extract all citations and references from this document. Include:
- Author names and years (e.g., Smith, 2023)
- Direct quotes with sources
- References to other works
- DOIs and URLs

Document content:
${content.substring(0, 5000)}...

Return as JSON array with format:
[{
  "citation_text": "full citation text",
  "authors": ["Author1", "Author2"],
  "title": "title if mentioned",
  "year": 2023,
  "context": "surrounding text"
}]`
        }],
        temperature: 0.2,
        maxTokens: 2000
      });

      if (response) {
        try {
          const extracted = JSON.parse(response.content);
          citations.push(...extracted);
        } catch (e) {
          logger.error('Error parsing AI citations:', e);
        }
      }

      // Also use pattern matching for additional citations
      const patterns = {
        academic: /\(([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)*),?\s*(\d{4})\)/g,
        doi: /10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+/g
      };

      let match;
      while ((match = patterns.academic.exec(content)) !== null) {
        const [fullMatch, authors, year] = match;
        const exists = citations.some(c => c.citation_text === fullMatch);
        if (!exists) {
          citations.push({
            citation_text: fullMatch,
            authors: authors.split(/\s+(?:and|&)\s+/),
            publication_year: parseInt(year)
          } as Citation);
        }
      }

      return citations;
    } catch (error) {
      logger.error('Error extracting citations:', error);
      return [];
    }
  }

  /**
   * Store citations and create links between documents
   */
  static async storeCitationsAndCreateLinks(documentId: string, userId: string, citations: Citation[]) {
    try {
      // Find which citations link to other user documents
      const { data: userDocs, error: docsError } = await supabase
        .from('documents')
        .select('id, title, metadata')
        .eq('user_id', userId);

      if (docsError) throw docsError;

      for (const citation of citations) {
        // Try to match citation to existing documents
        let targetDocId = null;
        let confidence = 0;

        for (const doc of userDocs || []) {
          // Check if citation matches document
          const titleMatch = citation.title && doc.title &&
            citation.title.toLowerCase().includes(doc.title.toLowerCase());
          
          const authorMatch = citation.authors && doc.metadata?.authors &&
            citation.authors.some((a: string) => 
              doc.metadata.authors.includes(a)
            );

          if (titleMatch || authorMatch) {
            targetDocId = doc.id;
            confidence = titleMatch && authorMatch ? 0.9 : 0.6;
            break;
          }
        }

        // Create citation link
        const { error: linkError } = await supabase
          .from('citation_links')
          .insert({
            source_document_id: documentId,
            target_document_id: targetDocId,
            citation_text: citation.citation_text,
            citation_context: citation.context,
            confidence_score: confidence || 0.5
          });

        if (linkError) throw linkError;
      }

      // Update citation metrics
      await this.updateCitationMetrics(documentId);
    } catch (error) {
      logger.error('Error storing citations:', error);
    }
  }

  /**
   * Build citation network for a set of documents
   */
  static async buildCitationNetwork(userId: string, documentIds?: string[]): Promise<{
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  }> {
    try {
      // Get documents
      let query = supabase
        .from('documents')
        .select('id, title, metadata')
        .eq('user_id', userId);

      if (documentIds?.length) {
        query = query.in('id', documentIds);
      }

      const { data: documents, error: docError } = await query;
      if (docError) throw docError;

      // Get citation links
      const { data: citationLinks, error: linkError } = await supabase
        .from('citation_links')
        .select('*')
        .in('source_document_id', documents?.map(d => d.id) || []);

      if (linkError) throw linkError;

      // Get citation metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('citation_metrics')
        .select('*')
        .in('document_id', documents?.map(d => d.id) || []);

      if (metricsError) throw metricsError;

      // Build network
      const nodes: NetworkNode[] = [];
      const edges: NetworkEdge[] = [];
      const nodeMap = new Map<string, NetworkNode>();

      // Add document nodes with metrics
      documents?.forEach(doc => {
        const docMetrics = metrics?.find(m => m.document_id === doc.id);
        const node: NetworkNode = {
          id: `doc_${doc.id}`,
          type: 'document',
          label: doc.title,
          metadata: {
            ...doc.metadata,
            inDegree: docMetrics?.in_degree || 0,
            outDegree: docMetrics?.out_degree || 0,
            betweenness: docMetrics?.betweenness_centrality || 0
          },
          size: 10 + (docMetrics?.in_degree || 0) * 2, // Size based on citations
          color: this.getNodeColor(docMetrics?.betweenness_centrality || 0)
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
      });

      // Add edges from citation links
      citationLinks?.forEach(link => {
        // Document to document edges
        if (link.target_document_id) {
          // Make sure target document is in our set
          const targetExists = documents?.some(d => d.id === link.target_document_id);
          if (targetExists) {
            edges.push({
              id: `edge_${link.source_document_id}_${link.target_document_id}`,
              source: `doc_${link.source_document_id}`,
              target: `doc_${link.target_document_id}`,
              type: 'cites',
              weight: link.confidence_score,
              metadata: { 
                citationText: link.citation_text,
                context: link.citation_context 
              }
            });
          }
        }
      });

      // Apply force-directed layout
      this.applyForceLayout(nodes, edges);

      return { nodes, edges };
    } catch (error) {
      logger.error('Error building citation network:', error);
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Calculate and update citation metrics for documents
   */
  static async updateCitationMetrics(documentId: string) {
    try {
      // Get all citation links involving this document
      const { data: inLinks, error: inError } = await supabase
        .from('citation_links')
        .select('*')
        .eq('target_document_id', documentId);

      if (inError) throw inError;

      const { data: outLinks, error: outError } = await supabase
        .from('citation_links')
        .select('*')
        .eq('source_document_id', documentId);

      if (outError) throw outError;

      // Calculate metrics
      const inDegree = inLinks?.length || 0;
      const outDegree = outLinks?.length || 0;

      // Update or insert metrics
      const { error: upsertError } = await supabase
        .from('citation_metrics')
        .upsert({
          document_id: documentId,
          in_degree: inDegree,
          out_degree: outDegree,
          betweenness_centrality: 0, // Will be calculated in network analysis
          eigenvector_centrality: 0,
          clustering_coefficient: 0,
          updated_at: new Date().toISOString()
        });

      if (upsertError) throw upsertError;
    } catch (error) {
      logger.error('Error updating citation metrics:', error);
    }
  }

  /**
   * Calculate network-wide metrics
   */
  static async calculateNetworkMetrics(userId: string) {
    try {
      // Get all documents and links
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', userId);

      if (docsError) throw docsError;

      const docIds = documents?.map(d => d.id) || [];

      const { data: links, error: linksError } = await supabase
        .from('citation_links')
        .select('*')
        .or(`source_document_id.in.(${docIds.join(',')}),target_document_id.in.(${docIds.join(',')})`);

      if (linksError) throw linksError;

      // Build adjacency matrix
      const adjacency = new Map<string, Set<string>>();
      const reverseAdjacency = new Map<string, Set<string>>();

      links?.forEach(link => {
        if (link.target_document_id) {
          // Forward links
          if (!adjacency.has(link.source_document_id)) {
            adjacency.set(link.source_document_id, new Set());
          }
          adjacency.get(link.source_document_id)!.add(link.target_document_id);

          // Reverse links
          if (!reverseAdjacency.has(link.target_document_id)) {
            reverseAdjacency.set(link.target_document_id, new Set());
          }
          reverseAdjacency.get(link.target_document_id)!.add(link.source_document_id);
        }
      });

      // Calculate betweenness centrality (simplified)
      const betweenness = this.calculateBetweennessCentrality(docIds, adjacency);

      // Calculate clustering coefficient
      const clustering = this.calculateClusteringCoefficients(docIds, adjacency);

      // Update metrics for each document
      for (const docId of docIds) {
        const { error } = await supabase
          .from('citation_metrics')
          .update({
            betweenness_centrality: betweenness.get(docId) || 0,
            clustering_coefficient: clustering.get(docId) || 0
          })
          .eq('document_id', docId);

        if (error) throw error;
      }
    } catch (error) {
      logger.error('Error calculating network metrics:', error);
    }
  }

  /**
   * Find documents with similar citation patterns
   */
  static async findSimilarDocuments(documentId: string, userId: string): Promise<any[]> {
    try {
      // Get target document's citation links
      const { data: targetLinks, error: targetError } = await supabase
        .from('citation_links')
        .select('*')
        .or(`source_document_id.eq.${documentId},target_document_id.eq.${documentId}`);

      if (targetError) throw targetError;

      // Get all user documents except target
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('id, title, metadata')
        .eq('user_id', userId)
        .neq('id', documentId);

      if (docError) throw docError;

      // Calculate similarities
      const similarities = [];

      for (const doc of documents || []) {
        // Get citation links for this document
        const { data: docLinks, error: linkError } = await supabase
          .from('citation_links')
          .select('*')
          .or(`source_document_id.eq.${doc.id},target_document_id.eq.${doc.id}`);

        if (linkError) continue;

        const similarity = this.calculateLinkSimilarity(targetLinks || [], docLinks || []);
        
        if (similarity > 0.1) {
          similarities.push({
            document: doc,
            similarity,
            sharedCitations: this.findSharedLinks(targetLinks || [], docLinks || [])
          });
        }
      }

      return similarities.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      logger.error('Error finding similar documents:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  private static getNodeColor(centrality: number): string {
    // Color based on centrality score
    const hue = 220 - (centrality * 60); // Blue to red
    return `hsl(${hue}, 70%, 50%)`;
  }

  private static calculateBetweennessCentrality(
    nodes: string[],
    adjacency: Map<string, Set<string>>
  ): Map<string, number> {
    const centrality = new Map<string, number>();
    
    // Initialize all nodes with 0
    nodes.forEach(node => centrality.set(node, 0));

    // Simplified betweenness centrality
    // For each pair of nodes, find shortest paths and count how many go through each node
    for (const source of nodes) {
      for (const target of nodes) {
        if (source === target) continue;
        
        const path = this.findShortestPath(source, target, adjacency);
        if (path.length > 2) {
          // Increment centrality for intermediate nodes
          for (let i = 1; i < path.length - 1; i++) {
            const current = centrality.get(path[i]) || 0;
            centrality.set(path[i], current + 1);
          }
        }
      }
    }

    // Normalize
    const maxCentrality = Math.max(...centrality.values(), 1);
    centrality.forEach((value, key) => {
      centrality.set(key, value / maxCentrality);
    });

    return centrality;
  }

  private static calculateClusteringCoefficients(
    nodes: string[],
    adjacency: Map<string, Set<string>>
  ): Map<string, number> {
    const coefficients = new Map<string, number>();

    for (const node of nodes) {
      const neighbors = adjacency.get(node) || new Set();
      const k = neighbors.size;

      if (k < 2) {
        coefficients.set(node, 0);
        continue;
      }

      // Count edges between neighbors
      let edgeCount = 0;
      const neighborsArray = Array.from(neighbors);
      
      for (let i = 0; i < neighborsArray.length; i++) {
        for (let j = i + 1; j < neighborsArray.length; j++) {
          const neighbor1Edges = adjacency.get(neighborsArray[i]) || new Set();
          if (neighbor1Edges.has(neighborsArray[j])) {
            edgeCount++;
          }
        }
      }

      // Clustering coefficient = 2 * edges / (k * (k - 1))
      const coefficient = (2 * edgeCount) / (k * (k - 1));
      coefficients.set(node, coefficient);
    }

    return coefficients;
  }

  private static findShortestPath(
    source: string,
    target: string,
    adjacency: Map<string, Set<string>>
  ): string[] {
    // BFS to find shortest path
    const queue: Array<{ node: string; path: string[] }> = [{ node: source, path: [source] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      
      if (node === target) {
        return path;
      }

      if (visited.has(node)) continue;
      visited.add(node);

      const neighbors = adjacency.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return []; // No path found
  }

  private static calculateLinkSimilarity(links1: any[], links2: any[]): number {
    if (links1.length === 0 || links2.length === 0) return 0;

    // Create sets of cited documents
    const cited1 = new Set<string>();
    const cited2 = new Set<string>();

    links1.forEach(link => {
      if (link.target_document_id) cited1.add(link.target_document_id);
    });

    links2.forEach(link => {
      if (link.target_document_id) cited2.add(link.target_document_id);
    });

    // Jaccard similarity
    const intersection = new Set([...cited1].filter(x => cited2.has(x)));
    const union = new Set([...cited1, ...cited2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private static findSharedLinks(links1: any[], links2: any[]): number {
    const cited1 = new Set(links1.map(l => l.target_document_id).filter(Boolean));
    const cited2 = new Set(links2.map(l => l.target_document_id).filter(Boolean));
    
    return [...cited1].filter(x => cited2.has(x)).length;
  }

  private static applyForceLayout(nodes: NetworkNode[], edges: NetworkEdge[]) {
    // Simple force-directed layout (would use D3.js force simulation in production)
    const width = 800;
    const height = 600;
    const center = { x: width / 2, y: height / 2 };

    // Initialize random positions
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const radius = 200 + Math.random() * 100;
      node.x = center.x + radius * Math.cos(angle);
      node.y = center.y + radius * Math.sin(angle);
    });

    // Simple spring layout iterations
    for (let iteration = 0; iteration < 50; iteration++) {
      // Apply forces
      nodes.forEach((node, i) => {
        let fx = 0;
        let fy = 0;

        // Repulsion between all nodes
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = node.x! - other.x!;
            const dy = node.y! - other.y!;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
              const force = 1000 / (distance * distance);
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        });

        // Attraction along edges
        edges.forEach(edge => {
          let other: NetworkNode | undefined;
          if (edge.source === node.id) {
            other = nodes.find(n => n.id === edge.target);
          } else if (edge.target === node.id) {
            other = nodes.find(n => n.id === edge.source);
          }

          if (other) {
            const dx = other.x! - node.x!;
            const dy = other.y! - node.y!;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
              const force = distance * 0.1 * edge.weight;
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        });

        // Apply forces with damping
        node.x! += fx * 0.01;
        node.y! += fy * 0.01;

        // Keep within bounds
        node.x = Math.max(50, Math.min(width - 50, node.x!));
        node.y = Math.max(50, Math.min(height - 50, node.y!));
      });
    }
  }

  /**
   * Find citation paths between documents
   */
  static async findCitationPaths(sourceId: string, targetId: string, userId: string) {
    try {
      // Get all user documents and links
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', userId);

      if (docsError) throw docsError;

      const docIds = documents?.map(d => d.id) || [];

      const { data: links, error: linksError } = await supabase
        .from('citation_links')
        .select('*')
        .or(`source_document_id.in.(${docIds.join(',')}),target_document_id.in.(${docIds.join(',')})`);

      if (linksError) throw linksError;

      // Build adjacency list
      const adjacency = new Map<string, Set<string>>();
      links?.forEach(link => {
        if (link.target_document_id) {
          if (!adjacency.has(link.source_document_id)) {
            adjacency.set(link.source_document_id, new Set());
          }
          adjacency.get(link.source_document_id)!.add(link.target_document_id);
        }
      });

      // Find all paths up to length 3
      const paths = this.findAllPaths(sourceId, targetId, adjacency, 3);
      
      return paths;
    } catch (error) {
      logger.error('Error finding citation paths:', error);
      return [];
    }
  }

  private static findAllPaths(
    source: string,
    target: string,
    adjacency: Map<string, Set<string>>,
    maxLength: number
  ): string[][] {
    const paths: string[][] = [];
    const queue: { path: string[]; visited: Set<string> }[] = [
      { path: [source], visited: new Set([source]) }
    ];

    while (queue.length > 0) {
      const { path, visited } = queue.shift()!;
      const current = path[path.length - 1];

      if (current === target) {
        paths.push(path);
        continue;
      }

      if (path.length >= maxLength) continue;

      const neighbors = adjacency.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({
            path: [...path, neighbor],
            visited: new Set([...visited, neighbor])
          });
        }
      }
    }

    return paths;
  }

  /**
   * Get citation statistics for a user
   */
  static async getCitationStats(userId: string) {
    try {
      const { data: metrics, error } = await supabase
        .from('citation_metrics')
        .select('*')
        .in('document_id', 
          supabase.from('documents')
            .select('id')
            .eq('user_id', userId)
        );

      if (error) throw error;

      const stats = {
        totalDocuments: metrics?.length || 0,
        totalCitations: metrics?.reduce((sum, m) => sum + m.out_degree, 0) || 0,
        totalCited: metrics?.reduce((sum, m) => sum + m.in_degree, 0) || 0,
        avgCitationsPerDoc: 0,
        avgCitedPerDoc: 0,
        mostCitedDocument: null as any,
        mostCitingDocument: null as any
      };

      if (metrics && metrics.length > 0) {
        stats.avgCitationsPerDoc = stats.totalCitations / metrics.length;
        stats.avgCitedPerDoc = stats.totalCited / metrics.length;
        
        // Find most cited/citing documents
        const sortedByCited = [...metrics].sort((a, b) => b.in_degree - a.in_degree);
        const sortedByCiting = [...metrics].sort((a, b) => b.out_degree - a.out_degree);
        
        if (sortedByCited[0]?.in_degree > 0) {
          stats.mostCitedDocument = sortedByCited[0];
        }
        
        if (sortedByCiting[0]?.out_degree > 0) {
          stats.mostCitingDocument = sortedByCiting[0];
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting citation stats:', error);
      throw error;
    }
  }
}