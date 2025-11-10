"use client";

import React, { useEffect, useState } from "react";
import Image from 'next/image';
import { publicPath } from '@/lib/apiPath';

type Props = {
  duration?: number; // milliseconds
};

export default function Splash({ duration = 10000 }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      
      // Mostra splash solo per homepage e libere
      if (pathname !== '/' && pathname !== '/libere') {
        setVisible(false);
        return;
      }
      
      // Durata diversa per pagina libere: +1 secondo
      const actualDuration = pathname === '/libere' ? duration + 1000 : duration;
      
      const t = setTimeout(() => setVisible(false), actualDuration);
      function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape') setVisible(false);
      }
      window.addEventListener('keydown', onKey);
      return () => {
        clearTimeout(t);
        window.removeEventListener('keydown', onKey);
      };
    }
  }, [duration]);

  return (
    <div
      className={`splash-overlay ${!visible ? "splash-hidden" : ""}`}
      aria-hidden={!visible}
      onClick={() => setVisible(false)}
    >
      <div className="splash-card">
        <div className="w-[60vw] max-w-[420px]">
          <Image
            src={publicPath('/LogoHD_Bianco.png')}
            alt="Banger Request Logo"
            width={420}
            height={420}
            priority
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}
