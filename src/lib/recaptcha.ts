/**
 * Utility per la verifica reCAPTCHA v2
 * Comunica con l'API Google reCAPTCHA per verificare i token
 */

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export async function verifyRecaptchaToken(token: string): Promise<{
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
}> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.warn('reCAPTCHA SECRET_KEY non configurato');
    return { success: false, error_codes: ['missing_secret_key'] };
  }

  if (!token) {
    return { success: false, error_codes: ['missing_token'] };
  }

  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore verifica reCAPTCHA:', error);
    return {
      success: false,
      error_codes: [error instanceof Error ? error.message : 'verification_failed'],
    };
  }
}

/**
 * Verifica se il token reCAPTCHA è valido
 * Soglia di sicurezza: score >= 0.5 per v3, o semplicemente success=true per v2
 */
export function isRecaptchaValid(verification: { success?: boolean; score?: number; error_codes?: string[] }, minScore = 0.5): boolean {
  // reCAPTCHA v2: basta che success sia true
  if (verification.success === true) {
    return true;
  }

  // reCAPTCHA v3: verifica anche lo score
  if (verification.score !== undefined && verification.score >= minScore) {
    return true;
  }

  return false;
}
