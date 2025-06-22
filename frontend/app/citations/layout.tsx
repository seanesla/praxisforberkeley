import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Citation Network Analysis',
  'Visualize and analyze citation networks. Discover connections between documents and identify influential sources.',
  '/citations',
  ['citations', 'network analysis', 'visualization', 'research', 'academic']
);

export default function CitationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}