import { apiClient } from './client';
import { Flashcard } from '@/types';

export interface FlashcardWithProgress extends Flashcard {
  study_progress?: {
    repetitions: number;
    ease_factor: number;
    interval: number;
    next_review: string;
    last_review: string;
  };
}

export interface StudySession {
  id: string;
  user_id: string;
  flashcard_ids: string[];
  started_at: string;
  completed_at?: string;
  performance: {
    totalCards: number;
    correctAnswers: number;
    averageTime: number;
    difficultyBreakdown: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

export interface StudyStats {
  totalCards: number;
  dueToday: number;
  streak: number;
  averageEaseFactor: number;
  masteredCards: number;
}

export interface GenerateFlashcardsParams {
  documentId: string;
  numCards?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'basic' | 'cloze' | 'multi';
}

export interface UpdateFlashcardParams {
  difficulty_rating: 'easy' | 'medium' | 'hard';
  review_date?: string;
}

// API functions
export const flashcardsApi = {
  // Get all flashcards with optional filters
  getFlashcards: async (params?: {
    document_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ flashcards: Flashcard[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.document_id) queryParams.append('document_id', params.document_id);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    const url = `/api/flashcards${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data;
  },

  // Get flashcards due for review
  getDueFlashcards: async (limit?: number): Promise<{ flashcards: FlashcardWithProgress[] }> => {
    const url = `/api/flashcards/due${limit ? `?limit=${limit}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  // Generate flashcards from a document
  generateFlashcards: async (params: GenerateFlashcardsParams): Promise<{
    flashcards: Flashcard[];
    documentId: string;
    documentTitle: string;
  }> => {
    const response = await apiClient.post(
      `/api/flashcards/generate/${params.documentId}`,
      {
        numCards: params.numCards || 10,
        difficulty: params.difficulty,
        type: params.type
      }
    );
    return response.data;
  },

  // Update flashcard progress (for spaced repetition)
  updateFlashcard: async (
    id: string,
    params: UpdateFlashcardParams
  ): Promise<{ progress: any }> => {
    const response = await apiClient.put(`/api/flashcards/${id}`, params);
    return response.data;
  },

  // Delete a flashcard
  deleteFlashcard: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/flashcards/${id}`);
    return response.data;
  },

  // Create a study session
  createStudySession: async (flashcardIds: string[]): Promise<{ session: StudySession }> => {
    const response = await apiClient.post('/api/flashcards/study-session', {
      flashcard_ids: flashcardIds
    });
    return response.data;
  },

  // Get study statistics
  getStudyStats: async (): Promise<{ stats: StudyStats }> => {
    const response = await apiClient.get('/api/flashcards/stats');
    return response.data;
  }
};