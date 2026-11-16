import { useState } from "react";
import { AlertCircle, BookOpen, Loader2, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function AuthPage() {
  const { login, register, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
        showToast("Signed in successfully.", "success");
      } else if (mode === "register") {
        await register(name, email, password);
        showToast("Account created and signed in.", "success");
      } else {
        const res = await api.forgotPassword(email);
        setInfoMessage(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-bold tracking-tight">
            AI in Research Paper
          </span>
        </div>
        <button
          type="button"
          onClick={() => void toggleTheme()}
          aria-label="Toggle theme"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="flex h-36 w-36 items-center justify-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <svg
                viewBox="0 0 120 120"
                className="h-24 w-24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="AI in Research Paper logo"
              >
                <defs>
                  <linearGradient id="rpLogoGrad" x1="16" y1="12" x2="104" y2="108" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
                {/* Back manuscript sheet */}
                <rect
                  x="30"
                  y="14"
                  width="64"
                  height="82"
                  rx="8"
                  className="fill-blue-50 dark:fill-slate-800 stroke-blue-200 dark:stroke-slate-700"
                  strokeWidth="2.5"
                />
                {/* Front research paper sheet */}
                <rect
                  x="20"
                  y="24"
                  width="64"
                  height="82"
                  rx="8"
                  className="fill-white dark:fill-slate-900"
                  stroke="url(#rpLogoGrad)"
                  strokeWidth="3.5"
                />
                {/* Paper header & text lines */}
                <line x1="32" y1="42" x2="64" y2="42" stroke="url(#rpLogoGrad)" strokeWidth="4" strokeLinecap="round" />
                <line x1="32" y1="56" x2="72" y2="56" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="32" y1="68" x2="68" y2="68" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="32" y1="80" x2="52" y2="80" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="3.5" strokeLinecap="round" />
                {/* Precision search / AI analysis lens badge */}
                <circle cx="80" cy="82" r="18" fill="url(#rpLogoGrad)" />
                <path
                  d="M80 72L82.4 78.6L89 81L82.4 83.4L80 90L77.6 83.4L71 81L77.6 78.6L80 72Z"
                  fill="#FFFFFF"
                />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl text-balance">
              Intelligent Research Paper Assistant
            </h1>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setInfoMessage(null);
                }}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
                  mode === "register"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. A. Sharma"
                    className="h-11 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@university.edu"
                  className="h-11 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          setError(null);
                          setInfoMessage(null);
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="h-11 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                  />
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-3 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  {infoMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {mode === "login"
                    ? "Sign In"
                    : mode === "register"
                    ? "Create Research Account"
                    : "Check Password Reset"}
                </span>
              </button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="w-full text-center text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  Back to Sign In
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
