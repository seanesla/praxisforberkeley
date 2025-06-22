import express from 'express';
import multer from 'multer';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { VectorStoreService } from '../services/vectorStore';
import logger from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
// @ts-ignore
import pdfParse from 'pdf-parse';

const router = express.Router();
const vectorStore = new VectorStoreService();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'application/json'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all documents for a user
router.get('/', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', authReq.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching documents:', error);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }

    res.json({ documents });
  } catch (error) {
    logger.error('Documents fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single document
router.get('/:id', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  
  try {
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', authReq.user!.id)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    logger.error('Document fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload a new document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  const authReq = req as AuthRequest;
  const file = req.file;
  
  console.log('Upload request received');
  console.log('File:', file);
  console.log('User:', authReq.user);
  
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    // Extract text content based on file type
    let content = '';
    const filePath = path.join(process.cwd(), file.path);
    
    switch (file.mimetype) {
      case 'text/plain':
      case 'text/markdown':
      case 'application/json':
        content = await fs.readFile(filePath, 'utf-8');
        break;
      case 'application/pdf':
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        content = pdfData.text;
        break;
      // Add more file type handlers as needed
    }
    
    // Create document in database
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        user_id: authReq.user!.id,
        title: req.body.title || file.originalname,
        content,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        metadata: {
          upload_date: new Date().toISOString(),
        }
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Generate embeddings asynchronously
    // TODO: Re-enable when VectorStore is properly configured
    // vectorStore.addDocument(document.id, content, {
    //   title: document.title,
    //   user_id: authReq.user!.id
    // }).then(() => {
    //   // Update document to mark embeddings as generated
    //   supabase
    //     .from('documents')
    //     .update({ embeddings_generated: true })
    //     .eq('id', document.id)
    //     .then(() => {
    //       logger.info(`Embeddings generated for document ${document.id}`);
    //     });
    // }).catch(err => {
    //   logger.error('Error generating embeddings:', err);
    // });

    // Add to activity feed
    await supabase
      .from('activity_feed')
      .insert({
        user_id: authReq.user!.id,
        activity_type: 'document_upload',
        entity_type: 'document',
        entity_id: document.id,
        metadata: { title: document.title }
      });

    // Clean up uploaded file
    await fs.unlink(filePath);

    res.json({ 
      message: 'Document uploaded successfully',
      document 
    });
  } catch (error) {
    logger.error('Document upload error:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Clean up uploaded file on error
    if (file?.path) {
      try {
        await fs.unlink(path.join(process.cwd(), file.path));
      } catch (unlinkError) {
        logger.error('Failed to clean up file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to upload document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update document
router.put('/:id', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const { title, content } = req.body;
  
  try {
    const { data: document, error } = await supabase
      .from('documents')
      .update({ title, content, updated_at: new Date() })
      .eq('id', id)
      .eq('user_id', authReq.user!.id)
      .select()
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update embeddings if content changed
    // TODO: Re-enable when VectorStore is properly configured
    // if (content) {
    //   vectorStore.updateDocument(id, content, {
    //     title: document.title,
    //     user_id: authReq.user!.id
    //   });
    // }

    res.json({ document });
  } catch (error) {
    logger.error('Document update error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', authReq.user!.id);

    if (error) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Remove from vector store
    // TODO: Re-enable when VectorStore is properly configured
    // await vectorStore.deleteDocument(id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Document delete error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Search documents
router.post('/search', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { query, limit = 10 } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    // Semantic search using vector store
    // TODO: Re-enable when VectorStore is properly configured
    // const results = await vectorStore.search(query, limit, {
    //   user_id: authReq.user!.id
    // });
    const results: any[] = [];

    // Log search query
    await supabase
      .from('search_queries')
      .insert({
        user_id: authReq.user!.id,
        query,
        results: results
      });

    res.json({ results });
  } catch (error) {
    logger.error('Document search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;