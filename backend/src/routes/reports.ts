import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ReportGeneratorService } from '../services/reportGenerator';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';
import * as path from 'path';
import * as fs from 'fs/promises';

const router = Router();

/**
 * Generate report
 */
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      config,
      document_ids,
      note_ids
    } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!config || !config.title) {
      return res.status(400).json({ error: 'Report configuration with title required' });
    }

    const report = await ReportGeneratorService.generateReport(
      req.user.id,
      config,
      document_ids,
      note_ids
    );

    return res.json(report);
  } catch (error) {
    logger.error('Error generating report:', error);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * Get report templates
 */
router.get('/templates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    
    let query = supabase
      .from('report_templates')
      .select('*')
      .eq('active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: templates, error } = await query
      .order('name', { ascending: true });

    if (error) throw error;

    return res.json({ templates });
  } catch (error) {
    logger.error('Error getting report templates:', error);
    return res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * Get generated reports
 */
router.get('/generated', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, format, limit = 20 } = req.query;

    let query = supabase
      .from('generated_reports')
      .select(`
        *,
        template:report_templates(name, category)
      `)
      .eq('user_id', req.user.id);

    if (status) {
      query = query.eq('status', status);
    }

    if (format) {
      query = query.eq('format', format);
    }

    const { data: reports, error } = await query
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    return res.json({ reports });
  } catch (error) {
    logger.error('Error getting generated reports:', error);
    return res.status(500).json({ error: 'Failed to get reports' });
  }
});

/**
 * Get report details
 */
router.get('/:reportId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: report, error } = await supabase
      .from('generated_reports')
      .select(`
        *,
        template:report_templates(*),
        documents:documents!source_documents(id, title),
        notes:notes!source_notes(id, title)
      `)
      .eq('id', reportId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    return res.json({ report });
  } catch (error) {
    logger.error('Error getting report details:', error);
    return res.status(500).json({ error: 'Failed to get report' });
  }
});

/**
 * Download report file
 */
router.get('/:reportId/download', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get report details
    const { data: report, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!report.file_url || report.status !== 'completed') {
      return res.status(400).json({ error: 'Report file not available' });
    }

    // Sanitize and validate file path to prevent directory traversal
    const normalizedPath = path.normalize(report.file_url).replace(/^(\.\.([\/\\]|$))+/, '');
    
    // Ensure file is within the reports directory
    const reportsDir = path.join(process.cwd(), 'reports');
    const filePath = path.join(reportsDir, normalizedPath);
    
    // Verify the resolved path is within the reports directory
    if (!filePath.startsWith(reportsDir)) {
      logger.error(`Attempted directory traversal: ${report.file_url}`);
      return res.status(403).json({ error: 'Invalid file path' });
    }
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Report file not found' });
    }

    // Set appropriate headers
    const contentType = {
      pdf: 'application/pdf',
      html: 'text/html',
      markdown: 'text/markdown',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }[report.format] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="report_${reportId}.${report.format}"`);

    // Stream file
    const fileStream = await fs.readFile(filePath);
    return res.send(fileStream);
  } catch (error) {
    logger.error('Error downloading report:', error);
    return res.status(500).json({ error: 'Failed to download report' });
  }
});

/**
 * Delete report
 */
router.delete('/:reportId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get report to delete file
    const { data: report, error: fetchError } = await supabase
      .from('generated_reports')
      .select('file_url')
      .eq('id', reportId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Delete file if exists
    if (report.file_url) {
      // Sanitize path to prevent directory traversal
      const normalizedPath = path.normalize(report.file_url).replace(/^(\.\.([\/\\]|$))+/, '');
      const reportsDir = path.join(process.cwd(), 'reports');
      const filePath = path.join(reportsDir, normalizedPath);
      
      // Verify the resolved path is within the reports directory
      if (filePath.startsWith(reportsDir)) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          logger.warn('Failed to delete report file:', error);
        }
      }
    }

    // Delete database record
    const { error } = await supabase
      .from('generated_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    return res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    logger.error('Error deleting report:', error);
    return res.status(500).json({ error: 'Failed to delete report' });
  }
});

/**
 * Create custom report template
 */
router.post('/templates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const template = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!template.name || !template.sections || !template.category) {
      return res.status(400).json({ 
        error: 'Template name, category, and sections required' 
      });
    }

    // Note: In production, this would require admin privileges
    const { data: newTemplate, error } = await supabase
      .from('report_templates')
      .insert({
        ...template,
        active: true
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ template: newTemplate });
  } catch (error) {
    logger.error('Error creating report template:', error);
    return res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Get report generation status
 */
router.get('/:reportId/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: report, error } = await supabase
      .from('generated_reports')
      .select('status, generation_time_ms, error_message')
      .eq('id', reportId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    return res.json({ 
      status: report.status,
      generationTime: report.generation_time_ms,
      error: report.error_message
    });
  } catch (error) {
    logger.error('Error getting report status:', error);
    return res.status(500).json({ error: 'Failed to get report status' });
  }
});

export default router;