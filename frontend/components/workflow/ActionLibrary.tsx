'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  XMarkIcon,
  MagnifyingGlassIcon,
  DocumentPlusIcon,
  BeakerIcon,
  ChartBarIcon,
  BellIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  CogIcon,
  BookOpenIcon,
  AcademicCapIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

interface Action {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  config?: any;
  requiredFields?: string[];
}

interface ActionLibraryProps {
  onSelect: (action: Action) => void;
  onClose: () => void;
}

const defaultActions: Action[] = [
  {
    id: 'create_flashcards',
    name: 'Create Flashcards',
    description: 'Generate flashcards from selected documents',
    category: 'learning',
    icon: <AcademicCapIcon className="w-5 h-5" />,
    config: { count: 10 },
    requiredFields: ['documentIds', 'setName']
  },
  {
    id: 'generate_exercises',
    name: 'Generate Exercises',
    description: 'Create practice exercises from content',
    category: 'learning',
    icon: <PencilSquareIcon className="w-5 h-5" />,
    config: { count: 10, types: ['multiple_choice', 'fill_blank'] },
    requiredFields: ['documentId', 'exerciseTypes']
  },
  {
    id: 'analyze_gaps',
    name: 'Analyze Knowledge Gaps',
    description: 'Detect and analyze knowledge gaps',
    category: 'learning',
    icon: <BeakerIcon className="w-5 h-5" />,
    config: { autoCreateLearningPath: true },
    requiredFields: []
  },
  {
    id: 'generate_report',
    name: 'Generate Report',
    description: 'Create automated reports from data',
    category: 'productivity',
    icon: <DocumentTextIcon className="w-5 h-5" />,
    config: { templateId: null, format: 'pdf' },
    requiredFields: ['templateId']
  },
  {
    id: 'send_notification',
    name: 'Send Notification',
    description: 'Send notifications to users',
    category: 'productivity',
    icon: <BellIcon className="w-5 h-5" />,
    config: { type: 'workflow', title: '', message: '' },
    requiredFields: ['title', 'message']
  },
  {
    id: 'update_data',
    name: 'Update Data',
    description: 'Update records in the database',
    category: 'productivity',
    icon: <CloudArrowUpIcon className="w-5 h-5" />,
    config: { table: '', updates: {}, conditions: {} },
    requiredFields: ['table', 'updates']
  },
  {
    id: 'ai_task',
    name: 'AI Task',
    description: 'Run custom AI analysis or generation',
    category: 'ai',
    icon: <SparklesIcon className="w-5 h-5" />,
    config: { prompt: '', useContext: true, saveResult: false },
    requiredFields: ['prompt']
  },
  {
    id: 'extract_citations',
    name: 'Extract Citations',
    description: 'Extract and analyze citations from documents',
    category: 'research',
    icon: <BookOpenIcon className="w-5 h-5" />,
    config: { buildNetwork: true },
    requiredFields: ['documentId']
  },
  {
    id: 'detect_themes',
    name: 'Detect Themes',
    description: 'Extract common themes across documents',
    category: 'research',
    icon: <ChartBarIcon className="w-5 h-5" />,
    config: { maxThemes: 10 },
    requiredFields: ['documentIds']
  },
  {
    id: 'check_plagiarism',
    name: 'Check Plagiarism',
    description: 'Check document for potential plagiarism',
    category: 'research',
    icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />,
    config: { threshold: 0.8 },
    requiredFields: ['documentId']
  }
];

export function ActionLibrary({ onSelect, onClose }: ActionLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [actions, setActions] = useState<Action[]>(defaultActions);
  const [customActions, setCustomActions] = useState<Action[]>([]);

  useEffect(() => {
    fetchCustomActions();
  }, []);

  const fetchCustomActions = async () => {
    try {
      const response = await fetch('/api/workflow/actions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      if (data.actions) {
        const mapped = data.actions.map((a: any) => ({
          ...a,
          icon: <CogIcon className="w-5 h-5" />
        }));
        setCustomActions(mapped);
      }
    } catch (error) {
      console.error('Error fetching custom actions:', error);
    }
  };

  const allActions = [...actions, ...customActions];

  const filteredActions = allActions.filter(action => {
    const matchesSearch = action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         action.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', name: 'All Actions' },
    { id: 'learning', name: 'Learning' },
    { id: 'research', name: 'Research' },
    { id: 'productivity', name: 'Productivity' },
    { id: 'ai', name: 'AI & Automation' }
  ];

  return (
    <div className="w-96 h-full bg-white border-l shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Action Library</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Categories */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1">
        <TabsList className="w-full px-4">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="flex-1">
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredActions.map((action) => (
              <Card
                key={action.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelect(action)}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-blue-500 flex-shrink-0 mt-0.5">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-1">{action.name}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {action.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {action.category}
                      </Badge>
                      {action.requiredFields && action.requiredFields.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {action.requiredFields.length} required fields
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredActions.length === 0 && (
            <div className="text-center py-8">
              <CogIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No actions found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search or category filter
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full">
          <DocumentPlusIcon className="w-4 h-4 mr-2" />
          Create Custom Action
        </Button>
      </div>
    </div>
  );
}