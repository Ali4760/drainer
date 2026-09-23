// functions/lib/telegram.ts

/** Send a message via Telegram Bot API */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  message: string
): Promise<void> {
  if (!token || !chatId) {
    console.warn('Telegram credentials not set – skipping notification');
    return;
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown',
  };
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Telegram send failed', resp.status, txt);
    }
  } catch (e) {
    console.error('Telegram send exception', e);
  }
}
