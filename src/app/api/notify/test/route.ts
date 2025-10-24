export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sendTelegramMessage, escapeHtml, getDjPanelUrl } from '@/lib/telegram';

export async function POST(req: Request) {
  if (process.env.ENABLE_TELEGRAM_NOTIFICATIONS !== 'true') {
    return NextResponse.json({ ok: false, error: 'Telegram disabled' }, { status: 403 });
  }

  const user = req.headers.get('x-dj-user')?.trim();
  const secret = req.headers.get('x-dj-secret')?.trim();
  if (!user || !secret || user !== process.env.DJ_PANEL_USER || secret !== process.env.DJ_PANEL_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const dummyId = 'test-request-telegram';
  const text = [
    '🎵 <b>Nuova richiesta</b>',
    `<b>Brano:</b> ${escapeHtml('Test Song')} — ${escapeHtml('Some Artist')}`,
    `<b>Da:</b> ${escapeHtml('Tester')}`,
    `<a href="${escapeHtml(getDjPanelUrl())}">Apri pannello DJ</a>`,
  ].join('\n');

  await sendTelegramMessage({
    textHtml: text,
    inlineKeyboard: [[
      { text: '✅ Accetta', callbackData: `accept:${dummyId}` },
      { text: '❌ Rifiuta', callbackData: `reject:${dummyId}` }
    ], [
      { text: '🔎 Apri pannello', url: getDjPanelUrl() }
    ]]
  });

  return NextResponse.json({ ok: true });
}
