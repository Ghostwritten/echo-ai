// ============================================================
// Echo AI — GitHub Trending 数据采集器
// 使用非官方 API (无需 Key, 免费)
// ============================================================

import type { RawPost } from "./types";

interface TrendingRepo {
  author: string;
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
  currentPeriodStars: number;
}

/**
 * 抓取 GitHub Trending 仓库
 * 使用 github-trending-api 的公开镜像
 */
export async function fetchGitHubTrending(): Promise<RawPost[]> {
  console.log("📡 [GitHub] 正在获取 Trending 仓库...");

  const posts: RawPost[] = [];

  try {
    // 方案 1: 使用公开的 trending API 镜像
    const res = await fetch(
      "https://api.gitterapp.com/repositories?since=daily&spoken_language_code=",
      {
        headers: { "User-Agent": "EchoAI/1.0" },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (res.ok) {
      const repos: TrendingRepo[] = await res.json();

      for (const repo of repos.slice(0, 20)) {
        posts.push({
          source: "github",
          source_id: `gh-${repo.author}-${repo.name}`,
          author_handle: repo.author,
          author_name: `${repo.author}/${repo.name}`,
          content: [
            `[GitHub Trending] ${repo.author}/${repo.name}`,
            repo.description ? `\n\n${repo.description}` : "",
            repo.language ? `\n\nLanguage: ${repo.language}` : "",
            `\n\nStars: ${repo.stars} (+${repo.currentPeriodStars} today) | Forks: ${repo.forks}`,
          ].join(""),
          original_url: repo.url,
        });
      }
    } else {
      // 方案 2: 回退到 GitHub 官方搜索 API (无需 Token 的公开接口)
      console.log("   ↳ Trending API 不可用, 回退到 GitHub Search API...");
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const searchRes = await fetch(
        `https://api.github.com/search/repositories?q=created:>${yesterday}&sort=stars&order=desc&per_page=20`,
        {
          headers: {
            "User-Agent": "EchoAI/1.0",
            Accept: "application/vnd.github.v3+json",
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (searchRes.ok) {
        const data = await searchRes.json();
        for (const repo of data.items ?? []) {
          posts.push({
            source: "github",
            source_id: `gh-${repo.full_name.replace("/", "-")}`,
            author_handle: repo.owner?.login,
            author_name: repo.full_name,
            content: [
              `[GitHub New & Hot] ${repo.full_name}`,
              repo.description ? `\n\n${repo.description}` : "",
              repo.language ? `\n\nLanguage: ${repo.language}` : "",
              `\n\nStars: ${repo.stargazers_count} | Forks: ${repo.forks_count}`,
            ].join(""),
            original_url: repo.html_url,
          });
        }
      }
    }
  } catch (err) {
    console.warn("⚠️  [GitHub] 采集失败:", err);
  }

  console.log(`📡 [GitHub] 获取到 ${posts.length} 条`);
  return posts;
}
