import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// 服务端客户端 (带完整权限, 仅用于 API Routes / Server Components)
export function createServerClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 浏览器客户端 (仅用 anon key, 受 RLS 限制)
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
