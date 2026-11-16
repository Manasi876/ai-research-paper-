import { useState } from "react";
import PptxGenJS from "pptxgenjs";
import { Download, Loader2, Presentation } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function PresentationPage({
  papers,
  selectedPaperId,
  onSelectPaper,
}) {
  const { showToast } = useToast();
  const activePaper = papers.find((p) => p.id === selectedPaperId) ?? papers[0] ?? null;

  const [slides, setSlides] = useState([]);
  const [deckTitle, setDeckTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!activePaper) return;
    setLoading(true);
    try {
      const res = await api.generatePresentation(activePaper.id);
      setSlides(res.slides);
      setDeckTitle(res.paperTitle);
      showToast("10-slide presentation outline generated.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to generate presentation.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPptx() {
    if (slides.length === 0) return;
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_16x9";
    pptx.title = deckTitle || activePaper?.title || "Research Presentation";

    for (const s of slides) {
      const slide = pptx.addSlide();
      slide.background = { color: "F8FAFC" };

      slide.addText(`${String(s.slideNumber).padStart(2, "0")} / ${s.title}`, {
        x: 0.6,
        y: 0.45,
        w: 8.8,
        h: 0.6,
        fontSize: 22,
        bold: true,
        color: "1E293B",
      });

      slide.addShape(pptx.ShapeType.line, {
        x: 0.6,
        y: 1.1,
        w: 8.8,
        h: 0,
        line: { color: "2563EB", width: 1.5 },
      });

      const bulletItems = s.bullets.map((b) => ({
        text: b,
        options: { bullet: true, breakLine: true, fontSize: 15, color: "334155" },
      }));

      slide.addText(bulletItems, {
        x: 0.7,
        y: 1.35,
        w: 8.6,
        h: 3.7,
        valign: "top",
        paraSpaceAfter: 10,
      });

      if (s.speakerNotes) {
        slide.addNotes(s.speakerNotes);
      }
    }

    const safeName = (deckTitle || "Research_Presentation").replace(
      /[^a-z0-9]+/gi,
      "_"
    );
    await pptx.writeFile({ fileName: `${safeName}.pptx` });
    showToast("Downloaded PowerPoint (.pptx) deck.", "success");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Select Paper for Presentation Deck
          </label>
          <select
            value={activePaper?.id || ""}
            onChange={(e) => {
              onSelectPaper(e.target.value);
              setSlides([]);
            }}
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

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={!activePaper || loading}
            onClick={() => void handleGenerate()}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-5 text-xs font-semibold shadow-xs disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Presentation className="h-4 w-4" />
            )}
            <span>{loading ? "Generating Slides..." : "Generate 10-Slide Deck"}</span>
          </button>

          {slides.length > 0 && (
            <button
              type="button"
              onClick={() => void handleDownloadPptx()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Download .pptx</span>
            </button>
          )}
        </div>
      </section>

      {slides.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {slides.map((s) => (
            <div
              key={s.slideNumber}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <p className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Slide {String(s.slideNumber).padStart(2, "0")}
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  {s.title}
                </h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                  {s.bullets.map((b, i) => (
                    <li key={i} className="leading-relaxed">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              {s.speakerNotes && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Speaker Notes:{" "}
                  </span>
                  {s.speakerNotes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
