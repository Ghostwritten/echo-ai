import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "请提供搜索查询" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    // 生成查询向量
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = embeddingRes.data[0].embedding;

    // 调用 Supabase RPC 函数进行语义搜索
    const supabase = createServerClient();
    const { data, error } = await (supabase.rpc as any)("match_posts", {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 20,
      filter_negative: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data });
  } catch (err) {
    return NextResponse.json(
      { error: "搜索服务暂不可用，请配置 API Keys" },
      { status: 503 }
    );
  }
}
