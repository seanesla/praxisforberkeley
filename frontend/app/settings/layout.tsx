import { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Settings',
  'Manage your account settings, API keys, and preferences. Customize your learning experience.',
  '/settings',
  ['settings', 'preferences', 'account', 'configuration', 'API keys']
);

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}