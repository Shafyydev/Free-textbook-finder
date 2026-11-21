// Relevance scoring for search results
// Per SPEC.md: score every result against the query after normalizing both
// (lowercase, remove punctuation and possessives, singular/plural treated
// the same, stop words ignored). Show a result only if at least 70 percent
// of the important query words appear in its title or authors.
// Typo tolerance: edit distance 1 for words 4-7 letters, 2 for longer words.

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
    .replace(/[^\w]/g, ''); // remove remaining punctuation
}

export function extractQueryWords(query) {
  return query
    .split(/\s+/)
    .map(w => normalizeWord(w))
    .filter(w => w.length > 0 && !STOP_WORDS.has(w));
}

// Edit distance (Levenshtein) between two strings
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) dp[i] = [i];
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + 1   // substitution
        );
      }
    }
  }
  return dp[m][n];
}

// Check if a query word matches a text word with typo tolerance:
// - Words < 4 letters: exact match only
// - Words 4-7 letters: edit distance <= 1
// - Words 8+ letters: edit distance <= 2
export function wordMatches(queryWord, textWord) {
  if (queryWord === textWord) return true;
  const qLen = queryWord.length;
  if (qLen < 4) return false; // too short for fuzzy matching
  const maxDist = qLen <= 7 ? 1 : 2;
  return editDistance(queryWord, textWord) <= maxDist;
}

export function scoreResult(queryWords, title, authors = []) {
  const authorsArray = Array.isArray(authors) ? authors : [authors];
  const text = `${title} ${authorsArray.join(' ')}`.toLowerCase();
  const textWords = text
    .split(/\s+/)
    .map(w => normalizeWord(w))
    .filter(w => w.length > 0);
  let matched = 0;
  for (const qw of queryWords) {
    if (textWords.some(tw => wordMatches(qw, tw))) {
      matched++;
    }
  }
  const score = matched / Math.max(1, queryWords.length);
  return { matched, total: queryWords.length, score };
}

export function passesRelevance(queryWords, title, authors = []) {
  if (queryWords.length === 0) return { pass: true, score: 1.0 };
  const result = scoreResult(queryWords, title, authors);
  return { pass: result.score >= 0.7, score: result.score };
}
