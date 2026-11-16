const TOKEN_STORAGE_KEY = "ai_research_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request(url, options = {}, isFormData = false) {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!isFormData && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(
      "Unable to reach the backend API. Please wait a moment and try again."
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    let errMsg = data?.error || `Request failed (${res.status})`;
    if (res.status === 413 && !data?.error) {
      errMsg =
        "File is too large for serverless upload (4.5 MB limit on Vercel). Please upload a smaller PDF.";
    }
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    throw new Error(errMsg);
  }

  return data;
}

export const api = {
  // Auth
  register: (payload) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  me: () => request("/api/auth/me"),

  forgotPassword: (email) =>
    request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // Profile
  getProfile: () => request("/api/users/profile"),

  updateProfile: (payload) =>
    request("/api/users/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Dashboard
  getDashboardSummary: () => request("/api/dashboard/summary"),

  // Papers
  listPapers: () => request("/api/papers"),

  uploadPaper: (file) => {
    const form = new FormData();
    form.append("paper", file);
    return request(
      "/api/papers/upload",
      { method: "POST", body: form },
      true
    );
  },

  updatePaper: (id, patch) =>
    request(`/api/papers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deletePaper: (id) =>
    request(`/api/papers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // AI Tools
  getPaperAnalysis: (paperId) =>
    request(`/api/ai/analyze/${encodeURIComponent(paperId)}`),

  analyzePaper: (paperId, refresh = false) =>
    request(`/api/ai/analyze/${encodeURIComponent(paperId)}`, {
      method: "POST",
      body: JSON.stringify({ refresh }),
    }),

  summarizePaper: (paperId, format) =>
    request(`/api/ai/summarize/${encodeURIComponent(paperId)}`, {
      method: "POST",
      body: JSON.stringify({ format }),
    }),

  listConversations: (paperId) =>
    request(`/api/ai/chat/${encodeURIComponent(paperId)}`),

  sendChatMessage: (paperId, question, conversationId) =>
    request(`/api/ai/chat/${encodeURIComponent(paperId)}`, {
      method: "POST",
      body: JSON.stringify({ question, conversationId }),
    }),

  deleteConversation: (paperId, conversationId) =>
    request(
      `/api/ai/chat/${encodeURIComponent(paperId)}/${encodeURIComponent(
        conversationId
      )}`,
      { method: "DELETE" }
    ),

  comparePapers: (paperIds) =>
    request("/api/ai/compare", {
      method: "POST",
      body: JSON.stringify({ paperIds }),
    }),

  findResearchGaps: (paperIds) =>
    request("/api/ai/research-gaps", {
      method: "POST",
      body: JSON.stringify({ paperIds }),
    }),

  generateQuestions: (paperId, payload) =>
    request(`/api/ai/generate-questions/${encodeURIComponent(paperId)}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  generateCitations: (paperId, metadata) =>
    request(`/api/ai/citations/${encodeURIComponent(paperId)}`, {
      method: "POST",
      body: JSON.stringify({ metadata }),
    }),

  generatePresentation: (paperId) =>
    request(`/api/ai/generate-presentation/${encodeURIComponent(paperId)}`, {
      method: "POST",
    }),

  getAiHistory: (paperId) =>
    request(
      paperId
        ? `/api/ai/history?paperId=${encodeURIComponent(paperId)}`
        : "/api/ai/history"
    ),

  // Discovery
  searchScholarly: (q, source = "all") =>
    request(
      `/api/research/search?q=${encodeURIComponent(q)}&source=${encodeURIComponent(
        source
      )}`
    ),

  saveDiscoveredPaper: (paperMetadata) =>
    request("/api/research/save", {
      method: "POST",
      body: JSON.stringify({ paperMetadata, source: paperMetadata.source }),
    }),

  listSavedPapers: () => request("/api/research/saved"),

  deleteSavedPaper: (id) =>
    request(`/api/research/saved/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Projects
  listProjects: () => request("/api/projects"),

  createProject: (payload) =>
    request("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateProject: (id, patch) =>
    request(`/api/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  deleteProject: (id) =>
    request(`/api/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
