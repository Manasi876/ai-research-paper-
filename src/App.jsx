import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "./components/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthPage } from "./pages/AuthPage";
import { CitationsPage } from "./pages/CitationsPage";
import { ComparePapersPage } from "./pages/ComparePapersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LibraryPage } from "./pages/LibraryPage";
import { PaperAnalyzerPage } from "./pages/PaperAnalyzerPage";
import { PaperChatPage } from "./pages/PaperChatPage";
import { PaperFinderPage } from "./pages/PaperFinderPage";
import { PresentationPage } from "./pages/PresentationPage";
import { ProfileSettingsPage } from "./pages/ProfileSettingsPage";
import { QuestionGeneratorPage } from "./pages/QuestionGeneratorPage";
import { ResearchGapsPage } from "./pages/ResearchGapsPage";
import { SummarizerPage } from "./pages/SummarizerPage";
import { api } from "./services/api";

function AuthenticatedWorkspace() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [pageHistory, setPageHistory] = useState([]);
  const [papers, setPapers] = useState([]);
  const [selectedPaperId, setSelectedPaperId] = useState(null);

  const refreshPapers = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.listPapers();
      setPapers(res.papers);
      setSelectedPaperId((prev) => {
        if (prev && res.papers.some((p) => p.id === prev)) return prev;
        return res.papers[0]?.id ?? null;
      });
    } catch {
      // Handled by individual pages if needed
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void refreshPapers();
    } else {
      setPapers([]);
      setSelectedPaperId(null);
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
    return <AuthPage />;
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
        <DashboardPage onNavigate={handleNavigate} />
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
      {activePage === "summarizer" && (
        <SummarizerPage
          papers={papers}
          selectedPaperId={selectedPaperId}
          onSelectPaper={setSelectedPaperId}
        />
      )}
      {activePage === "compare" && <ComparePapersPage papers={papers} />}
      {activePage === "gaps" && <ResearchGapsPage papers={papers} />}
      {activePage === "questions" && (
        <QuestionGeneratorPage
          papers={papers}
          selectedPaperId={selectedPaperId}
          onSelectPaper={setSelectedPaperId}
        />
      )}
      {activePage === "citations" && (
        <CitationsPage
          papers={papers}
          selectedPaperId={selectedPaperId}
          onSelectPaper={setSelectedPaperId}
        />
      )}
      {activePage === "finder" && (
        <PaperFinderPage onSavedPaper={() => void refreshPapers()} />
      )}
      {activePage === "library" && (
        <LibraryPage
          papers={papers}
          onPapersChanged={() => void refreshPapers()}
          onNavigateTool={handleNavigate}
        />
      )}
      {activePage === "presentation" && (
        <PresentationPage
          papers={papers}
          selectedPaperId={selectedPaperId}
          onSelectPaper={setSelectedPaperId}
        />
      )}
      {activePage === "profile" && <ProfileSettingsPage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthenticatedWorkspace />
      </AuthProvider>
    </ToastProvider>
  );
}
