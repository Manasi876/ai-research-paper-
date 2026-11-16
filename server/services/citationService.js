function formatAuthorsAPA(authors) {
  if (authors.length === 0) return "[Author(s) not detected — verify manually]";
  const formatted = authors.map((full) => {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    const initials = parts
      .slice(0, -1)
      .map((p) => `${p[0]?.toUpperCase() || ""}.`)
      .join(" ");
    return `${last}, ${initials}`;
  });
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
}

function formatAuthorsIEEE(authors) {
  if (authors.length === 0) return "[Author(s) not detected — verify manually]";
  const formatted = authors.map((full) => {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    const initials = parts
      .slice(0, -1)
      .map((p) => `${p[0]?.toUpperCase() || ""}.`)
      .join(" ");
    return `${initials} ${last}`;
  });
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  if (formatted.length > 6) return `${formatted[0]} et al.`;
  return `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`;
}

function formatAuthorsMLA(authors) {
  if (authors.length === 0) return "[Author(s) not detected — verify manually]";
  if (authors.length >= 3) {
    const parts = authors[0].trim().split(/\s+/);
    const firstFormatted =
      parts.length > 1
        ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`
        : parts[0];
    return `${firstFormatted}, et al.`;
  }
  const firstParts = authors[0].trim().split(/\s+/);
  const firstFormatted =
    firstParts.length > 1
      ? `${firstParts[firstParts.length - 1]}, ${firstParts.slice(0, -1).join(" ")}`
      : firstParts[0];
  if (authors.length === 1) return `${firstFormatted}.`;
  return `${firstFormatted}, and ${authors[1]}.`;
}

export function buildCitations(input) {
  const missingFields = [];
  if (!input.authors || input.authors.length === 0) missingFields.push("Authors");
  if (!input.publicationYear) missingFields.push("Publication Year");
  if (!input.venue) missingFields.push("Journal / Conference Venue");
  if (!input.doi) missingFields.push("DOI");

  const title = input.title?.trim() || "[Title missing]";
  const year = input.publicationYear?.trim() || "n.d.";
  const venue = input.venue?.trim() || "[Publication venue not specified — verify manually]";
  const doiPart = input.doi ? ` https://doi.org/${input.doi}` : input.url ? ` ${input.url}` : "";

  const ieeeAuthors = formatAuthorsIEEE(input.authors || []);
  const apaAuthors = formatAuthorsAPA(input.authors || []);
  const mlaAuthors = formatAuthorsMLA(input.authors || []);

  const ieee = `${ieeeAuthors}, "${title}," ${venue}, ${input.publicationYear || "[Year]"}.${doiPart}`.trim();
  const apa = `${apaAuthors} (${year}). ${title}. ${venue}.${doiPart}`.trim();
  const mla = `${mlaAuthors} "${title}." ${venue}, ${input.publicationYear || "[Year]"}.${doiPart}`.trim();

  return {
    ieee,
    apa,
    mla,
    missingFields,
    needsManualVerification: missingFields.length > 0,
  };
}
