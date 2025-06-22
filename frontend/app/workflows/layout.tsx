import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Workflow Automation',
  'Build automated workflows for your learning process. Create triggers and actions to streamline your study routine.',
  '/workflows',
  ['automation', 'workflows', 'triggers', 'productivity', 'efficiency']
);

export default function WorkflowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}