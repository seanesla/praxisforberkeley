'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface DocumentSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function DocumentSearch({ value, onChange }: DocumentSearchProps) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search documents..."
        className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
      />
    </div>
  );
}