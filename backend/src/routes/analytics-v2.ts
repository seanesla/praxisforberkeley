import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Analytics2Service } from '../services/analytics2';
import logger from '../utils/logger';

const router = Router();

/**
 * Track analytics event
 */
router.post('/track', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const event = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!event.event_type || !event.event_category) {
      return res.status(400).json({ 
        error: 'Event type and category required' 
      });
    }

    await Analytics2Service.trackEvent(req.user.id, event);

    return res.json({ message: 'Event tracked successfully' });
  } catch (error) {
    logger.error('Error tracking analytics event:', error);
    return res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * Track page view
 */
router.post('/pageview', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page_path, session_id, referrer } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!page_path || !session_id) {
      return res.status(400).json({ 
        error: 'Page path and session ID required' 
      });
    }

    await Analytics2Service.trackPageView(
      req.user.id,
      page_path,
      session_id,
      referrer
    );

    return res.json({ message: 'Page view tracked successfully' });
  } catch (error) {
    logger.error('Error tracking page view:', error);
    return res.status(500).json({ error: 'Failed to track page view' });
  }
});

/**
 * Track feature usage
 */
router.post('/feature', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { feature, action, metadata } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!feature || !action) {
      return res.status(400).json({ 
        error: 'Feature and action required' 
      });
    }

    await Analytics2Service.trackFeatureUsage(
      req.user.id,
      feature,
      action,
      metadata
    );

    return res.json({ message: 'Feature usage tracked successfully' });
  } catch (error) {
    logger.error('Error tracking feature usage:', error);
    return res.status(500).json({ error: 'Failed to track feature usage' });
  }
});

/**
 * Track performance metric
 */
router.post('/performance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { metric, duration, metadata } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!metric || duration === undefined) {
      return res.status(400).json({ 
        error: 'Metric and duration required' 
      });
    }

    await Analytics2Service.trackPerformance(
      req.user.id,
      metric,
      duration,
      metadata
    );

    return res.json({ message: 'Performance metric tracked successfully' });
  } catch (error) {
    logger.error('Error tracking performance:', error);
    return res.status(500).json({ error: 'Failed to track performance' });
  }
});

/**
 * Get user analytics summary
 */
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { start_date, end_date } = req.query;
    
    let timeRange;
    if (start_date && end_date) {
      timeRange = {
        start: new Date(start_date as string),
        end: new Date(end_date as string)
      };
    }

    const analytics = await Analytics2Service.getUserAnalytics(
      req.user.id,
      timeRange
    );

    return res.json({ analytics });
  } catch (error) {
    logger.error('Error getting user analytics:', error);
    return res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * Get feature usage metrics
 */
router.get('/features/:feature', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { feature } = req.params;
    const { start_date, end_date } = req.query;
    
    let timeRange;
    if (start_date && end_date) {
      timeRange = {
        start: new Date(start_date as string),
        end: new Date(end_date as string)
      };
    }

    const metrics = await Analytics2Service.getFeatureUsageMetrics(
      feature,
      timeRange
    );

    return res.json({ metrics });
  } catch (error) {
    logger.error('Error getting feature metrics:', error);
    return res.status(500).json({ error: 'Failed to get feature metrics' });
  }
});

/**
 * Generate analytics report
 */
router.post('/report', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { report_type = 'daily' } = req.body;

    if (!['daily', 'weekly', 'monthly'].includes(report_type)) {
      return res.status(400).json({ 
        error: 'Invalid report type. Must be daily, weekly, or monthly' 
      });
    }

    const report = await Analytics2Service.generateAnalyticsReport(
      req.user.id,
      report_type as 'daily' | 'weekly' | 'monthly'
    );

    return res.json({ report });
  } catch (error) {
    logger.error('Error generating analytics report:', error);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * Get real-time metrics
 */
router.get('/realtime', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const metrics = await Analytics2Service.getRealtimeMetrics(req.user.id);

    return res.json({ metrics });
  } catch (error) {
    logger.error('Error getting realtime metrics:', error);
    return res.status(500).json({ error: 'Failed to get realtime metrics' });
  }
});

/**
 * Export analytics data
 */
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { format = 'json', start_date, end_date } = req.query;
    
    let timeRange;
    if (start_date && end_date) {
      timeRange = {
        start: new Date(start_date as string),
        end: new Date(end_date as string)
      };
    }

    const analytics = await Analytics2Service.getUserAnalytics(
      req.user.id,
      timeRange
    );

    if (format === 'csv') {
      // Convert to CSV format
      const csv = [
        'Metric,Value',
        `Total Sessions,${analytics.totalSessions}`,
        `Total Time Spent (seconds),${analytics.totalTimeSpent}`,
        `Documents Created,${analytics.documentsCreated}`,
        `Documents Viewed,${analytics.documentsViewed}`,
        `Notes Created,${analytics.notesCreated}`,
        `Flashcards Studied,${analytics.flashcardsStudied}`,
        `Exercises Completed,${analytics.exercisesCompleted}`,
        `Study Streak Days,${analytics.studyStreakDays}`,
        `Knowledge Growth Score,${analytics.knowledgeGrowthScore}`,
        `Workflows Executed,${analytics.workflowsExecuted}`,
        `Reports Generated,${analytics.reportsGenerated}`
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
      return res.send(csv);
    }

    return res.json({ analytics });
  } catch (error) {
    logger.error('Error exporting analytics:', error);
    return res.status(500).json({ error: 'Failed to export analytics' });
  }
});

/**
 * Get analytics dashboard data
 */
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get multiple data points for dashboard
    const [
      realtimeMetrics,
      userAnalytics,
      weeklyReport
    ] = await Promise.all([
      Analytics2Service.getRealtimeMetrics(req.user.id),
      Analytics2Service.getUserAnalytics(req.user.id),
      Analytics2Service.generateAnalyticsReport(req.user.id, 'weekly')
    ]);

    return res.json({
      realtime: realtimeMetrics,
      summary: userAnalytics,
      weekly: weeklyReport
    });
  } catch (error) {
    logger.error('Error getting dashboard data:', error);
    return res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

export default router;