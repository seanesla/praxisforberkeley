import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { AIService } from './ai/aiService';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceSettings {
  isPublic: boolean;
  allowComments: boolean;
  allowEditing: boolean;
  versionControl: boolean;
  autoSave: boolean;
  collaboratorPermissions: {
    canInvite: boolean;
    canDelete: boolean;
    canExport: boolean;
  };
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActiveAt: Date;
}

export interface WorkspaceDocument {
  id: string;
  workspaceId: string;
  documentId: string;
  addedBy: string;
  addedAt: Date;
  position: { x: number; y: number };
  tags: string[];
  notes?: string;
}

export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  userId: string;
  action: 'created' | 'joined' | 'left' | 'added_document' | 'removed_document' | 'commented' | 'edited';
  targetId?: string;
  targetType?: 'workspace' | 'document' | 'member';
  metadata?: any;
  createdAt: Date;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  workspaceId: string;
  version: number;
  content: string;
  metadata: any;
  createdBy: string;
  createdAt: Date;
  changeDescription?: string;
  diff?: any;
}

export interface WorkspaceComment {
  id: string;
  workspaceId: string;
  documentId?: string;
  userId: string;
  content: string;
  parentId?: string;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentWorkspaceService {
  /**
   * Create a new workspace
   */
  static async createWorkspace(
    userId: string,
    name: string,
    description?: string,
    settings?: Partial<WorkspaceSettings>
  ): Promise<Workspace> {
    try {
      const defaultSettings: WorkspaceSettings = {
        isPublic: false,
        allowComments: true,
        allowEditing: true,
        versionControl: true,
        autoSave: true,
        collaboratorPermissions: {
          canInvite: true,
          canDelete: false,
          canExport: true
        }
      };

      const workspaceData = {
        name,
        description,
        owner_id: userId,
        settings: { ...defaultSettings, ...settings },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: workspace, error } = await supabase
        .from('workspaces')
        .insert(workspaceData)
        .select()
        .single();

      if (error) throw error;

      // Add owner as member
      await this.addMember(workspace.id, userId, 'owner');

      // Log activity
      await this.logActivity(workspace.id, userId, 'created', workspace.id, 'workspace');

      logger.info('Workspace created', { workspaceId: workspace.id, userId });

      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        ownerId: workspace.owner_id,
        settings: workspace.settings,
        createdAt: new Date(workspace.created_at),
        updatedAt: new Date(workspace.updated_at)
      };
    } catch (error) {
      logger.error('Error creating workspace:', error);
      throw error;
    }
  }

  /**
   * Add a member to workspace
   */
  static async addMember(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'admin' | 'editor' | 'viewer'
  ): Promise<WorkspaceMember> {
    try {
      const memberData = {
        workspace_id: workspaceId,
        user_id: userId,
        role,
        joined_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      };

      const { data: member, error } = await supabase
        .from('workspace_members')
        .insert(memberData)
        .select()
        .single();

      if (error) throw error;

      if (role !== 'owner') {
        await this.logActivity(workspaceId, userId, 'joined', userId, 'member');
      }

      return {
        id: member.id,
        workspaceId: member.workspace_id,
        userId: member.user_id,
        role: member.role,
        joinedAt: new Date(member.joined_at),
        lastActiveAt: new Date(member.last_active_at)
      };
    } catch (error) {
      logger.error('Error adding member to workspace:', error);
      throw error;
    }
  }

  /**
   * Add document to workspace
   */
  static async addDocument(
    workspaceId: string,
    documentId: string,
    userId: string,
    position?: { x: number; y: number },
    tags?: string[],
    notes?: string
  ): Promise<WorkspaceDocument> {
    try {
      const docData = {
        workspace_id: workspaceId,
        document_id: documentId,
        added_by: userId,
        added_at: new Date().toISOString(),
        position: position || { x: 0, y: 0 },
        tags: tags || [],
        notes
      };

      const { data: doc, error } = await supabase
        .from('workspace_documents')
        .insert(docData)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity(workspaceId, userId, 'added_document', documentId, 'document');

      return {
        id: doc.id,
        workspaceId: doc.workspace_id,
        documentId: doc.document_id,
        addedBy: doc.added_by,
        addedAt: new Date(doc.added_at),
        position: doc.position,
        tags: doc.tags,
        notes: doc.notes
      };
    } catch (error) {
      logger.error('Error adding document to workspace:', error);
      throw error;
    }
  }

