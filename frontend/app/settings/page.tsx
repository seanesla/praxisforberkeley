'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { apiClient } from '@/utils/api-client';
import { toast } from 'react-toastify';
import { 
  ChevronLeftIcon,
  KeyIcon,
  UserIcon,
  CogIcon,
  BellIcon,
  PuzzlePieceIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form states
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: ''
  });
  
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    vapi: ''
  });
  
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    anthropic: false,
    google: false,
    vapi: false
  });
  
  const [maskedKeys, setMaskedKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    vapi: ''
  });
  
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    notifications: true,
    autoSave: true,
    studyReminders: true
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    // Initialize with user data
    setProfile({
      name: user.user_metadata?.name || '',
      email: user.email || '',
      bio: user.user_metadata?.bio || ''
    });
    
    // Load existing API keys (masked)
    loadApiKeys();
  }, [user, router]);
  
  const loadApiKeys = async () => {
    try {
      const response = await apiClient.get('/api/auth/api-keys');
      if (response.apiKeys) {
        setMaskedKeys(response.apiKeys);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        setSuccessMessage('Profile updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKeys = async () => {
    setIsLoading(true);
    try {
      // Only send keys that have been modified (not empty)
      const keysToUpdate = Object.entries(apiKeys).reduce((acc, [key, value]) => {
        if (value && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      if (Object.keys(keysToUpdate).length === 0) {
        toast.warning('No API keys to update');
        setIsLoading(false);
        return;
      }
      
      await apiClient.put('/api/auth/api-keys', keysToUpdate);
      
      toast.success('API keys encrypted and saved successfully');
      // Clear the input fields after successful save
      setApiKeys({
        openai: '',
        anthropic: '',
        google: '',
        vapi: ''
      });
      // Reload masked keys
      await loadApiKeys();
    } catch (error) {
      toast.error('Failed to update API keys');
      console.error('Error updating API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        setSuccessMessage('Preferences updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'api-keys', label: 'API Keys', icon: KeyIcon },
    { id: 'preferences', label: 'Preferences', icon: CogIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'integrations', label: 'Integrations', icon: PuzzlePieceIcon }
  ];

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
              <h1 className="text-xl font-semibold text-white">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="glass-card">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">Profile Information</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="glass-input"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="glass-input opacity-50 cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        rows={4}
                        className="glass-input resize-none"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="glass-button"
                  >
                    {isLoading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              )}

              {/* API Keys Tab */}
              {activeTab === 'api-keys' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">API Keys</h2>
                  <p className="text-gray-400">Manage your API keys for AI providers</p>
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      <strong>Security Notice:</strong> API keys are encrypted before storage. 
                      Existing keys are shown as masked values. Only enter new keys to update them.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        OpenAI API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys.openai ? "text" : "password"}
                          value={apiKeys.openai || maskedKeys.openai || ''}
                          onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                          placeholder={maskedKeys.openai ? "Key configured (enter new key to update)" : "sk-..."}
                          className="glass-input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, openai: !showApiKeys.openai })}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showApiKeys.openai ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Anthropic API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys.anthropic ? "text" : "password"}
                          value={apiKeys.anthropic || maskedKeys.anthropic || ''}
                          onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                          placeholder={maskedKeys.anthropic ? "Key configured (enter new key to update)" : "sk-ant-..."}
                          className="glass-input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, anthropic: !showApiKeys.anthropic })}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showApiKeys.anthropic ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Google AI API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys.google ? "text" : "password"}
                          value={apiKeys.google || maskedKeys.google || ''}
                          onChange={(e) => setApiKeys({ ...apiKeys, google: e.target.value })}
                          placeholder={maskedKeys.google ? "Key configured (enter new key to update)" : "AIza..."}
                          className="glass-input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, google: !showApiKeys.google })}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showApiKeys.google ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Vapi API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys.vapi ? "text" : "password"}
                          value={apiKeys.vapi || maskedKeys.vapi || ''}
                          onChange={(e) => setApiKeys({ ...apiKeys, vapi: e.target.value })}
                          placeholder={maskedKeys.vapi ? "Key configured (enter new key to update)" : "Enter Vapi API key"}
                          className="glass-input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({ ...showApiKeys, vapi: !showApiKeys.vapi })}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showApiKeys.vapi ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSaveApiKeys}
                    disabled={isLoading}
                    className="glass-button"
                  >
                    {isLoading ? 'Saving...' : 'Save API Keys'}
                  </button>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">Preferences</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Theme
                      </label>
                      <select
                        value={preferences.theme}
                        onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                        className="glass-input"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifications}
                          onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white">Enable notifications</span>
                      </label>
                      
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.autoSave}
                          onChange={(e) => setPreferences({ ...preferences, autoSave: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white">Auto-save documents</span>
                      </label>
                      
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.studyReminders}
                          onChange={(e) => setPreferences({ ...preferences, studyReminders: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-white">Study reminders</span>
                      </label>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSavePreferences}
                    disabled={isLoading}
                    className="glass-button"
                  >
                    {isLoading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">Notification Settings</h2>
                  <p className="text-gray-400">Choose what notifications you want to receive</p>
                  
                  <div className="text-center py-12 text-gray-500">
                    Coming soon...
                  </div>
                </div>
              )}

              {/* Integrations Tab */}
              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">Integrations</h2>
                  <p className="text-gray-400">Connect with third-party services</p>
                  
                  <div className="text-center py-12 text-gray-500">
                    Coming soon...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}