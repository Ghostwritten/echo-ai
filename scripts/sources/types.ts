// 共享类型定义: 数据采集脚本使用
export interface RawPost {
  source: "hackernews" | "reddit" | "rss" | "github" | "custom";
  source_id: string;
  author_handle?: string;
  author_name?: string;
  content: string;
  original_url?: string;
  media_urls?: string[];
}
