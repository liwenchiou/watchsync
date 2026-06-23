const axios = require('axios');
require('dotenv').config();

/**
 * 發送訊息到 Discord 指定頻道
 * @param {string} content - 訊息內容
 */
async function sendMessage(content) {
  try {
    const token = process.env.DISCORD_TOKEN;
    const channelId = process.env.CHANNEL_ID;

    if (!token || !channelId) {
      console.warn("未設定 DISCORD_TOKEN 或 CHANNEL_ID，跳過發送通知。");
      return;
    }

    await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      { content },
      {
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[Discord] 成功發送通知: ${content.substring(0, 30)}...`);
  } catch (error) {
    console.error('[Discord] 發送失敗:', error.response?.data || error.message);
  }
}

module.exports = {
  sendMessage
};
