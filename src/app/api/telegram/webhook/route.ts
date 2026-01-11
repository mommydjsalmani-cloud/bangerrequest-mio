export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { answerCallbackQuery, editTelegramMessage, getAllowedUserIds, getDjPanelUrl } from '@/lib/telegram';
import { acceptRequest, rejectRequest, markAsPlayed } from '@/lib/moderation';

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  const header = req.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!secret || header !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }

  // Gestione callback_query
  type CallbackFrom = { id?: number; username?: string; first_name?: string };
  type CallbackMessage = { chat?: { id?: number | string }; text?: string; caption?: string; message_id?: number };
  type CallbackQuery = { id: string; from?: CallbackFrom; message?: CallbackMessage; data?: string };

  const update = body as { callback_query?: CallbackQuery } | undefined;
  if (!update || !update.callback_query) return NextResponse.json({ ok: true });

  const cb = update.callback_query;
  const cbId = cb.id;
  const from = cb.from || {};
  const message = cb.message || {};
  const chat = message.chat || {};

  const allowed = getAllowedUserIds();
  if (!allowed.includes(Number(from.id))) {
    await answerCallbackQuery(cbId, 'Permesso negato', true);
    return NextResponse.json({ ok: true });
  }

  // Verifica chat id è nella whitelist
  const cfgChatIds = (process.env.TELEGRAM_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!cfgChatIds.includes(String(chat.id))) {
    await answerCallbackQuery(cbId, 'Permesso negato (chat non autorizzata)', true);
    return NextResponse.json({ ok: true });
  }

  const data = String(cb.data || '');
  const [action, requestId] = data.split(':');
  
  // Gestisci noop (bottone stato disabilitato)
  if (action === 'noop') {
    await answerCallbackQuery(cbId, 'Info: usa i bottoni azione per modificare');
    return NextResponse.json({ ok: true });
  }
  
  // Azioni valide: accept, reject, played, new (ripristina)
  if (!requestId || !['accept', 'reject', 'played', 'new'].includes(action)) {
    await answerCallbackQuery(cbId, 'Comando non valido', true);
    return NextResponse.json({ ok: true });
  }

  const who = from.username ? '@' + from.username : (from.first_name || 'DJ');
  const chatIdVal = (chat.id ?? '') as string | number;
  const messageIdVal = Number(message.message_id || 0);
  const djPanelUrl = getDjPanelUrl();

  try {
    // Esegui l'azione sul database
    if (action === 'accept') {
      await acceptRequest(requestId);
    } else if (action === 'reject') {
      await rejectRequest(requestId);
    } else if (action === 'played') {
      await markAsPlayed(requestId);
    } else if (action === 'new') {
      // Ripristina a "new" - richiesta rimessa in coda
      await resetToNew(requestId);
    }

    // Costruisci la nuova tastiera in base all'azione
    // LOGICA: Tutte le azioni sono reversibili!
    let newKeyboard: Array<Array<{ text: string; callbackData?: string; url?: string }>>;
    
    if (action === 'accept') {
      // Dopo ACCEPT: stato + suonata + annulla
      newKeyboard = [
        [{ text: '✅ ACCETTATA', callbackData: 'noop:' + requestId }],
        [{ text: '🎵 Suonata', callbackData: 'played:' + requestId }],
        [{ text: '❌ Rifiuta', callbackData: 'reject:' + requestId }],
        [{ text: '🔎 Pannello', url: djPanelUrl }]
      ];
    } else if (action === 'reject') {
      // Dopo REJECT: stato + ripristina
      newKeyboard = [
        [{ text: '❌ RIFIUTATA', callbackData: 'noop:' + requestId }],
        [{ text: '✅ Accetta', callbackData: 'accept:' + requestId }],
        [{ text: '🎵 Suonata', callbackData: 'played:' + requestId }],
        [{ text: '🔎 Pannello', url: djPanelUrl }]
      ];
    } else if (action === 'played') {
      // Dopo PLAYED: stato + ripristina ad accettata
      newKeyboard = [
        [{ text: '🎵 SUONATA', callbackData: 'noop:' + requestId }],
        [{ text: '↩️ Torna ad Accettata', callbackData: 'accept:' + requestId }],
        [{ text: '🔎 Pannello', url: djPanelUrl }]
      ];
    } else {
      // Dopo NEW (ripristino): mostra i bottoni iniziali
      newKeyboard = [
        [
          { text: '✅ Accetta', callbackData: 'accept:' + requestId },
          { text: '❌ Rifiuta', callbackData: 'reject:' + requestId }
        ],
        [{ text: '🎵 Suonata', callbackData: 'played:' + requestId }],
        [{ text: '🔎 Pannello', url: djPanelUrl }]
      ];
    }

    // Aggiorna la tastiera inline del messaggio
    await editTelegramMessage({ 
      chatId: chatIdVal, 
      messageId: messageIdVal, 
      inlineKeyboard: newKeyboard 
    });

    // Feedback all'utente
    const statusMessages: Record<string, string> = {
      'accept': '✅ Accettata',
      'reject': '❌ Rifiutata',
      'played': '🎵 Suonata',
      'new': '↩️ Ripristinata'
    };
    
    await answerCallbackQuery(cbId, statusMessages[action] + ' da ' + who);
    
  } catch (err) {
    console.error('[Webhook] Error processing action:', action, err);
    await answerCallbackQuery(cbId, 'Errore: ' + (err instanceof Error ? err.message : 'sconosciuto'), true);
  }

  return NextResponse.json({ ok: true });
}

// Funzione per ripristinare una richiesta a "new"
async function resetToNew(requestId: string) {
  const { getSupabase } = await import('@/lib/supabase');
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Database non configurato');
  }
  
  const { error } = await supabase
    .from('richieste_libere')
    .update({ status: 'new' })
    .eq('id', requestId);
  
  if (error) {
    throw new Error('Reset failed: ' + error.message);
  }
  
  return { ok: true };
}
