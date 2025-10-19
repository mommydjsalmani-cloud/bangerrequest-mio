"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EventoRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dj/libere');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-xl">Reindirizzamento al pannello Richieste Libere...</div>
    </div>
  );
}
