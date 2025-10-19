"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DJRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect direttamente al pannello richieste libere
    router.replace('/dj/libere');
  }, [router]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-xl">Reindirizzamento...</div>
    </div>
  );
}