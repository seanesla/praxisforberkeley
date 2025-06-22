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
      
      // Check if provider is already initialized
      if (this.providers.has(provider)) {
        return this.providers.get(provider)!;
      }

      // Use hardcoded Anthropic API key from environment
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey) {
        logger.error('ANTHROPIC_API_KEY not configured in environment');
        return null;
      }

      // Initialize Anthropic provider with hardcoded key
      const providerInstance = new AnthropicService(anthropicApiKey);

      // Cache the provider instance
      this.providers.set(provider, providerInstance);
      logger.info('Anthropic provider initialized successfully');

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
  static clearProviderCache() {
    logger.info('Clearing AI provider cache');
    this.providers.clear();
  }
}