import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Download, Loader2, Quote } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function CitationsPage({
  papers,
  selectedPaperId,
  onSelectPaper,
}) {
  const { showToast } = useToast();
  const activePaper = papers.find((p) => p.id === selectedPaperId) ?? papers[0] ?? null;

  const [title, setTitle] = useState("");
  const [authorsText, setAuthorsText] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [venue, setVenue] = useState("");
  const [doi, setDoi] = useState("");
  const [url, setUrl] = useState("");
  const [citations, setCitations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedStyle, setCopiedStyle] = useState(null);

  useEffect(() => {
    if (!activePaper) return;
    setTitle(activePaper.title);
    setAuthorsText(activePaper.authors.join(", "));
    setPublicationYear(activePaper.publicationYear);
    setVenue("");
    setDoi("");
    setUrl("");
    setCitations(null);
  }, [activePaper?.id]);

  async function handleGenerate() {
    if (!activePaper) return;
    setLoading(true);
    try {
      const authors = authorsText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const res = await api.generateCitations(activePaper.id, {
        title,
        authors,
        publicationYear,
        venue,
        doi,
        url,
      });
      setCitations(res.citations);
      showToast("Citations formatted.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to format citations.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(style, text) {
    void navigator.clipboard.writeText(text);
    setCopiedStyle(style);
    window.setTimeout(() => setCopiedStyle(null), 1800);
    showToast(`${style.toUpperCase()} citation copied.`, "info");
  }

  function handleDownload() {
    if (!citations || !activePaper) return;
    const content = [
      `Citations for: ${title}`,
      "",
      `[IEEE]\n${citations.ieee}`,
      "",
      `[APA]\n${citations.apa}`,
      "",
      `[MLA]\n${citations.mla}`,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const linkUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = linkUrl;
    a.download = `${activePaper.title.replace(/[^a-z0-9]+/gi, "_")}_citations.txt`;
    a.click();
    URL.revokeObjectURL(linkUrl);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Select Uploaded Paper
          </label>
          <select
            value={activePaper?.id || ""}
            onChange={(e) => onSelectPaper(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
          >
            {papers.length === 0 ? (
              <option value="">No papers uploaded</option>
            ) : (
              papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Paper Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Authors (comma-separated)
            </label>
            <input
              type="text"
              value={authorsText}
              onChange={(e) => setAuthorsText(e.target.value)}
              placeholder="e.g., Jane Doe, John Smith"
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Publication Year
            </label>
            <input
              type="text"
              value={publicationYear}
              onChange={(e) => setPublicationYear(e.target.value)}
              placeholder="e.g., 2024"
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Journal / Conference Venue (verify manually)
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., IEEE Transactions on..."
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              DOI (optional)
            </label>
            <input
              type="text"
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              placeholder="e.g., 10.1109/..."
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!activePaper || loading}
            onClick={() => void handleGenerate()}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-5 text-xs font-semibold shadow-xs disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Quote className="h-4 w-4" />
            )}
            <span>Generate IEEE / APA / MLA</span>
          </button>
        </div>
      </section>

      {citations && (
        <section className="space-y-4">
          {citations.needsManualVerification && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                <span className="font-semibold">Manual Verification Required:</span> Missing metadata fields ({citations.missingFields.join(", ")}). Placeholder markers are shown instead of fabricated details—fill them in above if available.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Formatted Citations
              </h2>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .txt</span>
              </button>
            </div>

            {["ieee", "apa", "mla"].map((style) => (
              <div
                key={style}
                className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">
                    {style}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(style, citations[style])}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    {copiedStyle === style ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {citations[style]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
