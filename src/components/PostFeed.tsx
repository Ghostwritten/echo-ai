"use client";

import { useState } from "react";
import PostCard from "@/components/PostCard";
import SentimentToggle from "@/components/SentimentToggle";
import type { Post } from "@/components/PostCard";

// 模拟数据 (Supabase 未连接时展示)
const MOCK_POSTS: Post[] = [
  {
    id: "1",
    source: "x",
    source_id: "mock-001",
    author_handle: "openai",
    author_name: "OpenAI",
    content:
      "We're releasing a new reasoning model that achieves state-of-the-art on graduate-level math, science, and coding benchmarks. This represents a significant leap in AI reasoning capabilities.",
    summary:
      "OpenAI 昨晚悄悄更新了——新一代推理模型在研究生级别的数学、科学和编程基准测试中刷新了记录。这标志着 AI 推理能力的又一次质的飞跃，建议您重点关注后续的 API 定价和接入方式。",
    relevance_score: 95,
    relevance_reason: "直接关联 AI 核心关注领域，且具有重大行业影响",
    is_negative: false,
    sentiment_label: "positive",
    topics: ["AI", "OpenAI", "推理模型", "大模型"],
    original_url: "https://x.com/openai/status/example1",
    media_urls: [],
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "2",
    source: "x",
    source_id: "mock-002",
    author_handle: "rustlang",
    author_name: "Rust Language",
    content:
      "The Rust 2024 Annual Survey results are in! 92% of respondents use Rust at work, up from 85% last year. Async ecosystem satisfaction has increased significantly.",
    summary:
      "Rust 2024 年度调查出炉，工作场景渗透率从 85% 跃升至 92%，异步生态的满意度也明显提升。作为系统编程的首选语言，Rust 的企业采用曲线仍在加速上行。",
    relevance_score: 78,
    relevance_reason: "Rust 属于关注的技术栈，年度调查是重要风向标",
    is_negative: false,
    sentiment_label: "positive",
    topics: ["Rust", "编程语言", "开发者调查"],
    original_url: "https://x.com/rustlang/status/example2",
    media_urls: [],
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "3",
    source: "rss",
    source_id: "mock-003",
    author_handle: "techcrunch",
    author_name: "TechCrunch",
    content:
      "A new startup has raised $50M to build AI-powered developer tools that automatically detect and fix security vulnerabilities in real-time.",
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
    source: "x",
    source_id: "mock-004",
    author_handle: "negativenews",
    author_name: "Breaking Alerts",
    content:
      "Major tech company faces massive layoffs, thousands of employees affected in restructuring move.",
    summary:
      "某大型科技公司宣布大规模裁员重组。虽然行业阵痛在所难免，但从另一个角度看，这也可能加速人才向创业生态和新兴领域的流动。",
    relevance_score: 45,
    relevance_reason: "科技行业动态，但偏负面且非直接相关",
    is_negative: true,
    sentiment_label: "negative",
    topics: ["裁员", "科技行业"],
    original_url: "https://x.com/negativenews/status/example4",
    media_urls: [],
    created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: "5",
    source: "x",
    source_id: "mock-005",
    author_handle: "veraborns",
    author_name: "Vera",
    content: "Just had coffee. Nice weather today.",
    summary: "一条日常分享，与核心关注领域无关。",
    relevance_score: 12,
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
