function stripXmlTags(text) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function searchSemanticScholar(query, limit = 10) {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "paperId,title,authors,year,abstract,externalIds,url,openAccessPdf,isOpenAccess,venue,citationCount"
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data.data) ? data.data : [];

    return items
      .filter((item) => Boolean(item.title))
      .map((item) => {
        const pdfUrl = item.openAccessPdf?.url || "";
        return {
          externalId: item.paperId || item.externalIds?.DOI || item.title || "",
          title: item.title || "Untitled",
          authors: (item.authors || []).map((a) => a.name || "").filter(Boolean),
          year: item.year ? String(item.year) : "",
          abstract: item.abstract ? item.abstract.trim() : "",
          doi: item.externalIds?.DOI || "",
          url:
            item.url ||
            (item.externalIds?.DOI ? `https://doi.org/${item.externalIds.DOI}` : ""),
          openAccessPdfUrl: pdfUrl,
          isOpenAccess: Boolean(item.isOpenAccess || pdfUrl),
          venue: item.venue || "",
          citationCount:
            typeof item.citationCount === "number" ? item.citationCount : null,
          source: "semantic_scholar",
        };
      });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchCrossref(query, limit = 10) {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query", query);
  url.searchParams.set("rows", String(limit));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AI-in-Research-Paper/1.0 (mailto:research@example.edu)",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data.message?.items) ? data.message.items : [];

    return items
      .filter((item) => Array.isArray(item.title) && item.title[0])
      .map((item) => {
        const title = item.title?.[0] || "Untitled";
        const yearParts =
          item.published?.["date-parts"]?.[0] || item.issued?.["date-parts"]?.[0];
        const year = yearParts?.[0] ? String(yearParts[0]) : "";
        const pdfLink = item.link?.find((l) =>
          (l["content-type"] || "").toLowerCase().includes("pdf")
        )?.URL;

        return {
          externalId: item.DOI || title,
          title,
          authors: (item.author || [])
            .map((a) => [a.given, a.family].filter(Boolean).join(" ").trim())
            .filter(Boolean),
          year,
          abstract: item.abstract ? stripXmlTags(item.abstract) : "",
          doi: item.DOI || "",
          url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ""),
          openAccessPdfUrl: pdfLink || "",
          isOpenAccess: Boolean(pdfLink),
          venue: item["container-title"]?.[0] || "",
          citationCount:
            typeof item["is-referenced-by-count"] === "number"
              ? item["is-referenced-by-count"]
              : null,
          source: "crossref",
        };
      });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function searchScholarlyPapers(query, sourceFilter = "all") {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  if (sourceFilter === "semantic_scholar") {
    return searchSemanticScholar(cleanQuery, 12);
  }
  if (sourceFilter === "crossref") {
    return searchCrossref(cleanQuery, 12);
  }

  const [s2, cr] = await Promise.all([
    searchSemanticScholar(cleanQuery, 8),
    searchCrossref(cleanQuery, 8),
  ]);

  const seen = new Set();
  const merged = [];

  for (const paper of [...s2, ...cr]) {
    const key = (paper.doi || paper.title).toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(paper);
  }

  return merged;
}
