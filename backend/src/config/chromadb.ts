import { ChromaClient } from 'chromadb';
import logger from '../utils/logger';

export class ChromaDBConfig {
  private static client: ChromaClient | null = null;
  
  static async getClient(): Promise<ChromaClient> {
    if (!this.client) {
      logger.info('Initializing ChromaDB client');
      this.client = new ChromaClient({
        path: process.env.CHROMADB_URL || 'http://localhost:8000'
      });
    }
    return this.client;
  }
  
  static async createCollection(name: string, embeddingFunction?: any) {
    logger.info(`Creating or getting collection: ${name}`);
    const client = await this.getClient();
    
    try {
      // Try to get existing collection first
      const collection = await client.getOrCreateCollection({
        name,
        embeddingFunction,
        metadata: { 
          description: `Collection for ${name}`,
          created_at: new Date().toISOString()
        }
      });
      
      logger.info(`Collection ${name} ready`);
      return collection;
    } catch (error) {
      logger.error('Error creating collection', error);
      throw error;
    }
  }
  
  static async deleteCollection(name: string) {
    logger.info(`Deleting collection: ${name}`);
    const client = await this.getClient();
    
    try {
      await client.deleteCollection({ name });
      logger.info(`Collection ${name} deleted`);
    } catch (error) {
      logger.warn('Error deleting collection (might not exist)', error);
      // Collection might not exist, which is okay
    }
  }
  
  static async listCollections() {
    const client = await this.getClient();
    const collections = await client.listCollections();
    logger.debug('Available collections', { collections });
    return collections;
  }
}