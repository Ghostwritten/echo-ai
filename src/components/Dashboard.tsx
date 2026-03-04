import { createServerClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

// 模拟数据 (Supabase 未连接时使用)
const MOCK_BRIEFING = {
  greeting:
    "早上好！今天是新的一天，Echo 为您筛选了最值得关注的科技动态。AI 领域有几条重磅消息值得您优先了解。",
  stats: { total: 42, high_score: 5, negative_filtered: 8 },
  highlights: [
    { post_id: "1", title: "OpenAI 发布新一代推理模型", reason: "核心关注领域" },
    { post_id: "2", title: "Rust 语言 2024 年度调查结果公布", reason: "技术趋势" },
  ],
};

async function getBriefing() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("daily_briefings")
      .select("*")
      .eq("briefing_date", today)
      .single();
    return data;
  } catch {
    return null;
  }
}

export default async function Dashboard() {
  const briefing = await getBriefing();
  const data = briefing ?? MOCK_BRIEFING;

  const stats = data.stats as { total: number; high_score: number; negative_filtered: number };

  return (
    <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-slate-900/80 shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20">
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Echo 今日简报</h1>
            <p className="text-xs text-slate-500">
              {new Date().toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-slate-300">
          {data.greeting}
        </p>

        {/* 统计指标 */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-800/50 p-3 text-center">
            <p className="text-2xl font-bold text-indigo-400">{stats.total}</p>
            <p className="text-xs text-slate-500">今日采集</p>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.high_score}</p>
            <p className="text-xs text-slate-500">重点推荐</p>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3 text-center">
            <p className="text-2xl font-bold text-slate-400">{stats.negative_filtered}</p>
            <p className="text-xs text-slate-500">已过滤</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
