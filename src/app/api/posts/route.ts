import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterNegative = searchParams.get("filter_negative") !== "false";
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  try {
    const supabase = createServerClient();

    let query = supabase
      .from("posts")
      .select("*")
      .order("relevance_score", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filterNegative) {
      query = query.eq("is_negative", false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data });
  } catch (err) {
    return NextResponse.json(
      { error: "数据库未连接，请配置 SUPABASE 环境变量" },
      { status: 503 }
    );
  }
}
