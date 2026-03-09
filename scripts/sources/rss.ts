// ============================================================
// Echo AI — RSS 科技媒体数据采集器
// 使用免费 RSS feeds (无需 Key)
// ============================================================

import type { RawPost } from "./types";

// 科技媒体 RSS 源列表
const RSS_FEEDS = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { name: "Wired", url: "https://www.wired.com/feed/rss" },
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/feed/" },
];

/**
 * 简易 XML → 条目解析 (无需额外依赖)
 */
function parseRSSItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate: string;
  creator: string;
}> {
  const items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
    creator: string;
  }> = [];

  // 匹配 <item> 或 <entry> 标签
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const getTag = (tag: string): string => {
      // 处理 CDATA 和普通内容
      const r = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
      const m = block.match(r);
      return m ? m[1].trim() : "";
    };

    // Atom feeds 用 <link href="..."/>
    const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    const link = getTag("link") || (linkMatch ? linkMatch[1] : "");

    const creator = getTag("dc:creator") || getTag("author") || "";

    items.push({
      title: getTag("title"),
      link,
      description: getTag("description") || getTag("summary") || getTag("content"),
      pubDate: getTag("pubDate") || getTag("published") || getTag("updated"),
      creator,
    });
  }

  return items;
}

/**
 * 去除 HTML 标签
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 抓取所有 RSS 源
 * @param limitPerFeed 每个源最多取几条 (默认 8)
 */
export async function fetchRSS(limitPerFeed = 8): Promise<RawPost[]> {
  console.log(`📡 [RSS] 正在获取 ${RSS_FEEDS.length} 个媒体源...`);

  const allPosts: RawPost[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "EchoAI/1.0" },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        console.warn(`⚠️  [RSS] ${feed.name} 返回 ${res.status}, 跳过`);
        continue;
      }

      const xml = await res.text();
      const items = parseRSSItems(xml).slice(0, limitPerFeed);

      const posts: RawPost[] = items
        .filter((item) => item.title && item.title.length > 5)
        .map((item, idx) => ({
          source: "rss" as const,
          source_id: `rss-${feed.name.toLowerCase().replace(/\s+/g, "-")}-${
            item.link ? Buffer.from(item.link).toString("base64").slice(0, 20) : idx
          }`,
          author_handle: feed.name.toLowerCase().replace(/\s+/g, ""),
          author_name: item.creator || feed.name,
          content: [
            `[${feed.name}] ${item.title}`,
            stripHtml(item.description).slice(0, 800) || "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          original_url: item.link || undefined,
        }));

      allPosts.push(...posts);
      console.log(`   ✓ ${feed.name}: ${posts.length} 条`);
    } catch (err) {
      console.warn(`⚠️  [RSS] ${feed.name} 采集失败:`, err);
    }
  }

  console.log(`📡 [RSS] 共获取 ${allPosts.length} 条`);
  return allPosts;
}
