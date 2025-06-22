'use client';

import { useEffect, useRef } from 'react';
import { 
  UserIcon, 
  SparklesIcon,
  InformationCircleIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';

interface Transcript {
  id: string | number;
  speaker: 'user' | 'ai' | 'system';
  text: string;
  audioUrl?: string;
  timestamp: Date;
}

interface TranscriptDisplayProps {
  transcripts: Transcript[];
}

export function TranscriptDisplay({ transcripts }: TranscriptDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const playingRef = useRef<string | null>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new transcript
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts]);

  const handlePlayAudio = (transcriptId: string | number, audioUrl: string) => {
    const id = transcriptId.toString();
    
    // Create audio element if not exists
    if (!audioRefs.current[id]) {
      audioRefs.current[id] = new Audio(audioUrl);
      audioRefs.current[id].addEventListener('ended', () => {
        playingRef.current = null;
        forceUpdate();
      });
    }

    const audio = audioRefs.current[id];

    if (playingRef.current === id) {
      // Pause if currently playing
      audio.pause();
      playingRef.current = null;
    } else {
      // Stop any other playing audio
      if (playingRef.current) {
        audioRefs.current[playingRef.current]?.pause();
      }
      
      // Play this audio
      audio.play();
      playingRef.current = id;
    }

    forceUpdate();
  };

  const forceUpdate = () => {
    // Force re-render to update play/pause buttons
    containerRef.current?.dispatchEvent(new Event('update'));
  };

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'user':
        return <UserIcon className="w-5 h-5" />;
      case 'ai':
        return <SparklesIcon className="w-5 h-5" />;
      case 'system':
        return <InformationCircleIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getSpeakerName = (speaker: string) => {
    switch (speaker) {
      case 'user':
        return 'You';
      case 'ai':
        return 'AI';
      case 'system':
        return 'System';
      default:
        return speaker;
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'user':
        return 'text-blue-400';
      case 'ai':
        return 'text-purple-400';
      case 'system':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (transcripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <SpeakerWaveIcon className="w-12 h-12 mb-4" />
        <p>Start speaking or type to begin the conversation</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="max-h-96 overflow-y-auto space-y-4 pr-2"
      style={{ scrollBehavior: 'smooth' }}
    >
      {transcripts.map((transcript) => (
        <div
          key={transcript.id}
          className={`flex gap-3 ${
            transcript.speaker === 'user' ? 'flex-row-reverse' : ''
          }`}
        >
          <div className={`flex-shrink-0 ${
            transcript.speaker === 'user' ? 'ml-3' : 'mr-3'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              transcript.speaker === 'user' 
                ? 'bg-blue-500/20' 
                : transcript.speaker === 'ai' 
                  ? 'bg-purple-500/20' 
                  : 'bg-yellow-500/20'
            }`}>
              {getSpeakerIcon(transcript.speaker)}
            </div>
          </div>
          
          <div className={`flex-1 ${
            transcript.speaker === 'user' ? 'text-right' : ''
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {transcript.speaker === 'user' && (
                <span className="text-xs text-gray-500">
                  {transcript.timestamp.toLocaleTimeString()}
                </span>
              )}
              <span className={`text-sm font-medium ${getSpeakerColor(transcript.speaker)}`}>
                {getSpeakerName(transcript.speaker)}
              </span>
              {transcript.speaker !== 'user' && (
                <span className="text-xs text-gray-500">
                  {transcript.timestamp.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <div className={`inline-block ${
              transcript.speaker === 'user' 
                ? 'bg-blue-500/10 text-blue-100' 
                : 'bg-gray-800 text-gray-100'
            } rounded-lg px-4 py-2`}>
              <p 
                className="whitespace-pre-wrap"
                data-testid={transcript.speaker === 'user' ? 'user-transcript' : 'ai-response'}
              >
                {transcript.text}
              </p>
              
              {transcript.audioUrl && transcript.speaker === 'ai' && (
                <button
                  onClick={() => handlePlayAudio(transcript.id, transcript.audioUrl!)}
                  className="mt-2 flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                  data-testid="play-response"
                >
                  {playingRef.current === transcript.id.toString() ? (
                    <>
                      <PauseIcon className="w-4 h-4" />
                      <span className="text-sm">Pause</span>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse ml-1" 
                           data-testid="audio-playing-indicator" />
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-4 h-4" />
                      <span className="text-sm">Play response</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {/* Audio player container */}
      {transcripts.some(t => t.audioUrl) && (
        <div className="hidden" data-testid="response-audio-player">
          {/* Hidden audio elements are created dynamically */}
        </div>
      )}
    </div>
  );
}