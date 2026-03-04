import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";
import PostFeed from "@/components/PostFeed";
import SearchBar from "@/components/SearchBar";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Echo 今日简报 */}
      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-xl bg-slate-800/50" />
        }
      >
        <Dashboard />
      </Suspense>

      {/* 语义搜索 */}
      <div className="mt-8">
        <SearchBar />
      </div>

      {/* 内容流 */}
      <div className="mt-8">
        <Suspense
          fallback={
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-xl bg-slate-800/50"
                />
              ))}
            </div>
          }
        >
          <PostFeed />
        </Suspense>
      </div>
    </main>
  );
}
