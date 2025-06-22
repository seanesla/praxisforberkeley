'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/Logo';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { 
  ChevronLeftIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'templates' | 'generated'>('templates');
  const [templates, setTemplates] = useState<any[]>([]);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchReportData();
  }, [user, router]);

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch report templates
      const templatesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Fetch generated reports
      const reportsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (templatesResponse.ok) {
        const data = await templatesResponse.json();
        setTemplates(data.templates || []);
      }
      
      if (reportsResponse.ok) {
        const data = await reportsResponse.json();
        setGeneratedReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async (templateId: string, params: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templateId, params })
      });

      if (response.ok) {
        await fetchReportData();
        setActiveTab('generated');
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const exportReport = async (reportId: string, format: 'pdf' | 'docx' | 'markdown') => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${reportId}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading reports...</div>
      </div>
    );
  }

  const reportTemplates = [
    {
      id: 'research-summary',
      name: 'Research Summary',
      description: 'Comprehensive summary of your research findings',
      icon: '📊',
      fields: ['topic', 'dateRange', 'includeCharts']
    },
    {
      id: 'literature-review',
      name: 'Literature Review',
      description: 'Systematic review of academic literature',
      icon: '📚',
      fields: ['topic', 'sources', 'methodology']
    },
    {
      id: 'progress-report',
      name: 'Progress Report',
      description: 'Track your learning progress over time',
      icon: '📈',
      fields: ['period', 'metrics', 'goals']
    },
    {
      id: 'knowledge-synthesis',
      name: 'Knowledge Synthesis',
      description: 'Synthesize information from multiple sources',
      icon: '🧩',
      fields: ['documents', 'themes', 'connections']
    },
    {
      id: 'study-guide',
      name: 'Study Guide',
      description: 'Create a comprehensive study guide',
      icon: '📖',
      fields: ['subject', 'level', 'format']
    }
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
              <h1 className="text-xl font-semibold text-white">Reports</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center py-8">
            <DocumentTextIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">
              Generate Professional Reports
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Transform your knowledge into beautifully formatted reports with AI assistance
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('templates')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'templates' 
                  ? 'text-purple-400 border-b-2 border-purple-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Report Templates
            </button>
            <button
              onClick={() => setActiveTab('generated')}
              className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'generated' 
                  ? 'text-purple-400 border-b-2 border-purple-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Generated Reports
              {generatedReports.length > 0 && (
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                  {generatedReports.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          {activeTab === 'templates' ? (
            <div className="space-y-6">
              {selectedTemplate ? (
                <div className="glass-card">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-gray-400 hover:text-white mb-4"
                  >
                    ← Back to templates
                  </button>
                  <ReportGenerator
                    template={selectedTemplate}
                    onGenerate={(params) => handleGenerateReport(selectedTemplate.id, params)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reportTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className="glass-card hover:bg-gray-700 transition-all text-left group"
                    >
                      <div className="text-4xl mb-4">{template.icon}</div>
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-400">{template.description}</p>
                      <div className="mt-4 flex items-center gap-2 text-purple-400">
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-sm">AI-Powered</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {generatedReports.length > 0 ? (
                <div className="space-y-4">
                  {generatedReports.map((report) => (
                    <div key={report.id} className="glass-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2">{report.title}</h3>
                          <p className="text-sm text-gray-400 mb-4">{report.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-4 h-4" />
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                            <span>{report.template}</span>
                            <span>{report.pageCount} pages</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => router.push(`/reports/${report.id}`)}
                            className="px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            View
                          </button>
                          <div className="relative group">
                            <button className="p-2 text-gray-400 hover:text-white transition-colors">
                              <ArrowDownTrayIcon className="w-5 h-5" />
                            </button>
                            <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                              <button
                                onClick={() => exportReport(report.id, 'pdf')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                              >
                                Export as PDF
                              </button>
                              <button
                                onClick={() => exportReport(report.id, 'docx')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                              >
                                Export as Word
                              </button>
                              <button
                                onClick={() => exportReport(report.id, 'markdown')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                              >
                                Export as Markdown
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card text-center py-12">
                  <DocumentTextIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No reports generated yet</p>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Create your first report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}