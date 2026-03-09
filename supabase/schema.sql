-- ============================================================
-- Echo AI — Supabase Database Schema
-- ============================================================
-- 前置条件: 启用 pgvector 扩展
-- ============================================================

-- 1. 启用扩展
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. 核心表: posts (资讯条目)
-- ============================================================
CREATE TABLE posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 原始内容
  source        TEXT NOT NULL DEFAULT 'hackernews',   -- 来源: 'hackernews', 'reddit', 'rss', 'github', 'custom'
  source_id     TEXT UNIQUE,                        -- 原始平台 ID (用于去重)
  author_handle TEXT,                               -- 原作者 @handle
  author_name   TEXT,                               -- 原作者显示名
  content       TEXT NOT NULL,                      -- 原始推文/文章正文
  media_urls    TEXT[] DEFAULT '{}',                -- 附带媒体链接
  original_url  TEXT,                               -- 原文链接

  -- AI 处理结果
  summary           TEXT,                           -- Echo Persona 生成的摘要
  relevance_score   SMALLINT CHECK (relevance_score BETWEEN 0 AND 100),  -- 相关性评分 0-100
  relevance_reason  TEXT,                           -- 打分理由 (一句话)
  sentiment_label   TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  is_negative       BOOLEAN DEFAULT FALSE,          -- 情绪过滤标记
  topics            TEXT[] DEFAULT '{}',            -- AI 提取的主题标签

  -- 向量
  embedding         vector(1024),                   -- Jina jina-embeddings-v3 输出维度

  -- 元数据
  fetched_at        TIMESTAMPTZ DEFAULT NOW(),      -- 采集时间
  processed_at      TIMESTAMPTZ,                    -- AI 处理完成时间
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_posts_relevance      ON posts (relevance_score DESC);
CREATE INDEX idx_posts_sentiment      ON posts (is_negative);
CREATE INDEX idx_posts_created        ON posts (created_at DESC);
CREATE INDEX idx_posts_source         ON posts (source);
CREATE INDEX idx_posts_source_id      ON posts (source_id);

-- 向量相似度索引 (IVFFlat, 适用于中等数据量)
CREATE INDEX idx_posts_embedding ON posts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);


-- ============================================================
-- 3. 每日简报表: daily_briefings
-- ============================================================
CREATE TABLE daily_briefings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  greeting      TEXT NOT NULL,                       -- Echo 的每日问候语
  highlights    JSONB NOT NULL DEFAULT '[]',         -- 精选条目 [{post_id, title, reason}]
  stats         JSONB NOT NULL DEFAULT '{}',         -- 统计 {total, high_score, negative_filtered}
  generated_by  TEXT DEFAULT 'deepseek-chat',       -- 生成模型
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_briefings_date ON daily_briefings (briefing_date DESC);


-- ============================================================
-- 4. 用户偏好表: user_preferences
-- ============================================================
CREATE TABLE user_preferences (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE NOT NULL,          -- Supabase Auth user id
  interest_keywords   TEXT[] DEFAULT '{}',           -- 关注关键词 (影响打分权重)
  blocked_keywords    TEXT[] DEFAULT '{}',           -- 屏蔽关键词
  sentiment_filter_on BOOLEAN DEFAULT TRUE,          -- 是否开启情绪过滤
  theme               TEXT DEFAULT 'dark',           -- UI 主题
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 5. RPC: 语义搜索函数
-- ============================================================
CREATE OR REPLACE FUNCTION match_posts(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.72,
  match_count     INT   DEFAULT 20,
  filter_negative BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id              UUID,
  content         TEXT,
  summary         TEXT,
  relevance_score SMALLINT,
  is_negative     BOOLEAN,
  similarity      FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.content,
    p.summary,
    p.relevance_score,
    p.is_negative,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM posts p
  WHERE
    1 - (p.embedding <=> query_embedding) > match_threshold
    AND (NOT filter_negative OR p.is_negative = FALSE)
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- ============================================================
-- 6. 自动更新 updated_at 触发器
-- ============================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER set_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- ============================================================
-- 7. Row Level Security (RLS) — 基础策略
-- ============================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- posts: 所有认证用户可读
CREATE POLICY "Posts are viewable by authenticated users"
  ON posts FOR SELECT
  TO authenticated
  USING (true);

-- daily_briefings: 所有认证用户可读
CREATE POLICY "Briefings are viewable by authenticated users"
  ON daily_briefings FOR SELECT
  TO authenticated
  USING (true);

-- user_preferences: 仅本人可读写
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
