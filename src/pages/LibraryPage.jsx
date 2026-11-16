import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ExternalLink,
  FolderPlus,
  History,
  Search,
  Trash2,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function LibraryPage({
  papers,
  onPapersChanged,
  onNavigateTool,
}) {
  const { showToast } = useToast();
  const [tab, setTab] = useState("uploaded");
  const [search, setSearch] = useState("");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedProjectId, setSelectedProjectId] = useState("all");

  const [projects, setProjects] = useState([]);
  const [savedPapers, setSavedPapers] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);

  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [creatingProj, setCreatingProj] = useState(false);

  async function loadExtras() {
    try {
      const [projRes, savedRes, histRes] = await Promise.all([
        api.listProjects(),
        api.listSavedPapers(),
        api.getAiHistory(),
      ]);
      setProjects(projRes.projects);
      setSavedPapers(savedRes.savedPapers);
      setHistoryItems(histRes.items);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to load library items.",
        "error"
      );
    }
  }

  useEffect(() => {
    void loadExtras();
  }, []);

  const filteredPapers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return papers.filter((p) => {
      if (onlyBookmarked && !p.isBookmarked) return false;
      if (
        selectedProjectId !== "all" &&
        !p.projectIds.includes(selectedProjectId)
      ) {
        return false;
      }
      if (dateFilter !== "all") {
        const ageDays = (now - new Date(p.uploadDate).getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === "7d" && ageDays > 7) return false;
        if (dateFilter === "30d" && ageDays > 30) return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.fileName.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [papers, search, onlyBookmarked, selectedProjectId, dateFilter]);

  async function handleToggleBookmark(paper) {
    try {
      await api.updatePaper(paper.id, { isBookmarked: !paper.isBookmarked });
      onPapersChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed.", "error");
    }
  }

  async function handleAssignProject(paper, projectId) {
    try {
      const next = paper.projectIds.includes(projectId)
        ? paper.projectIds.filter((id) => id !== projectId)
        : [...paper.projectIds, projectId];
      await api.updatePaper(paper.id, { projectIds: next });
      const proj = projects.find((pr) => pr.id === projectId);
      if (proj) {
        const nextPaperIds = proj.paperIds.includes(paper.id)
          ? proj.paperIds.filter((id) => id !== paper.id)
          : [...proj.paperIds, paper.id];
        await api.updateProject(proj.id, { paperIds: nextPaperIds });
      }
      onPapersChanged();
      await loadExtras();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Assignment failed.", "error");
    }
  }

  async function handleDeletePaper(id) {
    try {
      await api.deletePaper(id);
      onPapersChanged();
      showToast("Paper deleted from library.", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed.", "error");
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    if (!newProjName.trim()) return;
    setCreatingProj(true);
    try {
      await api.createProject({
        projectName: newProjName.trim(),
        description: newProjDesc.trim(),
      });
      setNewProjName("");
      setNewProjDesc("");
      await loadExtras();
      showToast("Research project created.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create project.", "error");
    } finally {
      setCreatingProj(false);
    }
  }

  async function handleDeleteProject(id) {
    try {
      await api.deleteProject(id);
      if (selectedProjectId === id) setSelectedProjectId("all");
      await loadExtras();
      showToast("Project deleted.", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed.", "error");
    }
  }

  async function handleDeleteSaved(id) {
    try {
      await api.deleteSavedPaper(id);
      await loadExtras();
      showToast("Removed saved paper.", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed.", "error");
    }
  }

  function handleDownloadHistoryItem(item) {
    const text =
      typeof item.content === "string"
        ? item.content
        : JSON.stringify(item.content, null, 2);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.contentType}_${item.createdAt.slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Left: Research Projects Organizer */}
      <aside className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 h-fit space-y-4 shadow-xs">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Research Projects
        </h2>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSelectedProjectId("all")}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
              selectedProjectId === "all"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <span>All Papers</span>
            <span className="font-mono tabular-nums">{papers.length}</span>
          </button>

          {projects.map((proj) => (
            <div
              key={proj.id}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs ${
                selectedProjectId === proj.id
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedProjectId(proj.id)}
                className="flex-1 text-left truncate font-medium"
              >
                {proj.projectName}
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteProject(proj.id)}
                aria-label={`Delete project ${proj.projectName}`}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleCreateProject}
          className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5"
        >
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            New Project Folder
          </p>
          <input
            type="text"
            required
            value={newProjName}
            onChange={(e) => setNewProjName(e.target.value)}
            placeholder="Project name"
            className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={newProjDesc}
            onChange={(e) => setNewProjDesc(e.target.value)}
            placeholder="Short description (optional)"
            className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={creatingProj || !newProjName.trim()}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>Create Project</span>
          </button>
        </form>
      </aside>

      {/* Main Library Content */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            {[
              { id: "uploaded", label: `Uploaded PDFs (${papers.length})` },
              { id: "saved", label: `Saved Discovery (${savedPapers.length})` },
              { id: "history", label: `AI History (${historyItems.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "uploaded" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title or keyword..."
                  className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="all">Any Date</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <button
                type="button"
                onClick={() => setOnlyBookmarked((b) => !b)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${
                  onlyBookmarked
                    ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>Bookmarked</span>
              </button>
            </div>
          )}
        </div>

        {tab === "uploaded" && (
          <div className="space-y-3">
            {filteredPapers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                No uploaded papers match the current filters.
              </div>
            ) : (
              filteredPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {paper.title}
                      </h3>
                      <p className="mt-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {paper.fileName} · {paper.pageCount} pp · {paper.chunkCount} chunks ·{" "}
                        {new Date(paper.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleToggleBookmark(paper)}
                        aria-label="Toggle bookmark"
                        className={`rounded-lg p-2 border ${
                          paper.isBookmarked
                            ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        <Bookmark className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeletePaper(paper.id)}
                        aria-label="Delete paper"
                        className="rounded-lg p-2 border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => onNavigateTool("analyzer", paper.id)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Analyze
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={() => onNavigateTool("chat", paper.id)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Chat
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={() => onNavigateTool("summarizer", paper.id)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Summarize
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={() => onNavigateTool("citations", paper.id)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Cite
                      </button>
                    </div>

                    {projects.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400">Projects:</span>
                        {projects.map((proj) => {
                          const assigned = paper.projectIds.includes(proj.id);
                          return (
                            <button
                              key={proj.id}
                              type="button"
                              onClick={() => void handleAssignProject(paper, proj.id)}
                              className={`rounded px-2 py-0.5 text-[11px] font-medium border ${
                                assigned
                                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                  : "border-slate-200 dark:border-slate-700 text-slate-500"
                              }`}
                            >
                              {proj.projectName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "saved" && (
          <div className="space-y-3">
            {savedPapers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                No external papers saved yet. Use Paper Finder to discover and save papers.
              </div>
            ) : (
              savedPapers.map((sp) => (
                <div
                  key={sp.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {sp.paperMetadata.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {sp.paperMetadata.authors.slice(0, 4).join(", ")} ·{" "}
                      {sp.paperMetadata.year || "n.d."} · {sp.source}
                    </p>
                    {sp.paperMetadata.url && (
                      <a
                        href={sp.paperMetadata.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open Paper Link</span>
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSaved(sp.id)}
                    aria-label="Remove saved paper"
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-2.5">
            {historyItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                No AI-generated analyses or summaries recorded yet.
              </div>
            ) : (
              historyItems.map((item) => {
                const paper = papers.find((p) => p.id === item.paperId);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <History className="h-4 w-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                          {item.contentType.replace(/_/g, " ")}
                        </p>
                        <p className="truncate text-slate-500 dark:text-slate-400">
                          {paper ? paper.title : "Workspace Task"} ·{" "}
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadHistoryItem(item)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
                    >
                      Download
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
