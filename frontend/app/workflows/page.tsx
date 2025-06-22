'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { 
  ChevronLeftIcon,
  CpuChipIcon,
  PlayIcon,
  ClockIcon,
  PlusIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

export default function WorkflowsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<any>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [templateLibrary, setTemplateLibrary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchWorkflowData();
  }, [user, router]);

  const fetchWorkflowData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch user workflows
      const workflowsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflow`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Fetch execution history
      const historyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflow/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Fetch template library
      const templatesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflow/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (workflowsResponse.ok) {
        const data = await workflowsResponse.json();
        setWorkflows(data.workflows || []);
      }
      
      if (historyResponse.ok) {
        const data = await historyResponse.json();
        setExecutionHistory(data.history || []);
      }
      
      if (templatesResponse.ok) {
        const data = await templatesResponse.json();
        setTemplateLibrary(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching workflow data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkflow = async (name: string, description: string, fromTemplate?: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name, 
          description,
          template: fromTemplate 
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchWorkflowData();
        setActiveWorkflow(data.workflow);
        setShowTemplates(false);
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflow/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchWorkflowData();
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflow/${workflowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      await fetchWorkflowData();
      if (activeWorkflow?.id === workflowId) {
        setActiveWorkflow(null);
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const workflowTemplates = [
    {
      id: 'daily-review',
      name: 'Daily Review',
      description: 'Automatically review and summarize daily documents',
      icon: '📅',
      nodes: 5
    },
    {
      id: 'research-pipeline',
      name: 'Research Pipeline',
      description: 'Process research papers through analysis stages',
      icon: '🔬',
      nodes: 8
    },
    {
      id: 'note-to-flashcard',
      name: 'Note to Flashcard',
      description: 'Convert notes into flashcards automatically',
      icon: '🎴',
      nodes: 4
    },
    {
      id: 'knowledge-synthesis',
      name: 'Knowledge Synthesis',
      description: 'Synthesize information from multiple sources',
      icon: '🧩',
      nodes: 6
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <Logo size="sm" />
              <h1 className="text-xl font-semibold text-white">Workflow Automation</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <BookOpenIcon className="w-5 h-5" />
                <span>Templates</span>
              </button>
              <button
                onClick={() => createWorkflow('New Workflow', 'Untitled workflow')}
                className="glass-button flex items-center gap-2 px-4 py-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>New Workflow</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Workflows List */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Your Workflows</h3>
              <div className="space-y-2">
                {workflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    onClick={() => setActiveWorkflow(workflow)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      activeWorkflow?.id === workflow.id
                        ? 'bg-purple-500/20 border border-purple-500'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{workflow.name}</p>
                        <p className="text-xs text-gray-400">
                          {workflow.nodeCount} nodes
                        </p>
                      </div>
                      {workflow.isActive && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Execution History */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Recent Executions</h3>
              <div className="space-y-2">
                {executionHistory.slice(0, 5).map((execution) => (
                  <div key={execution.id} className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-white">{execution.workflowName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        execution.status === 'success' 
                          ? 'bg-green-500/20 text-green-400'
                          : execution.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {execution.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(execution.executedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Workflow Canvas */}
          <div className="lg:col-span-3">
            {activeWorkflow ? (
              <div className="space-y-4">
                <div className="glass-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{activeWorkflow.name}</h2>
                      <p className="text-gray-400">{activeWorkflow.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => executeWorkflow(activeWorkflow.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                      >
                        <PlayIcon className="w-4 h-4" />
                        <span>Run</span>
                      </button>
                      <button
                        onClick={() => deleteWorkflow(activeWorkflow.id)}
                        className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-400">
                    <span className="flex items-center gap-2">
                      <CpuChipIcon className="w-4 h-4" />
                      {activeWorkflow.nodeCount} nodes
                    </span>
                    <span className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      Last run: {activeWorkflow.lastRun || 'Never'}
                    </span>
                    <span className="flex items-center gap-2">
                      <PlayIcon className="w-4 h-4" />
                      {activeWorkflow.runCount || 0} runs
                    </span>
                  </div>
                </div>
                
                <div className="h-[600px] glass-card">
                  <WorkflowCanvas
                    workflow={activeWorkflow}
                    onSave={async (updatedWorkflow) => {
                      await fetchWorkflowData();
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="glass-card text-center py-24">
                <CpuChipIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Workflow Selected
                </h3>
                <p className="text-gray-400 mb-6">
                  Select an existing workflow or create a new one to get started
                </p>
                <button
                  onClick={() => createWorkflow('New Workflow', 'Untitled workflow')}
                  className="glass-button inline-flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Create New Workflow</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Workflow Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => createWorkflow(template.name, template.description, template)}
                  className="p-6 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-left"
                >
                  <div className="text-3xl mb-3">{template.icon}</div>
                  <h4 className="font-semibold text-white mb-1">{template.name}</h4>
                  <p className="text-sm text-gray-400 mb-3">{template.description}</p>
                  <div className="flex items-center gap-2 text-xs text-purple-400">
                    <CpuChipIcon className="w-4 h-4" />
                    <span>{template.nodes} nodes</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}