  /**
   * Create document version (for version control)
   */
  static async createVersion(
    documentId: string,
    workspaceId: string,
    content: string,
    metadata: any,
    userId: string,
    changeDescription?: string
  ): Promise<DocumentVersion> {
    try {
      // Get latest version
      const { data: latestVersion } = await supabase
        .from('document_versions')
        .select('version')
        .eq('document_id', documentId)
        .eq('workspace_id', workspaceId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (latestVersion?.version || 0) + 1;

      // Generate diff if previous version exists
      let diff = null;
      if (latestVersion) {
        const { data: prevVersion } = await supabase
          .from('document_versions')
          .select('content')
          .eq('document_id', documentId)
          .eq('workspace_id', workspaceId)
          .eq('version', latestVersion.version)
          .single();

        if (prevVersion) {
          diff = this.generateDiff(prevVersion.content, content);
        }
      }

      const versionData = {
        document_id: documentId,
        workspace_id: workspaceId,
        version: nextVersion,
        content,
        metadata,
        created_by: userId,
        created_at: new Date().toISOString(),
        change_description: changeDescription,
        diff
      };

      const { data: version, error } = await supabase
        .from('document_versions')
        .insert(versionData)
        .select()
        .single();

      if (error) throw error;

      logger.info('Document version created', { documentId, version: nextVersion });

      return {
        id: version.id,
        documentId: version.document_id,
        workspaceId: version.workspace_id,
        version: version.version,
        content: version.content,
        metadata: version.metadata,
        createdBy: version.created_by,
        createdAt: new Date(version.created_at),
        changeDescription: version.change_description,
        diff: version.diff
      };
    } catch (error) {
      logger.error('Error creating document version:', error);
      throw error;
    }
  }

  /**
   * Add comment to workspace or document
   */
  static async addComment(
    workspaceId: string,
    userId: string,
    content: string,
    documentId?: string,
    parentId?: string
  ): Promise<WorkspaceComment> {
    try {
      const commentData = {
        workspace_id: workspaceId,
        document_id: documentId,
        user_id: userId,
        content,
        parent_id: parentId,
        resolved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: comment, error } = await supabase
        .from('workspace_comments')
        .insert(commentData)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity(workspaceId, userId, 'commented', comment.id, 'document');

      return {
        id: comment.id,
        workspaceId: comment.workspace_id,
        documentId: comment.document_id,
        userId: comment.user_id,
        content: comment.content,
        parentId: comment.parent_id,
        resolved: comment.resolved,
        createdAt: new Date(comment.created_at),
        updatedAt: new Date(comment.updated_at)
      };
    } catch (error) {
      logger.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get workspace details with members and documents
   */
  static async getWorkspace(workspaceId: string): Promise<{
    workspace: Workspace;
    members: WorkspaceMember[];
    documents: WorkspaceDocument[];
    recentActivity: WorkspaceActivity[];
  }> {
    try {
      // Get workspace
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (wsError) throw wsError;

      // Get members
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;

      // Get documents
      const { data: documents, error: docsError } = await supabase
        .from('workspace_documents')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (docsError) throw docsError;

      // Get recent activity
      const { data: activities, error: actError } = await supabase
        .from('workspace_activity')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (actError) throw actError;

      return {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          ownerId: workspace.owner_id,
          settings: workspace.settings,
          createdAt: new Date(workspace.created_at),
          updatedAt: new Date(workspace.updated_at)
        },
        members: members.map(m => ({
          id: m.id,
          workspaceId: m.workspace_id,
          userId: m.user_id,
          role: m.role,
          joinedAt: new Date(m.joined_at),
          lastActiveAt: new Date(m.last_active_at)
        })),
        documents: documents.map(d => ({
          id: d.id,
          workspaceId: d.workspace_id,
          documentId: d.document_id,
          addedBy: d.added_by,
          addedAt: new Date(d.added_at),
          position: d.position,
          tags: d.tags,
          notes: d.notes
        })),
        recentActivity: activities.map(a => ({
          id: a.id,
          workspaceId: a.workspace_id,
          userId: a.user_id,
          action: a.action,
          targetId: a.target_id,
          targetType: a.target_type,
          metadata: a.metadata,
          createdAt: new Date(a.created_at)
        }))
      };
    } catch (error) {
      logger.error('Error getting workspace:', error);
      throw error;
    }
  }

  /**
   * Get user's workspaces
   */
  static async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    try {
      const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId);

      if (error) throw error;

      const workspaceIds = memberships.map(m => m.workspace_id);

      const { data: workspaces, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds)
        .order('updated_at', { ascending: false });

      if (wsError) throw wsError;

      return workspaces.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        ownerId: w.owner_id,
        settings: w.settings,
        createdAt: new Date(w.created_at),
        updatedAt: new Date(w.updated_at)
      }));
    } catch (error) {
      logger.error('Error getting user workspaces:', error);
      throw error;
    }
  }

  /**
   * Search workspaces
   */
  static async searchWorkspaces(query: string, userId: string): Promise<Workspace[]> {
    try {
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('settings->isPublic', true)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return workspaces.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        ownerId: w.owner_id,
        settings: w.settings,
        createdAt: new Date(w.created_at),
        updatedAt: new Date(w.updated_at)
      }));
    } catch (error) {
      logger.error('Error searching workspaces:', error);
      throw error;
    }
  }

  /**
   * Update member activity timestamp
   */
  static async updateMemberActivity(workspaceId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('workspace_members')
        .update({ last_active_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);
    } catch (error) {
      logger.error('Error updating member activity:', error);
    }
  }

  /**
   * Generate AI insights for workspace
   */
  static async generateWorkspaceInsights(workspaceId: string): Promise<{
    summary: string;
    themes: string[];
    recommendations: string[];
    connections: Array<{ doc1: string; doc2: string; reason: string }>;
  }> {
    try {
      const { documents } = await this.getWorkspace(workspaceId);
      
      if (documents.length < 2) {
        return {
          summary: 'Add more documents to generate insights',
          themes: [],
          recommendations: [],
          connections: []
        };
      }

      // Get document contents
      const { data: docs } = await supabase
        .from('documents')
        .select('id, title, content')
        .in('id', documents.map(d => d.documentId));

      if (!docs || docs.length === 0) {
        throw new Error('No documents found');
      }

      const aiService = new AIService();
      const prompt = `Analyze this collection of documents and provide insights:

Documents:
${docs.map((d, i) => `${i + 1}. ${d.title}\n${d.content?.substring(0, 500)}...`).join('\n\n')}

Provide:
1. A brief summary of the workspace's focus
2. Main themes across documents
3. Recommendations for additional research or documents
4. Potential connections between documents

Format as JSON:
{
  "summary": "...",
  "themes": ["theme1", "theme2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "connections": [{"doc1": "title1", "doc2": "title2", "reason": "..."}, ...]
}`;

      const response = await aiService.generateResponse('system', {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 1000
      });

      if (!response) throw new Error('Failed to generate insights');

      return JSON.parse(response.content);
    } catch (error) {
      logger.error('Error generating workspace insights:', error);
      return {
        summary: 'Unable to generate insights',
        themes: [],
        recommendations: [],
        connections: []
      };
    }
  }

  /**
   * Generate diff between two content versions
   */
  private static generateDiff(oldContent: string, newContent: string): any {
    // Simple line-based diff
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diff = [];

    let i = 0, j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i >= oldLines.length) {
        diff.push({ type: 'add', line: j + 1, content: newLines[j] });
        j++;
      } else if (j >= newLines.length) {
        diff.push({ type: 'remove', line: i + 1, content: oldLines[i] });
        i++;
      } else if (oldLines[i] === newLines[j]) {
        i++;
        j++;
      } else {
        diff.push({ type: 'remove', line: i + 1, content: oldLines[i] });
        diff.push({ type: 'add', line: j + 1, content: newLines[j] });
        i++;
        j++;
      }
    }

    return diff;
  }

  /**
   * Log workspace activity
   */
  private static async logActivity(
    workspaceId: string,
    userId: string,
    action: WorkspaceActivity['action'],
    targetId?: string,
    targetType?: WorkspaceActivity['targetType'],
    metadata?: any
  ): Promise<void> {
    try {
      await supabase
        .from('workspace_activity')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          action,
          target_id: targetId,
          target_type: targetType,
          metadata,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error logging workspace activity:', error);
    }
  }
}