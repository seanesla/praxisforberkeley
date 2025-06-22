'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  MicrophoneIcon,
  SpeakerWaveIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  ArrowDownTrayIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import { AudioWaveform } from './AudioWaveform';
import { TranscriptDisplay } from './TranscriptDisplay';

interface PodcastInterfaceProps {
  document?: any;
  onEnd: () => void;
}

export function PodcastInterface({ document, onEnd }: PodcastInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [currentTopic, setCurrentTopic] = useState('general discussion');
  const [language, setLanguage] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startPodcastSession();
    return () => {
      if (sessionId) {
        endPodcastSession();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startPodcastSession = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/podcast/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: document?.id,
          language
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
      } else if (response.status === 503) {
        // Service unavailable - podcast tables not set up
        const data = await response.json();
        setError('The podcast feature is not available yet. Please try again later or contact support.');
        console.error('Podcast service unavailable:', data);
      } else {
        setError('Failed to start podcast session. Please try again.');
      }
    } catch (error) {
      console.error('Error starting podcast session:', error);
      setError('Network error. Please check your connection and try again.');
    }
  };

  const endPodcastSession = async () => {
    if (!sessionId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/podcast/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        const data = await response.json();
        // Show summary
        setTranscripts(prev => [...prev, {
          id: Date.now(),
          speaker: 'system',
          text: data.summary,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error ending podcast session:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        setError('Microphone access requires a secure connection (HTTPS). Please use HTTPS or localhost.');
        return;
      }

      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support audio recording. Please use a modern browser.');
        return;
      }

      // First check if we already have permission
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permissionStatus.state === 'denied') {
            setError('Microphone access was denied. Please enable microphone access in your browser settings and reload the page.');
            return;
          }
        } catch (e) {
          // Some browsers don't support permission query for microphone
          console.log('Permission query not supported, proceeding with getUserMedia');
        }
      }

      // Request microphone permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Start visualization
      visualizeAudio();
      
      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null); // Clear any previous errors on success
    } catch (error: any) {
      console.error('Error starting recording:', error);
      
      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings and reload the page.');
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        setError('Microphone is already in use by another application.');
      } else if (error.name === 'AbortError') {
        setError('Microphone access was interrupted. Please try again.');
      } else if (error.name === 'OverconstrainedError') {
        setError('The microphone does not support the requested audio settings.');
      } else {
        setError(`Failed to access microphone: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Stop visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average / 255);
    
    animationFrameRef.current = requestAnimationFrame(visualizeAudio);
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // For demo, we'll simulate transcription
      const mockText = "What are the key concepts in this document?";
      
      // Add user transcript
      const userTranscript = {
        id: Date.now(),
        speaker: 'user',
        text: mockText,
        timestamp: new Date()
      };
      setTranscripts(prev => [...prev, userTranscript]);
      
      // Get AI response
      await getAIResponse(mockText);
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAIResponse = async (message: string) => {
    if (!sessionId) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/podcast/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          message,
          documentId: document?.id,
          language
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add AI transcript
        const aiTranscript = {
          id: Date.now(),
          speaker: 'ai',
          text: data.text,
          audioUrl: data.audioUrl,
          timestamp: new Date()
        };
        setTranscripts(prev => [...prev, aiTranscript]);
        
        // Play audio response
        if (data.audioUrl) {
          playAudioResponse(data.audioUrl);
        }
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
    }
  };

  const playAudioResponse = (url: string) => {
    // In production, this would play the actual audio
    console.log('Playing audio:', url);
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    // Add user transcript
    const userTranscript = {
      id: Date.now(),
      speaker: 'user',
      text: textInput,
      timestamp: new Date()
    };
    setTranscripts(prev => [...prev, userTranscript]);
    
    // Clear input and get response
    const message = textInput;
    setTextInput('');
    await getAIResponse(message);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleSaveTranscript = async () => {
    if (!sessionId) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/podcast/save-transcript`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          title: document?.title || 'General Discussion'
        })
      });

      if (response.ok) {
        // Show success message
        const saveConfirm = {
          id: Date.now(),
          speaker: 'system',
          text: 'Transcript saved successfully!',
          timestamp: new Date()
        };
        setTranscripts(prev => [...prev, saveConfirm]);
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'zh', name: '中文' }
  ];

  return (
    <div className="max-w-4xl mx-auto" data-testid="podcast-interface">
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg mb-4">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Controls */}
      <div className="glass-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isPaused}
              className={`p-3 rounded-full transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-purple-500 hover:bg-purple-600'
              } disabled:opacity-50`}
              data-testid="voice-input-toggle"
            >
              <MicrophoneIcon className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={handlePauseResume}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
              data-testid={isPaused ? "resume-podcast" : "pause-podcast"}
            >
              {isPaused ? (
                <PlayIcon className="w-6 h-6 text-white" />
              ) : (
                <PauseIcon className="w-6 h-6 text-white" />
              )}
            </button>
            
            <button
              onClick={() => {
                endPodcastSession();
                onEnd();
              }}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
              data-testid="end-podcast"
            >
              <StopIcon className="w-6 h-6 text-white" />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                data-testid="language-selector"
              >
                <LanguageIcon className="w-5 h-5 text-white" />
                <span className="text-white text-sm">
                  {languages.find(l => l.code === language)?.name}
                </span>
              </button>
              
              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-lg shadow-lg py-1 z-10">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLanguageMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors"
                      data-testid={`language-${lang.name.toLowerCase()}`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={handleSaveTranscript}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              data-testid="save-transcript"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center gap-4 text-sm">
          {isRecording && (
            <div className="flex items-center gap-2" data-testid="recording-indicator">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400">Recording...</span>
            </div>
          )}
          
          {isPaused && (
            <div className="text-yellow-400" data-testid="podcast-paused">
              Paused
            </div>
          )}
          
          {isProcessing && (
            <div className="text-blue-400">Processing...</div>
          )}
          
          <div className="text-gray-400" data-testid="current-topic">
            Topic: {currentTopic}
          </div>
        </div>
      </div>
      
      {/* Audio Waveform */}
      <div className="glass-card mb-6" data-testid="audio-waveform">
        <AudioWaveform level={audioLevel} isActive={isRecording} />
      </div>
      
      {/* Transcript Area */}
      <div className="glass-card mb-6" data-testid="transcript-area">
        <TranscriptDisplay transcripts={transcripts} />
      </div>
      
      {/* Text Input */}
      <form onSubmit={handleTextSubmit} className="glass-card">
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isPaused}
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            data-testid="text-input"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isPaused}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
      
      {/* Summary display */}
      {transcripts.some(t => t.speaker === 'system') && (
        <div className="glass-card mt-6" data-testid="podcast-summary">
          <h3 className="text-lg font-semibold text-white mb-2">Conversation Summary</h3>
          <div className="text-gray-300" data-testid="conversation-summary">
            {transcripts.find(t => t.speaker === 'system')?.text}
          </div>
        </div>
      )}
    </div>
  );
}