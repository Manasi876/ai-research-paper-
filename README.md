# AI in Research Paper — Intelligent Research Paper Assistant

A full-stack, AI-powered academic research SaaS platform built with **JavaScript (ES Modules)**, **React + Vite + Tailwind CSS**, **Node.js + Express**, **MongoDB (Mongoose)**, and **Google Gemini (`@google/genai`)**.

## Core Features

1. **JWT Authentication & User Isolation**: Register, login, bcrypt password hashing, profile management, Light/Dark mode, and user-isolated documents.
2. **Research Dashboard**: KPI counters, 7-day research activity chart (`Recharts`), quick AI tools, recent papers, project overview, and activity timeline.
3. **AI Research Paper Analyzer**: Drag-and-drop PDF upload (`multer` + `pdf-parse`), metadata extraction, and structured 11-section breakdown with Copy & Markdown export.
4. **Chat with Research Paper (RAG)**: Chunked 768-d Gemini embeddings, MongoDB Atlas `$vectorSearch` (with cosine fallback), multiple conversations per paper, suggested questions, and cited source chunks with estimated page numbers.
5. **Smart Summarizer**: Short, Medium, and Detailed structured summaries with copy and `.txt` export.
6. **Research Paper Comparison**: Select 2–5 uploaded papers for a multi-dimension comparison matrix, overall synthesis, similarities, and differences.
7. **Research Gap Finder**: Identifies limitations, unsolved problems, dataset gaps, and >=5 evidence-backed research ideas explicitly labeled as hypotheses requiring verification.
8. **AI Question & Quiz Generator**: Generates MCQs, Technical, Viva, Short, and Long questions (Easy/Medium/Hard) with interactive Practice Quiz Mode and scoring.
9. **Citation Generator**: Formats IEEE, APA, and MLA citations strictly from verified metadata and flags missing fields for manual verification.
10. **Research Paper Finder**: Live search across **Semantic Scholar** and **Crossref** APIs with Open-Access PDF vs. Access-Required indicators and library saving.
11. **My Research Library**: Research project folders CRUD, search, date/bookmark filters, saved discovery papers, and AI generation history downloads.
12. **Presentation Generator**: Generates a 10-slide academic deck outline and exports a real `.pptx` PowerPoint file via `pptxgenjs`.

## Project Structure

```text
├── server.js                          # Express entry point (port 3000)
├── server/
│   ├── atlas-vector-index.json        # MongoDB Atlas Vector Search definition
│   ├── config/db.js                   # Mongoose connection + local JSON fallback
│   ├── middleware/auth.js             # JWT + bcrypt authentication middleware
│   ├── models/                        # Mongoose schemas (User, Paper, Chunk, etc.)
│   ├── routes/                        # auth, users, papers, ai, research, projects, dashboard
│   └── services/                      # chunker, geminiService, citationService, researchDiscovery, dataStore
└── src/
    ├── components/AppShell.jsx        # Responsive SaaS sidebar, Back button & top bar
    ├── context/                       # AuthContext & ToastContext
    ├── pages/                         # Auth + 12 research workspace pages
    └── services/api.js                # Authenticated REST API client
```

## Installation & Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your environment file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Configure:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `MONGODB_URI`: Your MongoDB Atlas URI (if left blank, the server automatically uses local JSON persistence in `data/store.json`)
   - `JWT_SECRET`: A strong secret string for signing JWTs

3. *(Optional for MongoDB Atlas Vector Search)* Create the search index on the `chunks` collection using `server/atlas-vector-index.json`.

4. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

5. Production build & run:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```
