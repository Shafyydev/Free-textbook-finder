// Relevance scoring for search results
// Per SPEC.md: score every result against the query after normalizing both
// (lowercase, remove punctuation and possessives, singular/plural treated
// the same, stop words ignored). Show a result only if at least 70 percent
// of the important query words appear in its title or authors.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'and', 'in', 'on', 'at', 'to', 'with', 'by',
  'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'or', 'but', 'not',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'my', 'your', 'his', 'her', 'its', 'our', 'their'
]);

export function normalizeWord(word) {
  return word
    .toLowerCase()
    .replace(/['’]s$/, '')  // possessive: Cash's → cash
    .replace(/[^\w]/g, '')  // remove remaining punctuation
    .replace(/s$/, '');     // simple plural: physiotherapists → physiotherapist
}

export function extractQueryWords(query) {
  return query
    .split(/\s+/)
    .map(w => normalizeWord(w))
    .filter(w => w.length > 0 && !STOP_WORDS.has(w));
}

export function scoreResult(queryWords, title, authors = []) {
  const authorsArray = Array.isArray(authors) ? authors : [authors];
  const text = `${title} ${authorsArray.join(' ')}`.toLowerCase();
  const matched = queryWords.filter(w => text.includes(w));
  const score = matched.length / Math.max(1, queryWords.length);
  return { matched: matched.length, total: queryWords.length, score };
}

export function passesRelevance(queryWords, title, authors = []) {
  if (queryWords.length === 0) return { pass: true, score: 1.0 };
  const result = scoreResult(queryWords, title, authors);
  return { pass: result.score >= 0.7, score: result.score };
}
