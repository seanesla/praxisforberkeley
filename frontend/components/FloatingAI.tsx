'use client';

import { Fragment, useState, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; excerpt: string }>;
  timestamp: Date;
}

interface FloatingAIProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FloatingAI({ isOpen, onClose }: FloatingAIProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI assistant powered by Claude 4 Sonnet. I can help you understand your documents, answer questions, and provide insights. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I understand you're asking about that topic. Based on your documents, here's what I found relevant...",
        sources: [
          {
            title: 'Research Paper.pdf',
            excerpt: 'The key finding suggests that neural networks can effectively...'
          },
          {
            title: 'Meeting Notes',
            excerpt: 'During the discussion, we identified three main approaches...'
          }
        ],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const suggestedPrompts = [
    { icon: DocumentTextIcon, text: 'Summarize my latest document' },
    { icon: AcademicCapIcon, text: 'Create flashcards from research paper' },
    { icon: SparklesIcon, text: 'Find connections between my notes' }
  ];

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className={`fixed ${isExpanded ? 'inset-0' : 'bottom-4 right-4'} transition-all duration-300`}>
          <div
            className={`
              bg-gray-800 border border-gray-700 shadow-2xl overflow-hidden transition-all duration-300
              ${isExpanded 
                ? 'w-full h-full rounded-none' 
                : 'w-96 h-[600px] rounded-2xl'
              }
            `}
          >
            {/* Header */}
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-medium text-white">AI Assistant</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 rounded hover:bg-gray-700 transition-colors"
                >
                  {isExpanded ? (
                    <ArrowsPointingInIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-gray-700 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100% - 120px)' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    
                    {/* Sources */}
                    {message.sources && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-300">Sources:</p>
                        {message.sources.map((source, index) => (
                          <div
                            key={index}
                            className="bg-gray-800 rounded p-2 cursor-pointer hover:bg-gray-750 transition-colors"
                          >
                            <p className="text-xs font-medium text-purple-400">{source.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{source.excerpt}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested prompts */}
            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-400 mb-2">Try asking:</p>
                <div className="space-y-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(prompt.text)}
                      className="w-full flex items-center gap-2 text-left text-sm text-gray-300 bg-gray-700 rounded-lg px-3 py-2 hover:bg-gray-600 transition-colors"
                    >
                      <prompt.icon className="w-4 h-4 text-gray-400" />
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything about your documents..."
                  className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-purple-600 text-white rounded-lg px-3 py-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Powered by Claude 4 Sonnet • No API key required
              </p>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}