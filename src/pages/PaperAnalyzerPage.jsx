import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileSearch,
  FileUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

const MAX_BYTES = 15 * 1024 * 1024;

const ANALYSIS_SECTIONS = [
  { key: "overview", label: "1. Research Paper Overview" },
  { key: "problemStatement", label: "2. Problem Statement" },
  { key: "objectives", label: "3. Main Research Objectives" },
  { key: "methodology", label: "4. Proposed Methodology" },
  { key: "technologiesAndAlgorithms", label: "5. Technologies & Algorithms Used" },
  { key: "datasetInfo", label: "6. Dataset Information" },
  { key: "results", label: "7. Experimental Results" },
  { key: "advantages", label: "8. Advantages" },
  { key: "limitations", label: "9. Limitations" },
  { key: "futureScope", label: "10. Future Scope" },
  { key: "conclusion", label: "11. Conclusion" },
];

export function PaperAnalyzerPage({
  papers,
  selectedPaperId,
  onSelectPaper,
  onPaperUploaded,
}) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const activePaper = papers.find((p) => p.id === selectedPaperId) ?? papers[0] ?? null;

  useEffect(() => {
    if (!activePaper) {
      setAnalysis(null);
      return;
    }
    let active = true;
    async function loadExisting() {
      setLoadingAnalysis(true);
      try {
        const res = await api.getPaperAnalysis(activePaper.id);
        if (active) setAnalysis(res.analysis);
      } catch {
        if (active) setAnalysis(null);
      } finally {
        if (active) setLoadingAnalysis(false);
      }
    }
    void loadExisting();
    return () => {
      active = false;
    };
  }, [activePaper?.id]);

  async function handleUploadFile(file) {
    setUploadError(null);
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setUploadError("Invalid file type. Only PDF documents (.pdf) are allowed.");
      return;
    }
    if (file.size === 0) {
      setUploadError("Selected file is empty.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("File exceeds the 15 MB upload limit.");
      return;
    }

    setUploading(true);
    try {
      const { paper } = await api.uploadPaper(file);
      onPaperUploaded(paper);
      onSelectPaper(paper.id);
      showToast(`Indexed "${paper.title}" successfully.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(msg);
      showToast(msg, "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleRunAnalysis(refresh = false) {
    if (!activePaper) return;
    setRunningAnalysis(true);
    try {
      const res = await api.analyzePaper(activePaper.id, refresh);
      setAnalysis(res.analysis);
      showToast("11-section AI paper analysis completed.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to analyze paper.",
        "error"
      );
    } finally {
      setRunningAnalysis(false);
    }
  }

  function handleCopy(key, text) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
    showToast("Copied to clipboard.", "info");
  }

  function handleDownloadAnalysis() {
    if (!activePaper || !analysis) return;
    const md = [
      `# ${activePaper.title}`,
      `Authors: ${activePaper.authors.join(", ") || "Not detected"}`,
      `Year: ${activePaper.publicationYear || "Not detected"}`,
      "",
      ...ANALYSIS_SECTIONS.map(
        (s) => `## ${s.label}\n\n${String(analysis[s.key] || "")}\n`
      ),
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activePaper.title.replace(/[^a-z0-9]+/gi, "_")}_Analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* PDF Upload Dropzone */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Upload Research Paper (PDF)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Extracts text, bibliographic metadata, and creates 768-d vector embeddings for RAG Q&amp;A. Max 15 MB.
            </p>
          </div>
          {papers.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="analyzer-paper-select"
                className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
              >
                Active Paper:
              </label>
              <select
                id="analyzer-paper-select"
                value={activePaper?.id || ""}
                onChange={(e) => onSelectPaper(e.target.value)}
                className="h-10 max-w-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              >
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f && !uploading) void handleUploadFile(f);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30"
              : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUploadFile(f);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Extracting text, detecting metadata &amp; generating vector embeddings...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
              <FileUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Drag and drop a PDF here, or
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
              >
                Browse PDF
              </button>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </section>

      {/* Active Paper Metadata & 11-Section Analysis */}
      {activePaper && (
        <section className="space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  {activePaper.title}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  <span>{activePaper.fileName}</span>
                  <span>·</span>
                  <span>{activePaper.pageCount} pages</span>
                  <span>·</span>
                  <span>{activePaper.chunkCount} chunks</span>
                  {activePaper.publicationYear && (
                    <>
                      <span>·</span>
                      <span>Year: {activePaper.publicationYear}</span>
                    </>
                  )}
                </div>
                {activePaper.authors.length > 0 && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    Authors: {activePaper.authors.join(", ")}
                  </p>
                )}
                {activePaper.keywords.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Keywords: {activePaper.keywords.join(" · ")}
                  </p>
                )}
                {activePaper.abstract && (
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Extracted Abstract:{" "}
                    </span>
                    {activePaper.abstract}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={runningAnalysis}
                  onClick={() => void handleRunAnalysis(Boolean(analysis))}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-4 text-xs font-semibold shadow-xs disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                >
                  {runningAnalysis ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : analysis ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <FileSearch className="h-4 w-4" />
                  )}
                  <span>
                    {runningAnalysis
                      ? "Analyzing Paper..."
                      : analysis
                      ? "Re-run Analysis"
                      : "Analyze Paper with AI"}
                  </span>
                </button>

                {analysis && (
                  <button
                    type="button"
                    onClick={handleDownloadAnalysis}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download .md</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {loadingAnalysis || runningAnalysis ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
                >
                  <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-3 h-3 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
                  <div className="mt-2 h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800/60" />
                </div>
              ))}
            </div>
          ) : analysis ? (
            <div className="grid gap-4 md:grid-cols-2">
              {ANALYSIS_SECTIONS.map((sec) => {
                const value = String(analysis[sec.key] || "");
                const isFullWidth = sec.key === "overview" || sec.key === "conclusion";
                return (
                  <div
                    key={sec.key}
                    className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs ${
                      isFullWidth ? "md:col-span-2" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {sec.label}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleCopy(sec.key, value)}
                        aria-label={`Copy ${sec.label}`}
                        className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        {copiedKey === sec.key ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
              <FileSearch className="mx-auto h-7 w-7 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Ready to generate structured 11-section analysis
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Click &ldquo;Analyze Paper with AI&rdquo; above to extract overview, problem statement, objectives, methodology, algorithms, datasets, results, and limitations.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
