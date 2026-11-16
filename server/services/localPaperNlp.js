const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "as", "at", "be", "because", "been", "before", "being", "below",
  "between", "both", "but", "by", "can", "could", "did", "do", "does", "doing",
  "down", "during", "each", "explain", "few", "for", "from", "further", "had",
  "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
  "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of",
  "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out",
  "over", "own", "paper", "research", "same", "she", "should", "so", "some",
  "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then",
  "there", "these", "they", "this", "those", "through", "to", "too", "under",
  "until", "up", "used", "using", "very", "was", "we", "were", "what", "when",
  "where", "which", "while", "who", "whom", "why", "will", "with", "would",
  "you", "your", "yours", "yourself", "yourselves",
]);

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/([a-z]):([A-Z])/g, "$1: $2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function splitSentences(text) {
  const cleaned = normalizeWhitespace(text).replace(/\n+/g, " ");
  const raw = cleaned.split(/(?<=[.!?])\s+(?=[A-Z0-9"(\[])/);
  return raw
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length < 35 || s.length > 520) return false;
      const alphaCount = (s.match(/[a-zA-Z]/g) || []).length;
      if (alphaCount < 20) return false;
      // Filter obvious reference/citation lines or headers
      if (/^\[\d+\]/.test(s) || /^doi:\s*/i.test(s) || /^https?:\/\//i.test(s)) {
        return false;
      }
      return true;
    });
}

function splitSections(text) {
  const lines = normalizeWhitespace(text).split("\n");
  const sections = [];
  let currentHeading = "opening";
  let buffer = [];

  const headingRegex =
    /^(?:[IVXLC\d]+(?:\.\d+)*\.?\s+)?(abstract|introduction|background|related work|literature review|problem statement|problem formulation|motivation|objectives?|proposed methodology|methodology|methods?|proposed system|proposed approach|system architecture|architecture|materials and methods|experimental setup|experiments?|dataset|implementation|results?|experimental results|evaluation|performance|discussion|advantages?|benefits?|limitations?|challenges?|threats to validity|future work|future scope|conclusions?|summary)\s*:?$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 75 && headingRegex.test(trimmed)) {
      if (buffer.length > 0) {
        sections.push({ heading: currentHeading, text: buffer.join(" ") });
      }
      currentHeading = trimmed.toLowerCase();
      buffer = [];
    } else {
      buffer.push(trimmed);
    }
  }
  if (buffer.length > 0) {
    sections.push({ heading: currentHeading, text: buffer.join(" ") });
  }
  return sections;
}

function computeWordFrequencies(sentences) {
  const freq = new Map();
  for (const s of sentences) {
    for (const w of tokenize(s)) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return freq;
}

function pickTopSentences(candidates, keywords, maxCount = 3, usedSet = new Set()) {
  if (!candidates || candidates.length === 0) return [];
  const freq = computeWordFrequencies(candidates);

  const scored = candidates
    .map((sentence, idx) => {
      if (usedSet.has(sentence)) return null;
      const words = tokenize(sentence);
      if (words.length < 5) return null;

      let kwHits = 0;
      const lower = sentence.toLowerCase();
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          kwHits += kw.includes(" ") ? 3.5 : 2.2;
        }
      }

      let freqScore = 0;
      for (const w of words) {
        freqScore += Math.min(freq.get(w) || 1, 8);
      }
      freqScore = freqScore / Math.sqrt(words.length);

      const lengthBonus = words.length >= 12 && words.length <= 42 ? 1.5 : 0;
      return {
        sentence,
        idx,
        kwHits,
        score: kwHits * 3 + freqScore * 0.35 + lengthBonus,
      };
    })
    .filter(Boolean);

  scored.sort((a, b) => b.score - a.score);

  const chosen = [];
  for (const item of scored) {
    if (chosen.length >= maxCount) break;
    // Avoid picking near-duplicate sentences
    const tokensA = new Set(tokenize(item.sentence));
    const overlaps = chosen.some((c) => {
      const tokensB = new Set(tokenize(c.sentence));
      let common = 0;
      for (const t of tokensA) if (tokensB.has(t)) common++;
      return common / Math.max(1, Math.min(tokensA.size, tokensB.size)) > 0.65;
    });
    if (!overlaps) {
      chosen.push(item);
      usedSet.add(item.sentence);
    }
  }

  chosen.sort((a, b) => a.idx - b.idx);
  return chosen.map((c) => c.sentence);
}

