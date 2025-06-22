'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  SparklesIcon,
  AcademicCapIcon,
  MapIcon,
  HomeIcon,
  PlusIcon,
  CloudArrowUpIcon,
  MicrophoneIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface Command {
  id: string;
  name: string;
  description?: string;
  icon: any;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const commands: Command[] = [
    // Navigation
    {
      id: 'home',
      name: 'Go to Dashboard',
      description: 'Navigate to your dashboard',
      icon: HomeIcon,
      action: () => {
        router.push('/dashboard');
        onClose();
      },
      keywords: ['home', 'dashboard', 'main']
    },
    {
      id: 'documents',
      name: 'Go to Documents',
      description: 'View all your documents',
      icon: DocumentTextIcon,
      action: () => {
        router.push('/documents');
        onClose();
      },
      keywords: ['files', 'docs']
    },
    {
      id: 'notes',
      name: 'Go to Notes',
      description: 'View all your notes',
      icon: SparklesIcon,
      action: () => {
        router.push('/notes');
        onClose();
      }
    },
    {
      id: 'flashcards',
      name: 'Go to Flashcards',
      description: 'Study with flashcards',
      icon: AcademicCapIcon,
      action: () => {
        router.push('/flashcards');
        onClose();
      },
      keywords: ['study', 'learn']
    },
    {
      id: 'mindmaps',
      name: 'Go to Mind Maps',
      description: 'View your mind maps',
      icon: MapIcon,
      action: () => {
        router.push('/mindmaps');
        onClose();
      },
      keywords: ['visual', 'diagram']
    },
    
    // Create actions
    {
      id: 'create-note',
      name: 'Create New Note',
      description: 'Start writing a new note',
      icon: PlusIcon,
      action: () => {
        router.push('/notes/new');
        onClose();
      },
      keywords: ['new', 'add', 'write']
    },
    {
      id: 'create-smart-note',
      name: 'Create Smart Note',
      description: 'Create an AI-powered note with context',
      icon: SparklesIcon,
      action: () => {
        router.push('/notes/new?smart=true');
        onClose();
      },
      keywords: ['ai', 'smart', 'intelligent']
    },
    {
      id: 'upload-document',
      name: 'Upload Document',
      description: 'Upload a new document',
      icon: CloudArrowUpIcon,
      action: () => {
        router.push('/documents/upload');
        onClose();
      },
      keywords: ['import', 'file']
    },
    {
      id: 'create-flashcard',
      name: 'Create Flashcard Set',
      description: 'Create a new set of flashcards',
      icon: AcademicCapIcon,
      action: () => {
        router.push('/flashcards/new');
        onClose();
      }
    },
    {
      id: 'create-mindmap',
      name: 'Create Mind Map',
      description: 'Create a new mind map',
      icon: MapIcon,
      action: () => {
        router.push('/mindmaps/new');
        onClose();
      }
    },
    
    // Features
    {
      id: 'podcast-mode',
      name: 'Start Podcast Mode',
      description: 'Have a conversation about your documents',
      icon: MicrophoneIcon,
      action: () => {
        router.push('/podcast');
        onClose();
      },
      keywords: ['talk', 'voice', 'audio']
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Configure your preferences',
      icon: CogIcon,
      action: () => {
        router.push('/settings');
        onClose();
      },
      keywords: ['preferences', 'config']
    }
  ];

  // Filter commands based on query
  const filteredCommands = query === ''
    ? commands
    : commands.filter((command) => {
        const searchTerms = query.toLowerCase().split(' ');
        const commandText = `${command.name} ${command.description} ${command.keywords?.join(' ')}`.toLowerCase();
        return searchTerms.every(term => commandText.includes(term));
      });

  // Reset query when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  // Handle natural language commands
  const handleNaturalLanguage = async () => {
    if (query && filteredCommands.length === 0) {
      setLoading(true);
      try {
        // Parse natural language command
        const response = await fetch('/api/command/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: query })
        });
        
        const data = await response.json();
        if (data.command) {
          // Execute the parsed command
          await executeCommand(data.command);
        }
      } catch (error) {
        console.error('Failed to parse command:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const executeCommand = async (command: any) => {
    switch (command.type) {
      case 'navigation':
        router.push(`/${command.action}`);
        break;
      case 'create':
        router.push(`/${command.action}/new`);
        break;
      case 'search':
        router.push(`/search?q=${encodeURIComponent(command.query)}`);
        break;
      default:
        console.log('Unknown command type:', command);
    }
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment} afterLeave={() => setQuery('')}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl transform overflow-hidden rounded-xl bg-gray-800 shadow-2xl ring-1 ring-gray-700 transition-all">
              <Combobox
                onChange={(command: Command) => {
                  if (command) command.action();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredCommands.length === 0) {
                    handleNaturalLanguage();
                  }
                }}
              >
                <div className="relative">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-100 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                    placeholder="Type a command or search..."
                    onChange={(event) => setQuery(event.target.value)}
                    autoFocus
                  />
                </div>

                {(filteredCommands.length > 0 || query !== '') && (
                  <Combobox.Options static className="max-h-80 scroll-py-2 overflow-y-auto py-2">
                    {filteredCommands.length === 0 && query !== '' ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm text-gray-400">
                          No commands found. Press Enter to use natural language.
                        </p>
                        {loading && (
                          <div className="mt-4">
                            <div className="inline-flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                              <span className="ml-2 text-sm text-gray-400">Processing...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      filteredCommands.map((command) => (
                        <Combobox.Option
                          key={command.id}
                          value={command}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-2 ${
                              active ? 'bg-gray-700' : ''
                            }`
                          }
                        >
                          {({ active }) => (
                            <div className="flex items-center">
                              <command.icon
                                className={`h-5 w-5 flex-none ${
                                  active ? 'text-purple-400' : 'text-gray-400'
                                }`}
                                aria-hidden="true"
                              />
                              <div className="ml-3 flex-auto">
                                <p className={`text-sm font-medium ${
                                  active ? 'text-white' : 'text-gray-200'
                                }`}>
                                  {command.name}
                                </p>
                                {command.description && (
                                  <p className="text-sm text-gray-400">
                                    {command.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                )}

                {query === '' && (
                  <div className="border-t border-gray-700 px-4 py-2 text-xs text-gray-400">
                    <div className="flex items-center justify-between">
                      <span>Type to search or use natural language</span>
                      <div className="flex items-center gap-2">
                        <kbd className="rounded bg-gray-700 px-1.5 py-0.5">↵</kbd>
                        <span>to select</span>
                      </div>
                    </div>
                  </div>
                )}
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}