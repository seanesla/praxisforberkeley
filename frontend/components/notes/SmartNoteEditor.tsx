'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SparklesIcon,
  DocumentTextIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface SmartNoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  selectedDocuments: string[];
  isSmartNote: boolean;
}

interface Suggestion {
  text: string;
  source: string;
  documentId: string;
  relevance: number;
}

export function SmartNoteEditor({ 
  content, 
  onChange, 
  selectedDocuments, 
  isSmartNote 
}: SmartNoteEditorProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [acceptedSuggestion, setAcceptedSuggestion] = useState<string | null>(null);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastQueryRef = useRef<string>('');

  // Detect when user stops typing
  useEffect(() => {
    if (!isSmartNote || !content || selectedDocuments.length === 0) return;

    setIsTyping(true);
    setShowSuggestions(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      fetchSuggestions();
    }, 1500); // Wait 1.5 seconds after user stops typing

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [content, selectedDocuments, isSmartNote]);

  const fetchSuggestions = async () => {
    // Get the current sentence or last few words
    const cursorPos = editorRef.current?.selectionStart || 0;
    const textBeforeCursor = content.substring(0, cursorPos);
    const sentences = textBeforeCursor.split(/[.!?]\s+/);
    const currentContext = sentences[sentences.length - 1] || '';
    
    // Don't fetch if context is too short or same as last query
    if (currentContext.trim().length < 10 || currentContext === lastQueryRef.current) {
      return;
    }
    
    lastQueryRef.current = currentContext;

    try {
      const response = await fetch('/api/ai/context-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          noteContent: content,
          currentSentence: currentContext,
          documentIds: selectedDocuments
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(data.suggestions.length > 0);
        setSelectedSuggestion(0);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const acceptSuggestion = (suggestion: Suggestion) => {
    const cursorPos = editorRef.current?.selectionStart || content.length;
    const newContent = content.slice(0, cursorPos) + ' ' + suggestion.text + content.slice(cursorPos);
    onChange(newContent);
    setShowSuggestions(false);
    setSuggestions([]);
    setAcceptedSuggestion(suggestion.text);
    
    // Clear accepted suggestion indicator after 2 seconds
    setTimeout(() => setAcceptedSuggestion(null), 2000);
    
    // Focus back on editor
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const newCursorPos = cursorPos + suggestion.text.length + 1;
        editorRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        acceptSuggestion(suggestions[selectedSuggestion]);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(Math.max(0, selectedSuggestion - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(Math.min(suggestions.length - 1, selectedSuggestion + 1));
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="relative">
      {/* Editor */}
      <textarea
        ref={editorRef}
        value={content}
        onChange={(e) => {
          onChange(e.target.value);
          setCursorPosition(e.target.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={isSmartNote ? "Start typing and AI will suggest relevant content..." : "Start writing your note..."}
        className="w-full min-h-[500px] bg-gray-800/50 text-white placeholder-gray-500 rounded-lg p-6 outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none font-mono"
        style={{ lineHeight: '1.8' }}
      />

      {/* Typing Indicator */}
      {isSmartNote && isTyping && (
        <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-gray-400">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>AI thinking...</span>
        </div>
      )}

      {/* Accepted Suggestion Indicator */}
      {acceptedSuggestion && (
        <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-green-400 animate-fade-in">
          <CheckIcon className="w-4 h-4" />
          <span>Suggestion accepted</span>
        </div>
      )}

      {/* Suggestions Panel */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
          <div className="p-3 border-b border-gray-700">
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" />
              AI Suggestions (Press Tab to accept)
            </p>
          </div>
          <div className="p-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  index === selectedSuggestion 
                    ? 'bg-purple-600/20 border border-purple-600/50' 
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => acceptSuggestion(suggestion)}
              >
                <p className="text-sm text-white mb-2">{suggestion.text}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <DocumentTextIcon className="w-3 h-3" />
                    <span>{suggestion.source}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(suggestion.relevance * 100)}% match
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ghost Text Preview (optional enhancement) */}
      {showSuggestions && suggestions.length > 0 && selectedSuggestion === 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full">
            <div className="absolute whitespace-pre-wrap p-6 font-mono" style={{ lineHeight: '1.8' }}>
              <span className="invisible">{content}</span>
              <span className="text-gray-600"> {suggestions[0].text}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}