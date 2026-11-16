import { useState } from "react";
import { CheckCircle2, HelpCircle, Loader2, XCircle } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function QuestionGeneratorPage({
  papers,
  selectedPaperId,
  onSelectPaper,
}) {
  const { showToast } = useToast();
  const activePaper = papers.find((p) => p.id === selectedPaperId) ?? papers[0] ?? null;

  const [questionType, setQuestionType] = useState("mcq");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);

  // Quiz / Practice state
  const [practiceMode, setPracticeMode] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  async function handleGenerate() {
    if (!activePaper) return;
    setLoading(true);
    setSelectedOptions({});
    setRevealedAnswers({});
    setQuizSubmitted(false);
    try {
      const res = await api.generateQuestions(activePaper.id, {
        questionType,
        difficulty,
        count,
      });
      setQuestions(res.questions);
      showToast(`Generated ${res.questions.length} ${questionType.toUpperCase()} questions.`, "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to generate questions.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  const mcqScore = questions.reduce((acc, q) => {
    if (selectedOptions[q.id] === q.correctAnswer) return acc + 1;
    return acc;
  }, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Source Research Paper
            </label>
            <select
              value={activePaper?.id || ""}
              onChange={(e) => onSelectPaper(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
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
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Question Format
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
            >
              <option value="mcq">Multiple-Choice (MCQ)</option>
              <option value="technical">Technical Questions</option>
              <option value="viva">Viva Voce Questions</option>
              <option value="short">Short-Answer</option>
              <option value="long">Long-Answer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Difficulty &amp; Count
            </label>
            <div className="flex gap-2">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-medium text-slate-900 dark:text-slate-100"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="h-10 w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={practiceMode}
              onChange={(e) => setPracticeMode(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span>Enable Practice Quiz Mode (hide answers until checked)</span>
          </label>

          <button
            type="button"
            disabled={!activePaper || loading}
            onClick={() => void handleGenerate()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HelpCircle className="h-4 w-4" />
            )}
            <span>{loading ? "Generating..." : "Generate Questions"}</span>
          </button>
        </div>
      </section>

      {questions.length > 0 && (
        <div className="space-y-4">
          {questionType === "mcq" && practiceMode && quizSubmitted && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Quiz Result: <span className="font-mono tabular-nums">{mcqScore} / {questions.length}</span> correct (
                {Math.round((mcqScore / questions.length) * 100)}%)
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedOptions({});
                  setQuizSubmitted(false);
                }}
                className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
              >
                Retake Quiz
              </button>
            </div>
          )}

          {questions.map((q, idx) => {
            const isMcq = q.options && q.options.length > 0;
            const showSolution =
              !practiceMode || (isMcq ? quizSubmitted : Boolean(revealedAnswers[q.id]));

            return (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  Q{idx + 1}. {q.question}
                </p>

                {isMcq && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => {
                      const picked = selectedOptions[q.id] === opt;
                      const isCorrect = opt === q.correctAnswer;
                      let style =
                        "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-300";
                      if (showSolution) {
                        if (isCorrect) {
                          style =
                            "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200";
                        } else if (picked && !isCorrect) {
                          style =
                            "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40 text-red-900 dark:text-red-200";
                        }
                      } else if (picked) {
                        style =
                          "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40";
                      }

                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={showSolution}
                          onClick={() =>
                            setSelectedOptions((prev) => ({ ...prev, [q.id]: opt }))
                          }
                          className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-left text-xs font-medium transition-colors ${style}`}
                        >
                          <span>{opt}</span>
                          {showSolution && isCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                          {showSolution && picked && !isCorrect && (
                            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {!isMcq && practiceMode && !showSolution && (
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedAnswers((prev) => ({ ...prev, [q.id]: true }))
                    }
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reveal Model Answer &amp; Explanation
                  </button>
                )}

                {showSolution && (
                  <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3.5 text-xs space-y-1.5">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Answer: <span className="font-normal text-slate-700 dark:text-slate-300">{q.correctAnswer}</span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Explanation:{" "}
                      </span>
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {questionType === "mcq" && practiceMode && !quizSubmitted && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setQuizSubmitted(true)}
                className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Submit Quiz &amp; View Score
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
