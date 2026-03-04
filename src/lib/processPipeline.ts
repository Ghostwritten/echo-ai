// ============================================================
// Echo AI — 数据处理流水线
// 执行顺序: 预过滤 → 情感分析 → 相关性打分 → 摘要生成 → Embedding → 入库
// ============================================================

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { ECHO_SYSTEM_PROMPT } from "./echo-persona";

// ----------------------------------------------------------
// 客户端初始化 (无泛型, 避免与 RPC/upsert 的类型冲突)
// ----------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ----------------------------------------------------------
// 类型定义
// ----------------------------------------------------------
interface RawPost {
  source: "x" | "rss" | "custom";
  source_id: string;
  author_handle?: string;
  author_name?: string;
  content: string;
  original_url?: string;
  media_urls?: string[];
}

interface ProcessedPost extends RawPost {
  summary: string;
  relevance_score: number;
  relevance_reason: string;
  sentiment_label: "positive" | "negative" | "neutral";
  is_negative: boolean;
  topics: string[];
  embedding: number[];
  processed_at: string;
}

// ----------------------------------------------------------
// Step 1: 预过滤 (Pre-filter)
// 去重 / 去广告 / 最小内容长度
// ----------------------------------------------------------
async function preFilter(posts: RawPost[]): Promise<RawPost[]> {
  // 查询已存在的 source_id 进行去重
  const sourceIds = posts.map((p) => p.source_id).filter(Boolean);
  const { data: existing } = await supabase
    .from("posts")
    .select("source_id")
    .in("source_id", sourceIds);

  const existingIds = new Set(existing?.map((e: any) => e.source_id) ?? []);

  return posts.filter((post) => {
    // 去重
    if (existingIds.has(post.source_id)) return false;
    // 最小内容长度
    if (post.content.trim().length < 20) return false;
    // 基础广告过滤 (可扩展)
    const adPatterns = /(?:sponsored|promoted|#ad\b|buy now|limited offer)/i;
    if (adPatterns.test(post.content)) return false;
    return true;
  });
}

// ----------------------------------------------------------
// Step 2: 情感分析 (Sentiment Analysis) — GPT-4o mini
// ----------------------------------------------------------
async function analyzeSentiment(
  content: string
): Promise<{ sentiment_label: "positive" | "negative" | "neutral"; is_negative: boolean }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `你是一个情感分析引擎。分析用户提供的文本，返回 JSON:
{"sentiment_label": "positive"|"negative"|"neutral", "is_negative": boolean}
仅当内容包含明显的愤怒、仇恨、恐惧、悲伤等强烈负面情绪时 is_negative 为 true。
客观的批评性报道不算 negative。`,
      },
      { role: "user", content },
    ],
  });

  return JSON.parse(response.choices[0].message.content!);
}

// ----------------------------------------------------------
// Step 3: 相关性打分 (Relevance Scoring) — GPT-4o
// ----------------------------------------------------------
async function scoreRelevance(
  content: string,
  userInterests: string[]
): Promise<{ relevance_score: number; relevance_reason: string; topics: string[] }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `你是一个资讯相关性评分引擎。基于用户的兴趣领域，为内容打分 0-100。
用户兴趣: ${userInterests.join(", ")}

返回 JSON:
{
  "relevance_score": number (0-100),
  "relevance_reason": string (一句话解释为何给出此分数),
  "topics": string[] (提取 2-5 个主题关键词)
}

评分标准:
- 90-100: 与核心兴趣高度相关，有重大信息价值
- 70-89: 相关且有参考价值
- 40-69: 略有关联或泛科技领域
- 0-39: 关联性低`,
      },
      { role: "user", content },
    ],
  });

  return JSON.parse(response.choices[0].message.content!);
}

// ----------------------------------------------------------
// Step 4: 摘要生成 (Summary Generation) — GPT-4o + Echo Persona
// ----------------------------------------------------------
async function generateSummary(content: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    max_tokens: 300,
    messages: [
      { role: "system", content: ECHO_SYSTEM_PROMPT },
      {
        role: "user",
        content: `请用"助理汇报"的视角，为以下内容生成一段精炼摘要 (2-3 句话):\n\n${content}`,
      },
    ],
  });

  return response.choices[0].message.content!.trim();
}

// ----------------------------------------------------------
// Step 5: Embedding 生成
// ----------------------------------------------------------
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

