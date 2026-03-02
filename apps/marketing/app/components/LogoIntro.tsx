'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function LogoIntro() {
  const [isVisible, setIsVisible] = useState(true);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Controlla se l'intro è già stata mostrata in questa sessione
    const introShown = sessionStorage.getItem('logoIntroShown');
    
    if (introShown) {
      setIsVisible(false);
      setHasShown(true);
      return;
    }

    // Blocca lo scroll durante l'intro
    document.body.style.overflow = 'hidden';

    // Dopo 1.5 secondi, inizia il fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('logoIntroShown', 'true');
      setHasShown(true);
      document.body.style.overflow = '';
    }, 1500);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, []);

  // Non renderizzare nulla se l'intro è già stata mostrata
  if (hasShown && !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isVisible}
    >
      {/* Logo animato */}
      <div className="animate-logoIntro">
        <Image
          src="/Logo_Bianco.png"
          alt="Mommy DJ"
          width={800}
          height={240}
          priority
          className="w-auto h-32 md:h-48 lg:h-56"
        />
      </div>

      <style jsx>{`
        @keyframes logoIntro {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-logoIntro {
          animation: logoIntro 1s ease-out;
        }
      `}</style>
    </div>
  );
}
