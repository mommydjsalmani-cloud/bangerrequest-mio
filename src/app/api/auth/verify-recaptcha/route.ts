import { NextRequest, NextResponse } from 'next/server';
import { verifyRecaptchaToken, isRecaptchaValid } from '@/lib/recaptcha';

/**
 * POST /api/auth/verify-recaptcha
 * Verifica un token reCAPTCHA inviato dal client
 * 
 * Body: { token: string }
 * Response: { ok: boolean; message?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { ok: false, message: 'Token reCAPTCHA mancante' },
        { status: 400 }
      );
    }

    // Verifica il token con Google
    const verification = await verifyRecaptchaToken(token);

    if (!isRecaptchaValid(verification)) {
      console.warn('reCAPTCHA verification failed:', verification);
      return NextResponse.json(
        { ok: false, message: 'Verifica reCAPTCHA fallita' },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Errore verifica reCAPTCHA:', error);
    return NextResponse.json(
      { ok: false, message: 'Errore interno' },
      { status: 500 }
    );
  }
}
