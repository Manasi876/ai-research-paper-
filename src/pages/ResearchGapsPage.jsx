import { useState } from "react";
import { AlertTriangle, Lightbulb, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

const GAP_CATEGORIES = [
  { key: "existingLimitations", label: "Existing Research Limitations" },
  { key: "unsolvedProblems", label: "Unsolved Problems" },
  { key: "missingMethodologies", label: "Missing Methodologies" },
  { key: "datasetLimitations", label: "Limitations of Existing Datasets" },
  { key: "potentialImprovements", label: "Potential Improvements" },
  { key: "unexploredDirections", label: "Unexplored Research Directions" },
];

export function ResearchGapsPage({ papers }) {
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState(() =>
    papers[0] ? [papers[0].id] : []
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function togglePaper(id) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 5
        ? prev
        : [...prev, id]
    );
  }

  async function handleAnalyzeGaps() {
    if (selectedIds.length === 0) {
      showToast("Select at least one uploaded paper.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.findResearchGaps(selectedIds);
      setResult(res.gaps);
      showToast("Research gaps and potential topics generated.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to analyze research gaps.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Select Paper(s) for Research Gap Discovery
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose 1 to 5 papers. Every proposed gap cites supporting evidence from the text.
            </p>
          </div>
          <button
            type="button"
            disabled={selectedIds.length === 0 || loading}
            onClick={() => void handleAnalyzeGaps()}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-5 text-xs font-semibold shadow-xs disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lightbulb className="h-4 w-4" />
            )}
            <span>{loading ? "Discovering Gaps..." : "Find Research Gaps"}</span>
          </button>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper) => {
            const checked = selectedIds.includes(paper.id);
            return (
              <label
                key={paper.id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  checked
                    ? "border-purple-400 bg-purple-50/60 dark:border-purple-600 dark:bg-purple-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePaper(paper.id)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                  {paper.title}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {result && (
        <div className="space-y-6">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="leading-relaxed">
              <span className="font-semibold">Hypothesis Notice:</span> All AI-generated research ideas and gap extrapolations below are unverified hypotheses derived from the uploaded documents. Validate novelty via current literature databases before initiating a study.
            </p>
          </div>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {GAP_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs"
              >
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  {cat.label}
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                  {(result[cat.key] || []).map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Potential Research Ideas &amp; Supporting Evidence ({result.researchIdeas.length})
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {result.researchIdeas.map((idea, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                      0{idx + 1}. {idea.topicTitle}
                    </h4>
                  </div>
                  <p className="font-mono text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    {idea.hypothesisLabel || "AI-Generated Hypothesis (Requires Verification)"}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {idea.description}
                  </p>
                  <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Supporting Limitation / Evidence ({idea.sourcePaperTitle}):
                    </p>
                    <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                      {idea.supportingEvidence}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
