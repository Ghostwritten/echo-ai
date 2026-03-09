// ============================================================
// Echo AI — Hacker News 数据采集器
// API: https://github.com/HackerNews/API (完全免费, 无需 Key)
// ============================================================

import type { RawPost } from "./types";

const HN_API = "https://hacker-news.firebaseio.com/v0";

interface HNItem {
  id: number;
  title?: string;
  text?: string;
  url?: string;
  by?: string;
  score?: number;
  type?: string;
  time?: number;
}

/**
 * 抓取 Hacker News Top/Best Stories
 * @param limit 抓取条目数 (默认 30)
 */
export async function fetchHackerNews(limit = 30): Promise<RawPost[]> {
  console.log("📡 [HN] 正在获取 Top Stories...");

  // 获取 Top Story ID 列表
  const res = await fetch(`${HN_API}/topstories.json`);
  const ids: number[] = await res.json();
  const targetIds = ids.slice(0, limit);

  // 并发获取每条详情
  const items = await Promise.all(
    targetIds.map(async (id) => {
      try {
        const r = await fetch(`${HN_API}/item/${id}.json`);
        return (await r.json()) as HNItem;
      } catch {
        return null;
      }
    })
  );

  const posts: RawPost[] = items
    .filter((item): item is HNItem => item !== null && item.type === "story" && !!item.title)
    .map((item) => ({
      source: "hackernews" as const,
      source_id: `hn-${item.id}`,
      author_handle: item.by ?? undefined,
      author_name: item.by ?? undefined,
      content: [
        item.title,
        item.text ? `\n\n${item.text}` : "",
        item.url ? `\n\nLink: ${item.url}` : "",
        item.score ? `\n\nHN Score: ${item.score}` : "",
      ].join(""),
      original_url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
    }));

  console.log(`📡 [HN] 获取到 ${posts.length} 条`);
  return posts;
}