function collectSectionText(sections, headingPatterns) {
  const matched = sections.filter((sec) =>
    headingPatterns.some((rx) => rx.test(sec.heading))
  );
  return matched.map((m) => m.text).join(" ");
}

function formatBlock(sentences, fallbackText) {
  if (!sentences || sentences.length === 0) return fallbackText;
  return sentences.join(" ");
}

export function analyzePaperLocally(title, extractedText) {
  const cleanText = normalizeWhitespace(extractedText);
  const sections = splitSections(cleanText);
  const allSentences = splitSentences(cleanText);
  const used = new Set();

  // 1. Abstract / Overview
  const abstractSection = collectSectionText(sections, [/abstract/i, /opening/i]);
  const overviewCandidates = splitSentences(abstractSection);
  const overviewSentences = pickTopSentences(
    overviewCandidates.length >= 2 ? overviewCandidates : allSentences.slice(0, 18),
    ["propose", "paper", "present", "study", "model", "system", "approach", "investigate"],
    4,
    used
  );

  // 2. Problem Statement
  const problemSection = collectSectionText(sections, [
    /problem/i,
    /motivation/i,
    /introduction/i,
  ]);
  const problemCandidates = splitSentences(problemSection);
  const problemSentences = pickTopSentences(
    problemCandidates.length >= 2 ? problemCandidates : allSentences,
    [
      "problem",
      "challenge",
      "issue",
      "difficult",
      "lack",
      "struggle",
      "existing",
      "drawback",
      "limitation",
      "bottleneck",
      "gap",
      "however",
    ],
    3,
    used
  );

  // 3. Research Objectives
  const objSection = collectSectionText(sections, [/objective/i, /introduction/i]);
  const objCandidates = splitSentences(objSection);
  const objectiveSentences = pickTopSentences(
    objCandidates.length >= 2 ? objCandidates : allSentences,
    [
      "objective",
      "aim",
      "goal",
      "purpose",
      "propose",
      "design",
      "develop",
      "evaluate",
      "investigate",
      "determine",
      "examine",
    ],
    3,
    used
  );

  // 4. Methodology
  const methodSection = collectSectionText(sections, [
    /method/i,
    /approach/i,
    /architecture/i,
    /proposed system/i,
    /materials/i,
  ]);
  const methodCandidates = splitSentences(methodSection);
  const methodSentences = pickTopSentences(
    methodCandidates.length >= 2 ? methodCandidates : allSentences,
    [
      "method",
      "methodology",
      "proposed",
      "framework",
      "architecture",
      "pipeline",
      "workflow",
      "step",
      "phase",
      "process",
      "trained",
      "protocol",
    ],
    4,
    used
  );

  // 5. Technologies & Algorithms Used
  const techCandidates = splitSentences(
    collectSectionText(sections, [/method/i, /implementation/i, /architecture/i])
  );
  const techSentences = pickTopSentences(
    techCandidates.length >= 2 ? techCandidates : allSentences,
    [
      "algorithm",
      "neural",
      "deep learning",
      "machine learning",
      "transformer",
      "cnn",
      "lstm",
      "svm",
      "random forest",
      "regression",
      "clustering",
      "classification",
      "embedding",
      "python",
      "tensorflow",
      "pytorch",
      "vector",
      "model",
      "technique",
    ],
    3,
    used
  );

  // 6. Dataset Info
  const datasetSection = collectSectionText(sections, [
    /dataset/i,
    /experiment/i,
    /materials/i,
    /evaluation/i,
  ]);
  const datasetCandidates = splitSentences(datasetSection);
  const datasetSentences = pickTopSentences(
    datasetCandidates.length >= 2 ? datasetCandidates : allSentences,
    [
      "dataset",
      "corpus",
      "sample",
      "participant",
      "subject",
      "training set",
      "test set",
      "validation",
      "benchmark",
      "collected",
      "data",
    ],
    3,
    used
  );

  // 7. Experimental Results
  const resultsSection = collectSectionText(sections, [
    /result/i,
    /evaluation/i,
    /performance/i,
    /experiment/i,
    /discussion/i,
  ]);
  const resultsCandidates = splitSentences(resultsSection);
  const resultsSentences = pickTopSentences(
    resultsCandidates.length >= 2 ? resultsCandidates : allSentences,
    [
      "result",
      "accuracy",
      "precision",
      "recall",
      "f1",
      "score",
      "significant",
      "outperform",
      "improve",
      "achieve",
      "compared",
      "%",
      "table",
      "p <",
      "increase",
      "decrease",
    ],
    4,
    used
  );

  // 8. Advantages
  const advCandidates = resultsCandidates.length >= 2 ? resultsCandidates : allSentences;
  const advantageSentences = pickTopSentences(
    advCandidates,
    [
      "advantage",
      "benefit",
      "effective",
      "efficient",
      "outperform",
      "superior",
      "scalable",
      "robust",
      "improve",
      "faster",
      "higher accuracy",
      "reduce",
    ],
    3,
    used
  );

  // 9. Limitations
  const limitSection = collectSectionText(sections, [
    /limitation/i,
    /challenge/i,
    /threats/i,
    /discussion/i,
    /conclusion/i,
  ]);
  const limitCandidates = splitSentences(limitSection);
  const limitationSentences = pickTopSentences(
    limitCandidates.length >= 2 ? limitCandidates : allSentences,
    [
      "limitation",
      "limit",
      "drawback",
      "constraint",
      "however",
      "small sample",
      "not address",
      "cannot",
      "fail",
      "overhead",
      "bias",
      "threat",
    ],
    3,
    used
  );

  // 10. Future Scope
  const futureSection = collectSectionText(sections, [
    /future/i,
    /conclusion/i,
    /discussion/i,
  ]);
  const futureCandidates = splitSentences(futureSection);
  const futureSentences = pickTopSentences(
    futureCandidates.length >= 2 ? futureCandidates : allSentences.slice(-25),
    [
      "future",
      "further",
      "extend",
      "next",
      "recommendation",
      "direction",
      "plan",
      "explore",
      "larger",
      "will be",
    ],
    3,
    used
  );

  // 11. Conclusion
  const concSection = collectSectionText(sections, [/conclusion/i, /summary/i]);
  const concCandidates = splitSentences(concSection);
  const conclusionSentences = pickTopSentences(
    concCandidates.length >= 2 ? concCandidates : allSentences.slice(-20),
    [
      "conclude",
      "conclusion",
      "summary",
      "demonstrate",
      "findings",
      "confirm",
      "overall",
      "showed",
      "indicate",
    ],
    3,
    used
  );

  return {
    overview: formatBlock(
      overviewSentences,
      `Paper "${title}" spans ${allSentences.length} extracted sentences from the uploaded PDF.`
    ),
    problemStatement: formatBlock(
      problemSentences,
      "A standalone problem statement heading was not explicitly labeled in the extracted text."
    ),
    objectives: formatBlock(
      objectiveSentences,
      "Specific research objectives were not explicitly listed under a separate heading in the PDF."
    ),
    methodology: formatBlock(
      methodSentences,
      "Detailed methodology steps were not explicitly separated in the extracted PDF text."
    ),
    technologiesAndAlgorithms: formatBlock(
      techSentences,
      "No specific software tools or named algorithms were explicitly detected in the extracted PDF text."
    ),
    datasetInfo: formatBlock(
      datasetSentences,
      "Dataset specifications were not explicitly detailed in the extracted PDF text."
    ),
    results: formatBlock(
      resultsSentences,
      "Quantitative experimental results were not explicitly detected in the extracted PDF text."
    ),
    advantages: formatBlock(
      advantageSentences,
      "Explicit advantages were not separately listed in the extracted PDF text."
    ),
    limitations: formatBlock(
      limitationSentences,
      "The paper does not explicitly list limitations under a dedicated section in the extracted text."
    ),
    futureScope: formatBlock(
      futureSentences,
      "Future research directions were not explicitly detailed in the extracted PDF text."
    ),
    conclusion: formatBlock(
      conclusionSentences,
      "A dedicated conclusion paragraph was not explicitly detected in the extracted PDF text."
    ),
  };
}

