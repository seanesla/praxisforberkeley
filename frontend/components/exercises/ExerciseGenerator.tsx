'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { toast } from 'react-hot-toast';
import { makeInteractive } from '@/utils/accessibility';
import { 
  DocumentTextIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface ExerciseType {
  type: string;
  name: string;
  description: string;
  selected: boolean;
  difficulty: number;
}

interface GeneratorProps {
  documentId: string;
  onGenerated: (exercises: any[]) => void;
}

export function ExerciseGenerator({ documentId, onGenerated }: GeneratorProps) {
  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([
    {
      type: 'multiple_choice',
      name: 'Multiple Choice',
      description: 'Questions with multiple answer options',
      selected: true,
      difficulty: 0.5
    },
    {
      type: 'true_false',
      name: 'True/False',
      description: 'Simple true or false questions',
      selected: true,
      difficulty: 0.3
    },
    {
      type: 'fill_blank',
      name: 'Fill in the Blank',
      description: 'Complete sentences with missing words',
      selected: true,
      difficulty: 0.6
    },
    {
      type: 'short_answer',
      name: 'Short Answer',
      description: 'Open-ended questions requiring brief responses',
      selected: false,
      difficulty: 0.7
    },
    {
      type: 'matching',
      name: 'Matching',
      description: 'Match related items together',
      selected: false,
      difficulty: 0.5
    },
    {
      type: 'ordering',
      name: 'Ordering',
      description: 'Put items in the correct sequence',
      selected: false,
      difficulty: 0.6
    }
  ]);
  
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  const toggleType = (index: number) => {
    const updated = [...exerciseTypes];
    updated[index].selected = !updated[index].selected;
    setExerciseTypes(updated);
  };

  const generateExercises = async () => {
    const selectedTypes = exerciseTypes
      .filter(t => t.selected)
      .map(t => ({ type: t.type, difficulty: t.difficulty }));

    if (selectedTypes.length === 0) {
      toast.error('Please select at least one exercise type');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/exercises/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          document_id: documentId,
          count,
          exercise_types: selectedTypes
        })
      });

      if (!response.ok) throw new Error('Failed to generate exercises');

      const data = await response.json();
      toast.success(`Generated ${data.exercises.length} exercises!`);
      onGenerated(data.exercises);
    } catch (error) {
      console.error('Error generating exercises:', error);
      toast.error('Failed to generate exercises');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="flex items-center mb-6">
        <SparklesIcon className="w-6 h-6 text-purple-400 mr-3" />
        <h3 className="text-lg font-semibold text-white">Generate Exercises</h3>
      </div>

      {/* Exercise Types */}
      <div className="mb-6">
        <label className="text-sm text-gray-400 mb-3 block">Exercise Types</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exerciseTypes.map((type, index) => (
            <div
              key={type.type}
              {...makeInteractive(() => toggleType(index), {
                role: 'checkbox',
                ariaLabel: `${type.name}: ${type.description}`,
                ariaPressed: type.selected
              })}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                type.selected
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500'
              }`}
            >
              <div className="flex items-start">
                <div className={`mt-0.5 mr-3 w-4 h-4 rounded border-2 flex items-center justify-center ${
                  type.selected ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                }`}>
                  {type.selected && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{type.name}</p>
                  <p className="text-sm text-gray-400 mt-1">{type.description}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <span>Difficulty:</span>
                    <div className="flex ml-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full mx-0.5 ${
                            i < type.difficulty * 5 ? 'bg-purple-500' : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Count Slider */}
      <div className="mb-6">
        <label className="text-sm text-gray-400 mb-3 block">
          Number of Exercises: {count}
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="5"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5</span>
          <span>50</span>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={generateExercises}
        disabled={generating}
        className="w-full"
      >
        {generating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Generating Exercises...
          </>
        ) : (
          <>
            <SparklesIcon className="w-4 h-4 mr-2" />
            Generate {count} Exercises
          </>
        )}
      </Button>
    </div>
  );
}