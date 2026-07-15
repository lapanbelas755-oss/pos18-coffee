export const TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN";
export const TELEGRAM_CHAT_ID = "YOUR_TELEGRAM_CHAT_ID";

/**
 * Mengirim pesan teks ke Telegram melalui Bot API
 * @param message Pesan yang ingin dikirim
 */
export const sendTelegramNotification = async (message: string) => {
  const token = localStorage.getItem('telegram_bot_token') || '8738749086:AAGtYRPYGXj4p_x7zE1xhPYkwfp7MzhRJDs';
  const chatId = localStorage.getItem('telegram_chat_id') || '-5573934660';

  if (!token || !chatId) {
    console.warn("Telegram Token atau Chat ID belum diset.");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      console.error("Gagal mengirim notifikasi Telegram", await response.text());
    } else {
      console.log("Notifikasi Telegram berhasil dikirim:", message);
    }
  } catch (error) {
    console.error("Error mengirim notifikasi Telegram:", error);
  }
};
