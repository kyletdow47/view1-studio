// Setup Telegram Webhook — visit this URL once via GET to register
// https://view1-dashboard.vercel.app/api/setup-webhook

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = 'https://view1-dashboard.vercel.app/api/telegram';

module.exports = async function handler(req, res) {
  try {
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}`;
    const response = await fetch(telegramUrl);
    const result = await response.json();

    return res.status(200).json({
      success: true,
      telegram_response: result,
      webhook_url: WEBHOOK_URL,
      message: 'Webhook registration complete. You can now send commands to your bot.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
