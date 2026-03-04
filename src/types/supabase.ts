// ============================================================
// Echo AI — Supabase 类型定义 (与 schema.sql 保持同步)
// ============================================================

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          source: "x" | "rss" | "custom";
          source_id: string | null;
          author_handle: string | null;
          author_name: string | null;
          content: string;
          media_urls: string[];
          original_url: string | null;
          summary: string | null;
          relevance_score: number | null;
          relevance_reason: string | null;
          sentiment_label: "positive" | "negative" | "neutral" | null;
          is_negative: boolean;
          topics: string[];
          embedding: number[] | null;
          fetched_at: string;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["posts"]["Row"], "id" | "created_at" | "updated_at" | "fetched_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          fetched_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
      };
      daily_briefings: {
        Row: {
          id: string;
          briefing_date: string;
          greeting: string;
          highlights: Array<{ post_id: string; title: string; reason: string | null }>;
          stats: { total: number; high_score: number; negative_filtered: number };
          generated_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_briefings"]["Row"], "id" | "created_at" | "generated_by"> & {
          id?: string;
          created_at?: string;
          generated_by?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_briefings"]["Insert"]>;
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          interest_keywords: string[];
          blocked_keywords: string[];
          sentiment_filter_on: boolean;
          theme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_preferences"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Insert"]>;
      };
    };
    Functions: {
      match_posts: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          filter_negative?: boolean;
        };
        Returns: Array<{
          id: string;
          content: string;
          summary: string | null;
          relevance_score: number | null;
          is_negative: boolean;
          similarity: number;
        }>;
      };
    };
  };
}
