import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "./components/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { MyPapersPage } from "./pages/MyPapersPage";
import { PaperAnalyzerPage } from "./pages/PaperAnalyzerPage";
import { PaperChatPage } from "./pages/PaperChatPage";
import { SummarizerPage } from "./pages/SummarizerPage";
import { api } from "./services/api";

function WorkspaceRouter() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState("landing");
  const [activePage, setActivePage] = useState("dashboard");
  const [pageHistory, setPageHistory] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState(null);

  const refreshPapers = useCallback(async () => {
    if (!user) return;
    setLoadingPapers(true);
    try {
      const res = await api.listPapers();
      setPapers(res.papers || []);
      setSelectedPaperId((prev) => {
        if (prev && res.papers?.some((p) => p.id === prev)) return prev;
        return res.papers?.[0]?.id ?? null;
      });
    } catch {
      // Errors surfaced in tool views if needed
    } finally {
      setLoadingPapers(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void refreshPapers();
    } else {
      setPapers([]);
      setSelectedPaperId(null);
      setActivePage("dashboard");
      setPageHistory([]);
    }
  }, [user, refreshPapers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    if (authView === "landing") {
      return (
        <LandingPage
          onOpenAuth={(mode) =>
            setAuthView(mode === "register" ? "register" : "login")
          }
        />
      );
    }
    return (
      <AuthPage
        initialMode={authView}
        onBackHome={() => setAuthView("landing")}
      />
    );
  }

  function handleNavigate(page, paperId) {
    if (paperId) setSelectedPaperId(paperId);
    if (page !== activePage) {
      setPageHistory((prev) => [...prev.slice(-15), activePage]);
      setActivePage(page);
    }
  }

  function handleGoBack() {
    setPageHistory((prev) => {
      if (prev.length === 0) {
        setActivePage("dashboard");
        return prev;
      }
      const previousPage = prev[prev.length - 1];
      setActivePage(previousPage);
      return prev.slice(0, -1);
    });
  }

  const canGoBack = pageHistory.length > 0 || activePage !== "dashboard";

  return (
    <AppShell
      activePage={activePage}
      canGoBack={canGoBack}
      onGoBack={handleGoBack}
      onNavigate={(p) => handleNavigate(p)}
    >
      {activePage === "dashboard" && (
        <DashboardPage
          papers={papers}
          loadingPapers={loadingPapers}
          onNavigate={handleNavigate}
        />
      )}
      {activePage === "analyzer" && (
        <PaperAnalyzerPage
          papers={papers}
          selectedPaperId={selectedPaperId}
          onSelectPaper={setSelectedPaperId}
          onPaperUploaded={(paper) => {
            setPapers((prev) => [paper, ...prev]);
            setSelectedPaperId(paper.id);
          }}
          onAnalysisSaved={(paperId) => {
            setPapers((prev) =>
              prev.map((p) =>
                p.id === paperId ? { ...p, analysisStatus: "analyzed" } : p
              )
            );
          }}
        />
      )}
      {activePage === "summarizer" && (
        <SummarizerPage
          papers={papers}
          selectedPaperId={selectedPaperId}
          onSelectPaper={setSelectedPaperId}
          onGoUpload={() => handleNavigate("analyzer")}
        />
      )}
      {activePage === "chat" && (
        <PaperChatPage
          papers={papers}
          selectedPaperId={selectedPaperId}
          onSelectPaper={setSelectedPaperId}
          onGoUpload={() => handleNavigate("analyzer")}
        />
      )}
      {activePage === "papers" && (
        <MyPapersPage
          papers={papers}
          loadingPapers={loadingPapers}
          onPapersChanged={() => void refreshPapers()}
          onNavigateTool={handleNavigate}
        />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <WorkspaceRouter />
      </AuthProvider>
    </ToastProvider>
  );
}
