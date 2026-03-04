import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("daily_briefings")
      .select("*")
      .eq("briefing_date", today)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ briefing: data });
  } catch {
    return NextResponse.json(
      { error: "数据库未连接" },
      { status: 503 }
    );
  }
}
