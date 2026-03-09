// ============================================================
// 数据采集脚本 — 聚合 4 个免费数据源
// 用法: npx tsx scripts/fetch-posts.ts
// ============================================================

import { fetchHackerNews } from "./sources/hackernews";
import { fetchReddit } from "./sources/reddit";
import { fetchRSS } from "./sources/rss";
import { fetchGitHubTrending } from "./sources/github-trending";
import * as fs from "fs";

async function main() {
  console.log("🚀 Echo 数据采集开始...\n");

  const results = await Promise.allSettled([
    fetchHackerNews(30),
    fetchReddit(10),
    fetchRSS(8),
    fetchGitHubTrending(),
  ]);

  const allPosts = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.warn(`\n⚠️  ${failed.length} 个数据源采集失败，已跳过`);
  }

  console.log(`\n📊 共采集 ${allPosts.length} 条原始数据`);

  const outputPath = "/tmp/echo-raw-posts.json";
  fs.writeFileSync(outputPath, JSON.stringify(allPosts, null, 2));
  console.log(`💾 原始数据已保存到 ${outputPath}`);
}

main().catch(console.error);
