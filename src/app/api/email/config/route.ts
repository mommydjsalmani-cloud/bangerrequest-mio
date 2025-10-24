// API per configurare notifiche email DJ
// POST /api/email/config

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authUser = request.headers.get('x-dj-user');
    const authSecret = request.headers.get('x-dj-secret');
    
    // Verifica credenziali DJ
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
    
    const { enabled, email } = await request.json();
    
    if (enabled && (!email || !email.includes('@'))) {
      return NextResponse.json({
        ok: false,
        error: 'Email non valida'
      }, { status: 400 });
    }
    
    // Salva configurazione nel database
    const { error } = await supabase
      .from('dj_email_config')
      .upsert([
        {
          dj_user: authUser,
          email_enabled: enabled,
          email_address: enabled ? email : null,
          updated_at: new Date().toISOString()
        }
      ], { 
        onConflict: 'dj_user' 
      });
    
    if (error) {
      console.error('Errore salvataggio config email:', error);
      return NextResponse.json({
        ok: false,
        error: 'Errore salvataggio configurazione'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      ok: true,
      message: enabled 
        ? `Notifiche email abilitate per ${email}` 
        : 'Notifiche email disabilitate'
    });
    
  } catch (error) {
    console.error('Errore API configurazione email:', error);
    return NextResponse.json({
      ok: false,
      error: 'Errore server'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = request.headers.get('x-dj-user');
    const authSecret = request.headers.get('x-dj-secret');
    
    // Verifica credenziali DJ
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
    
    // Recupera configurazione
    const { data, error } = await supabase
      .from('dj_email_config')
      .select('*')
      .eq('dj_user', authUser)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Ignora errore "no rows"
      console.error('Errore recupero config email:', error);
      return NextResponse.json({
        ok: false,
        error: 'Errore recupero configurazione'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      ok: true,
      config: {
        enabled: data?.email_enabled || false,
        email: data?.email_address || null
      }
    });
    
  } catch (error) {
    console.error('Errore API recupero config email:', error);
    return NextResponse.json({
      ok: false,
      error: 'Errore server'
    }, { status: 500 });
  }
}