import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Knowledge Gap Analysis',
  'Identify and fill knowledge gaps in your learning journey. AI-powered analysis creates personalized learning paths.',
  '/knowledge-gaps',
  ['knowledge gaps', 'analysis', 'learning path', 'personalized', 'AI']
);

export default function KnowledgeGapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}