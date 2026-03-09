// ============================================================
// Echo AI — Reddit 数据采集器
// 使用 public JSON API (无需注册, 无需 Key)
// ============================================================

import type { RawPost } from "./types";

const SUBREDDITS = [
  "technology",
  "programming",
  "MachineLearning",
  "artificial",
  "opensource",
  "startups",
];

interface RedditChild {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    url: string;
    permalink: string;
    subreddit: string;
    score: number;
    num_comments: number;
    created_utc: number;
    is_self: boolean;
    link_flair_text?: string;
  };
}

/**
 * 抓取 Reddit 多个子版块的热门帖子
 * @param limit 每个子版块抓取数 (默认 10)
 */
export async function fetchReddit(limit = 10): Promise<RawPost[]> {
  console.log(`📡 [Reddit] 正在获取 ${SUBREDDITS.length} 个子版块...`);

  const allPosts: RawPost[] = [];

  for (const sub of SUBREDDITS) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=${limit}`,
        {
          headers: {
            "User-Agent": "EchoAI/1.0 (Personal News Assistant)",
          },
        }
      );

      if (!res.ok) {
        console.warn(`⚠️  [Reddit] r/${sub} 返回 ${res.status}, 跳过`);
        continue;
      }

      const data = await res.json();
      const children: RedditChild[] = data?.data?.children ?? [];

      const posts: RawPost[] = children
        .filter((c) => !c.data.title.toLowerCase().includes("[removed]"))
        .map((c) => ({
          source: "reddit" as const,
          source_id: `reddit-${c.data.id}`,
          author_handle: c.data.author,
          author_name: `u/${c.data.author}`,
          content: [
            `[r/${c.data.subreddit}] ${c.data.title}`,
            c.data.selftext ? `\n\n${c.data.selftext.slice(0, 1000)}` : "",
            `\n\nUpvotes: ${c.data.score} | Comments: ${c.data.num_comments}`,
          ].join(""),
          original_url: c.data.is_self
            ? `https://reddit.com${c.data.permalink}`
            : c.data.url,
        }));

      allPosts.push(...posts);
    } catch (err) {
      console.warn(`⚠️  [Reddit] r/${sub} 采集失败:`, err);
    }

    // Rate limit: Reddit 要求间隔请求
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`📡 [Reddit] 共获取 ${allPosts.length} 条`);
  return allPosts;
}
