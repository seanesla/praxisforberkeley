import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Document Workspace',
  'Collaborative document workspace with version control. Work together on documents in real-time.',
  '/workspace',
  ['workspace', 'collaboration', 'documents', 'version control', 'teamwork']
);

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}