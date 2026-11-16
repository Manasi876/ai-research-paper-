import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquare,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function MyPapersPage({
  papers,
  loadingPapers,
  onPapersChanged,
  onNavigateTool,
}) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return papers;
    return papers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.fileName.toLowerCase().includes(q)
    );
  }, [papers, searchQuery]);

  async function handleDelete(paper) {
    setDeletingId(paper.id);
    try {
      await api.deletePaper(paper.id);
      setConfirmDeleteId(null);
      showToast(`Deleted "${paper.title}".`, "info");
      await onPapersChanged();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete paper.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loadingPapers) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-14 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
        <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search uploaded papers by title or filename..."
            className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => onNavigateTool("analyzer")}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-4 text-xs font-semibold shadow-xs whitespace-nowrap"
        >
          <Upload className="h-4 w-4" />
          <span>Upload New PDF</span>
        </button>
      </section>

      {papers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            No research papers uploaded yet
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Upload your first PDF in the Research Paper Analyzer to index it for AI analysis, summarization, and Q&amp;A.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTool("analyzer")}
            className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-4 text-xs font-semibold"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Research Paper</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No uploaded papers match &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Paper Title</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Upload Date</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Pages / Chunks</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Analysis Status</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((paper) => {
                  const isAnalyzed = paper.analysisStatus === "analyzed";
                  const isConfirming = confirmDeleteId === paper.id;
                  const isDeleting = deletingId === paper.id;

                  return (
                    <tr
                      key={paper.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-5 py-4 max-w-md">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {paper.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          {paper.fileName}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(paper.uploadDate).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {paper.pageCount} pp · {paper.chunkCount} chunks
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {isAnalyzed ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Analyzed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Pending Analysis</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onNavigateTool("analyzer", paper.id)}
                            title="View / Run Analysis"
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            <FileSearch className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateTool("summarizer", paper.id)}
                            title="Summarize Paper"
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            <FileText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                            <span className="hidden sm:inline">Summarize</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateTool("chat", paper.id)}
                            title="Chat with Paper"
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="hidden sm:inline">Chat</span>
                          </button>

                          {isConfirming ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => void handleDelete(paper)}
                                className="inline-flex h-8 items-center gap-1 rounded-md bg-red-600 px-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Confirm"
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setConfirmDeleteId(null)}
                                className="inline-flex h-8 items-center rounded-md border border-slate-200 dark:border-slate-700 px-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(paper.id)}
                              aria-label={`Delete ${paper.title}`}
                              title="Delete paper"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
