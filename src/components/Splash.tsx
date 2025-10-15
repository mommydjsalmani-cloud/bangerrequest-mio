"use client";

import React, { useEffect, useState } from "react";
import Image from 'next/image';

type Props = {
  duration?: number; // milliseconds
};

export default function Splash({ duration = 10000 }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(false), duration);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setVisible(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
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
            src="/LogoHD_Bianco.png" 
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
