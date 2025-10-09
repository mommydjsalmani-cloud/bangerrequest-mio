import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const BUILD_TAG = 'libere-blocking-api-v1';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const remoteAddr = req.headers.get('x-remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  if (remoteAddr) {
    return remoteAddr.trim();
  }
  
  return 'unknown';
}

// GET - Lista utenti bloccati per una sessione
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  
  if (!sessionId) {
    return withVersion({ ok: false, error: 'Session ID richiesto' }, { status: 400 });
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }
  
  try {
    const { data: blockedUsers, error } = await supabase
      .from('libere_blocked_users')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return withVersion({ ok: false, error: 'Errore caricamento blocchi' }, { status: 500 });
    }
    
    return withVersion({ 
      ok: true, 
      blocked_users: blockedUsers || [] 
    });
    
  } catch (error) {
    console.error('Errore GET blocchi:', error);
    return withVersion({ ok: false, error: 'Errore server' }, { status: 500 });
  }
}

// POST - Blocca un utente
export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }
  
  let body;
  try {
    body = await req.json();
  } catch {
    return withVersion({ ok: false, error: 'Dati richiesta non validi' }, { status: 400 });
  }
  
  const { session_id, client_ip, requester_name, reason } = body;
  
  if (!session_id) {
    return withVersion({ ok: false, error: 'Session ID richiesto' }, { status: 400 });
  }
  
  if (!client_ip && !requester_name) {
    return withVersion({ ok: false, error: 'IP o nome utente richiesto' }, { status: 400 });
  }
  
  try {
    // Verifica che la sessione esista
    const { data: session } = await supabase
      .from('sessioni_libere')
      .select('id')
      .eq('id', session_id)
      .single();
    
    if (!session) {
      return withVersion({ ok: false, error: 'Sessione non trovata' }, { status: 404 });
    }
    
    // Blocca utente
    const blockData: any = {
      session_id,
      blocked_by: 'DJ',
      reason: reason?.trim() || null
    };
    
    if (client_ip) {
      blockData.client_ip = client_ip;
    }
    
    if (requester_name?.trim()) {
      blockData.requester_name = requester_name.trim();
    }
    
    const { data: blocked, error } = await supabase
      .from('libere_blocked_users')
      .insert(blockData)
      .select()
      .single();
    
    if (error) {
      // Gestisci duplicati
      if (error.code === '23505') {
        return withVersion({ ok: false, error: 'Utente già bloccato' }, { status: 409 });
      }
      console.error('Errore blocco utente:', error);
      return withVersion({ ok: false, error: 'Errore durante il blocco' }, { status: 500 });
    }
    
    return withVersion({ 
      ok: true, 
      message: 'Utente bloccato con successo',
      blocked_user: blocked
    });
    
  } catch (error) {
    console.error('Errore POST blocco:', error);
    return withVersion({ ok: false, error: 'Errore server' }, { status: 500 });
  }
}

// DELETE - Sblocca un utente
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const blockId = url.searchParams.get('id');
  
  if (!blockId) {
    return withVersion({ ok: false, error: 'ID blocco richiesto' }, { status: 400 });
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }
  
  try {
    const { error } = await supabase
      .from('libere_blocked_users')
      .delete()
      .eq('id', blockId);
    
    if (error) {
      console.error('Errore sblocco utente:', error);
      return withVersion({ ok: false, error: 'Errore durante lo sblocco' }, { status: 500 });
    }
    
    return withVersion({ 
      ok: true, 
      message: 'Utente sbloccato con successo' 
    });
    
  } catch (error) {
    console.error('Errore DELETE blocco:', error);
    return withVersion({ ok: false, error: 'Errore server' }, { status: 500 });
  }
}