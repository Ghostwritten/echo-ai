// ============================================================
// Echo AI — PostCard 核心组件
// 基于 relevance_score 实现视觉分层 (Visual Hierarchy)
// ============================================================

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, TrendingUp, ExternalLink, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

// ----------------------------------------------------------
// 类型定义
// ----------------------------------------------------------
export interface Post {
  id: string;
  source: "x" | "rss" | "custom";
  source_id: string | null;
  author_handle: string | null;
  author_name: string | null;
  content: string;
  summary: string | null;
  relevance_score: number; // 0-100
  relevance_reason: string | null;
  is_negative: boolean;
  sentiment_label: "positive" | "negative" | "neutral";
  topics: string[];
  original_url: string | null;
  media_urls: string[];
  created_at: string;
}

interface PostCardProps {
  post: Post;
  /** 是否展示完整正文，默认只显示摘要 */
  showFullContent?: boolean;
}

// ----------------------------------------------------------
// 视觉层级配置
// 根据 relevance_score 划分为 4 个档位
// ----------------------------------------------------------
type Tier = "critical" | "high" | "medium" | "low";

interface TierConfig {
  tier: Tier;
  label: string;
  cardClass: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
  showGlow: boolean;
  showSparkle: boolean;
  summaryLines: number; // 摘要显示行数
}

function getTierConfig(score: number): TierConfig {
  if (score >= 90) {
    return {
      tier: "critical",
      label: "重点推荐",
      cardClass: cn(
        "border-indigo-500/60 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900/80",
        "shadow-[0_0_25px_-5px_rgba(99,102,241,0.4)]",
        "ring-1 ring-indigo-400/30",
        "hover:shadow-[0_0_35px_-5px_rgba(99,102,241,0.55)]",
        "transition-shadow duration-300"
      ),
      badgeVariant: "default",
      showGlow: true,
      showSparkle: true,
      summaryLines: 5,
    };
  }
  if (score >= 70) {
    return {
      tier: "high",
      label: "值得关注",
      cardClass: cn(
        "border-sky-500/40 bg-slate-900/70",
        "shadow-md",
        "hover:border-sky-400/60 hover:shadow-lg",
        "transition-all duration-300"
      ),
      badgeVariant: "secondary",
      showGlow: false,
      showSparkle: false,
      summaryLines: 4,
    };
  }
  if (score >= 40) {
    return {
      tier: "medium",
      label: "一般资讯",
      cardClass: cn(
        "border-slate-700/50 bg-slate-900/50",
        "hover:border-slate-600/60",
        "transition-colors duration-200"
      ),
      badgeVariant: "outline",
      showGlow: false,
      showSparkle: false,
      summaryLines: 3,
    };
  }
  return {
    tier: "low",
    label: "低优先级",
    cardClass: cn(
      "border-slate-800/40 bg-slate-950/40",
      "opacity-75 hover:opacity-100",
      "transition-opacity duration-200"
    ),
    badgeVariant: "outline",
    showGlow: false,
    showSparkle: false,
    summaryLines: 2,
  };
}

// ----------------------------------------------------------
// 分数可视化条
// ----------------------------------------------------------
function ScoreBar({ score }: { score: number }) {
  const getBarColor = (s: number) => {
    if (s >= 90) return "bg-indigo-500";
    if (s >= 70) return "bg-sky-500";
    if (s >= 40) return "bg-slate-500";
    return "bg-slate-700";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", getBarColor(score))}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-400">{score}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>相关性评分: {score}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ----------------------------------------------------------
// 情感指示器
// ----------------------------------------------------------
function SentimentDot({ label }: { label: Post["sentiment_label"] }) {
  const config = {
    positive: { color: "bg-emerald-500", text: "正面" },
    negative: { color: "bg-red-500", text: "负面" },
    neutral: { color: "bg-slate-500", text: "中性" },
  };
  const { color, text } = config[label];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
        </TooltipTrigger>
        <TooltipContent>
          <p>情绪: {text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ----------------------------------------------------------
// PostCard 主组件
// ----------------------------------------------------------
export default function PostCard({ post, showFullContent = false }: PostCardProps) {
  const tier = getTierConfig(post.relevance_score);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden",
        tier.cardClass
      )}
    >
      {/* ---- 高分外发光装饰线 ---- */}
      {tier.showGlow && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* 左侧: 标签 + 分数 */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={tier.badgeVariant} className="text-xs">
              {tier.showSparkle && <Sparkles className="mr-1 h-3 w-3" />}
              {tier.label}
            </Badge>
            <ScoreBar score={post.relevance_score} />
            <SentimentDot label={post.sentiment_label} />
          </div>

          {/* 右侧: 外链 */}
          {post.original_url && (
            <a
              href={post.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* 作者信息 */}
        {post.author_handle && (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-400">
            <User className="h-3.5 w-3.5" />
            <span className="font-medium text-slate-300">
              {post.author_name ?? post.author_handle}
            </span>
            <span className="text-slate-600">@{post.author_handle}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        {/* Echo 生成的摘要 */}
        {post.summary && (
          <CardDescription
            className={cn(
              "text-sm leading-relaxed text-slate-300 mb-3",
              !showFullContent && `line-clamp-${tier.summaryLines}`
            )}
          >
            {post.summary}
          </CardDescription>
        )}

        {/* 原始内容 (可折叠) */}
        {showFullContent && (
          <div className="mt-2 rounded-md bg-slate-800/50 p-3 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        )}

        {/* 主题标签 */}
        {post.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.topics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
              >
                #{topic}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex w-full items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <time dateTime={post.created_at}>
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </time>
          </div>

          {/* 打分理由 (hover 显示) */}
          {post.relevance_reason && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-help text-slate-500 hover:text-slate-400">
                    <TrendingUp className="h-3 w-3" />
                    <span>为什么推荐?</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">{post.relevance_reason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
