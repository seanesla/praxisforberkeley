import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const dateSchema = z.string().datetime();

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Document DNA schemas
export const generateFingerprintSchema = z.object({
  document_id: uuidSchema,
});

export const compareFingerprintSchema = z.object({
  document_id_1: uuidSchema,
  document_id_2: uuidSchema,
});

export const findSimilarSchema = z.object({
  document_id: uuidSchema,
  limit: z.coerce.number().min(1).max(50).default(10),
  min_similarity: z.coerce.number().min(0).max(1).default(0.7),
});

// Cross-document schemas
export const analyzeDocumentsSchema = z.object({
  document_ids: z.array(uuidSchema).min(2).max(100),
  analysis_types: z.array(z.string()).optional(),
});

export const extractThemesSchema = z.object({
  document_ids: z.array(uuidSchema).optional(),
  max_themes: z.coerce.number().min(1).max(50).default(10),
});

// Workspace schemas
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  settings: z.record(z.any()).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.any()).optional(),
});

export const addDocumentsToWorkspaceSchema = z.object({
  document_ids: z.array(uuidSchema).min(1).max(100),
});

export const shareWorkspaceSchema = z.object({
  user_email: emailSchema,
  permission: z.enum(['view', 'edit', 'admin']).default('view'),
});

// Spaced repetition schemas
export const initializeStudyCardSchema = z.object({
  flashcard_id: uuidSchema,
});

export const recordReviewSchema = z.object({
  study_card_id: uuidSchema,
  quality: z.number().min(0).max(5),
  response_time: z.number().positive(),
  session_id: uuidSchema.optional(),
});

// Exercise schemas
export const generateExercisesSchema = z.object({
  document_id: uuidSchema,
  count: z.coerce.number().min(1).max(50).default(10),
  exercise_types: z.array(z.string()).optional(),
});

export const createExerciseSetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  document_id: uuidSchema.optional(),
  exercises: z.array(z.any()).optional(),
});

export const submitAttemptSchema = z.object({
  exercise_id: uuidSchema,
  user_answer: z.any(),
  session_id: uuidSchema.optional(),
  time_taken: z.number().positive().optional(),
});

// Knowledge gap schemas
export const updateMasterySchema = z.object({
  concept: z.string().min(1).max(200),
  mastery_level: z.number().min(0).max(1),
  source: z.string().optional(),
});

export const generateLearningPathSchema = z.object({
  gap_ids: z.array(uuidSchema).min(1).max(50),
  preferences: z.record(z.any()).optional(),
});

// Citation network schemas
export const buildCitationNetworkSchema = z.object({
  document_id: uuidSchema,
});

export const findCitationPathsSchema = z.object({
  source_id: uuidSchema,
  target_id: uuidSchema,
  max_depth: z.coerce.number().min(1).max(10).default(3),
});

// Search schemas
export const searchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  scope: z.array(z.enum(['documents', 'notes', 'flashcards'])).default(['documents', 'notes']),
  filters: z.object({
    dateRange: z.object({
      start: dateSchema,
      end: dateSchema,
    }).optional(),
    documentTypes: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    authors: z.array(z.string()).optional(),
  }).optional(),
  options: z.object({
    expandQuery: z.boolean().default(true),
    includeContext: z.boolean().default(false),
    minRelevance: z.number().min(0).max(1).default(0.5),
    maxResults: z.coerce.number().min(1).max(100).default(20),
  }).optional(),
});

export const saveSearchSchema = z.object({
  query: z.string().min(1).max(500),
  name: z.string().min(1).max(100),
  filters: z.record(z.any()).optional(),
});

// Report schemas
export const generateReportSchema = z.object({
  config: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    template_id: uuidSchema.optional(),
    format: z.enum(['pdf', 'html', 'markdown', 'docx']).default('pdf'),
    sections: z.array(z.string()).optional(),
  }),
  document_ids: z.array(uuidSchema).optional(),
  note_ids: z.array(uuidSchema).optional(),
});

// Workflow schemas
export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  trigger_type: z.enum(['manual', 'schedule', 'event']),
  trigger_config: z.record(z.any()).optional(),
  flow_data: z.record(z.any()),
  enabled: z.boolean().default(true),
});

export const executeWorkflowSchema = z.object({
  input_data: z.record(z.any()).optional(),
});

// Analytics schemas
export const trackEventSchema = z.object({
  event_type: z.string().min(1).max(50),
  event_category: z.string().min(1).max(50),
  event_label: z.string().max(100).optional(),
  event_value: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export const trackPageViewSchema = z.object({
  page_path: z.string().min(1).max(255),
  session_id: z.string().min(1).max(100),
  referrer: z.string().max(255).optional(),
});

export const trackFeatureSchema = z.object({
  feature: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  metadata: z.record(z.any()).optional(),
});

export const trackPerformanceSchema = z.object({
  metric: z.string().min(1).max(50),
  duration: z.number().min(0),
  metadata: z.record(z.any()).optional(),
});

// Time range schema
export const timeRangeSchema = z.object({
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
});

// ==================== Spaced Repetition Schemas ====================
export const spacedRepetitionSchemas = {
  getDueCards: z.object({
    query: z.object({
      set_id: z.string().uuid().optional()
    })
  }),
  
  initializeCard: z.object({
    body: z.object({
      flashcard_id: z.string().uuid()
    })
  }),
  
  startSession: z.object({
    body: z.object({
      set_id: z.string().uuid().optional()
    })
  }),
  
  reviewCard: z.object({
    body: z.object({
      study_card_id: z.string().uuid(),
      quality: z.number().min(0).max(5),
      response_time: z.number().positive(),
      session_id: z.string().uuid().optional()
    })
  }),
  
  completeSession: z.object({
    body: z.object({
      session_id: z.string().uuid(),
      stats: z.object({
        cards_reviewed: z.number().nonnegative(),
        average_ease: z.number().min(0).max(5),
        average_time: z.number().positive(),
        retention_rate: z.number().min(0).max(1)
      })
    })
  }),
  
  initializeSet: z.object({
    body: z.object({
      set_id: z.string().uuid()
    })
  }),
  
  getTrends: z.object({
    query: z.object({
      days: z.string().regex(/^\d+$/).default('30')
    })
  }),
  
  getForecast: z.object({
    query: z.object({
      days: z.string().regex(/^\d+$/).default('7')
    })
  })
};