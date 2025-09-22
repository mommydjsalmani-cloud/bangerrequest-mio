"use client";

import React, { useEffect, useState } from "react";

type Props = {
  duration?: number; // milliseconds
};

export default function Splash({ duration = 10000 }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  return (
    <div className={`splash-overlay ${!visible ? "splash-hidden" : ""}`} aria-hidden={!visible}>
      <div className="splash-card">
        <img src="/file.svg" alt="Logo" className="splash-logo" />
      </div>
    </div>
  );
}
