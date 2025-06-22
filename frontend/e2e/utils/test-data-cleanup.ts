import { Page } from '@playwright/test';
import { TEST_CONFIG } from '../config/test-config';

interface TestEntity {
  id: string;
  type: 'user' | 'document' | 'flashcard' | 'workspace' | 'report';
  createdAt: Date;
}

export class TestDataCleanup {
  private static entities: TestEntity[] = [];
  private static isEnabled = true;

  static disable() {
    this.isEnabled = false;
  }

  static enable() {
    this.isEnabled = true;
  }

  static register(id: string, type: TestEntity['type']) {
    if (!this.isEnabled) return;
    
    this.entities.push({
      id,
      type,
      createdAt: new Date()
    });
    
    console.log(`[Cleanup] Registered ${type}: ${id}`);
  }

  static async cleanup(page: Page) {
    if (!this.isEnabled || this.entities.length === 0) return;
    
    console.log(`[Cleanup] Starting cleanup of ${this.entities.length} entities`);
    
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    if (!token) {
      console.warn('[Cleanup] No auth token found, skipping cleanup');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Group entities by type for batch operations
    const grouped = this.entities.reduce((acc, entity) => {
      if (!acc[entity.type]) acc[entity.type] = [];
      acc[entity.type].push(entity);
      return acc;
    }, {} as Record<string, TestEntity[]>);

    // Cleanup in reverse dependency order
    const cleanupOrder: TestEntity['type'][] = [
      'report', 'workspace', 'flashcard', 'document', 'user'
    ];

    for (const type of cleanupOrder) {
      const entities = grouped[type];
      if (!entities || entities.length === 0) continue;

      await this.cleanupEntities(page, type, entities, headers);
    }

    // Clear the registry
    this.entities = [];
    console.log('[Cleanup] Cleanup completed');
  }

  private static async cleanupEntities(
    page: Page,
    type: TestEntity['type'],
    entities: TestEntity[],
    headers: Record<string, string>
  ) {
    console.log(`[Cleanup] Cleaning up ${entities.length} ${type}(s)`);

    for (const entity of entities) {
      try {
        const endpoint = this.getCleanupEndpoint(type, entity.id);
        
        const response = await page.request.delete(endpoint, { headers });
        
        if (response.ok()) {
          console.log(`[Cleanup] ✓ Deleted ${type}: ${entity.id}`);
        } else {
          console.warn(`[Cleanup] ✗ Failed to delete ${type}: ${entity.id} (${response.status()})`);
        }
      } catch (error) {
        console.error(`[Cleanup] Error deleting ${type} ${entity.id}:`, error);
      }

      // Small delay to avoid overwhelming the API
      await page.waitForTimeout(100);
    }
  }

  private static getCleanupEndpoint(type: TestEntity['type'], id: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    switch (type) {
      case 'user':
        return `${baseUrl}/api/test/users/${id}`;
      case 'document':
        return `${baseUrl}/api/documents/${id}`;
      case 'flashcard':
        return `${baseUrl}/api/flashcards/sets/${id}`;
      case 'workspace':
        return `${baseUrl}/api/document-workspaces/${id}`;
      case 'report':
        return `${baseUrl}/api/reports/${id}`;
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }
  }

  // Utility to generate test IDs
  static generateTestId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${TEST_CONFIG.testData.userPrefix}${prefix}_${timestamp}_${random}`;
  }

  // Check if an ID is a test entity
  static isTestEntity(id: string): boolean {
    return id.startsWith(TEST_CONFIG.testData.userPrefix) || 
           id.startsWith(TEST_CONFIG.testData.documentPrefix);
  }

  // Get age of entities for cleanup decisions
  static getOldEntities(maxAgeMinutes: number = 60): TestEntity[] {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    return this.entities.filter(e => e.createdAt < cutoff);
  }

  // Export cleanup summary
  static getSummary(): Record<string, number> {
    return this.entities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// Cleanup hook for test files
export function useTestCleanup(page: Page) {
  return {
    registerUser: (id: string) => TestDataCleanup.register(id, 'user'),
    registerDocument: (id: string) => TestDataCleanup.register(id, 'document'),
    registerFlashcard: (id: string) => TestDataCleanup.register(id, 'flashcard'),
    registerWorkspace: (id: string) => TestDataCleanup.register(id, 'workspace'),
    registerReport: (id: string) => TestDataCleanup.register(id, 'report'),
    cleanup: () => TestDataCleanup.cleanup(page),
    generateId: (prefix: string) => TestDataCleanup.generateTestId(prefix)
  };
}