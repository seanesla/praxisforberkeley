import fetch from 'node-fetch';
import { ChatCompletionOptions, ChatCompletionResponse, StreamCallback } from '../aiService';

export class AnthropicService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    console.log('[ANTHROPIC_SERVICE] Initialized');
  }

  async generateResponse(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    console.log('[ANTHROPIC_SERVICE] Generating response');

    const { systemPrompt, messages } = this.prepareMessages(options);
    
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          messages,
          system: systemPrompt,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[ANTHROPIC_SERVICE] API error:', error);
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.content?.[0]?.text || '';

      console.log('[ANTHROPIC_SERVICE] Response generated successfully');
      return { content };
    } catch (error) {
      console.error('[ANTHROPIC_SERVICE] Error generating response:', error);
      throw error;
    }
  }

  async generateStreamingResponse(
    options: ChatCompletionOptions,
    callback: StreamCallback
  ): Promise<void> {
    console.log('[ANTHROPIC_SERVICE] Generating streaming response');

    const { systemPrompt, messages } = this.prepareMessages(options);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          messages,
          system: systemPrompt,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[ANTHROPIC_SERVICE] API error:', error);
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      // Process SSE stream
      const reader = response.body;
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // @ts-ignore - Node fetch types don't perfectly match
      for await (const chunk of reader) {
        buffer += decoder.decode(chunk as any, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta') {
                const content = parsed.delta?.text || '';
                if (content) {
                  callback({ content, done: false });
                }
              } else if (parsed.type === 'message_stop') {
                callback({ content: '', done: true });
                return;
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('[ANTHROPIC_SERVICE] Error in streaming response:', error);
      throw error;
    }
  }

  private prepareMessages(options: ChatCompletionOptions) {
    let systemPrompt = '';
    const messages: any[] = [];

    // Extract system prompt and convert messages
    for (const msg of options.messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
      } else {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add document context to system prompt if provided
    if (options.documentContext) {
      const contextPrompt = `You have access to the following document content to help answer questions:\n\n${options.documentContext}\n\nPlease use this document content to provide accurate and relevant responses.`;
      systemPrompt = systemPrompt ? `${contextPrompt}\n\n${systemPrompt}` : contextPrompt;
    }

    // Set a default system prompt if none provided
    if (!systemPrompt) {
      systemPrompt = 'You are a helpful AI assistant.';
    }

    return { systemPrompt, messages };
  }
}