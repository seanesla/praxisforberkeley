import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Study - Spaced Repetition',
  'Master your flashcards with scientifically-proven spaced repetition. Track your progress and maintain study streaks.',
  '/study',
  ['spaced repetition', 'flashcards', 'study', 'learning', 'memory']
);

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}