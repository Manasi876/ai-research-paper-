import { useEffect, useState } from "react";
import {
  BookMarked,
  Compass,
  FileSearch,
  FolderKanban,
  GitCompare,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Presentation,
  Quote,
  Upload,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

const QUICK_TOOLS = [
  {
    id: "analyzer",
    label: "Paper Analyzer",
    desc: "Upload PDF & extract 11 structured sections",
    icon: FileSearch,
  },
  {
    id: "chat",
    label: "Chat with Paper",
    desc: "Ask RAG-grounded questions with citations",
    icon: MessageSquare,
  },
  {
    id: "compare",
    label: "Compare Papers",
    desc: "Side-by-side matrix across 2–5 PDFs",
    icon: GitCompare,
  },
  {
    id: "gaps",
    label: "Research Gap Finder",
    desc: "Identify limitations & future directions",
    icon: Lightbulb,
  },
  {
    id: "questions",
    label: "Question Generator",
    desc: "MCQs, viva prep & interactive quiz mode",
    icon: HelpCircle,
  },
  {
    id: "citations",
    label: "Citation Generator",
    desc: "Format IEEE, APA & MLA references",
    icon: Quote,
  },
  {
    id: "finder",
    label: "Paper Finder",
    desc: "Search Semantic Scholar & Crossref",
    icon: Compass,
  },
  {
    id: "presentation",
    label: "Presentation Maker",
    desc: "Generate 10-slide outlines & export PPTX",
    icon: Presentation,
  },
];

export function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.getDashboardSummary();
        if (active) setSummary(data);
      } catch (err) {
        if (active) {
          showToast(
            err instanceof Error ? err.message : "Failed to load dashboard.",
            "error"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [showToast]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  const stats = summary?.stats ?? {
    totalPapers: 0,
    totalAnalyses: 0,
    totalSavedPapers: 0,
    totalProjects: 0,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Welcome Banner */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
            Welcome back, {user?.name}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your research corpus, run structured AI analyses, and explore literature gaps.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate("analyzer")}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Research Paper</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("finder")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <Compass className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Discover Literature</span>
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Uploaded Papers
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {stats.totalPapers}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Indexed PDF documents
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completed Analyses
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {stats.totalAnalyses}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            11-section AI breakdowns
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Saved External Papers
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
            {stats.totalSavedPapers}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            From Semantic Scholar &amp; Crossref
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Research Projects
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {stats.totalProjects}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Active literature folders
          </p>
        </div>
      </section>

      {/* Analytics Chart */}
      <section>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                7-Day Research Activity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paper uploads and AI tasks executed
              </p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.activityChart ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="uploads"
                  name="PDF Uploads"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="aiTasks"
                  name="AI Runs"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Quick Access AI Tools */}
      <section>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Quick Access to AI Tools
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onNavigate(tool.id)}
                className="flex items-start gap-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {tool.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {tool.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Papers, Projects & Activity */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent Documents */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recently Uploaded Papers
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("library")}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </button>
          </div>
          {(summary?.recentPapers.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No PDFs uploaded yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {summary?.recentPapers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onNavigate("analyzer", p.id)}
                  className="w-full rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-left transition-colors hover:border-blue-300 dark:hover:border-blue-700"
                >
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {p.title}
                  </p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {p.pageCount} pp · {p.chunkCount} chunks ·{" "}
                    {new Date(p.uploadDate).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Research Projects Overview */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Research Projects
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("library")}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage
            </button>
          </div>
          {(summary?.projects.length ?? 0) === 0 ? (
            <div className="py-6 text-center">
              <FolderKanban className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Organize uploaded papers into themed research folders in My Library.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {summary?.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {proj.projectName}
                    </p>
                    <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {proj.paperIds.length} papers
                    </span>
                  </div>
                  {proj.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {proj.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Research Activity
            </h3>
            <BookMarked className="h-4 w-4 text-slate-400" />
          </div>
          {(summary?.recentActivity.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Your recent uploads and AI runs will appear here.
            </p>
          ) : (
            <div className="space-y-2.5">
              {summary?.recentActivity.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {act.action}
                    </p>
                    <p className="truncate text-slate-500 dark:text-slate-400">
                      {act.targetTitle}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-slate-400 shrink-0">
                    {new Date(act.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
