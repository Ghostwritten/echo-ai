import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "请提供搜索查询" },
        { status: 400 }
      );
    }

    // 使用 Jina AI 生成查询向量
    const JINA_API_KEY = process.env.JINA_API_KEY;
    if (!JINA_API_KEY) {
      return NextResponse.json(
        { error: "JINA_API_KEY 未配置" },
        { status: 503 }
      );
    }

    const embeddingRes = await fetch("https://api.jina.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v3",
        task: "text-matching",
        dimensions: 1024,
        input: [query],
      }),
    });

    if (!embeddingRes.ok) {
      return NextResponse.json(
        { error: "Embedding 生成失败" },
        { status: 502 }
      );
    }

    const embData = await embeddingRes.json();
    const queryEmbedding = embData.data[0].embedding;

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
