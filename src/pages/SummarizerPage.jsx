import { useState } from "react";
import { Check, Copy, Download, FileText, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

const SUMMARY_FIELDS = [
  { key: "mainIdea", label: "Main Idea" },
  { key: "researchProblem", label: "Research Problem" },
  { key: "proposedSolution", label: "Proposed Solution" },
  { key: "methodology", label: "Methodology" },
  { key: "importantFindings", label: "Important Findings" },
  { key: "conclusion", label: "Conclusion" },
];

export function SummarizerPage({
  papers,
  selectedPaperId,
  onSelectPaper,
}) {
  const { showToast } = useToast();
  const activePaper = papers.find((p) => p.id === selectedPaperId) ?? papers[0] ?? null;

  const [format, setFormat] = useState("medium");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!activePaper) return;
    setLoading(true);
    try {
      const res = await api.summarizePaper(activePaper.id, format);
      setSummary(res.summary);
      showToast(`Generated ${format} summary.`, "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to summarize paper.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function buildPlainText() {
    if (!activePaper || !summary) return "";
    return [
      `${activePaper.title} (${format.toUpperCase()} SUMMARY)`,
      "",
      ...SUMMARY_FIELDS.map((f) => `${f.label}:\n${summary[f.key]}\n`),
    ].join("\n");
  }

  function handleCopyAll() {
    void navigator.clipboard.writeText(buildPlainText());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    showToast("Summary copied to clipboard.", "info");
  }

  function handleDownload() {
    if (!activePaper || !summary) return;
    const blob = new Blob([buildPlainText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activePaper.title.replace(/[^a-z0-9]+/gi, "_")}_${format}_summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Select Research Paper
            </label>
            <select
              value={activePaper?.id || ""}
              onChange={(e) => {
                onSelectPaper(e.target.value);
                setSummary(null);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
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

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Summary Format
            </p>
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {["short", "medium", "detailed"].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFormat(lvl)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    format === lvl
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!activePaper || loading}
            onClick={() => void handleGenerate()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span>{loading ? "Summarizing..." : "Generate Summary"}</span>
          </button>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-32 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
            />
          ))}
        </div>
      ) : summary ? (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                {activePaper?.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {format} format summary
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {SUMMARY_FIELDS.map((field) => (
              <div
                key={field.key}
                className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4"
              >
                <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {field.label}
                </h3>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {summary[field.key]}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
          <FileText className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
            Select a paper and summary format above
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Covers main idea, research problem, proposed solution, methodology, findings, and conclusion.
          </p>
        </div>
      )}
    </div>
  );
}
