import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-2";
const LLM_MODEL = "gemini-4-hydrogen";
const EMBEDDING_DIMENSIONS = 768;

let cachedClient = null;
let cachedApiKey = null;

function getGeminiApiKey() {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];
  for (const raw of candidates) {
    const key = typeof raw === "string" ? raw.trim() : "";
    if (key && key !== "MY_GEMINI_API_KEY") {
      return key;
    }
  }
  return null;
}

export function hasGeminiApiKey() {
  return Boolean(getGeminiApiKey());
}

export function buildLocalEmbedding(text, dimensions = EMBEDDING_DIMENSIONS) {
  const vec = new Float64Array(dimensions);
  const tokens = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  for (let i = 0; i < tokens.length; i++) {
    const terms = i + 1 < tokens.length ? [tokens[i], `${tokens[i]}_${tokens[i + 1]}`] : [tokens[i]];
    for (const term of terms) {
      let hash = 2166136261;
      for (let c = 0; c < term.length; c++) {
        hash ^= term.charCodeAt(c);
        hash = Math.imul(hash, 16777619);
      }
      const idx = (hash >>> 0) % dimensions;
      const sign = (hash & 1) === 0 ? 1 : -1;
      vec[idx] += sign;
    }
  }

  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm) || 1;

  const out = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    out[i] = vec[i] / norm;
  }
  return out;
}

export function extractLocalMetadata(fallbackTitle, text) {
  const header = String(text || "").slice(0, 6000);
  const lines = header
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let title = fallbackTitle;
  const looksLikeFilename =
    !fallbackTitle ||
    /^[a-z0-9_-]+$/i.test(fallbackTitle) ||
    fallbackTitle.length < 6;
  if (looksLikeFilename) {
    const candidate = lines.find(
      (l) =>
        l.length >= 10 &&
        l.length <= 180 &&
        !/^(abstract|keywords|index terms|arxiv:|http|doi:|volume|issue|issn)/i.test(l)
    );
    if (candidate) title = candidate;
  }

  let abstract = "";
  const absMatch = header.match(
    /(?:^|\n)\s*abstract[:.\s—–-]*\n?([\s\S]{40,1800}?)(?=\n\s*(?:keywords|index terms|1\.?\s+introduction|introduction)\b)/i
  );
  if (absMatch?.[1]) {
    abstract = absMatch[1].replace(/\s+/g, " ").trim();
  }

  let keywords = [];
  const kwMatch = header.match(
    /(?:^|\n)\s*(?:keywords|index terms)[:.\s—–-]+([^\n]{3,300})/i
  );
  if (kwMatch?.[1]) {
    keywords = kwMatch[1]
      .split(/[,;·•]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 1 && k.length <= 60)
      .slice(0, 10);
  }

  let publicationYear = "";
  const yearMatch = header.slice(0, 2500).match(/\b(199\d|20[0-2]\d)\b/);
  if (yearMatch?.[1]) {
    publicationYear = yearMatch[1];
  }

  return {
    title: title || fallbackTitle,
    authors: [],
    abstract,
    keywords,
    publicationYear,
  };
}

function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets, Vercel Environment Variables, or .env."
    );
  }
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return cachedClient;
}

async function withRetry(fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isTransient =
        message.includes("429") ||
        message.includes("503") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("UNAVAILABLE");
      if (!isTransient || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = 600 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function sampleDocumentText(text, maxChars = 28000) {
  if (text.length <= maxChars) return text;
  const head = Math.floor(maxChars * 0.45);
  const mid = Math.floor(maxChars * 0.25);
  const tail = maxChars - head - mid;
  const midStart = Math.floor(text.length / 2 - mid / 2);
  return [
    text.slice(0, head),
    "\n\n[... MIDDLE SECTION EXCERPT ...]\n\n",
    text.slice(midStart, midStart + mid),
    "\n\n[... CONCLUSION / LATTER SECTION EXCERPT ...]\n\n",
    text.slice(text.length - tail),
  ].join("");
}

export async function embedText(text) {
  const ai = getGeminiClient();
  const response = await withRetry(() =>
    ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    })
  );
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini embedding API returned an empty vector.");
  }
  return values;
}

