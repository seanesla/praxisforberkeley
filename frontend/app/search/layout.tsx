import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Advanced Search',
  'Powerful semantic search across all your documents. Find exactly what you need with AI-enhanced search capabilities.',
  '/search',
  ['search', 'semantic search', 'AI search', 'documents', 'find']
);

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}