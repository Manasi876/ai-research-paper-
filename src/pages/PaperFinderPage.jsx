import { useState } from "react";
import { Bookmark, ExternalLink, FileCheck2, Loader2, Lock, Search } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function PaperFinderPage({ onSavedPaper }) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingIds, setSavingIds] = useState({});
  const [savedIds, setSavedIds] = useState({});

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.searchScholarly(query.trim(), source);
      setResults(res.results);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Scholarly search failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(paper) {
    setSavingIds((prev) => ({ ...prev, [paper.externalId]: true }));
    try {
      await api.saveDiscoveredPaper(paper);
      setSavedIds((prev) => ({ ...prev, [paper.externalId]: true }));
      onSavedPaper();
      showToast("Saved paper to My Research Library.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not save paper.",
        "error"
      );
    } finally {
      setSavingIds((prev) => ({ ...prev, [paper.externalId]: false }));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Search Semantic Scholar &amp; Crossref
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Search by research topic, paper title, author name, or keywords. Open-access PDFs are clearly separated from restricted publications.
        </p>

        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., retrieval augmented generation transformer survey"
              className="h-11 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
            />
          </div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Sources (S2 + Crossref)</option>
            <option value="semantic_scholar">Semantic Scholar</option>
            <option value="crossref">Crossref</option>
          </select>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg btn-brand-gradient px-6 text-sm font-semibold shadow-xs disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>Search</span>
          </button>
        </form>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
            />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((paper) => {
            const isSaved = Boolean(savedIds[paper.externalId]);
            const isSaving = Boolean(savingIds[paper.externalId]);
            return (
              <div
                key={paper.externalId}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2.5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {paper.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {paper.authors.length > 0
                          ? paper.authors.slice(0, 5).join(", ") +
                            (paper.authors.length > 5 ? " et al." : "")
                          : "Authors not listed"}
                      </span>
                      {paper.year && (
                        <>
                          <span>·</span>
                          <span className="font-mono tabular-nums">{paper.year}</span>
                        </>
                      )}
                      {paper.venue && (
                        <>
                          <span>·</span>
                          <span>{paper.venue}</span>
                        </>
                      )}
                      {paper.citationCount !== null && (
                        <>
                          <span>·</span>
                          <span className="font-mono tabular-nums">
                            {paper.citationCount} citations
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span className="font-mono">
                        {paper.source === "semantic_scholar"
                          ? "Semantic Scholar"
                          : "Crossref"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        paper.isOpenAccess
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {paper.isOpenAccess ? (
                        <>
                          <FileCheck2 className="h-3.5 w-3.5" />
                          <span>Open Access PDF</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          <span>Access Required</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {paper.abstract && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {paper.abstract}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {paper.openAccessPdfUrl && (
                    <a
                      href={paper.openAccessPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open PDF</span>
                    </a>
                  )}
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>{paper.doi ? `DOI: ${paper.doi}` : "View Source"}</span>
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={isSaved || isSaving}
                    onClick={() => void handleSave(paper)}
                    className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Bookmark className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{isSaved ? "Saved" : isSaving ? "Saving..." : "Save to Library"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : hasSearched ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            No matching scholarly papers returned
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Try broader keywords or switch between Semantic Scholar and Crossref.
          </p>
        </div>
      ) : null}
    </div>
  );
}
