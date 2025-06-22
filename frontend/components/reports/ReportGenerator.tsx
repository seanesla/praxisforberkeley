'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { toast } from 'react-hot-toast';
import { 
  DocumentTextIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  BeakerIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: any[];
  customizable_fields: any[];
}

interface ReportConfig {
  title: string;
  description?: string;
  template_id?: string;
  format: 'pdf' | 'docx' | 'html' | 'markdown';
  custom_values?: Record<string, any>;
  include_sections?: string[];
}

interface GeneratorProps {
  documentIds?: string[];
  noteIds?: string[];
  onGenerated?: (reportId: string) => void;
}

export function ReportGenerator({ documentIds = [], noteIds = [], onGenerated }: GeneratorProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [config, setConfig] = useState<ReportConfig>({
    title: '',
    description: '',
    format: 'pdf'
  });
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/reports/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load templates');

      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load report templates');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setConfig({
      ...config,
      template_id: template.id,
      include_sections: template.sections.map(s => s.id)
    });
    
    // Initialize custom values
    const values: Record<string, any> = {};
    template.customizable_fields?.forEach(field => {
      values[field.id] = field.default_value || '';
    });
    setCustomValues(values);
  };

  const generateReport = async () => {
    if (!config.title) {
      toast.error('Please enter a report title');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          config: {
            ...config,
            custom_values: customValues
          },
          document_ids: documentIds,
          note_ids: noteIds
        })
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const data = await response.json();
      toast.success('Report generated successfully!');
      
      if (onGenerated) {
        onGenerated(data.reportId);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'academic': return <AcademicCapIcon className="w-5 h-5" />;
      case 'business': return <BriefcaseIcon className="w-5 h-5" />;
      case 'technical': return <BeakerIcon className="w-5 h-5" />;
      default: return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {!selectedTemplate ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Choose a Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                onClick={() => selectTemplate(template)}
                className="glass-card cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-start justify-between mb-3">
                  {getCategoryIcon(template.category)}
                  <span className="text-xs text-gray-400 capitalize">
                    {template.category}
                  </span>
                </div>
                <h4 className="font-medium text-white mb-2">{template.name}</h4>
                <p className="text-sm text-gray-400">{template.description}</p>
                <div className="mt-3 text-xs text-gray-500">
                  {template.sections.length} sections
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected Template */}
          <div className="glass-card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{selectedTemplate.description}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setConfig({ ...config, template_id: undefined });
                }}
                className="text-gray-400 hover:text-white text-sm"
              >
                Change Template
              </button>
            </div>

            {/* Report Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Report Title</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="Enter report title..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description (Optional)</label>
                <textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Enter report description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Export Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['pdf', 'docx', 'html', 'markdown'] as const).map(format => (
                    <button
                      key={format}
                      onClick={() => setConfig({ ...config, format })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        config.format === format
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              {selectedTemplate.customizable_fields?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">Customize Report</h4>
                  <div className="space-y-3">
                    {selectedTemplate.customizable_fields.map(field => (
                      <div key={field.id}>
                        <label className="block text-sm text-gray-400 mb-1">
                          {field.label}
                        </label>
                        {field.type === 'text' && (
                          <input
                            type="text"
                            value={customValues[field.id] || ''}
                            onChange={(e) => setCustomValues({
                              ...customValues,
                              [field.id]: e.target.value
                            })}
                            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                          />
                        )}
                        {field.type === 'select' && (
                          <select
                            value={customValues[field.id] || ''}
                            onChange={(e) => setCustomValues({
                              ...customValues,
                              [field.id]: e.target.value
                            })}
                            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                          >
                            <option value="">Select...</option>
                            {field.options?.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Include Sections</h4>
                <div className="space-y-2">
                  {selectedTemplate.sections.map(section => (
                    <label
                      key={section.id}
                      className="flex items-center p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={config.include_sections?.includes(section.id)}
                        onChange={(e) => {
                          const sections = config.include_sections || [];
                          if (e.target.checked) {
                            setConfig({
                              ...config,
                              include_sections: [...sections, section.id]
                            });
                          } else {
                            setConfig({
                              ...config,
                              include_sections: sections.filter(s => s !== section.id)
                            });
                          }
                        }}
                        disabled={section.required}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{section.title}</p>
                        {section.required && (
                          <p className="text-xs text-gray-500">Required</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Source Summary */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-2">Report Sources</h4>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>{documentIds.length} documents selected</p>
                  <p>{noteIds.length} notes selected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateReport}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating Report...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}