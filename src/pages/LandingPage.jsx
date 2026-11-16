import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  FileSearch,
  FileText,
  MessageSquare,
  Moon,
  Sun,
} from "lucide-react";
import heroImage from "../assets/images/hero_research_analyzer_1794850548781.jpg";
import { useAuth } from "../context/AuthContext";

const CORE_FEATURES = [
  {
    num: "01",
    title: "AI Research Paper Analysis",
    description:
      "Upload any academic PDF to extract the title, abstract, problem statement, objectives, methodology, algorithms, experimental results, advantages, limitations, conclusion, and future scope.",
    icon: FileSearch,
  },
  {
    num: "02",
    title: "AI Research Paper Summarizer",
    description:
      "Generate a crisp Short Summary (150–200 words) or a comprehensive Detailed Summary written in plain, student-friendly English ready to copy or download.",
    icon: FileText,
  },
  {
    num: "03",
    title: "Chat with Research Paper",
    description:
      "Ask specific questions using Retrieval-Augmented Generation (RAG). Answers are grounded strictly in indexed document chunks with page estimates and verbatim source excerpts.",
    icon: MessageSquare,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Upload Your PDF",
    detail:
      "Drag and drop a research paper PDF. The backend validates the document, extracts clean text with page estimates, splits it into overlapping chunks, and builds vector embeddings.",
  },
  {
    step: "02",
    title: "Analyze & Summarize",
    detail:
      "Run structured multi-section extraction or switch between Short and Detailed plain-English summaries with one-click copy and text/Markdown export.",
  },
  {
    step: "03",
    title: "Ask Grounded Questions",
    detail:
      "Query the paper via semantic similarity search. The assistant cites supporting chunk numbers and page estimates and alerts you if information is absent from the PDF.",
  },
];

export function LandingPage({ onOpenAuth }) {
  const { theme, toggleTheme } = useAuth();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Bar: 3 clean zones (Brand | Links | Auth + Theme) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          <a
            href="#top"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg badge-brand-gradient shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              AI Research Paper Analyzer
            </span>
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#features"
              className="whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void toggleTheme()}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth("login")}
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth("register")}
              className="inline-flex h-9 items-center rounded-lg btn-brand-gradient px-3.5 sm:px-4 text-xs sm:text-sm font-semibold shadow-xs whitespace-nowrap"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="top" className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6 space-y-6">
              <h1
                className="font-display font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance leading-tight"
                style={{ fontSize: "clamp(2.15rem, 3.8vw, 3.25rem)" }}
              >
                Understand Complex Research Papers in Minutes
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload academic PDFs to extract structured technical sections, generate plain-English short or detailed summaries, and ask questions grounded directly in your paper&apos;s pages.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenAuth("register")}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-5 text-sm font-semibold shadow-sm"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth("login")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Sign In to Workspace
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                {!imgError ? (
                  <img
                    src={heroImage}
                    alt="Academic manuscript pages connected to semantic retrieval nodes"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-8 text-center">
                    <FileSearch className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    <p className="mt-3 font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
                      PDF Extraction · Summarization · RAG Q&amp;A
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section
          id="features"
          className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
        >
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                Three Focused Tools for Academic Reading
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Built around the real workflow students use to review IEEE, ACM, and arXiv papers without bloat.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {CORE_FEATURES.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.num}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                        {feat.num}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      {feat.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="border-t border-slate-200 dark:border-slate-800"
        >
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                How It Works
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                From raw PDF upload to verified, citation-backed answers in three steps.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
                >
                  <p className="font-mono text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    Step {item.step}
                  </p>
                  <h3 className="mt-2 font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>AI Research Paper Analyzer</span>
          <span>Always verify extracted findings against the source PDF.</span>
        </div>
      </footer>
    </div>
  );
}
