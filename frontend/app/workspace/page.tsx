'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { DocumentWorkspace } from '@/components/document-workspace/DocumentWorkspace';
import { 
  ChevronLeftIcon,
  FolderIcon,
  UserGroupIcon,
  ClockIcon,
  PlusIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

export default function WorkspacePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    isPublic: false
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchWorkspaces();
  }, [user, router]);

  const fetchWorkspaces = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workspace`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
        if (data.workspaces?.length > 0 && !activeWorkspace) {
          selectWorkspace(data.workspaces[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectWorkspace = async (workspace: any) => {
    setActiveWorkspace(workspace);
    
    // Fetch collaborators
    try {
      const token = localStorage.getItem('auth_token');
      const collabResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workspace/${workspace.id}/collaborators`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (collabResponse.ok) {
        const data = await collabResponse.json();
        setCollaborators(data.collaborators || []);
      }
      
      // Fetch versions
      const versionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workspace/${workspace.id}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (versionResponse.ok) {
        const data = await versionResponse.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Error fetching workspace details:', error);
    }
  };

  const createWorkspace = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newWorkspace)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewWorkspace({ name: '', description: '', isPublic: false });
        await fetchWorkspaces();
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const inviteCollaborator = async (email: string, role: string) => {
    if (!activeWorkspace) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workspace/${activeWorkspace.id}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, role })
      });

      if (response.ok) {
        // Refresh collaborators
        selectWorkspace(activeWorkspace);
      }
    } catch (error) {
      console.error('Error inviting collaborator:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading workspaces...</div>
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
              <h1 className="text-xl font-semibold text-white">Document Workspace</h1>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="glass-button flex items-center gap-2 px-4 py-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Workspace</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Workspace List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Your Workspaces</h3>
            <div className="space-y-2">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => selectWorkspace(workspace)}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    activeWorkspace?.id === workspace.id
                      ? 'bg-purple-500/20 border border-purple-500'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-white">{workspace.name}</p>
                      <p className="text-xs text-gray-400">
                        {workspace.documentCount} documents
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {activeWorkspace ? (
              <>
                {/* Workspace Header */}
                <div className="glass-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{activeWorkspace.name}</h2>
                      <p className="text-gray-400 mt-1">{activeWorkspace.description}</p>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                      <ShareIcon className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Workspace Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{activeWorkspace.documentCount || 0}</p>
                      <p className="text-sm text-gray-400">Documents</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{collaborators.length}</p>
                      <p className="text-sm text-gray-400">Collaborators</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{versions.length}</p>
                      <p className="text-sm text-gray-400">Versions</p>
                    </div>
                  </div>
                </div>

                {/* Document Workspace Component */}
                <DocumentWorkspace
                  workspaceId={activeWorkspace.id}
                  onInvite={inviteCollaborator}
                />

                {/* Collaborators */}
                <div className="glass-card">
                  <div className="flex items-center gap-3 mb-4">
                    <UserGroupIcon className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Collaborators</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {collaborators.map((collaborator) => (
                      <div key={collaborator.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {collaborator.name?.charAt(0) || collaborator.email.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{collaborator.name || collaborator.email}</p>
                            <p className="text-xs text-gray-400">{collaborator.role}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          collaborator.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {collaborator.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Version History */}
                <div className="glass-card">
                  <div className="flex items-center gap-3 mb-4">
                    <ClockIcon className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Version History</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-white">Version {version.number}</p>
                          <p className="text-sm text-gray-400">
                            {version.changes} • {new Date(version.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button className="text-purple-400 hover:text-purple-300 text-sm">
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card text-center py-12">
                <FolderIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a workspace to get started</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Workspace</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  className="glass-input"
                  placeholder="My Research Project"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  value={newWorkspace.description}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  className="glass-input resize-none"
                  rows={3}
                  placeholder="Brief description of your workspace..."
                />
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newWorkspace.isPublic}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-white">Make this workspace public</span>
              </label>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createWorkspace}
                disabled={!newWorkspace.name}
                className="flex-1 glass-button"
              >
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}