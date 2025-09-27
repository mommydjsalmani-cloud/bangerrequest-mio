import React, { useState } from 'react';
import Image from 'next/image';

/**
 * Logo centralizzato.
 * - Usa PNG principale (/Simbolo_Bianco.png) con fallback SVG (/mommy-logo.svg)
 * - Accetta dimensioni tramite props oppure className Tailwind.
 */
export type LogoProps = {
  size?: number; // lato massimo in px (width), height auto
  className?: string;
  alt?: string;
  priority?: boolean;
};

export default function Logo({ size = 160, className = '', alt = 'Mommy Music Entertainment', priority = false }: LogoProps) {
  const [failed, setFailed] = useState(false);
  const src = failed ? '/mommy-logo.svg' : '/Simbolo_Bianco.png';
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`h-auto ${className}`}
      style={{ width: size, height: 'auto' }}
      onError={() => setFailed(true)}
    />
  );
}
