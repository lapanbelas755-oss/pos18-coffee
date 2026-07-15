export async function sendTelegramMessage(text: string) {
  // Dalam production, Token & Chat ID sebaiknya disimpan di backend atau env variables.
  // Karena ini aplikasi React SPA, kita gunakan localStorage untuk setting dinamis (atau hardcode sementara).
  
  const token = localStorage.getItem('telegram_bot_token') || '8738749086:AAGtYRPYGXj4p_x7zE1xhPYkwfp7MzhRJDs';
  const chatId = localStorage.getItem('telegram_chat_id') || '-5573934660';

  if (!token || !chatId) {
    console.warn("Telegram Token atau Chat ID belum diset.");
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      console.error("Gagal mengirim Telegram:", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error mengirim pesan Telegram:", error);
    return false;
  }
}
