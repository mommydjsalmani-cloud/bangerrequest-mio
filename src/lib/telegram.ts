// Server-only helpers per integrazione Telegram
import config from './config';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ENABLE = process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true';

export function escapeHtml(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getChatIds(): string[] {
  const raw = process.env.TELEGRAM_CHAT_ID || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function getThreadId(): number | undefined {
  const v = process.env.TELEGRAM_THREAD_ID?.trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export function getDjPanelUrl(): string {
  return process.env.DJ_PANEL_URL?.trim() || `${config.app.baseUrl.replace(/\/$/, '')}/dj/libere`;
}

export function getAllowedUserIds(): number[] {
  const raw = process.env.ALLOWED_TELEGRAM_USER_IDS || '';
  return raw.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
}

async function safeFetch(url: string, opts: RequestInit): Promise<Response | null> {
  try {
    const res = await fetch(url, opts);
    return res;
  } catch (err) {
    // Non rilanciare errori di rete per non bloccare il flusso applicativo
    if (process.env.NODE_ENV !== 'production') console.error('[Telegram] network error', err);
    return null;
  }
}

export type InlineButton = { text: string; callbackData?: string; url?: string };
export type InlineKeyboard = Array<Array<InlineButton>>;

export async function sendTelegramMessage(opts: { textHtml: string; inlineKeyboard?: InlineKeyboard }): Promise<void> {
  if (!ENABLE) return;
  if (!TOKEN) {
    if (process.env.NODE_ENV !== 'production') console.warn('[Telegram] TOKEN non configurato');
    return;
  }

  const chatIds = getChatIds();
  const threadId = getThreadId();
  const keyboard = opts.inlineKeyboard ? { inline_keyboard: opts.inlineKeyboard.map((row) => row.map((b) => {
    const out: Record<string, unknown> = { text: b.text };
    if (b.callbackData) out.callback_data = b.callbackData;
    if (b.url) out.url = b.url;
    return out;
  })) } : undefined;

  const bodyBase: Record<string, unknown> = {
    text: opts.textHtml,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  for (const chatId of chatIds) {
    const body: Record<string, unknown> = { ...bodyBase };
    body.chat_id = chatId;
    if (keyboard) body.reply_markup = keyboard;
    if (threadId) body.message_thread_id = threadId;

    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    const res = await safeFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res) continue;
    try {
      const json = (await res.json()) as unknown;
      if (typeof json === 'object' && json !== null) {
        const rec = json as Record<string, unknown>;
        if (rec['ok'] === false) {
          if (process.env.NODE_ENV !== 'production') console.error('[Telegram] sendMessage error', json);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('[Telegram] sendMessage parse error', err);
    }
  }
}

export async function editTelegramMessage(opts: { chatId: string | number; messageId: number; textHtml?: string; removeKeyboard?: boolean }): Promise<void> {
  if (!ENABLE) return;
  if (!TOKEN) return;

  const bodyBase: Record<string, unknown> = { chat_id: opts.chatId, message_id: opts.messageId };

  if (opts.textHtml) {
    const url = `https://api.telegram.org/bot${TOKEN}/editMessageText`;
    const body = { ...bodyBase, text: opts.textHtml, parse_mode: 'HTML', disable_web_page_preview: true };
    await safeFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  if (opts.removeKeyboard) {
    const url = `https://api.telegram.org/bot${TOKEN}/editMessageReplyMarkup`;
    const body = { ...bodyBase, reply_markup: { inline_keyboard: [] } };
    await safeFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
}

export async function answerCallbackQuery(cbId: string, text?: string, alert: boolean = false): Promise<void> {
  if (!ENABLE) return;
  if (!TOKEN) return;
  const url = `https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`;
  const body: Record<string, unknown> = { callback_query_id: cbId, show_alert: !!alert };
  if (text) body.text = text;
  await safeFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

const Telegram = {
  escapeHtml,
  getChatIds,
  getThreadId,
  getDjPanelUrl,
  getAllowedUserIds,
  sendTelegramMessage,
  editTelegramMessage,
  answerCallbackQuery,
};

export default Telegram;
