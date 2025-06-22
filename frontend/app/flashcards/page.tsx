'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Brain, Plus, BarChart } from 'lucide-react';
import { FlashcardList } from '@/components/flashcards/FlashcardList';
import { FlashcardGenerator } from '@/components/flashcards/FlashcardGenerator';
import { FlashcardStats } from '@/components/flashcards/FlashcardStats';
import { FlashcardStudy } from '@/components/flashcards/FlashcardStudy';
import { documentsApi } from '@/lib/api/documents';
import { flashcardsApi } from '@/lib/api/flashcards';
import { Flashcard } from '@/types';

export default function FlashcardsPage() {
  const [activeTab, setActiveTab] = useState('cards');
  const [isStudying, setIsStudying] = useState(false);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);

  // Fetch documents for the generator
  const { data: documentsData } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.getDocuments,
  });

  // Fetch due flashcards
  const { data: dueData } = useQuery({
    queryKey: ['flashcards-due'],
    queryFn: () => flashcardsApi.getDueFlashcards(),
  });

  const documents = documentsData?.documents || [];
  const dueFlashcards = dueData?.flashcards || [];

  const handleStartStudy = (cards: Flashcard[]) => {
    setStudyCards(cards);
    setIsStudying(true);
  };

  const handleStudyComplete = (stats: any) => {
    setIsStudying(false);
    setStudyCards([]);
    setActiveTab('stats');
    // TODO: Show completion modal with stats
  };

  const handleExitStudy = () => {
    setIsStudying(false);
    setStudyCards([]);
  };

  if (isStudying) {
    return (
      <div className="container mx-auto py-8">
        <FlashcardStudy
          flashcards={studyCards}
          onComplete={handleStudyComplete}
          onExit={handleExitStudy}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Flashcards</h1>
          <p className="text-muted-foreground mt-1">
            Master your knowledge with spaced repetition
          </p>
        </div>
        
        {dueFlashcards.length > 0 && (
          <Button 
            size="lg"
            onClick={() => handleStartStudy(dueFlashcards)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Brain className="h-5 w-5 mr-2" />
            Study {dueFlashcards.length} Due Cards
          </Button>
        )}
      </div>

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="cards">My Cards</TabsTrigger>
          <TabsTrigger value="generate">
            <Plus className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart className="h-4 w-4 mr-2" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-6">
          <FlashcardList
            onStudyClick={handleStartStudy}
          />
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="lg:col-span-1">
              <FlashcardGenerator
                documents={documents}
                onSuccess={() => setActiveTab('cards')}
              />
            </div>
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tips for Better Flashcards</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-1">Choose the Right Type</p>
                    <p>Basic Q&A for definitions, Cloze for facts, Multiple Choice for concepts</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-1">Start with Medium Difficulty</p>
                    <p>You can always adjust based on your performance</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-1">Quality over Quantity</p>
                    <p>10-20 well-crafted cards are better than 50 poor ones</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-1">Review Regularly</p>
                    <p>The spaced repetition algorithm works best with consistent practice</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <FlashcardStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}