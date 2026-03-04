// ============================================================
// 流水线执行脚本 — 由 GitHub Actions 或手动触发
// 用法: npx tsx scripts/run-pipeline.ts
// ============================================================

import { processPipeline } from "../src/lib/processPipeline";
import * as fs from "fs";

async function main() {
  console.log("🧠 Echo AI 处理流水线启动...\n");

  const inputPath = "/tmp/echo-raw-posts.json";

  if (!fs.existsSync(inputPath)) {
    console.log("⚠️  未找到采集数据文件，请先运行 fetch-posts.ts");
    console.log("   或确保 /tmp/echo-raw-posts.json 存在\n");
    process.exit(1);
  }

  const rawPosts = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  console.log(`📥 读取到 ${rawPosts.length} 条待处理数据\n`);

  const result = await processPipeline(rawPosts);

  console.log("\n✅ 流水线执行完成!");
  console.log(`   处理成功: ${result.processed} 条`);
  console.log(`   过滤跳过: ${result.filtered} 条`);
}

main().catch((err) => {
  console.error("❌ 流水线执行失败:", err);
  process.exit(1);
});
