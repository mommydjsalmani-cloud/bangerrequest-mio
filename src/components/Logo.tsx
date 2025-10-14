import React from 'react';
import Image from 'next/image';

/**
 * Logo centralizzato.
 * - Usa PNG principale (/Simbolo_Bianco.png)
 * - Accetta dimensioni tramite props oppure className Tailwind.
 */
export type LogoProps = {
  size?: number; // lato massimo in px (width), height auto
  className?: string;
  alt?: string;
  priority?: boolean;
};

export default function Logo({ size = 160, className = '', alt = 'Mommy Music Entertainment', priority = false }: LogoProps) {
  return (
    <Image
      src="/Simbolo_Bianco.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`h-auto transition-all duration-300 ${className}`}
      style={{ width: size, height: 'auto' }}
    />
  );
}
