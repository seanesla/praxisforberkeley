'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SparklesIcon,
  DocumentTextIcon,
  CheckIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface EnhancedSmartNoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  selectedDocuments: string[];
  isSmartNote: boolean;
  onSave?: () => void;
}

interface Suggestion {
  text: string;
  source: string;
  documentId: string;
  documentTitle: string;
  relevance: number;
  pageNumber?: number;
  paragraph?: string;
}

interface GhostText {
  text: string;
  position: number;
  source: string;
}

export function EnhancedSmartNoteEditor({ 
  content, 
  onChange, 
  selectedDocuments, 
  isSmartNote,
  onSave
}: EnhancedSmartNoteEditorProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ghostText, setGhostText] = useState<GhostText | null>(null);
  const [showSourceTooltip, setShowSourceTooltip] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [lastTypingTime, setLastTypingTime] = useState(Date.now());
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(true);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const pauseDetectionRef = useRef<NodeJS.Timeout>();
  const lastQueryRef = useRef<string>('');
  const cursorPositionRef = useRef<number>(0);

  // Enhanced pause detection (1.5s as per README)
  useEffect(() => {
    if (!isSmartNote || !content || selectedDocuments.length === 0) return;

    const handleTypingPause = () => {
      const timeSinceLastType = Date.now() - lastTypingTime;
      
      if (timeSinceLastType >= 1500 && !isTyping) {
        // User has paused typing for 1.5 seconds
        fetchContextSuggestions();
      }
    };

    if (pauseDetectionRef.current) {
      clearTimeout(pauseDetectionRef.current);
    }

    pauseDetectionRef.current = setTimeout(() => {
      setIsTyping(false);
      handleTypingPause();
    }, 1500);

    return () => {
      if (pauseDetectionRef.current) {
        clearTimeout(pauseDetectionRef.current);
      }
    };
  }, [content, lastTypingTime, selectedDocuments, isSmartNote]);

  const fetchContextSuggestions = async () => {
    const cursorPos = cursorPositionRef.current;
    const textBeforeCursor = content.substring(0, cursorPos);
    const sentences = textBeforeCursor.split(/[.!?]\s+/);
    const currentContext = sentences[sentences.length - 1] || '';
    
    // Enhanced context extraction - include more surrounding text
    const words = textBeforeCursor.split(/\s+/);
    const recentWords = words.slice(-20).join(' '); // Last 20 words for better context
    
    if (currentContext.trim().length < 5 || currentContext === lastQueryRef.current) {
      return;
    }
    
    lastQueryRef.current = currentContext;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/context-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          noteContent: content,
          currentSentence: currentContext,
          recentContext: recentWords,
          documentIds: selectedDocuments,
          cursorPosition: cursorPos
        })
      });

      if (response.ok) {
        const data = await response.json();
        const filteredSuggestions = data.suggestions.filter((s: Suggestion) => s.relevance > 0.7);
        
        if (filteredSuggestions.length > 0) {
          setSuggestions(filteredSuggestions);
          // Set ghost text for the most relevant suggestion
          setGhostText({
            text: filteredSuggestions[0].text,
            position: cursorPos,
            source: filteredSuggestions[0].source
          });
        } else {
          setGhostText(null);
          setSuggestions([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const acceptGhostText = useCallback(() => {
    if (!ghostText) return;
    
    const newContent = 
      content.slice(0, ghostText.position) + 
      ' ' + ghostText.text + 
      content.slice(ghostText.position);
    
    onChange(newContent);
    setGhostText(null);
    setSuggestions([]);
    setAcceptedCount(prev => prev + 1);
    
    // Show source attribution briefly
    setShowSourceTooltip(true);
    setTimeout(() => setShowSourceTooltip(false), 3000);
    
    // Move cursor to end of inserted text
    setTimeout(() => {
      if (editorRef.current) {
        const newPos = ghostText.position + ghostText.text.length + 1;
        editorRef.current.setSelectionRange(newPos, newPos);
        editorRef.current.focus();
      }
    }, 0);
  }, [ghostText, content, onChange]);

  const dismissGhostText = useCallback(() => {
    setGhostText(null);
    setSuggestions([]);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab to accept ghost text
    if (e.key === 'Tab' && ghostText) {
      e.preventDefault();
      acceptGhostText();
      return;
    }
    
    // Escape to dismiss
    if (e.key === 'Escape' && ghostText) {
      e.preventDefault();
      dismissGhostText();
      return;
    }
    
    // Arrow keys to navigate suggestions
    if (suggestions.length > 1) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(Math.max(0, selectedSuggestion - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(Math.min(suggestions.length - 1, selectedSuggestion + 1));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    onChange(newContent);
    cursorPositionRef.current = e.target.selectionStart;
    setLastTypingTime(Date.now());
    setIsTyping(true);
    
    // Clear ghost text while typing
    if (ghostText) {
      setGhostText(null);
    }
  };

  const handleCursorMove = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    cursorPositionRef.current = target.selectionStart;
  };

  // Calculate ghost text position
  const getGhostTextStyle = () => {
    if (!ghostText || !editorRef.current) return {};
    
    const lines = content.substring(0, ghostText.position).split('\n');
    const currentLine = lines.length;
    const currentColumn = lines[lines.length - 1].length;
    
    // This is a simplified calculation - in production, you'd want more precise positioning
    return {
      top: `${currentLine * 1.8}em`,
      left: `${currentColumn * 0.6}em`
    };
  };

  return (
    <div className="relative">
      {/* Smart Note Indicator */}
      {isSmartNote && (
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-purple-400">Instant Context Retrieval Active</span>
            {selectedDocuments.length > 0 && (
              <span className="text-xs text-gray-500">
                ({selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''})
              </span>
            )}
          </div>
          
          {acceptedCount > 0 && (
            <div className="text-xs text-gray-400">
              {acceptedCount} suggestion{acceptedCount > 1 ? 's' : ''} accepted
            </div>
          )}
        </div>
      )}

      {/* Main Editor */}
      <div className="relative">
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleCursorMove}
          onClick={handleCursorMove}
          placeholder={isSmartNote 
            ? "Start typing... AI will suggest relevant content from your documents after you pause" 
            : "Start writing your note..."
          }
          className="w-full min-h-[500px] bg-gray-800/50 text-white placeholder-gray-500 rounded-lg p-6 outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none font-mono relative z-10"
          style={{ lineHeight: '1.8' }}
          data-testid="smart-note-editor"
        />
        
        {/* Ghost Text Overlay */}
        {ghostText && (
          <div 
            className="absolute inset-0 pointer-events-none p-6 font-mono"
            style={{ lineHeight: '1.8' }}
          >
            <div className="relative">
              <span className="invisible whitespace-pre-wrap">{content.substring(0, ghostText.position)}</span>
              <span className="text-gray-500/70 whitespace-pre-wrap" data-testid="ghost-text">
                {' ' + ghostText.text}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Source Attribution Tooltip */}
      {showSourceTooltip && ghostText && (
        <div className="absolute top-2 right-2 bg-gray-900 border border-purple-500/50 rounded-lg p-3 shadow-xl z-20 animate-fade-in">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-white mb-1">Source Added</p>
              <p className="text-xs text-gray-400">{ghostText.source}</p>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Helper */}
      {isSmartNote && showShortcuts && ghostText && (
        <div className="absolute bottom-2 left-2 bg-gray-900/90 backdrop-blur rounded-lg p-2 text-xs z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300">Tab</kbd>
              <span className="text-gray-400">Accept</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300">Esc</kbd>
              <span className="text-gray-400">Dismiss</span>
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="ml-2 text-gray-600 hover:text-gray-400"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Alternative Suggestions Panel */}
      {suggestions.length > 1 && (
        <div className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
          <div className="p-3 border-b border-gray-700">
            <p className="text-xs text-gray-400">
              Alternative suggestions from your documents
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setGhostText({
                    text: suggestion.text,
                    position: cursorPositionRef.current,
                    source: suggestion.source
                  });
                  setSelectedSuggestion(index);
                }}
                className={`w-full text-left p-3 border-b border-gray-700 last:border-0 transition-colors ${
                  index === selectedSuggestion 
                    ? 'bg-purple-600/20' 
                    : 'hover:bg-gray-700'
                }`}
              >
                <p className="text-sm text-white mb-1 line-clamp-2">{suggestion.text}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <DocumentTextIcon className="w-3 h-3" />
                    <span>{suggestion.documentTitle}</span>
                    {suggestion.pageNumber && (
                      <span className="text-gray-500">• Page {suggestion.pageNumber}</span>
                    )}
                  </div>
                  <div className="text-xs text-purple-400">
                    {Math.round(suggestion.relevance * 100)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Indicators */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}
        
        {!isTyping && isSmartNote && selectedDocuments.length > 0 && !ghostText && (
          <div className="text-xs text-gray-500">
            Pause typing for suggestions
          </div>
        )}
      </div>
    </div>
  );
}