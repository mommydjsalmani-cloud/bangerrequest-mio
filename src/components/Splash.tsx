"use client";

import React, { useEffect, useState } from "react";
import Logo from '@/components/Logo';

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

  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`splash-overlay ${!visible ? "splash-hidden" : ""}`}
      aria-hidden={!visible}
      onClick={() => setVisible(false)}
    >
      <div className="splash-card">
        {!failed ? (
          <div className="w-[60vw] max-w-[420px]">
            <Logo size={420} className="w-full h-auto" priority />
          </div>
        ) : (
          <div className="text-white font-bold text-2xl tracking-wide">MOMMY MUSIC</div>
        )}
      </div>
    </div>
  );
}
