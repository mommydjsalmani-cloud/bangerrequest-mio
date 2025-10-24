import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabase } from '@/lib/supabase';

type RequestItem = {
  id: string;
  created_at: string;
  track_id: string;
  uri?: string;
  title?: string;
  artists?: string;
  album?: string;
  cover_url?: string | null;
  isrc?: string | null;
  explicit?: boolean;
  preview_url?: string | null;
  duration_ms?: number;
  note?: string;
  event_code?: string | null;
  requester?: string | null;
  status: 'new' | 'accepted' | 'rejected' | 'muted' | 'cancelled';
  duplicates?: number; // how many times merged/duplicated
};

const store: RequestItem[] = [];
const BUILD_TAG = 'requests-diagnostics-v1';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventCode = url.searchParams.get('event_code');
  const status = url.searchParams.get('status');
  const id = url.searchParams.get('id');
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (id) q = q.eq('id', id);
    if (eventCode) q = q.eq('event_code', eventCode);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return withVersion({ ok: false, error: error.message }, { status: 500 });
    return withVersion({ ok: true, requests: data || [] });
  } else {
    let list = store;
    if (id) list = list.filter((r) => r.id === id);
    if (eventCode) list = list.filter((r) => r.event_code === eventCode);
    if (status) list = list.filter((r) => r.status === status);
    return withVersion({ ok: true, requests: list });
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<RequestItem> & { song?: string; artist?: string; name?: string; eventCode?: string };
  const supabase = getSupabase();
  
  if (supabase) {
    try {
      // Ottieni o crea una sessione di default per le richieste
      const { data: sessions } = await supabase
        .from('sessioni_libere')
        .select('*')
        .eq('archived', false)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      
      let session = sessions && sessions.length > 0 ? sessions[0] : null;
      
      if (!session) {
        // Crea una sessione di default
        const sessionData = {
          token: randomUUID().replace(/-/g, '').substring(0, 16),
          name: 'Richieste Musicali (Auto-creata)',
          status: 'active',
          reset_count: 0,
          archived: false,
          rate_limit_enabled: true,
          rate_limit_seconds: 60,
          notes_enabled: true,
          require_event_code: false,
          current_event_code: null
        };
        
        const { data: newSession, error: sessionError } = await supabase
          .from('sessioni_libere')
          .insert(sessionData)
          .select()
          .single();
        
        if (sessionError) {
          throw new Error(`Errore creazione sessione: ${sessionError.message}`);
        }
        
        session = newSession;
      }
      
      // Mappatura campi per compatibilità
      const title = body.title || body.song;
      const artists = body.artists || body.artist;
      const requester_name = body.requester || body.name;
      const event_code = body.event_code || body.eventCode;
      const finalEventCode = ['default', 'test'].includes(event_code || '') ? null : (event_code?.trim() || null);
      
      // Ottieni IP e user agent
      const getClientIP = (req: Request): string => {
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
        return ip.replace(/%[\w]+$/, '');
      };
      
      const clientIP = getClientIP(req);
      const userAgent = req.headers.get('user-agent') || '';
      
      // Crea richiesta nel sistema libere
      const requestData = {
        session_id: session.id,
        track_id: body.track_id || 'unknown',
        uri: body.uri || null,
        title: title?.trim() || '',
        artists: artists?.trim() || null,
        album: body.album?.trim() || null,
        cover_url: body.cover_url ?? null,
        isrc: body.isrc ?? null,
        explicit: !!body.explicit,
        preview_url: body.preview_url ?? null,
        duration_ms: body.duration_ms || null,
        requester_name: requester_name?.trim() || null,
        note: body.note?.trim() || null,
        client_ip: clientIP,
        user_agent: userAgent,
        source: 'spotify',
        status: 'new',
        archived: false,
        event_code: finalEventCode,
        event_code_upper: finalEventCode?.toUpperCase() || null
      };
      
      const { data: newRequest, error } = await supabase
        .from('richieste_libere')
        .insert(requestData)
        .select()
        .single();
      
      if (error) {
        console.error('Errore creazione richiesta libere:', error);
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      // Notifica Telegram
      try {
        if (process.env.TELEGRAM_BOT_TOKEN) {
          const { sendTelegramMessage, escapeHtml, getDjPanelUrl } = await import('@/lib/telegram');
          const songTitle = newRequest.title || '';
          const artist = newRequest.artists || '';
          const requesterName = newRequest.requester_name || 'Ospite';
          const comment = newRequest.note || '';

          const text = [
            '🎵 <b>Nuova richiesta</b>',
            `<b>Brano:</b> ${escapeHtml(String(songTitle))} — ${escapeHtml(String(artist))}`,
            `<b>Da:</b> ${escapeHtml(String(requesterName))}`,
            comment ? `<b>Commento:</b> "${escapeHtml(String(comment).slice(0,200))}"` : null,
            `<a href="${escapeHtml(getDjPanelUrl())}">Apri pannello DJ</a>`,
          ].filter(Boolean).join('\n');

          await sendTelegramMessage({
            textHtml: text,
            inlineKeyboard: [[
              { text: '✅ Accetta', callbackData: `accept:${newRequest.id}` },
              { text: '❌ Rifiuta', callbackData: `reject:${newRequest.id}` }
            ], [
              { text: '🔎 Apri pannello', url: getDjPanelUrl() }
            ]]
          });
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.error('[Requests] telegram hook error', e);
      }

      // Mappa la risposta al formato requests per compatibilità
      const mappedItem = {
        id: newRequest.id,
        created_at: newRequest.created_at,
        track_id: newRequest.track_id,
        uri: newRequest.uri,
        title: newRequest.title,
        artists: newRequest.artists,
        album: newRequest.album,
        cover_url: newRequest.cover_url,
        isrc: newRequest.isrc,
        explicit: newRequest.explicit,
        preview_url: newRequest.preview_url,
        duration_ms: newRequest.duration_ms,
        note: newRequest.note,
        event_code: newRequest.event_code,
        requester: newRequest.requester_name,
        status: newRequest.status,
        duplicates: 0
      };

      return withVersion({ ok: true, item: mappedItem });
      
    } catch (error) {
      console.error('Errore POST requests:', error);
      return withVersion({ ok: false, error: error instanceof Error ? error.message : 'Errore interno' }, { status: 500 });
    }
  }
  
  // Fallback al sistema in memoria per sviluppo locale
  const now = new Date().toISOString();
  const generatedId = `${Date.now()}`;
  const title = body.title || body.song;
  const artists = body.artists || body.artist;
  const requester = body.requester || body.name;
  const event_code = body.event_code || body.eventCode;
  const finalEventCode = ['default', 'test'].includes(event_code || '') ? null : event_code;
  
  const item: RequestItem = {
    id: generatedId,
    created_at: now,
    track_id: body.track_id || 'unknown',
    uri: body.uri,
    title: title,
    artists: artists,
    album: body.album,
    cover_url: body.cover_url ?? null,
    isrc: body.isrc ?? null,
    explicit: !!body.explicit,
    preview_url: body.preview_url ?? null,
    duration_ms: body.duration_ms,
    note: body.note,
    event_code: finalEventCode ?? null,
    requester: requester ?? null,
    status: 'new',
    duplicates: 0,
  };
  
  store.unshift(item);
  return withVersion({ ok: true, item });
} “${escapeHtml(String(comment).slice(0,200))}”` : null,
          `<a href="${escapeHtml(getDjPanelUrl())}">Apri pannello DJ</a>`,
        ].filter(Boolean).join('\n');

        await sendTelegramMessage({
          textHtml: text,
          inlineKeyboard: [[
            { text: '✅ Accetta', callbackData: `accept:${data.id}` },
            { text: '❌ Rifiuta', callbackData: `reject:${data.id}` }
          ], [
            { text: '🔎 Apri pannello', url: getDjPanelUrl() }
          ]]
        });
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.error('[Requests] telegram hook error', e);
    }

    return withVersion({ ok: true, item: data });
  } else {
    store.unshift(item);
    
    return withVersion({ ok: true, item });
  }
}

export async function PATCH(req: Request) {
  try {
  const body = (await req.json()) as { id: string; action: 'accept' | 'reject' | 'mute' | 'merge' | 'cancel'; mergeWithId?: string };
    if (body.action !== 'cancel') {
      const djSecret = process.env.DJ_PANEL_SECRET?.trim();
      const djUser = process.env.DJ_PANEL_USER?.trim();
      if (!djSecret || !djUser) {
        return withVersion({ ok: false, error: 'misconfigured' }, { status: 500 });
      }
      const header = req.headers.get('x-dj-secret')?.trim();
      const headerUser = req.headers.get('x-dj-user')?.trim();
      if (header !== djSecret || headerUser !== djUser) {
        return withVersion({ ok: false, error: 'unauthorized' }, { status: 401 });
      }
    }
    const supabase = getSupabase();
    if (supabase) {
      if (body.action === 'merge') {
        if (body.mergeWithId) {
          const { data: target, error: e1 } = await supabase.from('requests').select('*').eq('id', body.mergeWithId).single();
          if (e1 || !target) return withVersion({ ok: false, error: 'merge_target_not_found' }, { status: 404 });
          const { error: e2 } = await supabase.from('requests').delete().eq('id', body.id);
          if (e2) return withVersion({ ok: false, error: e2.message }, { status: 500 });
          const { data, error: e3 } = await supabase.from('requests').update({ duplicates: (target.duplicates || 0) + 1 }).eq('id', body.mergeWithId).select('*').single();
          if (e3) return withVersion({ ok: false, error: e3.message }, { status: 500 });
          return withVersion({ ok: true, mergedInto: body.mergeWithId, target: data });
        } else {
          const { data, error } = await supabase.from('requests').select('*').eq('id', body.id).single();
          if (error || !data) return withVersion({ ok: false, error: 'not_found' }, { status: 404 });
          const { data: upd, error: e2 } = await supabase.from('requests').update({ duplicates: (data.duplicates || 0) + 1 }).eq('id', body.id).select('*').single();
          if (e2) return withVersion({ ok: false, error: e2.message }, { status: 500 });
          return withVersion({ ok: true, item: upd });
        }
      }
      if (body.action === 'cancel') {
        const { data, error } = await supabase.from('requests').update({ status: 'cancelled' }).eq('id', body.id).select('*').single();
        if (error || !data) return withVersion({ ok: false, error: error?.message || 'not_found' }, { status: 404 });
        return withVersion({ ok: true, item: data });
      }
      const map: Record<'accept'|'reject'|'mute', Partial<RequestItem>> = {
        accept: { status: 'accepted' },
        reject: { status: 'rejected' },
        mute: { status: 'muted' },
      };
      const patch = map[body.action];
      if (!patch) return withVersion({ ok: false, error: 'invalid_action' }, { status: 400 });
      const { data, error } = await supabase.from('requests').update(patch).eq('id', body.id).select('*').single();
      if (error || !data) return withVersion({ ok: false, error: error?.message || 'not_found' }, { status: 404 });
      return withVersion({ ok: true, item: data });
    }

    // fallback in-memory
    const idx = store.findIndex((r) => r.id === body.id);
  if (idx === -1) return withVersion({ ok: false, error: 'not_found' }, { status: 404 });
    const item = store[idx];
    switch (body.action) {
      case 'accept':
        item.status = 'accepted';
        break;
      case 'reject':
        item.status = 'rejected';
        break;
      case 'mute':
        item.status = 'muted';
        break;
      case 'cancel':
        item.status = 'cancelled';
        break;
      case 'merge': {
        const target = body.mergeWithId ? store.find((r) => r.id === body.mergeWithId) : null;
        if (target) {
          target.duplicates = (target.duplicates || 0) + 1;
          store.splice(idx, 1);
          return NextResponse.json({ ok: true, mergedInto: target.id, target });
        } else {
          item.duplicates = (item.duplicates || 0) + 1;
        }
        break;
      }
      default:
        return withVersion({ ok: false, error: 'invalid_action' }, { status: 400 });
    }
    return withVersion({ ok: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return withVersion({ ok: false, error: message }, { status: 400 });
  }
}
