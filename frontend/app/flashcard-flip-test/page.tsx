'use client';

import { useState } from 'react';

export default function FlashcardFlipTest() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    setIsFlipped(prev => !prev);
    console.log(`Click ${clickCount + 1}: Flipping to ${!isFlipped}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-center">Card Flip Test</h1>
        
        <div className="mb-4 text-center">
          <p>Click count: {clickCount}</p>
          <p>Is flipped: {isFlipped ? 'Yes' : 'No'}</p>
        </div>

        <div 
          className={`relative min-h-[300px] p-8 cursor-pointer transition-all duration-300 glass rounded-xl hover:shadow-lg ${
            isFlipped ? 'bg-white/20' : ''
          }`}
          onClick={handleClick}
        >
          <div className="absolute top-4 right-4">
            <span className="px-2 py-1 text-xs border border-white/20 rounded-lg bg-white/10">
              {isFlipped ? 'Answer' : 'Question'}
            </span>
          </div>

          <div className="flex items-center justify-center h-full min-h-[200px]">
            {!isFlipped ? (
              <div className="text-lg">
                <p className="text-xl font-semibold mb-2">What is React?</p>
                <p className="text-sm text-gray-400">Click to see the answer</p>
              </div>
            ) : (
              <div className="text-lg">
                <p className="text-xl font-semibold mb-4 text-purple-400">Answer:</p>
                <p>React is a JavaScript library for building user interfaces, particularly single-page applications where you need a fast, interactive user experience.</p>
                <div className="mt-6 flex gap-3 justify-center">
                  <button className="px-3 py-1.5 text-sm text-red-400 border border-red-400/50 hover:bg-red-400/10 rounded-lg">
                    Hard
                  </button>
                  <button className="px-3 py-1.5 text-sm text-yellow-400 border border-yellow-400/50 hover:bg-yellow-400/10 rounded-lg">
                    Medium
                  </button>
                  <button className="px-3 py-1.5 text-sm text-green-400 border border-green-400/50 hover:bg-green-400/10 rounded-lg">
                    Easy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Debug Info</h2>
          <pre className="text-sm text-gray-400 overflow-x-auto">
{JSON.stringify({
  isFlipped,
  clickCount,
  currentSide: isFlipped ? 'answer' : 'question',
  timestamp: new Date().toISOString()
}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}