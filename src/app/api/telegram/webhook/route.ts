export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { answerCallbackQuery, editTelegramMessage, escapeHtml, getAllowedUserIds } from '@/lib/telegram';
import { acceptRequest, rejectRequest } from '@/lib/moderation';

export async function POST(req: Request) {
  // Log per debug - rimuovere in produzione
  console.log('🔍 WEBHOOK CHIAMATO:', {
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });

  // Temporaneamente disabilitato per debug
  // const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  // const header = req.headers.get('x-telegram-bot-api-secret-token') || '';
  // if (!secret || header !== secret) {
  //   return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  // }

  let body: unknown;
  try {
    body = await req.json();
    console.log('🔍 Webhook body ricevuto:', JSON.stringify(body, null, 2));
  } catch (error) {
    console.log('❌ Errore parsing JSON:', error);
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }

  // Gestione callback_query
  type CallbackFrom = { id?: number; username?: string; first_name?: string };
  type CallbackMessage = { chat?: { id?: number | string }; text?: string; caption?: string; message_id?: number };
  type CallbackQuery = { id: string; from?: CallbackFrom; message?: CallbackMessage; data?: string };

  const update = body as { callback_query?: CallbackQuery } | undefined;
  
  console.log('🔍 Parsed update:', {
    hasUpdate: !!update,
    hasCallbackQuery: !!update?.callback_query,
    updateKeys: update ? Object.keys(update) : []
  });
  
  if (!update || !update.callback_query) {
    console.log('⚠️ Nessuna callback_query, uscita normale');
    return NextResponse.json({ ok: true });
  }

  const cb = update.callback_query;
  const cbId = cb.id;
  const from = cb.from || {};
  const message = cb.message || {};
  const chat = message.chat || {};

  console.log('🔍 Callback query data:', {
    callbackId: cbId,
    fromId: from.id,
    fromUsername: from.username,
    chatId: chat.id,
    messageId: message.message_id,
    data: cb.data
  });

  const allowed = getAllowedUserIds();
  console.log('🔍 User authorization:', {
    userId: from.id,
    allowedUsers: allowed,
    isAuthorized: allowed.includes(Number(from.id))
  });
  if (!allowed.includes(Number(from.id))) {
    console.log('❌ User non autorizzato');
    await answerCallbackQuery(cbId, 'Permesso negato', true);
    return NextResponse.json({ ok: true });
  }

  // Verifica chat id è nella whitelist
  const cfgChatIds = (process.env.TELEGRAM_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
  console.log('🔍 Chat authorization:', {
    chatId: chat.id,
    allowedChats: cfgChatIds,
    isChatAuthorized: cfgChatIds.includes(String(chat.id))
  });
  if (!cfgChatIds.includes(String(chat.id))) {
    console.log('❌ Chat non autorizzata');
    await answerCallbackQuery(cbId, 'Permesso negato (chat non autorizzata)', true);
    return NextResponse.json({ ok: true });
  }

  const data = String(cb.data || '');
  const [action, requestId] = data.split(':');
  console.log('🔍 Action parsing:', {
    rawData: data,
    action: action,
    requestId: requestId,
    isValidAction: ['accept', 'reject'].includes(action)
  });
  if (!requestId || !['accept', 'reject'].includes(action)) {
    console.log('❌ Comando non valido');
    await answerCallbackQuery(cbId, 'Comando non valido', true);
    return NextResponse.json({ ok: true });
  }

  console.log('🚀 Elaborazione richiesta:', { action, requestId });
  try {
    if (action === 'accept') {
      console.log('✅ Chiamata acceptRequest...');
      await acceptRequest(requestId);
    } else {
      console.log('❌ Chiamata rejectRequest...');
      await rejectRequest(requestId);
    }
    console.log('✅ Azione completata con successo');

    const who = from.username ? `@${from.username}` : (from.first_name || 'DJ');
    const appended = `\n\n<b>Stato:</b> ${action === 'accept' ? '✅ Accettata' : '❌ Rifiutata'} da ${escapeHtml(String(who))}`;

    const originalText = String(message.text || message.caption || '');
    const chatIdVal = (chat.id ?? '') as string | number;
    const messageIdVal = Number(message.message_id || 0);

    await editTelegramMessage({ chatId: chatIdVal, messageId: messageIdVal, textHtml: (originalText || '') + appended, removeKeyboard: true });

    await answerCallbackQuery(cbId, 'Fatto');
  } catch {
    await answerCallbackQuery(cbId, 'Già processata o non trovata', true);
  }

  return NextResponse.json({ ok: true });
}