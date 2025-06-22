import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Learning Analytics',
  'Track your learning progress with detailed analytics. Visualize your performance and identify areas for improvement.',
  '/analytics',
  ['analytics', 'progress', 'statistics', 'performance', 'tracking']
);

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}