import { NextRequest, NextResponse } from 'next/server';
import { blockIP, unblockIP, getBlockedIPs } from '@/lib/ipBlocking';
import { isValidCredentials } from '@/lib/eventsStore';

export async function GET(request: NextRequest) {
  try {
    // Autenticazione DJ
    const username = request.headers.get('x-dj-user');
    const password = request.headers.get('x-dj-secret');
    
    if (!username || !password || !isValidCredentials(username, password)) {
      return NextResponse.json(
        { ok: false, error: 'Credenziali DJ non valide' },
        { status: 401 }
      );
    }
    
    const result = await getBlockedIPs();
    
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      ok: true,
      blockedIPs: result.data
    });
    
  } catch (error) {
    console.error('Error in blocked-ips GET:', error);
    return NextResponse.json(
      { ok: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Autenticazione DJ
    const username = request.headers.get('x-dj-user');
    const password = request.headers.get('x-dj-secret');
    
    if (!username || !password || !isValidCredentials(username, password)) {
      return NextResponse.json(
        { ok: false, error: 'Credenziali DJ non valide' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { action, ip, reason } = body;
    
    if (!action || !ip) {
      return NextResponse.json(
        { ok: false, error: 'Parametri mancanti: action e ip sono obbligatori' },
        { status: 400 }
      );
    }
    
    if (action === 'block') {
      const result = await blockIP(ip, reason || 'Bloccato dal DJ', username);
      
      if (!result.success) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        ok: true,
        message: `IP ${ip} bloccato con successo`
      });
      
    } else if (action === 'unblock') {
      const result = await unblockIP(ip);
      
      if (!result.success) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        ok: true,
        message: `IP ${ip} sbloccato con successo`
      });
      
    } else {
      return NextResponse.json(
        { ok: false, error: 'Azione non valida. Usa "block" o "unblock"' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in blocked-ips POST:', error);
    return NextResponse.json(
      { ok: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}