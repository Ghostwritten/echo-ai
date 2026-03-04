// ============================================================
// 数据采集脚本 — 由 GitHub Actions 或手动触发
// 用法: npx tsx scripts/fetch-posts.ts
// ============================================================

interface RawPost {
  source: "x" | "rss" | "custom";
  source_id: string;
  author_handle?: string;
  author_name?: string;
  content: string;
  original_url?: string;
  media_urls?: string[];
}

async function fetchFromX(): Promise<RawPost[]> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    console.warn("⚠️  X_BEARER_TOKEN 未设置，跳过 X 采集");
    return [];
  }

  // TODO: 替换为实际的 X API v2 调用
  // 示例: 搜索关注列表的最新推文
  // const response = await fetch(
  //   "https://api.twitter.com/2/tweets/search/recent?query=from:openai OR from:rustlang",
  //   { headers: { Authorization: `Bearer ${bearerToken}` } }
  // );

  console.log("📡 X API 采集完成 (待实现实际调用)");
  return [];
}

async function fetchFromRSS(): Promise<RawPost[]> {
  // TODO: 添加 RSS 源采集逻辑
  // 可使用 rss-parser 库
  console.log("📡 RSS 采集完成 (待实现实际调用)");
  return [];
}

async function main() {
  console.log("🚀 Echo 数据采集开始...\n");

  const [xPosts, rssPosts] = await Promise.all([
    fetchFromX(),
    fetchFromRSS(),
  ]);

  const allPosts = [...xPosts, ...rssPosts];
  console.log(`\n📊 共采集 ${allPosts.length} 条原始数据`);

  // 将采集结果写入临时文件，供 run-pipeline.ts 读取
  const fs = await import("fs");
  const outputPath = "/tmp/echo-raw-posts.json";
  fs.writeFileSync(outputPath, JSON.stringify(allPosts, null, 2));
  console.log(`💾 原始数据已保存到 ${outputPath}`);
}

main().catch(console.error);
