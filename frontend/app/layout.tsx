import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth';
import { ProviderProvider } from '@/contexts/provider';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler';
import { ToastContainer, ToastProvider } from '@/components/Toast';
import { defaultMetadata } from '@/utils/metadata';
import './globals.css';

const geistSans = Geist({ 
  variable: '--font-geist-sans', 
  subsets: ['latin'] 
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = defaultMetadata;

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <AuthProvider>
            <ProviderProvider>
              <GlobalErrorHandler>
                {children}
              </GlobalErrorHandler>
              <ToastContainer />
            </ProviderProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}