export async function embedBatch(texts) {
  const results = new Array(texts.length);
  const concurrency = 5;
  for (let i = 0; i < texts.length; i += concurrency) {
    const slice = texts.slice(i, i + concurrency);
    const embeddings = await Promise.all(slice.map((t) => embedText(t)));
    for (let j = 0; j < embeddings.length; j++) {
      results[i + j] = embeddings[j];
    }
  }
  return results;
}

export async function extractBibliographicMetadata(fallbackTitle, text) {
  const ai = getGeminiClient();
  const headerSample = text.slice(0, 6500);

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: LLM_MODEL,
      contents: `Extract bibliographic metadata strictly from the beginning of this research paper text. If any field (authors, abstract, keywords, publicationYear) is NOT explicitly written in the text, return an empty string or empty array—NEVER guess or fabricate authors, years, or details.\n\nFallback title: ${fallbackTitle}\n\nPaper Opening Text:\n${headerSample}`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            authors: { type: Type.ARRAY, items: { type: Type.STRING } },
            abstract: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            publicationYear: { type: Type.STRING },
          },
          required: ["title", "authors", "abstract", "keywords", "publicationYear"],
        },
      },
    })
  );

  try {
    const parsed = JSON.parse(response.text || "{}");
    return {
      title: parsed.title?.trim() || fallbackTitle,
      authors: Array.isArray(parsed.authors) ? parsed.authors.filter(Boolean) : [],
      abstract: parsed.abstract?.trim() || "",
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter(Boolean) : [],
      publicationYear: parsed.publicationYear?.trim() || "",
    };
  } catch {
    return {
      title: fallbackTitle,
      authors: [],
      abstract: "",
      keywords: [],
      publicationYear: "",
    };
  }
}

export async function analyzeResearchPaper(title, extractedText) {
  const ai = getGeminiClient();
  const sample = sampleDocumentText(extractedText, 30000);

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: LLM_MODEL,
      contents: `Analyze the following research paper strictly based on its text. If a specific detail (such as dataset information or limitations) is not mentioned in the provided text, clearly state that it is not specified in the paper rather than inventing facts.\n\nPaper Title: ${title}\n\nPaper Text:\n${sample}`,
      config: {
        systemInstruction:
          "You are a rigorous academic research analyst. Produce clear, structured, factual analyses grounded strictly in the provided document text.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: { type: Type.STRING },
            problemStatement: { type: Type.STRING },
            objectives: { type: Type.STRING },
            methodology: { type: Type.STRING },
            technologiesAndAlgorithms: { type: Type.STRING },
            datasetInfo: { type: Type.STRING },
            results: { type: Type.STRING },
            advantages: { type: Type.STRING },
            limitations: { type: Type.STRING },
            futureScope: { type: Type.STRING },
            conclusion: { type: Type.STRING },
          },
          required: [
            "overview",
            "problemStatement",
            "objectives",
            "methodology",
            "technologiesAndAlgorithms",
            "datasetInfo",
            "results",
            "advantages",
            "limitations",
            "futureScope",
            "conclusion",
          ],
        },
      },
    })
  );

  return JSON.parse(response.text || "{}");
}

export async function summarizeResearchPaper(title, extractedText, format) {
  const ai = getGeminiClient();
  const sample = sampleDocumentText(extractedText, 28000);

  const lengthGuidance =
    format === "short"
      ? "Keep each field concise (1-2 crisp sentences)."
      : format === "medium"
      ? "Provide balanced paragraph explanations (3-4 sentences per field)."
      : "Provide thorough, detailed academic explanations (5-7 sentences per field with technical specifics from the text).";

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: LLM_MODEL,
      contents: `Summarize this research paper strictly from the provided text. ${lengthGuidance}\n\nPaper Title: ${title}\n\nPaper Text:\n${sample}`,
      config: {
        systemInstruction:
          "You are an academic summarizer. Never invent results, datasets, or conclusions not present in the paper.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainIdea: { type: Type.STRING },
            researchProblem: { type: Type.STRING },
            proposedSolution: { type: Type.STRING },
            methodology: { type: Type.STRING },
            importantFindings: { type: Type.STRING },
            conclusion: { type: Type.STRING },
          },
          required: [
            "mainIdea",
            "researchProblem",
            "proposedSolution",
            "methodology",
            "importantFindings",
            "conclusion",
          ],
        },
      },
    })
  );

  return JSON.parse(response.text || "{}");
}

