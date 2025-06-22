import { AnthropicService } from './providers/anthropic';
import { VectorStoreService } from '../vectorStore';
import { logger } from '../../utils/logger';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  documentContext?: string;
}

export interface ChatCompletionResponse {
  content: string;
  sources?: any[];
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export type StreamCallback = (chunk: StreamChunk) => void;

interface AIProvider {
  generateResponse(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;
  generateStreamingResponse(options: ChatCompletionOptions, callback: StreamCallback): Promise<void>;
}

export class AIService {
  private static providers: Map<string, AIProvider> = new Map();

  static async initialize() {
    logger.info('Initializing AI providers');
    // Providers will be initialized on-demand when needed
  }

  static async getProviderForUser(userId: string): Promise<AIProvider | null> {
    try {
      logger.debug('Getting Anthropic provider', { userId });

      const provider = 'anthropic';
      const cacheKey = `${provider}_${userId}`;
      
      // Check if provider is already initialized for this user
      if (this.providers.has(cacheKey)) {
        return this.providers.get(cacheKey)!;
      }

      // Import required modules
      const { supabase } = await import('../config/supabase');
      const { EncryptionService } = await import('../utils/encryption');

      // Get API key from database for the user
      const { data: apiKeyData, error } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', userId)
        .eq('provider', 'anthropic')
        .eq('is_active', true)
        .single();

      if (error || !apiKeyData || !apiKeyData.encrypted_key) {
        logger.info('No Anthropic API key found for user', { userId });
        return null;
      }

      // Decrypt the API key
      const decryptedApiKey = EncryptionService.decrypt(apiKeyData.encrypted_key);
      if (!decryptedApiKey) {
        logger.error('Failed to decrypt API key');
        return null;
      }

      // Initialize Anthropic provider with user's API key
      const providerInstance = new AnthropicService(decryptedApiKey);

      // Cache the provider instance for this user
      this.providers.set(cacheKey, providerInstance);
      logger.info('Anthropic provider initialized successfully with user API key');

      return providerInstance;
    } catch (error) {
      logger.error('Error getting Anthropic provider', error);
      return null;
    }
  }

  static async generateResponse(
    userId: string,
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse | null> {
    try {
      const provider = await this.getProviderForUser(userId);
      if (!provider) {
        logger.error('No AI provider available', { userId });
        return null;
      }

      logger.debug('Generating AI response');
      return await provider.generateResponse(options);
    } catch (error) {
      logger.error('Error generating AI response', error);
      return null;
    }
  }

  static async generateStreamingResponse(
    userId: string,
    options: ChatCompletionOptions,
    callback: StreamCallback
  ): Promise<void> {
    try {
      const provider = await this.getProviderForUser(userId);
      if (!provider) {
        throw new Error('No AI provider available');
      }

      logger.debug('Generating streaming AI response');
      await provider.generateStreamingResponse(options, callback);
    } catch (error) {
      logger.error('Error in streaming AI response', error);
      throw error;
    }
  }

  // Clear cached providers (useful when API keys change)
  static clearProviderCache(userId?: string) {
    if (userId) {
      logger.info('Clearing AI provider cache for user', { userId });
      // Clear all providers for specific user
      for (const [key] of this.providers) {
        if (key.includes(userId)) {
          this.providers.delete(key);
        }
      }
    } else {
      logger.info('Clearing entire AI provider cache');
      this.providers.clear();
    }
  }
}