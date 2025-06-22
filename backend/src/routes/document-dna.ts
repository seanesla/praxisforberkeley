import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { aiLimiter, standardLimiter } from '../middleware/rateLimiter';
import { DocumentDNAService } from '../services/documentDNA';
import logger from '../utils/logger';
import {
  generateFingerprintSchema,
  compareFingerprintSchema,
  findSimilarSchema,
  z
} from '../validation/schemas';

const router = Router();

/**
 * Generate DNA fingerprint for a document
 */
router.post(
  '/fingerprint',
  aiLimiter,
  authenticateToken,
  validateBody(generateFingerprintSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { document_id } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const fingerprint = await DocumentDNAService.generateFingerprint(
      document_id,
      req.user.id
    );

    return res.json({ fingerprint });
  } catch (error) {
    logger.error('Error generating document fingerprint:', error);
    return res.status(500).json({ error: 'Failed to generate fingerprint' });
  }
});

/**
 * Get fingerprint for a document
 */
router.get('/fingerprint/:documentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fingerprint = await DocumentDNAService.getFingerprint(
      documentId,
      req.user.id
    );

    if (!fingerprint) {
      return res.status(404).json({ error: 'Fingerprint not found' });
    }

    return res.json({ fingerprint });
  } catch (error) {
    logger.error('Error getting document fingerprint:', error);
    return res.status(500).json({ error: 'Failed to get fingerprint' });
  }
});

/**
 * Compare two documents
 */
router.post(
  '/compare',
  standardLimiter,
  authenticateToken,
  validateBody(compareFingerprintSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { document_id_1, document_id_2 } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const comparison = await DocumentDNAService.compareDocuments(
      document_id_1,
      document_id_2,
      req.user.id
    );

    return res.json({ comparison });
  } catch (error) {
    logger.error('Error comparing documents:', error);
    return res.status(500).json({ error: 'Failed to compare documents' });
  }
});

/**
 * Get similarity matrix for user documents
 */
router.get(
  '/similarity-matrix',
  standardLimiter,
  authenticateToken,
  validateQuery(z.object({ threshold: z.coerce.number().min(0).max(1).default(0.5) })),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { threshold = 0.5 } = req.query;

    const matrix = await DocumentDNAService.getSimilarityMatrix(
      req.user.id,
      Number(threshold)
    );

    return res.json({ matrix });
  } catch (error) {
    logger.error('Error getting similarity matrix:', error);
    return res.status(500).json({ error: 'Failed to get similarity matrix' });
  }
});

/**
 * Find similar documents
 */
router.post(
  '/find-similar',
  standardLimiter,
  authenticateToken,
  validateBody(findSimilarSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { document_id, limit = 10, min_similarity = 0.7 } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const similarDocuments = await DocumentDNAService.findSimilarDocuments(
      document_id,
      req.user.id,
      {
        limit: Number(limit),
        minSimilarity: Number(min_similarity)
      }
    );

    return res.json({ similarDocuments });
  } catch (error) {
    logger.error('Error finding similar documents:', error);
    return res.status(500).json({ error: 'Failed to find similar documents' });
  }
});

/**
 * Batch generate fingerprints
 */
router.post(
  '/batch-fingerprint',
  aiLimiter,
  authenticateToken,
  validateBody(z.object({ document_ids: z.array(z.string().uuid()).min(1).max(50) })),
  async (req: AuthRequest, res: Response) => {
    try {
      const { document_ids } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const fingerprints = await DocumentDNAService.batchGenerateFingerprints(
      document_ids,
      req.user.id
    );

    return res.json({ fingerprints });
  } catch (error) {
    logger.error('Error batch generating fingerprints:', error);
    return res.status(500).json({ error: 'Failed to batch generate fingerprints' });
  }
});

/**
 * Get plagiarism check
 */
router.post('/plagiarism-check', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { document_id, threshold = 0.8 } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!document_id) {
      return res.status(400).json({ error: 'Document ID required' });
    }

    const results = await DocumentDNAService.checkPlagiarism(
      document_id,
      req.user.id,
      Number(threshold)
    );

    return res.json({ results });
  } catch (error) {
    logger.error('Error checking plagiarism:', error);
    return res.status(500).json({ error: 'Failed to check plagiarism' });
  }
});

/**
 * Get document evolution timeline
 */
router.get('/evolution/:documentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const evolution = await DocumentDNAService.getDocumentEvolution(
      documentId,
      req.user.id
    );

    return res.json({ evolution });
  } catch (error) {
    logger.error('Error getting document evolution:', error);
    return res.status(500).json({ error: 'Failed to get document evolution' });
  }
});

/**
 * Get document clusters
 */
router.get('/clusters', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method = 'kmeans', k = 5 } = req.query;

    const clusters = await DocumentDNAService.clusterDocuments(
      req.user.id,
      {
        method: method as string,
        k: Number(k)
      }
    );

    return res.json({ clusters });
  } catch (error) {
    logger.error('Error clustering documents:', error);
    return res.status(500).json({ error: 'Failed to cluster documents' });
  }
});

export default router;