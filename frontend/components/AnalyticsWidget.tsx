'use client';

import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function AnalyticsWidget() {
  const [activeTab, setActiveTab] = useState<'study' | 'activity'>('study');

  // Study progress data
  const studyData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Cards Studied',
        data: [45, 52, 38, 65, 48, 72, 55],
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Activity data
  const activityData = {
    labels: ['Documents', 'Notes', 'Flashcards', 'Mind Maps', 'AI Chats'],
    datasets: [
      {
        label: 'This Week',
        data: [12, 28, 15, 8, 34],
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(99, 102, 241, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'rgb(243, 244, 246)',
        bodyColor: 'rgb(209, 213, 219)',
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        titleFont: {
          size: 14,
          weight: '500' as const
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12
          }
        }
      }
    }
  };

  const barOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: false
      }
    }
  };

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Analytics</h2>
        
        {/* Tab switcher */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('study')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              activeTab === 'study'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Study Progress
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              activeTab === 'activity'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Activity
          </button>
        </div>
      </div>

      <div className="h-64">
        {activeTab === 'study' ? (
          <Line data={studyData} options={chartOptions} />
        ) : (
          <Bar data={activityData} options={barOptions} />
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">327</p>
          <p className="text-xs text-gray-400 mt-1">Total this week</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">+12%</p>
          <p className="text-xs text-gray-400 mt-1">From last week</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">89%</p>
          <p className="text-xs text-gray-400 mt-1">Retention rate</p>
        </div>
      </div>
    </div>
  );
}