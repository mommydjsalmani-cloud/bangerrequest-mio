export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { answerCallbackQuery, editTelegramMessage, escapeHtml, getAllowedUserIds } from '@/lib/telegram';
import { acceptRequest, rejectRequest } from '@/lib/moderation';

export async function POST(req: Request) {
  // Temporaneamente disabilitato per debug
  // const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  // const header = req.headers.get('x-telegram-bot-api-secret-token') || '';
  // if (!secret || header !== secret) {
  //   return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  // }

  let body: unknown;
  try {
    body = await req.json();
    console.log('🔍 Webhook ricevuto:', JSON.stringify(body, null, 2));
  } catch {
    console.log('❌ Errore parsing JSON');
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
  if (!requestId || !['accept', 'reject'].includes(action)) {
    await answerCallbackQuery(cbId, 'Comando non valido', true);
    return NextResponse.json({ ok: true });
  }

  try {
    if (action === 'accept') await acceptRequest(requestId);
    else await rejectRequest(requestId);

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