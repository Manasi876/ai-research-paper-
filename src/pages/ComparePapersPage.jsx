import { useState } from "react";
import { GitCompare, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

const COMPARISON_ROWS = [
  { key: "objectives", label: "Research Objectives" },
  { key: "problemAddressed", label: "Problem Addressed" },
  { key: "methodology", label: "Methodology" },
  { key: "algorithms", label: "Algorithms & Models" },
  { key: "datasets", label: "Datasets" },
  { key: "experimentalResults", label: "Experimental Results" },
  { key: "advantages", label: "Advantages" },
  { key: "limitations", label: "Limitations" },
  { key: "futureDirections", label: "Future Research Directions" },
];

export function ComparePapersPage({ papers }) {
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function toggleSelection(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) {
        showToast("You can compare up to 5 papers at once.", "info");
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleCompare() {
    if (selectedIds.length < 2) {
      showToast("Select at least 2 papers to compare.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.comparePapers(selectedIds);
      setResult(res.comparison);
      showToast("Paper comparison generated.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Comparison failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Select 2 to 5 Uploaded Papers to Compare
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selected: <span className="font-mono tabular-nums">{selectedIds.length}</span> papers
            </p>
          </div>
          <button
            type="button"
            disabled={selectedIds.length < 2 || loading}
            onClick={() => void handleCompare()}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-5 text-xs font-semibold shadow-xs disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitCompare className="h-4 w-4" />
            )}
            <span>{loading ? "Comparing..." : "Compare Selected Papers"}</span>
          </button>
        </div>

        {papers.length < 2 ? (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Upload at least 2 research papers to enable side-by-side comparison.
          </p>
        ) : (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {papers.map((paper) => {
              const checked = selectedIds.includes(paper.id);
              return (
                <label
                  key={paper.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    checked
                      ? "border-blue-400 bg-blue-50/70 dark:border-blue-600 dark:bg-blue-950/40"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelection(paper.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                      {paper.title}
                    </p>
                    <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {paper.pageCount} pp · {paper.publicationYear || "n.d."}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {result && (
        <div className="space-y-6">
          {/* Overall Synthesis + Similarities & Differences */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs lg:col-span-1">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Overall AI Comparison
              </h3>
              <p className="mt-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {result.overallComparison}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <h3 className="font-display text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Key Similarities
              </h3>
              <ul className="mt-2.5 space-y-2 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                {result.keySimilarities.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <h3 className="font-display text-sm font-semibold text-purple-700 dark:text-purple-400">
                Key Differences
              </h3>
              <ul className="mt-2.5 space-y-2 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                {result.keyDifferences.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Structured Comparison Matrix Table */}
          <section className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70">
                  <th className="w-48 p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                    Dimension
                  </th>
                  {result.papers.map((p) => (
                    <th
                      key={p.paperId || p.title}
                      className="p-3.5 font-semibold text-slate-900 dark:text-slate-100"
                    >
                      {p.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.key} className="align-top">
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/20">
                      {row.label}
                    </td>
                    {result.papers.map((p) => (
                      <td
                        key={`${p.paperId}-${row.key}`}
                        className="p-3.5 text-slate-700 dark:text-slate-300 leading-relaxed"
                      >
                        {p[row.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
