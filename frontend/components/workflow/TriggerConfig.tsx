'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  XMarkIcon,
  ClockIcon,
  BoltIcon,
  DocumentTextIcon,
  CursorArrowRaysIcon,
  CalendarDaysIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface TriggerConfigProps {
  trigger: any;
  onChange: (trigger: any) => void;
  onClose: () => void;
}

interface TriggerType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  configFields: ConfigField[];
}

interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'cron' | 'event';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}

const triggerTypes: TriggerType[] = [
  {
    id: 'manual',
    name: 'Manual Trigger',
    description: 'Run workflow manually on demand',
    icon: <CursorArrowRaysIcon className="w-5 h-5" />,
    configFields: []
  },
  {
    id: 'time',
    name: 'Scheduled',
    description: 'Run workflow on a schedule',
    icon: <ClockIcon className="w-5 h-5" />,
    configFields: [
      {
        name: 'schedule',
        label: 'Schedule',
        type: 'select',
        options: [
          { value: 'daily', label: 'Daily at 9 AM' },
          { value: 'weekly', label: 'Weekly on Monday' },
          { value: 'monthly', label: 'Monthly on 1st' },
          { value: 'custom', label: 'Custom Schedule' }
        ],
        required: true
      },
      {
        name: 'customCron',
        label: 'Cron Expression',
        type: 'text',
        placeholder: '0 9 * * *',
        required: false
      }
    ]
  },
  {
    id: 'event',
    name: 'Event-based',
    description: 'Run when specific events occur',
    icon: <BoltIcon className="w-5 h-5" />,
    configFields: [
      {
        name: 'event',
        label: 'Event Type',
        type: 'select',
        options: [
          { value: 'document_added', label: 'Document Added' },
          { value: 'note_created', label: 'Note Created' },
          { value: 'flashcard_studied', label: 'Flashcard Studied' },
          { value: 'milestone_reached', label: 'Learning Milestone' },
          { value: 'gap_detected', label: 'Knowledge Gap Detected' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'data_change',
    name: 'Data Change',
    description: 'Run when data meets conditions',
    icon: <ServerIcon className="w-5 h-5" />,
    configFields: [
      {
        name: 'dataSource',
        label: 'Data Source',
        type: 'select',
        options: [
          { value: 'study_streak', label: 'Study Streak' },
          { value: 'document_count', label: 'Document Count' },
          { value: 'review_due', label: 'Reviews Due' },
          { value: 'knowledge_gap_count', label: 'Knowledge Gaps' }
        ],
        required: true
      },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        options: [
          { value: 'equals', label: 'Equals' },
          { value: 'greater_than', label: 'Greater Than' },
          { value: 'less_than', label: 'Less Than' },
          { value: 'changes', label: 'Changes' }
        ],
        required: true
      },
      {
        name: 'threshold',
        label: 'Threshold Value',
        type: 'number',
        placeholder: 'Enter value',
        required: true
      }
    ]
  }
];

export function TriggerConfig({ trigger, onChange, onClose }: TriggerConfigProps) {
  const [selectedType, setSelectedType] = useState(trigger.type || 'manual');
  const [config, setConfig] = useState(trigger.config || {});

  const currentTriggerType = triggerTypes.find(t => t.id === selectedType);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setConfig({}); // Reset config when type changes
    onChange({
      ...trigger,
      type,
      config: {},
      label: triggerTypes.find(t => t.id === type)?.name || 'Trigger'
    });
  };

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onChange({
      ...trigger,
      type: selectedType,
      config: newConfig,
      label: currentTriggerType?.name || 'Trigger'
    });
  };

  const renderConfigField = (field: ConfigField) => {
    switch (field.type) {
      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Select
              value={config[field.name] || ''}
              onValueChange={(value) => handleConfigChange(field.name, value)}
            >
              <SelectTrigger id={field.name}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'text':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              type="text"
              value={config[field.name] || ''}
              onChange={(e) => handleConfigChange(field.name, e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );
      
      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              type="number"
              value={config[field.name] || ''}
              onChange={(e) => handleConfigChange(field.name, parseInt(e.target.value))}
              placeholder={field.placeholder}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="w-96 h-full bg-white border-l shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Configure Trigger</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Trigger Type Selection */}
      <div className="p-4">
        <Label className="text-sm font-medium mb-3 block">Trigger Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {triggerTypes.map((type) => (
            <Card
              key={type.id}
              className={`p-3 cursor-pointer transition-all ${
                selectedType === type.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'hover:border-gray-300'
              }`}
              onClick={() => handleTypeChange(type.id)}
            >
              <div className="flex items-center space-x-2">
                <div className={selectedType === type.id ? 'text-blue-600' : 'text-gray-500'}>
                  {type.icon}
                </div>
                <span className="text-sm font-medium">{type.name}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Configuration */}
      {currentTriggerType && (
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="text-sm text-gray-600 mb-4">
            {currentTriggerType.description}
          </div>
          
          {currentTriggerType.configFields.length > 0 ? (
            <div className="space-y-4">
              {currentTriggerType.configFields.map(field => {
                // Only show custom cron field if schedule is set to custom
                if (field.name === 'customCron' && config.schedule !== 'custom') {
                  return null;
                }
                return renderConfigField(field);
              })}
            </div>
          ) : (
            <Card className="p-4 bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                No configuration needed for manual triggers
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Examples */}
      {selectedType === 'time' && config.schedule === 'custom' && (
        <div className="p-4 border-t">
          <p className="text-sm font-medium mb-2">Cron Examples:</p>
          <div className="space-y-1 text-xs text-gray-600">
            <p>• Daily at 9 AM: 0 9 * * *</p>
            <p>• Every Monday at 3 PM: 0 15 * * 1</p>
            <p>• Every hour: 0 * * * *</p>
            <p>• Every 30 minutes: */30 * * * *</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t">
        <Button onClick={onClose} className="w-full">
          Apply Configuration
        </Button>
      </div>
    </div>
  );
}