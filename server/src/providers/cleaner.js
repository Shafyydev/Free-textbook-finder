// Query cleaning for store-style titles.
// Strips edition, binding, year and ISBN noise so providers and the relevance
// scorer search against the real title. Detects and preserves any ISBN so the
// caller can run an isbn: lookup.
export const EDITION_MARKERS = [
  /\b(4th|4ed|4e|fourth edition)\b/gi,
  /\b(3rd|3ed|3e|third edition)\b/gi,
  /\b(2nd|2ed|2e|second edition)\b/gi,
  /\b(1st|1ed|1e|first edition)\b/gi,
  /\b(5th|5ed|5e|fifth edition)\b/gi,
  /\b(6th|6ed|6e|sixth edition)\b/gi,
  /\b(7th|7ed|7e|seventh edition)\b/gi,
  /\b(8th|8ed|8e|eighth edition)\b/gi,
  /\b(9th|9ed|9e|ninth edition)\b/gi,
  /\b(10th|tenth edition)\b/gi,
  /\b(revised|latest|new)\b/gi
];

export const BINDING_WORDS = [
  /\bpb\b/gi, /\bhb\b/gi, /\bpaperback\b/gi, /\bhardcover\b/gi, /\bebook\b/gi
];

// ISBN-13 (13 digits) or ISBN-10 (9 digits + digit/X), as standalone tokens.
// ISBN-13 is checked first so a 13-digit ISBN isn't truncated to 10 digits.
const ISBN_LIKE = /\b\d{13}\b|\b\d{9}[\dXx](?!\d)\b/;

// Years 1900-2100.
const YEAR_LIKE = /\b(19\d\d|20\d\d|2100)\b/;

// Bracketed text: parentheses, square brackets, curly braces.
const BRACKETS = /\([^)]*\)|\[[^]]*\]|\{[^}]*\}/g;

export function extractIsbn(query) {
  if (!query) return null;
  const match = query.match(ISBN_LIKE);
  if (!match) return null;
  return match[0].replace(/[-/\s]/g, '').toUpperCase();
}

// Returns { cleanedQuery, isbn }. The ISBN is extracted before numeric tokens
// are stripped so it is preserved for isbn: lookups.
export function cleanQuery(query) {
  if (!query) return { cleanedQuery: '', isbn: null };
  let cleaned = query;
  const isbn = extractIsbn(cleaned);

  // Remove bracketed text (e.g. "(Pb 2025)", "[Revised]")
  cleaned = cleaned.replace(BRACKETS, ' ');
  // Remove edition markers
  for (const re of EDITION_MARKERS) cleaned = cleaned.replace(re, ' ');
  // Remove binding words
  for (const re of BINDING_WORDS) cleaned = cleaned.replace(re, ' ');
  // Remove years 1900-2100
  cleaned = cleaned.replace(YEAR_LIKE, ' ');
  // Remove any remaining ISBN-like numbers
  cleaned = cleaned.replace(ISBN_LIKE, ' ');
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return { cleanedQuery: cleaned, isbn };
}
