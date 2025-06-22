import { Page } from '@playwright/test';
import { supabase } from '../fixtures/supabase-client';

export async function createTestUser(email: string, password: string, name?: string) {
  try {
    // Create user via Supabase Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || 'Test User',
      }
    });

    if (error) {
      console.error('Error creating test user:', error);
      throw error;
    }

    return data.user;
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  }
}

export async function deleteTestUser(email: string) {
  try {
    // Find user by email
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error('Error searching for user:', searchError);
      return;
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.log('User not found for deletion:', email);
      return;
    }

    // Delete user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Error deleting test user:', deleteError);
    }
  } catch (error) {
    console.error('Failed to delete test user:', error);
  }
}

export async function authenticateUser(page: Page, email: string, password: string) {
  // Navigate to login page
  await page.goto('/login');
  
  // Fill in credentials
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  
  // Submit form
  await page.getByRole('button', { name: 'Sign in' }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  
  // Verify authentication
  await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });
}

export async function logoutUser(page: Page) {
  // Click user menu
  await page.locator('[data-testid="user-menu"]').click();
  
  // Click logout
  await page.getByRole('button', { name: 'Logout' }).click();
  
  // Wait for redirect to home
  await page.waitForURL('/');
}