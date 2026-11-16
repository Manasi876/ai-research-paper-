# AI Research Paper Analyzer

An AI-powered full-stack web application built for B.Tech CSE minor projects to help students and researchers upload academic research papers (PDF), extract structured technical breakdowns, generate plain-English summaries, and ask grounded questions via Retrieval-Augmented Generation (RAG).

## Core Features

1. **AI Research Paper Analysis**
   - Upload PDF files with drag-and-drop validation (`pdf-parse` + `multer`).
   - Extracts paper title, abstract, authors, problem statement, research objectives, methodology, algorithms and technologies used, experimental results, advantages, limitations, conclusion, and future scope.
   - Supports one-click section copy and Markdown (`.md`) download.

2. **AI Research Paper Summarizer**
   - **Short Summary**: Clear explanation in ~150–200 words using simple English.
   - **Detailed Summary**: Structured breakdown covering research problem, objectives, methodology, experimental results, and conclusion.
   - Supports copy and `.txt` export.

3. **Chat with Research Paper (RAG)**
   - Splits extracted text into overlapping chunks, generates 768-dimensional embeddings (`gemini-embedding-2`), and retrieves the top matching chunks via cosine similarity search.
   - Answers strictly from retrieved excerpts with inline chunk/page citations and an explicit fallback when information is not in the uploaded PDF.

## Website Pages

1. **Landing Page** — Overview, 3 core features, workflow, tech stack, Login & Register links.
2. **Authentication Page** — User registration & login (`bcryptjs` + `JWT`) with protected routes.
3. **Dashboard** — Welcome banner, upload shortcut, paper/analysis/chunk metrics, quick access to the 3 core tools, and recent papers.
4. **Research Paper Analyzer** — PDF upload dropzone and 10-section structured analysis viewer.
5. **Research Paper Summarizer** — Short and Detailed summary generator.
6. **Chat with PDF** — Grounded RAG Q&A with suggested questions, conversation history, and expandable source excerpts.
7. **My Papers** — Searchable list of uploaded PDFs with upload date, analysis status, View/Summarize/Chat actions, and delete confirmation.

## Folder Structure

```text
├── api/
│   └── index.js                # Vercel serverless Express handler
├── server/
│   ├── app.js                  # Shared Express app, CORS, rate limiting, error handler
│   ├── config/
│   │   └── db.js               # MongoDB Mongoose connection + local JSON fallback
│   ├── controllers/
│   │   ├── aiController.js     # Analysis, summarization, and RAG chat handlers
│   │   ├── authController.js   # Register, login, and current user handlers
│   │   └── paperController.js  # PDF upload, chunking, listing, and delete handlers
│   ├── middleware/
│   │   └── auth.js             # JWT verification and password hashing utilities
│   ├── models/
│   │   ├── Conversation.js     # Chat thread & grounded source chunk schema
│   │   ├── Paper.js            # Paper metadata, chunks, and 768-d embeddings schema
│   │   ├── PaperAnalysis.js    # Saved structured paper analysis schema
│   │   └── User.js             # User account schema
│   ├── routes/
│   │   ├── ai.js
│   │   ├── auth.js
│   │   ├── papers.js
│   │   └── users.js
│   └── services/
│       ├── chunker.js          # PDF text extraction & overlapping chunk splitter
│       ├── dataStore.js        # MongoDB + local JSON store abstraction
│       └── geminiService.js    # @google/genai client, embeddings, analysis & RAG
├── src/
│   ├── components/
│   │   └── AppShell.jsx        # Responsive sidebar, header, back button, theme toggle
│   ├── context/
│   │   ├── AuthContext.jsx     # Session & theme persistence
│   │   └── ToastContext.jsx    # Toast notifications
│   ├── pages/
│   │   ├── AuthPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── LandingPage.jsx
│   │   ├── MyPapersPage.jsx
│   │   ├── PaperAnalyzerPage.jsx
│   │   ├── PaperChatPage.jsx
│   │   └── SummarizerPage.jsx
│   ├── services/
│   │   └── api.js              # Fetch wrapper with Bearer JWT handling
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── server.js                   # Local Node + Vite dev/prod server (port 3000)
├── vercel.json                 # Vercel rewrite rules for /api and SPA fallback
└── .env.example
```

## API Endpoints

- `GET /api/health` — Database mode & Gemini API configuration status
- `POST /api/auth/register` / `POST /api/auth/login` / `GET /api/auth/me`
- `GET /api/papers` / `GET /api/papers/:id` / `POST /api/papers/upload` / `DELETE /api/papers/:id`
- `GET /api/ai/analyze/:paperId` / `POST /api/ai/analyze/:paperId`
- `POST /api/ai/summarize/:paperId`
- `GET /api/ai/chat/:paperId` / `POST /api/ai/chat/:paperId` / `DELETE /api/ai/chat/:paperId/:conversationId`

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```
   *(If `MONGODB_URI` is omitted locally, the app falls back to local JSON storage for development.)*
3. Run the full-stack server on `http://localhost:3000`:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Deploying to Vercel

1. Set `GEMINI_API_KEY`, `MONGODB_URI`, and `JWT_SECRET` in Vercel Project Settings -> Environment Variables.
2. Deploy from Git or with `vercel --prod`. `vercel.json` automatically routes `/api/*` requests to `api/index.js` and serves the built React app for all other routes.
