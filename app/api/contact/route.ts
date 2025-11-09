import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

// Schema di validazione rigoroso
const contactSchema = z.object({
  nome: z.string()
    .min(2, 'Nome troppo corto')
    .max(100, 'Nome troppo lungo')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome contiene caratteri non validi'),
  email: z.string()
    .email('Email non valida')
    .max(255, 'Email troppo lunga')
    .refine(email => !email.includes('+tag'), 'Email con tag non consentita'),
  telefono: z.string()
    .max(20, 'Telefono troppo lungo')
    .optional()
    .transform(val => val || ''),
  tipoEvento: z.string()
    .max(100, 'Tipo evento troppo lungo')
    .optional()
    .transform(val => val || ''),
  data: z.string()
    .max(50, 'Data troppo lunga')
    .optional()
    .transform(val => val || ''),
  location: z.string()
    .max(200, 'Location troppo lunga')
    .optional()
    .transform(val => val || ''),
  messaggio: z.string()
    .max(5000, 'Messaggio troppo lungo')
    .optional()
    .transform(val => val || ''),
  recaptchaToken: z.string()
    .min(1, 'Token reCAPTCHA mancante')
});

// Funzione per sanitizzare HTML e prevenire XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Blacklist di parole spam comuni
const SPAM_KEYWORDS = ['viagra', 'casino', 'bitcoin', 'crypto', 'forex', 'loan', 'pills', 'seo services'];

function containsSpam(text: string): boolean {
  const lowerText = text.toLowerCase();
  return SPAM_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Verifica token reCAPTCHA v3
async function verifyRecaptcha(token: string, ip: string): Promise<{ success: boolean; score: number; error?: string }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error('[RECAPTCHA_ERROR] Secret key non configurata');
    return { success: false, score: 0, error: 'CAPTCHA non configurato' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}&remoteip=${ip}`,
    });

    const data = await response.json();

    return {
      success: data.success && data.score >= 0.5,
      score: data.score || 0,
      error: data['error-codes']?.[0],
    };
  } catch (error) {
    console.error('[RECAPTCHA_VERIFY_ERROR]', error);
    return { success: false, score: 0, error: 'Errore verifica CAPTCHA' };
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const body = await request.json();
    
    // Validazione con zod
    const validationResult = contactSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.warn('[CONTACT_VALIDATION_FAILED]', {
        ip,
        errors: validationResult.error.issues,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Dati non validi', 
        details: validationResult.error.issues 
      }, { status: 400 });
    }

    const { nome, email, telefono, tipoEvento, data, location, messaggio, recaptchaToken } = validationResult.data;

    // Verifica reCAPTCHA
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, ip);
    
    if (!recaptchaResult.success) {
      console.warn('[CONTACT_RECAPTCHA_FAILED]', {
        ip,
        score: recaptchaResult.score,
        error: recaptchaResult.error,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Verifica sicurezza fallita. Riprova.',
        code: 'RECAPTCHA_FAILED'
      }, { status: 403 });
    }

    // Log score per monitoraggio
    console.log('[CONTACT_RECAPTCHA_SCORE]', {
      ip,
      email,
      score: recaptchaResult.score,
      timestamp: new Date().toISOString()
    });

    // Check spam keywords
    if (containsSpam(`${nome} ${messaggio}`)) {
      console.warn('[CONTACT_SPAM_DETECTED]', { ip, nome, email, timestamp: new Date().toISOString() });
      return NextResponse.json({ error: 'Richiesta bloccata' }, { status: 403 });
    }

    // Sanitizza tutti i campi per l'email HTML
    const safeNome = escapeHtml(nome);
    const safeEmail = escapeHtml(email);
    const safeTelefono = escapeHtml(telefono);
    const safeTipoEvento = escapeHtml(tipoEvento);
    const safeData = escapeHtml(data);
    const safeLocation = escapeHtml(location);
    const safeMessaggio = escapeHtml(messaggio);

    const { data: emailData, error } = await resend.emails.send({
      from: 'Mommy DJ Richieste <onboarding@resend.dev>',
      to: ['mommydjsalmani@gmail.com'],
      subject: `Nuova richiesta: ${safeTipoEvento || 'Informazioni'}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4169e1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .field { margin-bottom: 15px; }
              .label { font-weight: bold; color: #4169e1; }
              .value { margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🎵 Nuova Richiesta da Mommy DJ</h1>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">👤 Nome:</div>
                  <div class="value">${safeNome}</div>
                </div>
                
                <div class="field">
                  <div class="label">📧 Email:</div>
                  <div class="value"><a href="mailto:${safeEmail}">${safeEmail}</a></div>
                </div>
                
                <div class="field">
                  <div class="label">📱 Telefono:</div>
                  <div class="value"><a href="tel:${safeTelefono}">${safeTelefono}</a></div>
                </div>
                
                ${safeTipoEvento ? `
                <div class="field">
                  <div class="label">🎉 Tipo Evento:</div>
                  <div class="value">${safeTipoEvento}</div>
                </div>
                ` : ''}
                
                ${safeData ? `
                <div class="field">
                  <div class="label">📅 Data:</div>
                  <div class="value">${safeData}</div>
                </div>
                ` : ''}
                
                ${safeLocation ? `
                <div class="field">
                  <div class="label">📍 Location:</div>
                  <div class="value">${safeLocation}</div>
                </div>
                ` : ''}
                
                ${safeMessaggio ? `
                <div class="field">
                  <div class="label">💬 Messaggio:</div>
                  <div class="value" style="white-space: pre-wrap;">${safeMessaggio}</div>
                </div>
                ` : ''}
                
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                
                <div style="font-size: 12px; color: #666;">
                  <p>Richiesta ricevuta dal sito mommydj.com</p>
                  <p>Data e ora: ${new Date().toLocaleString('it-IT')}</p>
                  <p>IP: ${ip}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[CONTACT_EMAIL_ERROR]', { ip, error, timestamp: new Date().toISOString() });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log successo
    const duration = Date.now() - startTime;
    console.log('[CONTACT_SUCCESS]', { 
      ip, 
      email: safeEmail, 
      tipoEvento: safeTipoEvento,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString() 
    });

    return NextResponse.json({ success: true, data: emailData });
  } catch (error) {
    console.error('[CONTACT_SERVER_ERROR]', { ip, error, timestamp: new Date().toISOString() });
    return NextResponse.json({ error: 'Errore durante l\'invio della richiesta' }, { status: 500 });
  }
}
