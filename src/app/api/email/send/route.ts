// API per invio notifiche email
// POST /api/email/send

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { title, artists, requesterName, test = false } = await request.json();
    
    // Se è un test, verifica le credenziali DJ
    if (test) {
      const authUser = request.headers.get('x-dj-user');
      const authSecret = request.headers.get('x-dj-secret');
      
      if (!authUser || !authSecret) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Credenziali DJ mancanti' 
        }, { status: 401 });
      }
      
      if (authUser !== process.env.DJ_PANEL_USER || authSecret !== process.env.DJ_PANEL_SECRET) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Credenziali DJ non valide' 
        }, { status: 401 });
      }
    }
    
    // Recupera configurazione email DJ
    const { data: config, error: configError } = await supabase
      .from('dj_email_config')
      .select('*')
      .eq('email_enabled', true)
      .single();
    
    if (configError || !config) {
      console.log('Nessuna configurazione email attiva');
      return NextResponse.json({
        ok: true,
        message: 'Nessuna configurazione email attiva'
      });
    }
    
    // Verifica variabili d'ambiente email
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Variabili d\'ambiente email mancanti');
      return NextResponse.json({
        ok: false,
        error: 'Configurazione email server mancante'
      }, { status: 500 });
    }
    
    // Configura transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    // Componi il messaggio
    const isTestEmail = test || title === 'Test';
    const subject = isTestEmail 
      ? '🧪 Test Notifiche Banger Request'
      : '🎵 Nuova Richiesta Musicale';
    
    const body = isTestEmail
      ? `
        <h2>🧪 Email di Test</h2>
        <p>Questo è un test delle notifiche email per Banger Request.</p>
        <p>Se ricevi questa email, la configurazione funziona correttamente!</p>
        <hr>
        <p><small>Banger Request - Sistema di Richieste Musicali</small></p>
      `
      : `
        <h2>🎵 Nuova Richiesta Musicale</h2>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="margin: 0; color: #333;">${title}</h3>
          ${artists ? `<p style="margin: 5px 0; color: #666;"><strong>Artista:</strong> ${artists}</p>` : ''}
          ${requesterName ? `<p style="margin: 5px 0; color: #666;"><strong>Richiesta da:</strong> ${requesterName}</p>` : ''}
        </div>
        <p>Vai al <a href="https://bangerrequest-mio.vercel.app/dj/libere" style="color: #0066cc;">pannello DJ</a> per gestire la richiesta.</p>
        <hr>
        <p><small>Banger Request - Sistema di Richieste Musicali</small></p>
      `;
    
    // Invia email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: config.email_address,
      subject,
      html: body,
    });
    
    console.log('Email inviata:', info.messageId);
    
    return NextResponse.json({
      ok: true,
      message: isTestEmail 
        ? `Email di test inviata a ${config.email_address}` 
        : 'Notifica email inviata'
    });
    
  } catch (error) {
    console.error('Errore invio email:', error);
    return NextResponse.json({
      ok: false,
      error: 'Errore invio email: ' + (error instanceof Error ? error.message : 'Errore sconosciuto')
    }, { status: 500 });
  }
}