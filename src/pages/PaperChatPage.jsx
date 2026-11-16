import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquarePlus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

const SUGGESTED_QUESTIONS = [
  "What is the main objective of this paper?",
  "Which algorithm is used?",
  "What problem does this research solve?",
  "Explain the proposed methodology.",
  "What are the limitations of this research?",
  "What is the future scope?",
];

function SourceChunksBox({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-2.5">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>Source Excerpts ({sources.length})</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {open && (
        <div className="mt-2.5 space-y-2">
          {sources.map((s) => (
            <div
              key={s.chunkIndex}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-3 text-xs"
            >
              <div className="flex items-center justify-between font-mono tabular-nums text-slate-500 dark:text-slate-400 mb-1">
                <span>
                  Chunk #{s.chunkIndex + 1} · ~Page {s.pageEstimate}
                </span>
                <span>Similarity: {s.score.toFixed(4)}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {s.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PaperChatPage({
  papers,
  selectedPaperId,
  onSelectPaper,
  onGoUpload,
}) {
  const { showToast } = useToast();
  const activePaper =
    papers.find((p) => p.id === selectedPaperId) ?? papers[0] ?? null;

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!activePaper) {
      setConversations([]);
      setActiveConvId(null);
      return;
    }
    let active = true;
    async function loadConvs() {
      setLoadingConvs(true);
      try {
        const res = await api.listConversations(activePaper.id);
        if (active) {
          setConversations(res.conversations);
          setActiveConvId(res.conversations[0]?.id ?? null);
        }
      } catch (err) {
        if (active) {
          showToast(
            err instanceof Error ? err.message : "Failed to load chat history.",
            "error"
          );
        }
      } finally {
        if (active) setLoadingConvs(false);
      }
    }
    void loadConvs();
    return () => {
      active = false;
    };
  }, [activePaper?.id, showToast]);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length, sending]);

  async function handleSend(text) {
    const trimmed = text.trim();
    if (!trimmed || !activePaper || sending) return;
    setSending(true);
    setQuestion("");

    try {
      const res = await api.sendChatMessage(
        activePaper.id,
        trimmed,
        activeConvId ?? undefined
      );
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === res.conversation.id);
        if (exists) {
          return prev.map((c) =>
            c.id === res.conversation.id ? res.conversation : c
          );
        }
        return [res.conversation, ...prev];
      });
      setActiveConvId(res.conversation.id);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to answer question.",
        "error"
      );
      setQuestion(trimmed);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteConv(convId) {
    if (!activePaper) return;
    try {
      await api.deleteConversation(activePaper.id, convId);
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== convId);
        if (activeConvId === convId) setActiveConvId(next[0]?.id ?? null);
        return next;
      });
      showToast("Conversation deleted.", "info");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete conversation.",
        "error"
      );
    }
  }

  if (papers.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
        <p className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          No papers uploaded yet
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Upload a PDF in the Paper Analyzer first to start asking questions.
        </p>
        <button
          type="button"
          onClick={onGoUpload}
          className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-4 text-xs font-semibold"
        >
          <Upload className="h-4 w-4" />
          <span>Go to Paper Analyzer</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl grid gap-5 lg:grid-cols-[280px_1fr]">
      {/* Paper & Conversations Column */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col gap-4 h-fit lg:h-[calc(100vh-11rem)]">
        <div>
          <label
            htmlFor="chat-paper-select"
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5"
          >
            Selected Paper
          </label>
          <select
            id="chat-paper-select"
            value={activePaper?.id || ""}
            onChange={(e) => onSelectPaper(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setActiveConvId(null)}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/70"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span>New Conversation</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Conversations ({conversations.length})
          </p>
          {loadingConvs ? (
            <div className="space-y-2 pt-1">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
              No saved threads for this paper yet.
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                  conv.id === activeConvId
                    ? "border-blue-300 dark:border-blue-700 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200"
                    : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveConvId(conv.id)}
                  className="min-w-0 flex-1 text-left truncate font-medium"
                >
                  {conv.title}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteConv(conv.id)}
                  aria-label="Delete conversation"
                  className="text-slate-400 hover:text-red-600 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Viewport */}
      <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs lg:h-[calc(100vh-11rem)]">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
          <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {activePaper?.title}
          </p>
          <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {activePaper?.pageCount} pages · {activePaper?.chunkCount} indexed vector chunks
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!activeConv || activeConv.messages.length === 0 ? (
            <div className="py-4 space-y-5">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Ask anything about this research paper
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  Questions are matched against indexed PDF chunks via semantic similarity search. Answers are grounded strictly in the uploaded document with page estimates and source excerpts.
                </p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={sending}
                    onClick={() => void handleSend(q)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeConv.messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-xl rounded-xl bg-blue-600 px-4 py-3 text-sm text-white leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-start">
                  <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 text-sm text-slate-800 dark:text-slate-200">
                    <div className="leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    {msg.sources && <SourceChunksBox sources={msg.sources} />}
                  </div>
                </div>
              )
            )
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Searching document chunks and generating grounded response...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend(question);
          }}
          className="border-t border-slate-200 dark:border-slate-800 p-3.5 flex items-end gap-2.5"
        >
          <textarea
            rows={1}
            value={question}
            disabled={sending}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend(question);
              }
            }}
            placeholder="Ask a question about objectives, algorithms, methodology, or limitations..."
            className="min-h-[42px] max-h-28 flex-1 resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !question.trim()}
            className="inline-flex h-[42px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="h-4 w-4" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
