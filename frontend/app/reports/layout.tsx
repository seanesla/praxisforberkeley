import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Smart Reports',
  'Generate comprehensive reports from your documents. Export in multiple formats with customizable templates.',
  '/reports',
  ['reports', 'export', 'templates', 'documents', 'PDF']
);

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}