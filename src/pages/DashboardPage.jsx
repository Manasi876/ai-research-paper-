import {
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  FolderOpen,
  MessageSquare,
  Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const CORE_TOOLS = [
  {
    id: "analyzer",
    label: "Research Paper Analyzer",
    desc: "Upload a PDF to extract title, abstract, problem statement, objectives, methodology, results, limitations, and future scope.",
    icon: FileSearch,
  },
  {
    id: "summarizer",
    label: "Research Paper Summarizer",
    desc: "Generate a Short Summary (150–200 words) or Detailed Summary written in clear, student-friendly English.",
    icon: FileText,
  },
  {
    id: "chat",
    label: "Chat with PDF",
    desc: "Ask questions answered strictly from indexed document chunks with page estimates and verbatim source excerpts.",
    icon: MessageSquare,
  },
];

export function DashboardPage({ papers, loadingPapers, onNavigate }) {
  const { user } = useAuth();

  if (loadingPapers) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
        <div className="h-60 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  const totalPapers = papers.length;
  const analyzedCount = papers.filter(
    (p) => p.analysisStatus === "analyzed"
  ).length;
  const totalChunks = papers.reduce(
    (acc, p) => acc + (Number(p.chunkCount) || 0),
    0
  );
  const recentPapers = papers.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Welcome Banner */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
            Welcome back, {user?.name}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Upload research PDFs to run structured analysis, generate summaries, or chat with your papers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate("analyzer")}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-4 text-sm font-medium shadow-xs whitespace-nowrap"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Research Paper</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("papers")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>My Papers</span>
          </button>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Uploaded Papers
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {totalPapers}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            PDF manuscripts in your workspace
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Analyzed Papers
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {analyzedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Structured 10-section breakdowns saved
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Indexed RAG Chunks
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
            {totalChunks}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Searchable vector segments across PDFs
          </p>
        </div>
      </section>

      {/* Quick Access to the 3 Main AI Features */}
      <section>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Quick Access to AI Features
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {CORE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onNavigate(tool.id)}
                className="flex flex-col items-start rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {tool.label}
                </p>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Uploaded Papers */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Recent Uploaded Papers
          </h3>
          {papers.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate("papers")}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all in My Papers
            </button>
          )}
        </div>

        {recentPapers.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No research papers uploaded yet.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Click &ldquo;Upload Research Paper&rdquo; above to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentPapers.map((p) => {
              const isAnalyzed = p.analysisStatus === "analyzed";
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {p.title}
                    </p>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {p.pageCount} pp · {p.chunkCount} chunks ·{" "}
                      {new Date(p.uploadDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isAnalyzed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Analyzed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Pending Analysis</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigate("analyzer", p.id)}
                      className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Open
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