export function summarizePaperLocally(title, extractedText, format) {
  const cleanText = normalizeWhitespace(extractedText);
  const allSentences = splitSentences(cleanText);

  if (format === "short") {
    const freq = computeWordFrequencies(allSentences);
    const total = Math.max(1, allSentences.length);
    const signalWords = [
      "propose",
      "paper",
      "study",
      "method",
      "algorithm",
      "model",
      "dataset",
      "result",
      "accuracy",
      "conclude",
      "show",
      "significant",
      "improve",
    ];

    const ranked = allSentences
      .map((s, idx) => {
        const words = tokenize(s);
        if (words.length < 7) return null;
        let score = 0;
        for (const w of words) score += Math.min(freq.get(w) || 1, 6);
        score = score / Math.sqrt(words.length);

        const lower = s.toLowerCase();
        for (const sig of signalWords) {
          if (lower.includes(sig)) score += 2.2;
        }
        // Boost opening (abstract/intro) and closing (conclusion)
        const pos = idx / total;
        if (pos < 0.22 || pos > 0.8) score += 2.0;

        return { sentence: s, idx, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const selected = [];
    let wordCount = 0;

    for (const item of ranked) {
      const wordsInSentence = item.sentence.split(/\s+/).length;
      if (wordCount >= 165 && wordCount + wordsInSentence > 205) break;
      if (wordCount + wordsInSentence > 215 && selected.length >= 3) continue;

      const tokensA = new Set(tokenize(item.sentence));
      const dup = selected.some((s) => {
        const tokensB = new Set(tokenize(s.sentence));
        let common = 0;
        for (const t of tokensA) if (tokensB.has(t)) common++;
        return common / Math.max(1, Math.min(tokensA.size, tokensB.size)) > 0.6;
      });
      if (dup) continue;

      selected.push(item);
      wordCount += wordsInSentence;
      if (wordCount >= 185) break;
    }

    selected.sort((a, b) => a.idx - b.idx);
    const summaryText =
      selected.map((s) => s.sentence).join(" ").trim() ||
      `Summary of "${title}": ${cleanText.slice(0, 900)}`;

    return {
      format: "short",
      summaryText,
      wordCount: summaryText ? summaryText.split(/\s+/).length : 0,
    };
  }

  // Detailed summary covering problem, objectives, methodology, results, conclusion
  const analysis = analyzePaperLocally(title, cleanText);
  return {
    format: "detailed",
    researchProblem: analysis.problemStatement,
    objectives: analysis.objectives,
    methodology: analysis.methodology,
    results: analysis.results,
    conclusion: analysis.conclusion,
  };
}

const QUESTION_INTENT_EXPANSIONS = [
  {
    trigger: /\b(objective|objectives|goal|goals|aim|aims|purpose)\b/i,
    cues: [
      "objective",
      "aim",
      "aims",
      "goal",
      "purpose",
      "investigate",
      "propose",
      "determine",
      "examine",
      "evaluate",
      "assess",
      "effect",
    ],
  },
  {
    trigger: /\b(algorithm|algorithms|technique|techniques|model|models|technology|technologies)\b/i,
    cues: [
      "algorithm",
      "model",
      "neural",
      "learning",
      "method",
      "architecture",
      "classifier",
      "regression",
      "vector",
      "framework",
      "protocol",
    ],
  },
  {
    trigger: /\b(problem|issue|solve|challenge|challenges)\b/i,
    cues: [
      "problem",
      "challenge",
      "issue",
      "solve",
      "address",
      "limitation",
      "existing",
      "lack",
      "effect",
    ],
  },
  {
    trigger: /\b(methodology|method|methods|approach|workflow|procedure)\b/i,
    cues: [
      "method",
      "methodology",
      "approach",
      "proposed",
      "step",
      "process",
      "framework",
      "experiment",
      "protocol",
      "measured",
      "performed",
      "participated",
    ],
  },
  {
    trigger: /\b(limitation|limitations|drawback|drawbacks|weakness|constraint)\b/i,
    cues: [
      "limitation",
      "drawback",
      "constraint",
      "however",
      "challenge",
      "small",
      "bias",
      "cannot",
      "further",
    ],
  },
  {
    trigger: /\b(future|scope|next|further)\b/i,
    cues: ["future", "scope", "further", "extend", "direction", "recommend", "plan"],
  },
  {
    trigger: /\b(result|results|accuracy|performance|metric|finding|findings|dataset)\b/i,
    cues: [
      "result",
      "results",
      "accuracy",
      "performance",
      "finding",
      "findings",
      "significant",
      "dataset",
      "table",
      "score",
      "increased",
      "decreased",
      "%",
    ],
  },
];

function getIntentCues(question) {
  const cues = [];
  for (const rule of QUESTION_INTENT_EXPANSIONS) {
    if (rule.trigger.test(question)) {
      cues.push(...rule.cues);
    }
  }
  return Array.from(new Set(cues));
}

export function rankChunksLocally(question, chunks, topK = 5) {
  const queryTerms = tokenize(question);
  const intentCues = getIntentCues(question);
  const allCues = Array.from(new Set([...queryTerms, ...intentCues]));

  if (!chunks || chunks.length === 0) return [];

  // Document frequency across chunks for IDF weighting
  const df = new Map();
  for (const ch of chunks) {
    const unique = new Set(tokenize(ch.content));
    for (const term of allCues) {
      if (unique.has(term)) df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const N = chunks.length;
  const scored = chunks.map((ch) => {
    const lower = String(ch.content || "").toLowerCase();
    const tokens = tokenize(lower);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const count = tf.get(term) || 0;
      if (count > 0) {
        const idf = Math.log(1 + N / (1 + (df.get(term) || 0)));
        score += (1 + Math.log(count)) * idf * 2.0;
      } else if (lower.includes(term)) {
        score += 1.0;
      }
    }

    for (const cue of intentCues) {
      if (tf.has(cue) || lower.includes(cue)) {
        score += 0.65;
      }
    }

    // Normalize into a clean [0, 1] similarity-like score
    const normalizedScore = score > 0 ? Math.min(0.99, score / (score + 6)) : 0;

    return {
      chunkIndex: ch.chunkIndex,
      pageEstimate: ch.pageEstimate || 1,
      content: ch.content,
      charStart: ch.charStart,
      charEnd: ch.charEnd,
      score: normalizedScore,
    };
  });

  scored.sort((a, b) => b.score - a.score || a.chunkIndex - b.chunkIndex);
  return scored.slice(0, topK);
}

export function answerQuestionLocally(question, _paperTitle, chunks) {
  if (!chunks || chunks.length === 0) {
    return "This information was not found in the uploaded document.";
  }

  const queryTerms = tokenize(question);
  const intentCues = getIntentCues(question);

  const sentenceMatches = [];
  for (const chunk of chunks) {
    const sentences = splitSentences(chunk.content);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const sTokens = new Set(tokenize(lower));

      let directHits = 0;
      for (const qt of queryTerms) {
        if (sTokens.has(qt) || lower.includes(qt)) directHits++;
      }

      let cueHits = 0;
      for (const cue of intentCues) {
        if (sTokens.has(cue) || lower.includes(cue)) cueHits++;
      }

      const relevance = directHits * 3 + cueHits * 1.4 + (chunk.score || 0) * 2;
      if (directHits > 0 || (intentCues.length > 0 && cueHits >= 1)) {
        sentenceMatches.push({
          sentence,
          chunkIndex: chunk.chunkIndex,
          pageEstimate: chunk.pageEstimate || 1,
          directHits,
          cueHits,
          relevance,
        });
      }
    }
  }

  if (sentenceMatches.length === 0) {
    return "This information was not found in the uploaded document. Try rephrasing your question using keywords or section terms present in the paper.";
  }

  sentenceMatches.sort((a, b) => b.relevance - a.relevance);

  // Require at least one genuine query-term match unless an explicit research-section intent matched
  const best = sentenceMatches[0];
  if (queryTerms.length > 0 && best.directHits === 0 && best.cueHits === 0) {
    return "This information was not found in the uploaded document. The uploaded paper does not appear to contain matching terms for this query.";
  }

  const picked = [];
  for (const match of sentenceMatches) {
    if (picked.length >= 3) break;
    const dup = picked.some((p) => p.sentence === match.sentence);
    if (!dup) picked.push(match);
  }

  return picked
    .map(
      (m) => `${m.sentence} [Chunk ${m.chunkIndex + 1}, ~Page ${m.pageEstimate}]`
    )
    .join("\n\n");
}
