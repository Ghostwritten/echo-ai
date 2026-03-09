// ============================================================
// Echo AI — 数据处理流水线
// AI 模型: DeepSeek (摘要/打分/情感) + Jina AI (Embedding)
// 数据源: Hacker News / Reddit / RSS / GitHub Trending
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { ECHO_SYSTEM_PROMPT } from "./echo-persona";

// ----------------------------------------------------------
// 客户端懒初始化 (确保 dotenv 已加载后再读取 env)
// ----------------------------------------------------------
let _supabase: SupabaseClient;
let _deepseek: OpenAI;
let _jinaKey: string;

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

function getDeepseek() {
  if (!_deepseek) {
    _deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY!,
      baseURL: "https://api.deepseek.com",
    });
  }
  return _deepseek;
}

function getJinaKey() {
  if (!_jinaKey) {
    _jinaKey = process.env.JINA_API_KEY!;
  }
  return _jinaKey;
}

// ----------------------------------------------------------
// 类型定义
// ----------------------------------------------------------
export interface RawPost {
  source: "hackernews" | "reddit" | "rss" | "github" | "custom";
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
// ----------------------------------------------------------
async function preFilter(posts: RawPost[]): Promise<RawPost[]> {
  const sourceIds = posts.map((p) => p.source_id).filter(Boolean);
  const { data: existing } = await getSupabase()
    .from("posts")
    .select("source_id")
    .in("source_id", sourceIds);

  const existingIds = new Set(existing?.map((e: any) => e.source_id) ?? []);

  return posts.filter((post) => {
    if (existingIds.has(post.source_id)) return false;
    if (post.content.trim().length < 20) return false;
    const adPatterns = /(?:sponsored|promoted|#ad\b|buy now|limited offer)/i;
    if (adPatterns.test(post.content)) return false;
    return true;
  });
}

// ----------------------------------------------------------
// Step 2: 情感分析 — DeepSeek
// ----------------------------------------------------------
async function analyzeSentiment(
  content: string
): Promise<{ sentiment_label: "positive" | "negative" | "neutral"; is_negative: boolean }> {
  const response = await getDeepseek().chat.completions.create({
    model: "deepseek-chat",
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
// Step 3: 相关性打分 — DeepSeek
// ----------------------------------------------------------
async function scoreRelevance(
  content: string,
  userInterests: string[]
): Promise<{ relevance_score: number; relevance_reason: string; topics: string[] }> {
  const response = await getDeepseek().chat.completions.create({
    model: "deepseek-chat",
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
// Step 4: 摘要生成 — DeepSeek + Echo Persona
// ----------------------------------------------------------
async function generateSummary(content: string): Promise<string> {
  const response = await getDeepseek().chat.completions.create({
    model: "deepseek-chat",
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
// Step 5: Embedding — Jina AI
// jina-embeddings-v3 输出 1024 维, 需调整 pgvector 列维度
// ----------------------------------------------------------
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getJinaKey()}`,
    },
    body: JSON.stringify({
      model: "jina-embeddings-v3",
      task: "text-matching",
      dimensions: 1024,
      input: [text],
    }),
  });

  if (!response.ok) {
    throw new Error(`Jina Embedding 失败: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ----------------------------------------------------------
// Step 6: 批量入库
// ----------------------------------------------------------
async function upsertPosts(posts: ProcessedPost[]): Promise<void> {
  // 按 source_id 去重 (同一批次中可能存在重复)
  const uniqueMap = new Map<string, ProcessedPost>();
  for (const p of posts) {
    uniqueMap.set(p.source_id, p);
  }
  const uniquePosts = Array.from(uniqueMap.values());

  const { error } = await getSupabase().from("posts").upsert(
    uniquePosts.map((p) => ({
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
      embedding: p.embedding as any,
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

  const { data: topPosts } = await getSupabase()
    .from("posts")
    .select("id, summary, relevance_score, relevance_reason, topics")
    .gte("created_at", `${today}T00:00:00Z`)
    .eq("is_negative", false)
    .order("relevance_score", { ascending: false })
    .limit(5);

  const { count: total } = await getSupabase()
    .from("posts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00Z`);

  const { count: negativeCount } = await getSupabase()
    .from("posts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00Z`)
    .eq("is_negative", true);

  const greetingResponse = await getDeepseek().chat.completions.create({
    model: "deepseek-chat",
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

  await getSupabase().from("daily_briefings").upsert(
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

  const filtered = await preFilter(rawPosts);
  console.log(`🔍 预过滤后剩余 ${filtered.length} 条`);

  const { data: prefs } = await getSupabase()
    .from("user_preferences")
    .select("interest_keywords")
    .limit(1)
    .single();

  const interests = prefs?.interest_keywords ?? ["AI", "科技", "创业", "开源"];

  const processed: ProcessedPost[] = [];
  const BATCH_SIZE = 2; // Jina 免费版并发限制为 2, 保守设置

  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (post) => {
        try {
          const sentiment = await analyzeSentiment(post.content);
          const relevance = await scoreRelevance(post.content, interests);
          const summary = await generateSummary(post.content);
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

  if (processed.length > 0) {
    await upsertPosts(processed);
    console.log(`💾 成功入库 ${processed.length} 条`);
  }

  await generateDailyBriefing();
  console.log(`📋 每日简报已更新`);

  return {
    processed: processed.length,
    filtered: rawPosts.length - filtered.length,
  };
}
