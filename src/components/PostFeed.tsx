"use client";

import { useState } from "react";
import PostCard from "@/components/PostCard";
import SentimentToggle from "@/components/SentimentToggle";
import type { Post } from "@/components/PostCard";

// 模拟数据 (Supabase 未连接时展示)
const MOCK_POSTS: Post[] = [
  {
    id: "1",
    source: "hackernews",
    source_id: "mock-hn-001",
    author_handle: "dang",
    author_name: "dang",
    content:
      "Show HN: We built an open-source AI reasoning engine that runs locally. No API keys needed, works offline with 7B parameter models on consumer GPUs.\n\nHN Score: 892",
    summary:
      "Hacker News 上一个热门 Show HN 项目——开源本地 AI 推理引擎，无需 API Key，7B 模型即可在消费级 GPU 上离线运行。这对隐私敏感场景和离线开发者来说是个好消息。",
    relevance_score: 95,
    relevance_reason: "开源 AI + 本地推理，直接命中核心关注领域",
    is_negative: false,
    sentiment_label: "positive",
    topics: ["AI", "开源", "本地推理", "LLM"],
    original_url: "https://news.ycombinator.com/item?id=example1",
    media_urls: [],
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "2",
    source: "reddit",
    source_id: "mock-reddit-002",
    author_handle: "rust_enthusiast",
    author_name: "u/rust_enthusiast",
    content:
      "[r/programming] Rust 2024 Annual Survey: 92% of respondents now use Rust at work, up from 85% last year. Async ecosystem satisfaction has increased significantly.\n\nUpvotes: 2341 | Comments: 567",
    summary:
      "Reddit r/programming 热帖——Rust 2024 年度调查出炉，工作场景渗透率从 85% 跃升至 92%，异步生态满意度也明显提升。企业采用曲线仍在加速上行。",
    relevance_score: 78,
    relevance_reason: "Rust 属于关注的技术栈，年度调查是重要风向标",
    is_negative: false,
    sentiment_label: "positive",
    topics: ["Rust", "编程语言", "开发者调查"],
    original_url: "https://reddit.com/r/programming/comments/example2",
    media_urls: [],
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "3",
    source: "rss",
    source_id: "mock-rss-003",
    author_handle: "techcrunch",
    author_name: "TechCrunch",
    content:
      "[TechCrunch] A new startup has raised $50M to build AI-powered developer tools that automatically detect and fix security vulnerabilities in real-time.",
    summary:
      "又一家 AI 安全工具初创公司拿到 5000 万美元融资，主打实时检测和修复代码安全漏洞。赛道渐热，但差异化还有待观察。",
    relevance_score: 62,
    relevance_reason: "AI + 安全领域有一定交集，但非核心关注点",
    is_negative: false,
    sentiment_label: "neutral",
    topics: ["创业", "融资", "AI安全"],
    original_url: "https://techcrunch.com/example3",
    media_urls: [],
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: "4",
    source: "github",
    source_id: "mock-gh-004",
    author_handle: "denoland",
    author_name: "denoland/deno",
    content:
      "[GitHub Trending] denoland/deno\n\nA modern runtime for JavaScript and TypeScript built on V8, Rust, and Tokio.\n\nLanguage: Rust\n\nStars: 98200 (+320 today) | Forks: 5400",
    summary:
      "Deno 再次登上 GitHub Trending 榜首，今日新增 320 star。作为 Node.js 之父的新作，其 Rust 内核和原生 TypeScript 支持的路线持续吸引关注。",
    relevance_score: 55,
    relevance_reason: "开源项目趋势，与技术栈有一定关联",
    is_negative: false,
    sentiment_label: "positive",
    topics: ["Deno", "开源", "JavaScript", "Rust"],
    original_url: "https://github.com/denoland/deno",
    media_urls: [],
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: "5",
    source: "hackernews",
    source_id: "mock-hn-005",
    author_handle: "pessimist",
    author_name: "pessimist",
    content:
      "Major tech company faces massive layoffs, thousands of employees affected in restructuring move.\n\nHN Score: 445",
    summary:
      "某大型科技公司宣布大规模裁员重组。虽然行业阵痛在所难免，但从另一个角度看，这也可能加速人才向创业生态和新兴领域的流动。",
    relevance_score: 45,
    relevance_reason: "科技行业动态，但偏负面且非直接相关",
    is_negative: true,
    sentiment_label: "negative",
    topics: ["裁员", "科技行业"],
    original_url: "https://news.ycombinator.com/item?id=example5",
    media_urls: [],
    created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: "6",
    source: "reddit",
    source_id: "mock-reddit-006",
    author_handle: "casual_poster",
    author_name: "u/casual_poster",
    content:
      "[r/technology] Just had coffee and browsed some tech news. Nice weather today for coding outside.\n\nUpvotes: 12 | Comments: 3",
    summary: "一条日常分享，与核心关注领域无关。",
    relevance_score: 8,
    relevance_reason: "个人日常动态，无信息价值",
    is_negative: false,
    sentiment_label: "neutral",
    topics: ["日常"],
    original_url: null,
    media_urls: [],
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
];

export default function PostFeed() {
  const [filterNegative, setFilterNegative] = useState(true);
  const [posts] = useState<Post[]>(MOCK_POSTS);

  const displayPosts = filterNegative
    ? posts.filter((p) => !p.is_negative)
    : posts;

  // 按分数降序排列
  const sortedPosts = [...displayPosts].sort(
    (a, b) => b.relevance_score - a.relevance_score
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">
          内容流 · {sortedPosts.length} 条
        </h2>
        <SentimentToggle
          enabled={filterNegative}
          onChange={setFilterNegative}
        />
      </div>
      <div className="space-y-4">
        {sortedPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {sortedPosts.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            暂无内容
          </div>
        )}
      </div>
    </div>
  );
}
