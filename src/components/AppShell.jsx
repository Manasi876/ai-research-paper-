import { useState } from "react";
import {
  ArrowLeft,
  BookMarked,
  Compass,
  FileSearch,
  FileText,
  GitCompare,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Presentation,
  Quote,
  Settings,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_GROUPS = [
  {
    heading: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "library", label: "My Library", icon: BookMarked },
    ],
  },
  {
    heading: "Paper Intelligence",
    items: [
      { id: "analyzer", label: "Paper Analyzer", icon: FileSearch },
      { id: "chat", label: "Chat with Paper", icon: MessageSquare },
      { id: "summarizer", label: "Summarizer", icon: FileText },
      { id: "compare", label: "Compare Papers", icon: GitCompare },
      { id: "gaps", label: "Research Gaps", icon: Lightbulb },
    ],
  },
  {
    heading: "Research Tools",
    items: [
      { id: "questions", label: "Question Generator", icon: HelpCircle },
      { id: "citations", label: "Citation Generator", icon: Quote },
      { id: "finder", label: "Paper Finder", icon: Compass },
      { id: "presentation", label: "Presentation Maker", icon: Presentation },
    ],
  },
  {
    heading: "Account",
    items: [{ id: "profile", label: "Profile & Settings", icon: Settings }],
  },
];

const PAGE_TITLES = {
  dashboard: "Research Dashboard",
  analyzer: "AI Research Paper Analyzer",
  chat: "Chat with Research Paper",
  summarizer: "Smart Paper Summarizer",
  compare: "Research Paper Comparison",
  gaps: "Research Gap Finder",
  questions: "AI Question & Quiz Generator",
  citations: "Citation Generator",
  finder: "Research Paper Finder",
  library: "My Research Library",
  presentation: "Presentation Generator",
  profile: "Profile & Settings",
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

  const initials = (user?.name || "R")
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
          className="text-left focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <span className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            AI in Research Paper
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

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
            <p className="px-3 mb-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
              {group.heading}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
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
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
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
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        <div className="flex items-center gap-2.5 rounded-lg p-2">
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full badge-brand-gradient text-xs font-semibold shrink-0">
              {initials}
            </div>
          )}
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
            title="Sign out"
            aria-label="Sign out"
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebarBody}
      </aside>

      {/* Mobile Drawer */}
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

      {/* Main Column */}
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
              {PAGE_TITLES[activePage]}
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
            Verification notice: AI-generated analyses, summaries, research gaps, questions, and extracted citations are assistive tools and may contain omissions. Always verify findings and bibliographic details against the original peer-reviewed source.
          </p>
        </footer>
      </div>
    </div>
  );
}
