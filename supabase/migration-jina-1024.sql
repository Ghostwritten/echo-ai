-- ============================================================
-- Echo AI — 迁移脚本: 适配 Jina AI Embedding (1024 维)
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- 1. 删除旧的向量索引
DROP INDEX IF EXISTS idx_posts_embedding;

-- 2. 修改 embedding 列维度 (1536 → 1024)
ALTER TABLE posts ALTER COLUMN embedding TYPE vector(1024);

-- 3. 重建向量索引
CREATE INDEX idx_posts_embedding ON posts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. 更新 RPC 函数以匹配新维度
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

-- 5. 更新 source 字段约束, 添加新数据源类型
-- (TEXT 类型无需修改, 但更新默认值)
ALTER TABLE posts ALTER COLUMN source SET DEFAULT 'hackernews';
