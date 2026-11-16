import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  FileSearch,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analyzer", label: "Paper Analyzer", icon: FileSearch },
  { id: "summarizer", label: "Summarizer", icon: FileText },
  { id: "chat", label: "Chat with PDF", icon: MessageSquare },
  { id: "papers", label: "My Papers", icon: FolderOpen },
];

const PAGE_TITLES = {
  dashboard: "Dashboard",
  analyzer: "Research Paper Analyzer",
  summarizer: "Research Paper Summarizer",
  chat: "Chat with PDF",
  papers: "My Papers",
};

export function AppShell({
  activePage,
  canGoBack,
  onGoBack,
  onNavigate,
  children,
}) {
  const { user, theme, toggleTheme, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = (user?.name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarBody = (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            onNavigate("dashboard");
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md badge-brand-gradient shrink-0">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <span className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            Paper Analyzer
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav
        aria-label="Workspace navigation"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
      >
        <p className="px-3 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
          Workspace
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        <div className="flex items-center gap-2.5 rounded-lg p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full badge-brand-gradient text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {user?.name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebarBody}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[85vw] h-full">
            {sidebarBody}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            {canGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                aria-label="Go back"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            )}
            <h1 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate sm:text-lg">
              {PAGE_TITLES[activePage] || "AI Research Paper Analyzer"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void toggleTheme()}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate("analyzer")}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg btn-brand-gradient px-4 text-sm font-medium shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload PDF</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            AI-generated analyses, summaries, and RAG responses are grounded in your uploaded PDFs. Always verify critical academic details against the original manuscript.
          </p>
        </footer>
      </div>
    </div>
  );
}
