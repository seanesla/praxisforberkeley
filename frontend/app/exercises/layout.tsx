import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Interactive Exercises',
  'Practice with AI-generated exercises tailored to your learning materials. Multiple question types to reinforce understanding.',
  '/exercises',
  ['exercises', 'practice', 'quiz', 'learning', 'interactive']
);

export default function ExercisesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}