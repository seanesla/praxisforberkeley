'use client';

// Redirect to the correct dashboard route
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function NoteRedirectPage() {
  const router = useRouter();
  const params = useParams();
  
  useEffect(() => {
    if (params?.id) {
      router.replace(`/dashboard/notes/${params.id}`);
    }
  }, [params?.id, router]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="mt-4">Redirecting...</p>
      </div>
    </div>
  );
}