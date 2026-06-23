const axios = require('axios');
const cheerio = require('cheerio');
const { ThreadsAPI } = require('threads-api');

// 初始化 ThreadsAPI 實例
const threadsAPI = new ThreadsAPI();

// 通用請求 Headers，模擬正常瀏覽器
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
};

/**
 * 爬取 Threads 帳號的最新貼文
 * @param {string} account - 目標帳號
 */
async function fetchLatestThreads(account) {
  try {
    console.log(`[Crawler] 正在爬取 Threads: @${account}`);
    
    // 使用非官方的 ThreadsAPI 模組，這樣就能突破純 HTML 阻擋
    const userID = await threadsAPI.getUserIDfromUsername(account);
    if (!userID) {
      console.log(`[Crawler] 找不到 Threads 帳號 @${account}`);
      return null;
    }

    const threads = await threadsAPI.getUserProfileThreads(userID);
    if (!threads || threads.length === 0) {
       console.log(`[Crawler] Threads @${account} 尚未發布任何貼文`);
       return null;
    }

    // 提取最近的 20 筆貼文，防止網紅短時間瘋狂連發
    const recentPosts = threads.slice(0, 20).map(threadObj => {
      const post = threadObj.thread_items[0]?.post;
      return {
        id: post.id,
        text: post.caption?.text || '',
        url: `https://www.threads.net/@${account}/post/${post.code}`
      };
    });

    return recentPosts;
  } catch (error) {
    console.error(`[Crawler] 爬取 Threads @${account} 失敗:`, error.message);
    return null;
  }
}

/**
 * 爬取 IG 帳號的最新貼文
 * @param {string} account - 目標帳號
 */
async function fetchLatestIG(account) {
  try {
    console.log(`[Crawler] 正在爬取 Instagram: @${account}`);
    // 使用 IG 官方提供的 Public Web Profile API
    // 加上 x-ig-app-id 能夠繞過大部分未登入的阻擋
    const res = await axios.get(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${account}`, {
      headers: {
        ...HEADERS,
        'x-ig-app-id': '936619743392459' // IG Web App ID
      }
    });

    const userData = res.data?.data?.user;
    if (!userData) {
      console.log(`[Crawler] 找不到 Instagram @${account} 的資料`);
      return null;
    }

    // 取得最新貼文的陣列
    const edges = userData.edge_owner_to_timeline_media?.edges;
    if (!edges || edges.length === 0) {
      console.log(`[Crawler] Instagram @${account} 尚未發布任何貼文`);
      return null;
    }

    // 提取最近的 20 筆貼文 (最多)，防止短時間內大量發文漏接
    const recentPosts = edges.slice(0, 20).map(edge => {
      const node = edge.node;
      return {
        id: node.id,
        text: node.edge_media_to_caption?.edges[0]?.node?.text || '',
        url: `https://www.instagram.com/p/${node.shortcode}/`
      };
    });
    
    return recentPosts;

  } catch (error) {
    console.error(`[Crawler] 爬取 Instagram @${account} 失敗:`, error.response?.status || error.message);
    return null;
  }
}

module.exports = {
  fetchLatestThreads,
  fetchLatestIG
};