export async function answerRagQuestion(
  question,
  paperTitle,
  chunks,
  recentHistory = []
) {
  if (chunks.length === 0) {
    return "This information was not found in the uploaded document.";
  }

  const ai = getGeminiClient();
  const contextBlock = chunks
    .map((c) => `[Chunk ${c.chunkIndex + 1}, ~Page ${c.pageEstimate}]\n${c.content}`)
    .join("\n\n---\n\n");

  const historyBlock =
    recentHistory.length > 0
      ? `Recent Conversation Context:\n${recentHistory
          .slice(-4)
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n")}\n\n`
      : "";

  const systemInstruction = [
    "You are an intelligent research paper assistant.",
    "Answer the user's question STRICTLY and EXCLUSIVELY from the provided document excerpts.",
    "Do NOT use outside knowledge or extrapolate beyond the uploaded document.",
    "Cite supporting excerpts inline like [Chunk 2, ~Page 4].",
    'If the retrieved excerpts do not contain the answer, respond explicitly: "This information was not found in the uploaded document." followed by one brief sentence noting what is missing.',
  ].join(" ");

  const prompt = `${historyBlock}Paper Title: ${paperTitle}\n\nRetrieved Document Excerpts:\n${contextBlock}\n\nUser Question: ${question}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: LLM_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    })
  );

  return (
    response.text?.trim() || "This information was not found in the uploaded document."
  );
}

export async function compareResearchPapers(papers) {
  const ai = getGeminiClient();
  const perPaperLimit = Math.max(6000, Math.floor(28000 / papers.length));

  const paperBlocks = papers
    .map(
      (p, idx) =>
        `=== PAPER ${idx + 1} (id: ${p.id}) ===\nTitle: ${p.title}\nExcerpt:\n${sampleDocumentText(
          p.text,
          perPaperLimit
        )}`
    )
    .join("\n\n");

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: LLM_MODEL,
      contents: `Compare the following ${papers.length} research papers across every required dimension strictly using the provided excerpts. Preserve the exact paperId for each paper. If a field is not stated in a paper, write "Not specified in paper."\n\n${paperBlocks}`,
      config: {
        systemInstruction:
          "You are a comparative literature analyst. Never invent metrics, datasets, or findings.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            papers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  paperId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  objectives: { type: Type.STRING },
                  problemAddressed: { type: Type.STRING },
                  methodology: { type: Type.STRING },
                  algorithms: { type: Type.STRING },
                  datasets: { type: Type.STRING },
                  experimentalResults: { type: Type.STRING },
                  advantages: { type: Type.STRING },
                  limitations: { type: Type.STRING },
                  futureDirections: { type: Type.STRING },
                },
                required: [
                  "paperId",
                  "title",
                  "objectives",
                  "problemAddressed",
                  "methodology",
                  "algorithms",
                  "datasets",
                  "experimentalResults",
                  "advantages",
                  "limitations",
                  "futureDirections",
                ],
              },
            },
            overallComparison: { type: Type.STRING },
            keySimilarities: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyDifferences: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["papers", "overallComparison", "keySimilarities", "keyDifferences"],
        },
      },
    })
  );

  return JSON.parse(response.text || "{}");
}

export async function findResearchGaps(papers) {
  const ai = getGeminiClient();
  const perPaperLimit = Math.max(6000, Math.floor(28000 / papers.length));

  const paperBlocks = papers
    .map(
      (p, idx) =>
        `=== PAPER ${idx + 1}: ${p.title} ===\n${sampleDocumentText(p.text, perPaperLimit)}`
    )
    .join("\n\n");

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: LLM_MODEL,
      contents: `Analyze the following research paper(s) to identify concrete research gaps and propose at least 5 potential research ideas. For EVERY suggested research idea, explicitly cite the supporting limitation or evidence from a paper and label hypothesisLabel as "AI-Generated Hypothesis (Requires Verification)".\n\n${paperBlocks}`,
      config: {
        systemInstruction:
          "You are an academic research strategist. Ground every identified limitation in evidence from the uploaded papers, and explicitly mark AI-proposed research ideas as unverified hypotheses.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            existingLimitations: { type: Type.ARRAY, items: { type: Type.STRING } },
            unsolvedProblems: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingMethodologies: { type: Type.ARRAY, items: { type: Type.STRING } },
            datasetLimitations: { type: Type.ARRAY, items: { type: Type.STRING } },
            potentialImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
            unexploredDirections: { type: Type.ARRAY, items: { type: Type.STRING } },
            researchIdeas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topicTitle: { type: Type.STRING },
                  hypothesisLabel: { type: Type.STRING },
                  description: { type: Type.STRING },
                  supportingEvidence: { type: Type.STRING },
                  sourcePaperTitle: { type: Type.STRING },
                },
                required: [
                  "topicTitle",
                  "hypothesisLabel",
                  "description",
                  "supportingEvidence",
                  "sourcePaperTitle",
                ],
              },
            },
          },
          required: [
            "existingLimitations",
            "unsolvedProblems",
            "missingMethodologies",
            "datasetLimitations",
            "potentialImprovements",
            "unexploredDirections",
            "researchIdeas",
          ],
        },
      },
    })
  );

  return JSON.parse(response.text || "{}");
}

export async function generatePaperQuestions(params) {
  const ai = getGeminiClient();
  const sample = sampleDocumentText(params.text, 26000);

  const typeLabelMap = {
    mcq: "Multiple-Choice Questions (include exactly 4 distinct options in options array; correctAnswer must exactly match one option string)",
    technical:
      "Technical deep-dive questions about algorithms, architecture, or equations (leave options as [])",
    viva: "Academic defense / Viva Voce oral examination questions (leave options as [])",
    short: "Short-answer conceptual questions (leave options as [])",
    long: "Long-answer analytical essay questions (leave options as [])",
  };

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: LLM_MODEL,
      contents: `Generate exactly ${params.count} ${params.difficulty.toUpperCase()} difficulty questions of type: ${typeLabelMap[params.questionType]}.\nGround every question, answer, and explanation strictly in this research paper.\n\nPaper Title: ${params.title}\n\nPaper Text:\n${sample}`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["id", "question", "options", "correctAnswer", "explanation"],
          },
        },
      },
    })
  );

  const items = JSON.parse(response.text || "[]");
  return items.map((item, idx) => ({
    ...item,
    id: item.id || `q-${idx + 1}`,
    options: Array.isArray(item.options) ? item.options : [],
  }));
}

export async function generatePresentationOutline(title, text) {
  const ai = getGeminiClient();
  const sample = sampleDocumentText(text, 26000);

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: LLM_MODEL,
      contents: `Create a 10-slide academic presentation outline strictly grounded in this research paper. Follow this exact 10-slide structure:\n1. Title Slide\n2. Introduction\n3. Problem Statement\n4. Objectives\n5. Methodology\n6. System Architecture or Workflow\n7. Experimental Results\n8. Advantages and Limitations\n9. Future Scope\n10. Conclusion\n\nKeep each slide concise with 3-5 clear bullet points and helpful speaker notes.\n\nPaper Title: ${title}\n\nPaper Text:\n${sample}`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              slideNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
              speakerNotes: { type: Type.STRING },
            },
            required: ["slideNumber", "title", "bullets", "speakerNotes"],
          },
        },
      },
    })
  );

  return JSON.parse(response.text || "[]");
}
