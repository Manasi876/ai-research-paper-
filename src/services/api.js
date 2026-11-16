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
    // Non-JSON response body
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
  // System health
  health: () => request("/api/health"),

  // Authentication
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

  updateProfile: (payload) =>
    request("/api/users/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Research Papers
  listPapers: () => request("/api/papers"),

  getPaper: (id) => request(`/api/papers/${encodeURIComponent(id)}`),

  uploadPaper: (file) => {
    const form = new FormData();
    form.append("paper", file);
    return request(
      "/api/papers/upload",
      { method: "POST", body: form },
      true
    );
  },

  deletePaper: (id) =>
    request(`/api/papers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Core Feature 1: AI Research Paper Analysis
  getPaperAnalysis: (paperId) =>
    request(`/api/ai/analyze/${encodeURIComponent(paperId)}`),

  analyzePaper: (paperId, refresh = false) =>
    request(`/api/ai/analyze/${encodeURIComponent(paperId)}`, {
      method: "POST",
      body: JSON.stringify({ refresh }),
    }),

  // Core Feature 2: AI Research Paper Summarizer
  summarizePaper: (paperId, format) =>
    request(`/api/ai/summarize/${encodeURIComponent(paperId)}`, {
      method: "POST",
      body: JSON.stringify({ format }),
    }),

  // Core Feature 3: Chat with Research Paper (RAG)
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
};
