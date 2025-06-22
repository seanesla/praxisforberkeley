import { apiClient } from '../api';

export interface Document {
  id: string;
  title: string;
  content: string;
  file_url?: string | null;
  file_type: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  embeddings_generated?: boolean;
}

export async function getDocuments(): Promise<Document[]> {
  try {
    const response = await apiClient.get<{ documents: Document[] }>('/api/documents');
    return response.data?.documents || [];
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

export async function getDocument(id: string): Promise<Document | null> {
  try {
    const response = await apiClient.get<{ document: Document }>(`/api/documents/${id}`);
    return response.data?.document || null;
  } catch (error) {
    console.error('Error fetching document:', error);
    return null;
  }
}

export async function createDocument(document: Partial<Document>): Promise<Document | null> {
  try {
    const response = await apiClient.post<{ document: Document }>('/api/documents', document);
    return response.data?.document || null;
  } catch (error) {
    console.error('Error creating document:', error);
    return null;
  }
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
  try {
    const response = await apiClient.put<{ document: Document }>(`/api/documents/${id}`, updates);
    return response.data?.document || null;
  } catch (error) {
    console.error('Error updating document:', error);
    return null;
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/api/documents/${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
}

export async function uploadDocument(file: File): Promise<Document | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<{ document: Document }>('/api/documents/upload', formData);
    return response.data?.document || null;
  } catch (error) {
    console.error('Error uploading document:', error);
    return null;
  }
}

// Export as documentsApi for compatibility
export const documentsApi = {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocument
};