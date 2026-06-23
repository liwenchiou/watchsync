require('dotenv').config();
const cron = require('node-cron');
const { sendMessage } = require('./src/discord');
const { isNewPost } = require('./src/storage');
const { fetchLatestThreads, fetchLatestIG } = require('./src/crawler');

// 從環境變數讀取目標帳號，如果沒有設定則回傳空陣列
const getAccounts = (envStr) => {
  if (!envStr) return [];
  return envStr.split(',').map(acc => acc.trim()).filter(Boolean);
};

const TARGETS = {
  threads: getAccounts(process.env.THREADS_ACCOUNTS),
  instagram: getAccounts(process.env.IG_ACCOUNTS)
};

/**
 * 處理單一帳號的抓取與通知邏輯
 */
async function processAccount(platform, account, fetchFunction) {
  const posts = await fetchFunction(account);
  
  if (!posts || posts.length === 0) {
    // 可能是因為反爬蟲機制或網路錯誤
    return;
  }

  // 確保 posts 是陣列
  const postsArray = Array.isArray(posts) ? posts : [posts];
  
  // 反轉陣列，讓比較舊的新貼文先發送通知，確保時間順序正確
  const reversedPosts = [...postsArray].reverse();

  // 如果是全新部署或沒有 state.json 的環境，靜默初始化，不要發通知
  if (storage.isNewAccount(platform, account)) {
    console.log(`[WatchSync] 初次部署或無紀錄，已自動記錄 @${account} 的 ${reversedPosts.length} 篇貼文，不觸發洗版通知。`);
    storage.initAccount(platform, account, reversedPosts.map(p => p.id));
    return; // 結束這次檢查
  }

  let hasNew = false;
  for (const post of reversedPosts) {
    if (isNewPost(platform, account, post.id)) {
      hasNew = true;
      console.log(`[WatchSync] 發現新貼文！平台: ${platform}, 帳號: @${account}`);
      
      // 組裝 Discord 通知內容 (極簡版，只給連結)
      const message = `🚨 **@${account} 發布了新貼文！** (${platform === 'threads' ? 'Threads 🧵' : 'Instagram 📷'})\n👉 ${post.url}`;
        
      await sendMessage(message);
      // 避免短時間發送太多通知被 Discord 限制
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!hasNew) {
    console.log(`[WatchSync] 尚無新貼文。平台: ${platform}, 帳號: @${account}`);
  }
}

/**
 * 主執行任務
 */
async function runJob() {
  console.log(`\n--- 開始執行監控任務: ${new Date().toLocaleString()} ---`);

  for (const account of TARGETS.threads) {
    await processAccount('threads', account, fetchLatestThreads);
    // 稍微延遲避免瞬間發出太多請求
    await new Promise(r => setTimeout(r, 2000));
  }

  for (const account of TARGETS.instagram) {
    await processAccount('instagram', account, fetchLatestIG);
    await new Promise(r => setTimeout(r, 2000));
  }
}

// 測試時先執行一次
runJob();

// 設定排程 (每 30 分鐘執行一次)
cron.schedule('*/30 * * * *', () => {
  const delay = Math.floor(Math.random() * 60000); // 0 到 60,000 毫秒
  console.log(`[排程] 任務觸發，預計延遲 ${delay / 1000} 秒後執行...`);
  
  setTimeout(() => {
    runJob();
  }, delay);
});

console.log("[WatchSync] 系統啟動成功！排程已設定。");
