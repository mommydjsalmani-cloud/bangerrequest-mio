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
    await answerCallbackQuery(cbId, 'Richiesta già processata');
    return NextResponse.json({ ok: true });
  }
  
  if (!requestId || !['accept', 'reject', 'played'].includes(action)) {
    await answerCallbackQuery(cbId, 'Comando non valido', true);
    return NextResponse.json({ ok: true });
  }

  try {
    if (action === 'accept') await acceptRequest(requestId);
    else if (action === 'reject') await rejectRequest(requestId);
    else if (action === 'played') await markAsPlayed(requestId);

    const who = from.username ? `@${from.username}` : (from.first_name || 'DJ');
    const chatIdVal = (chat.id ?? '') as string | number;
    const messageIdVal = Number(message.message_id || 0);

    // Non modifichiamo il testo, solo i bottoni per mostrare lo stato
    const djPanelUrl = getDjPanelUrl();
    
    // Bottoni che mostrano lo stato attuale (v2)
    let newKeyboard;
    if (action === 'accept') {
      newKeyboard = [
        [{ text: '✅ Accettata', callbackData: `noop:${requestId}` }],
        [{ text: '🎵 Segna come Suonata', callbackData: `played:${requestId}` }],
        [{ text: '🔄 Cambia idea (Rifiuta)', callbackData: `reject:${requestId}` }],
        [{ text: '🔎 Apri pannello', url: djPanelUrl }]
      ];
    } else if (action === 'reject') {
      newKeyboard = [
        [{ text: '❌ Rifiutata', callbackData: `noop:${requestId}` }],
        [{ text: '🔄 Cambia idea (Accetta)', callbackData: `accept:${requestId}` }],
        [{ text: '🔎 Apri pannello', url: djPanelUrl }]
      ];
    } else if (action === 'played') {
      newKeyboard = [
        [{ text: '🎵 Suonata', callbackData: `noop:${requestId}` }],
        [{ text: '🔎 Apri pannello', url: djPanelUrl }]
      ];
    }

    // Aggiorna solo la tastiera, non il testo
    await editTelegramMessage({ 
      chatId: chatIdVal, 
      messageId: messageIdVal, 
      inlineKeyboard: newKeyboard 
    });

    const statusMessages: Record<string, string> = {
      'accept': '✅ Accettata',
      'reject': '❌ Rifiutata',
      'played': '🎵 Segnata come Suonata'
    };
    
    await answerCallbackQuery(cbId, `${statusMessages[action]} da ${who}`);
  } catch {
    await answerCallbackQuery(cbId, 'Già processata o non trovata', true);
  }

  return NextResponse.json({ ok: true });
}