// ----------------------------------------------------------
// Step 6: 批量入库
// ----------------------------------------------------------
async function upsertPosts(posts: ProcessedPost[]): Promise<void> {
  const { error } = await supabase.from("posts").upsert(
    posts.map((p) => ({
      source: p.source,
      source_id: p.source_id,
      author_handle: p.author_handle ?? null,
      author_name: p.author_name ?? null,
      content: p.content,
      original_url: p.original_url ?? null,
      media_urls: p.media_urls ?? [],
      summary: p.summary,
      relevance_score: p.relevance_score,
      relevance_reason: p.relevance_reason,
      sentiment_label: p.sentiment_label,
      is_negative: p.is_negative,
      topics: p.topics,
      embedding: p.embedding as any, // pgvector 接受 number[]
      processed_at: p.processed_at,
    })),
    { onConflict: "source_id" }
  );

  if (error) throw new Error(`入库失败: ${error.message}`);
}

// ----------------------------------------------------------
// 生成每日简报
// ----------------------------------------------------------
async function generateDailyBriefing(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // 获取今日高分内容
  const { data: topPosts } = await supabase
    .from("posts")
    .select("id, summary, relevance_score, relevance_reason, topics")
    .gte("created_at", `${today}T00:00:00Z`)
    .eq("is_negative", false)
    .order("relevance_score", { ascending: false })
    .limit(5);

  // 获取今日统计
  const { count: total } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00Z`);

  const { count: negativeCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00Z`)
    .eq("is_negative", true);

  // 让 Echo 生成问候语
  const greetingResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.8,
    max_tokens: 200,
    messages: [
      { role: "system", content: ECHO_SYSTEM_PROMPT },
      {
        role: "user",
        content: `今天是 ${today}，共处理了 ${total} 条资讯，其中 ${topPosts?.length ?? 0} 条高分推荐。
请生成一段温暖而专业的"今日简报"开场问候 (2-3 句话)。`,
      },
    ],
  });

  await supabase.from("daily_briefings").upsert(
    {
      briefing_date: today,
      greeting: greetingResponse.choices[0].message.content!.trim(),
      highlights: topPosts?.map((p) => ({
        post_id: p.id,
        title: p.summary?.slice(0, 60) ?? "",
        reason: p.relevance_reason,
      })) as any,
      stats: {
        total: total ?? 0,
        high_score: topPosts?.length ?? 0,
        negative_filtered: negativeCount ?? 0,
      },
    },
    { onConflict: "briefing_date" }
  );
}

// ----------------------------------------------------------
// 主流水线入口
// ----------------------------------------------------------
export async function processPipeline(rawPosts: RawPost[]): Promise<{
  processed: number;
  filtered: number;
}> {
  console.log(`📥 收到 ${rawPosts.length} 条原始数据`);

  // Step 1: 预过滤
  const filtered = await preFilter(rawPosts);
  console.log(`🔍 预过滤后剩余 ${filtered.length} 条`);

  // 获取用户兴趣 (取第一个用户的偏好, 单用户场景)
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("interest_keywords")
    .limit(1)
    .single();

  const interests = prefs?.interest_keywords ?? ["AI", "科技", "创业", "开源"];

  // Step 2-5: 并行处理每条内容
  const processed: ProcessedPost[] = [];
  const BATCH_SIZE = 5; // 并发控制

  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (post) => {
        try {
          // 2: 情感分析
          const sentiment = await analyzeSentiment(post.content);
          // 3: 相关性打分
          const relevance = await scoreRelevance(post.content, interests);
          // 4: 摘要生成
          const summary = await generateSummary(post.content);
          // 5: Embedding
          const embedding = await generateEmbedding(post.content);

          return {
            ...post,
            ...sentiment,
            ...relevance,
            summary,
            embedding,
            processed_at: new Date().toISOString(),
          } as ProcessedPost;
        } catch (err) {
          console.error(`❌ 处理失败 [${post.source_id}]:`, err);
          return null;
        }
      })
    );

    processed.push(...(results.filter(Boolean) as ProcessedPost[]));
    console.log(`⚙️  已处理 ${Math.min(i + BATCH_SIZE, filtered.length)}/${filtered.length}`);
  }

  // Step 6: 入库
  if (processed.length > 0) {
    await upsertPosts(processed);
    console.log(`💾 成功入库 ${processed.length} 条`);
  }

  // 生成每日简报
  await generateDailyBriefing();
  console.log(`📋 每日简报已更新`);

  return {
    processed: processed.length,
    filtered: rawPosts.length - filtered.length,
  };
}
