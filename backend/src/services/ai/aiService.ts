import { AnthropicService } from './providers/anthropic';
import { VectorStoreService } from '../vectorStore';
import logger from '../../utils/logger';

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
  
  // Generate Socratic question
  static async generateSocraticQuestion(
    prompt: string,
    relevantContent: any,
    difficulty: string,
    topic: string
  ): Promise<any> {
    try {
      const systemPrompt = `You are a Socratic teacher who guides students to discover knowledge through thoughtful questions.
        Create questions that encourage critical thinking and self-discovery rather than just recall.`;
      
      const response = await AIService.chat(
        `${prompt}\n\nRelevant content: ${JSON.stringify(relevantContent)}`,
        { 
          systemPrompt,
          responseFormat: 'json'
        }
      );
      
      // Parse and structure the question
      const questionData = typeof response === 'string' ? JSON.parse(response) : response;
      
      return {
        id: `q_${Date.now()}`,
        text: questionData.text || questionData.question,
        type: questionData.type || 'open',
        options: questionData.options,
        hint: questionData.hint,
        difficulty,
        concept: questionData.concept || topic,
        explanation: questionData.explanation
      };
    } catch (error) {
      logger.error('Error generating Socratic question:', error);
      // Return a fallback question
      return {
        id: `q_${Date.now()}`,
        text: `What aspects of ${topic} would you like to explore further?`,
        type: 'open',
        difficulty: 'easy',
        concept: topic
      };
    }
  }
  
  // Evaluate Socratic answer
  static async evaluateAnswer(
    question: string,
    answer: string,
    concept: string,
    questionType: string
  ): Promise<any> {
    try {
      const prompt = `
        Evaluate this answer in the context of Socratic learning:
        Question: ${question}
        Student Answer: ${answer}
        Concept: ${concept}
        Question Type: ${questionType}
        
        Provide constructive feedback that guides further learning.
        Return JSON with: { correct: boolean, explanation: string }
      `;
      
      const response = await AIService.chat(prompt, { responseFormat: 'json' });
      const evaluation = typeof response === 'string' ? JSON.parse(response) : response;
      
      return {
        correct: evaluation.correct || false,
        explanation: evaluation.explanation || 'Thank you for your response. Let\'s explore this concept further.'
      };
    } catch (error) {
      logger.error('Error evaluating answer:', error);
      return {
        correct: true, // Assume correct for open-ended questions
        explanation: 'Thank you for your thoughtful response. Let\'s continue exploring this topic.'
      };
    }
  }
  
  // Generate learning summary
  static async generateLearningSummary(
    topic: string,
    responses: any[],
    concepts: string[],
    accuracy: number
  ): Promise<string> {
    try {
      const prompt = `
        Generate a personalized learning summary for a student who completed a Socratic dialogue session.
        Topic: ${topic}
        Concepts covered: ${concepts.join(', ')}
        Accuracy: ${accuracy}%
        Number of questions: ${responses.length}
        
        Provide encouraging feedback and suggest next steps for continued learning.
      `;
      
      const summary = await AIService.generateSummary(prompt, {
        level: 'comprehensive',
        format: 'learning_summary'
      });
      
      return summary;
    } catch (error) {
      logger.error('Error generating learning summary:', error);
      return `Great job exploring ${topic}! You've covered ${concepts.length} key concepts with ${Math.round(accuracy)}% accuracy. Keep up the excellent learning!`;
    }
  }

  // Chat method for general AI conversations
  static async chat(message: string, options: any = {}): Promise<string> {
    try {
      const chatOptions: ChatCompletionOptions = {
        messages: [
          { role: 'system', content: options.systemPrompt || 'You are a helpful AI assistant.' },
          { role: 'user', content: message }
        ],
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000
      };

      const response = await AIService.generateResponse(
        options.userId || 'default',
        chatOptions
      );

      return response?.content || 'I apologize, but I was unable to generate a response.';
    } catch (error) {
      logger.error('Error in chat method:', error);
      throw error;
    }
  }

  // Generate summary
  static async generateSummary(content: string, options: any = {}): Promise<string> {
    try {
      const prompt = `Please summarize the following content:

${content}

Provide a ${options.level || 'brief'} summary.`;
      
      return await AIService.chat(prompt, {
        userId: options.userId,
        systemPrompt: 'You are an expert at creating clear, concise summaries.'
      });
    } catch (error) {
      logger.error('Error generating summary:', error);
      throw error;
    }
  }

  // Generate flashcards
  static async generateFlashcards(content: string, options: any = {}): Promise<any[]> {
    try {
      const prompt = `Create ${options.count || 10} flashcards from the following content:

${content}

Return as JSON array with format: [{"question": "...", "answer": "...", "difficulty": "easy|medium|hard"}]`;
      
      const response = await AIService.chat(prompt, {
        userId: options.userId,
        systemPrompt: 'You are an expert educator creating effective flashcards for learning.'
      });

      try {
        return JSON.parse(response);
      } catch {
        // Fallback if parsing fails
        return [{
          question: "What is the main topic of this content?",
          answer: "Please review the document for the main topic.",
          difficulty: "easy"
        }];
      }
    } catch (error) {
      logger.error('Error generating flashcards:', error);
      throw error;
    }
  }

  // Generate mind map
  static async generateMindMap(content: string): Promise<any> {
    try {
      const prompt = `Create a mind map structure from the following content:

${content}

Return as JSON with format:
{
  "title": "Main Topic",
  "nodes": [
    {
      "id": "unique_id",
      "text": "Node text",
      "type": "root|main|sub|detail",
      "position": { "x": 0, "y": 0 }
    }
  ],
  "connections": [
    {
      "source": "node_id",
      "target": "node_id",
      "type": "hierarchy|association|reference"
    }
  ]
}`;
      
      const response = await AIService.chat(prompt, {
        systemPrompt: 'You are an expert at organizing information into clear mind map structures.'
      });

      try {
        return JSON.parse(response);
      } catch {
        // Fallback structure
        return {
          title: "Content Overview",
          nodes: [
            {
              id: "root",
              text: "Main Topic",
              type: "root",
              position: { x: 0, y: 0 }
            }
          ],
          connections: []
        };
      }
    } catch (error) {
      logger.error('Error generating mind map:', error);
      throw error;
    }
  }

  // Change perspective
  static async changePerspective(content: string, perspective: string): Promise<string> {
    try {
      const prompt = `Rewrite the following content from a ${perspective} perspective:

${content}`;
      
      return await AIService.chat(prompt, {
        systemPrompt: `You are skilled at explaining concepts from different perspectives, particularly for ${perspective} audiences.`
      });
    } catch (error) {
      logger.error('Error changing perspective:', error);
      throw error;
    }
  }

  // Detect knowledge gaps
  static async detectKnowledgeGaps(documents: any[]): Promise<any[]> {
    try {
      const content = documents.map(d => d.content).join('\n\n');
      const prompt = `Analyze the following content and identify knowledge gaps or missing concepts:

${content}

Return as JSON array with format: [{"gap": "...", "importance": "high|medium|low", "suggestion": "..."}]`;
      
      const response = await AIService.chat(prompt, {
        systemPrompt: 'You are an expert educator who can identify knowledge gaps and learning opportunities.'
      });

      try {
        return JSON.parse(response);
      } catch {
        return [{
          gap: "Unable to analyze knowledge gaps",
          importance: "medium",
          suggestion: "Please review the documents manually"
        }];
      }
    } catch (error) {
      logger.error('Error detecting knowledge gaps:', error);
      throw error;
    }
  }
}