"use client";

import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';

export default function ConditionalHeader() {
  const pathname = usePathname();
  
  // Non mostrare l'header nella homepage
  if (pathname === '/') {
    return null;
  }

  return (
    <header className="w-full flex items-center justify-center pt-4 pb-1">
      <Logo size={60} className="opacity-60 transition-all hover:opacity-80 hover:scale-105" priority />
    </header>
  );
}