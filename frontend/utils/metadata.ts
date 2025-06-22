import { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://praxisforberkeley.com';

export const defaultMetadata: Metadata = {
  title: {
    template: '%s | Praxis Learning Platform',
    default: 'Praxis Learning Platform',
  },
  description: 'AI-powered learning platform for Berkeley students. Create flashcards, notes, and mindmaps from any document.',
  keywords: ['learning', 'AI', 'flashcards', 'notes', 'mindmaps', 'Berkeley', 'education', 'study'],
  authors: [{ name: 'Praxis Team' }],
  creator: 'Praxis for Berkeley',
  publisher: 'Praxis for Berkeley',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: 'Praxis Learning Platform',
    description: 'AI-powered learning platform for Berkeley students',
    url: BASE_URL,
    siteName: 'Praxis',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Praxis Learning Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Praxis Learning Platform',
    description: 'AI-powered learning platform for Berkeley students',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export function generatePageMetadata(
  title: string,
  description: string,
  path?: string,
  keywords?: string[]
): Metadata {
  const url = path ? `${BASE_URL}${path}` : BASE_URL;
  
  return {
    title,
    description,
    keywords: keywords ? [...(defaultMetadata.keywords as string[]), ...keywords] : defaultMetadata.keywords,
    openGraph: {
      ...defaultMetadata.openGraph,
      title,
      description,
      url,
    },
    twitter: {
      ...defaultMetadata.twitter,
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}