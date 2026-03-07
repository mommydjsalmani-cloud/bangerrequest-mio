'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { ReactNode } from 'react';

export default function RecaptchaProvider({ children }: { children: ReactNode }) {
  // Ottieni la chiave - usa un valore di fallback per evitare errori di context
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

  // Log warning solo lato client
  if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    console.warn('⚠️ NEXT_PUBLIC_RECAPTCHA_SITE_KEY non configurata - usando chiave di test');
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaSiteKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
