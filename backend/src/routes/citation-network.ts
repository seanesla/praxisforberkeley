import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { standardLimiter, aiLimiter } from '../middleware/rateLimiter';
import { CitationNetworkService } from '../services/citationNetwork';
import logger from '../utils/logger';
import { buildCitationNetworkSchema, findCitationPathsSchema } from '../validation/schemas';
import { convertToGraphML, convertToGEXF, convertToCSV, identifyClusters } from '../utils/networkExport';

const router = Router();

/**
 * Build citation network for a document
 */
router.post(
  '/build',
  aiLimiter,
  authenticateToken,
  validateBody(buildCitationNetworkSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { document_id } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const network = await CitationNetworkService.buildCitationNetwork(
      document_id,
      req.user.id
    );

    return res.json({ network });
  } catch (error) {
    logger.error('Error building citation network:', error);
    return res.status(500).json({ error: 'Failed to build citation network' });
  }
});

/**
 * Get citation network for a document
 */
router.get('/document/:documentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const network = await CitationNetworkService.getCitationNetwork(
      documentId,
      req.user.id
    );

    return res.json({ network });
  } catch (error) {
    logger.error('Error getting citation network:', error);
    return res.status(500).json({ error: 'Failed to get citation network' });
  }
});

/**
 * Get full network for user
 */
router.get('/user', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const network = await CitationNetworkService.getNetworkForUser(req.user.id);

    return res.json({ network });
  } catch (error) {
    logger.error('Error getting user network:', error);
    return res.status(500).json({ error: 'Failed to get user network' });
  }
});

/**
 * Calculate network metrics
 */
router.get('/metrics/:documentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const metrics = await CitationNetworkService.calculateNetworkMetrics(
      documentId,
      req.user.id
    );

    return res.json({ metrics });
  } catch (error) {
    logger.error('Error calculating network metrics:', error);
    return res.status(500).json({ error: 'Failed to calculate network metrics' });
  }
});

/**
 * Find citation paths between documents
 */
router.post(
  '/paths',
  standardLimiter,
  authenticateToken,
  validateBody(findCitationPathsSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { source_id, target_id, max_depth = 3 } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const paths = await CitationNetworkService.findCitationPaths(
      source_id,
      target_id,
      req.user.id,
      max_depth
    );

    return res.json({ paths });
  } catch (error) {
    logger.error('Error finding citation paths:', error);
    return res.status(500).json({ error: 'Failed to find citation paths' });
  }
});

/**
 * Get network statistics
 */
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const network = await CitationNetworkService.getNetworkForUser(req.user.id);
    
    // Calculate statistics
    const stats = {
      totalDocuments: network.nodes.length,
      totalCitations: network.edges.length,
      avgCitationsPerDoc: network.nodes.length > 0 
        ? (network.edges.length / network.nodes.length).toFixed(2) 
        : 0,
      mostCitedDocuments: network.nodes
        .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
        .slice(0, 5)
        .map(n => ({
          id: n.id,
          title: n.label,
          citations: n.citationCount || 0
        })),
      centralDocuments: network.nodes
        .filter(n => n.centralityScore)
        .sort((a, b) => (b.centralityScore || 0) - (a.centralityScore || 0))
        .slice(0, 5)
        .map(n => ({
          id: n.id,
          title: n.label,
          centrality: n.centralityScore || 0
        })),
      clusters: identifyClusters(network)
    };

    return res.json({ stats });
  } catch (error) {
    logger.error('Error getting network statistics:', error);
    return res.status(500).json({ error: 'Failed to get network statistics' });
  }
});

/**
 * Get citation timeline
 */
router.get('/timeline', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const network = await CitationNetworkService.getNetworkForUser(req.user.id);
    
    // Group citations by time period
    const timeline = network.edges.reduce((acc, edge) => {
      const date = new Date(edge.metadata?.created_at || new Date());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          period: monthKey,
          citations: 0,
          documents: new Set()
        };
      }
      
      acc[monthKey].citations++;
      acc[monthKey].documents.add(edge.source);
      acc[monthKey].documents.add(edge.target);
      
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort
    const timelineData = Object.values(timeline)
      .map(period => ({
        period: period.period,
        citations: period.citations,
        uniqueDocuments: period.documents.size
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return res.json({ timeline: timelineData });
  } catch (error) {
    logger.error('Error getting citation timeline:', error);
    return res.status(500).json({ error: 'Failed to get citation timeline' });
  }
});

/**
 * Export citation network
 */
router.post('/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { format = 'json' } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const network = await CitationNetworkService.getNetworkForUser(req.user.id);
    
    let exportData: any;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'graphml':
        exportData = convertToGraphML(network);
        contentType = 'application/xml';
        filename = 'citation_network.graphml';
        break;
      case 'gexf':
        exportData = convertToGEXF(network);
        contentType = 'application/xml';
        filename = 'citation_network.gexf';
        break;
      case 'csv':
        exportData = convertToCSV(network);
        contentType = 'text/csv';
        filename = 'citation_network.csv';
        break;
      default:
        exportData = JSON.stringify(network, null, 2);
        contentType = 'application/json';
        filename = 'citation_network.json';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(exportData);
  } catch (error) {
    logger.error('Error exporting citation network:', error);
    return res.status(500).json({ error: 'Failed to export citation network' });
  }
});

// Helper functions have been moved to utils/networkExport.ts

export default router;