const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../state.json');

/**
 * 讀取狀態檔
 */
function readState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('[Storage] 狀態檔解析失敗:', e);
      return {};
    }
  }
  return { threads: {}, instagram: {} };
}

/**
 * 寫入狀態檔
 */
function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('[Storage] 狀態檔寫入失敗:', e);
  }
}

/**
 * 檢查是否為新貼文，並更新狀態
 * @param {string} platform - 'threads' 或 'instagram'
 * @param {string} account - 目標帳號
 * @param {string} postId - 抓取到的最新貼文 ID
 * @returns {boolean} - 如果是新的回傳 true，否則 false
 */
function isNewPost(platform, account, postId) {
  const state = readState();
  
  if (!state[platform]) state[platform] = {};
  if (!state[platform][account]) state[platform][account] = { seen_posts: [] };

  // 向下相容之前的 last_post_id 結構
  if (!state[platform][account].seen_posts) {
     const oldId = state[platform][account].last_post_id;
     state[platform][account].seen_posts = oldId ? [oldId] : [];
  }

  const seenPosts = state[platform][account].seen_posts;

  if (seenPosts.includes(postId)) {
    return false; // 已經通知過
  }

  // 發現新貼文，加入清單
  seenPosts.push(postId);
  
  // 保持陣列大小不超過 50，避免檔案無限增長，並給予足夠的緩衝空間
  if (seenPosts.length > 50) {
    seenPosts.shift(); 
  }

  state[platform][account].seen_posts = seenPosts;
  state[platform][account].last_checked_at = new Date().toISOString();
  
  writeState(state);
  return true;
}

/**
 * 檢查是否為初次建立的帳號 (無歷史紀錄)
 */
function isNewAccount(platform, account) {
  const state = readState();
  return !state[platform] || !state[platform][account] || !state[platform][account].seen_posts || state[platform][account].seen_posts.length === 0;
}

/**
 * 初次初始化帳號，直接寫入陣列，不觸發通知
 */
function initAccount(platform, account, postIds) {
  const state = readState();
  if (!state[platform]) state[platform] = {};
  if (!state[platform][account]) state[platform][account] = { seen_posts: [] };
  
  // 保留最後 50 筆
  state[platform][account].seen_posts = postIds.slice(-50);
  state[platform][account].last_checked_at = new Date().toISOString();
  writeState(state);
}

module.exports = {
  readState,
  writeState,
  isNewPost,
  isNewAccount,
  initAccount
};
