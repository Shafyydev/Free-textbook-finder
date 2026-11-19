// Shared types for the search engine

export const SEARCH_STATUS = {
  FREE: 'free',
  PAID: 'paid',
  BORROW: 'borrow',
  UNKNOWN: 'unknown'
};

export const OPTION_TYPE = {
  DOWNLOAD: 'download',
  READ: 'read',
  BORROW: 'borrow',
  BUY: 'buy'
};

export class SearchResult {
  constructor({ title, authors = [], isbn = null, cover_url = null, status = SEARCH_STATUS.UNKNOWN, options = [] }) {
    this.title = title;
    this.authors = authors;
    this.isbn = isbn;
    this.cover_url = cover_url;
    this.status = status;
    this.options = options;
  }

  addOption({ source, type, url, license = null, price = null }) {
    this.options.push({ source, type, url, license, price });
  }

  hasFreeOption() {
    return this.status === SEARCH_STATUS.FREE && this.options.some(o => o.type === OPTION_TYPE.DOWNLOAD || o.type === OPTION_TYPE.READ);
  }

  hasBorrowOption() {
    return this.options.some(o => o.type === OPTION_TYPE.BORROW);
  }

  hasPaidOption() {
    return this.options.some(o => o.type === OPTION_TYPE.BUY);
  }
}

export function normalizeIsbn(isbn) {
  if (!isbn) return null;
  return isbn.replace(/[-/\s]/g, '').toUpperCase();
}

export function normalizeTitle(title) {
  if (!title) return '';
  return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function mergeResults(results) {
  const byIsbn = new Map();
  const byTitleAuthor = new Map();

  for (const result of results) {
    const key = result.isbn ? `isbn:${result.isbn}` : `title:${normalizeTitle(result.title)}|author:${result.authors.join('|').toLowerCase()}`;

    const existing = byIsbn.get(key) || byTitleAuthor.get(key);
    if (existing) {
      // Merge options
      for (const opt of result.options) {
        if (!existing.options.find(o => o.source === opt.source && o.type === opt.type && o.url === opt.url)) {
          existing.options.push(opt);
        }
      }
      // Merge authors (dedupe)
      for (const a of result.authors) {
        if (!existing.authors.includes(a)) existing.authors.push(a);
      }
      // Upgrade status: free > borrow > paid > unknown
      const statusRank = { free: 4, borrow: 3, paid: 2, unknown: 1 };
      if (statusRank[result.status] > statusRank[existing.status]) {
        existing.status = result.status;
      }
    } else {
      if (result.isbn) byIsbn.set(`isbn:${result.isbn}`, result);
      byTitleAuthor.set(key, result);
    }
  }

  // Return all unique results
  const seen = new Set();
  const merged = [];
  for (const result of results) {
    const key = result.isbn ? `isbn:${result.isbn}` : `title:${normalizeTitle(result.title)}|author:${result.authors.join('|').toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      // Find the merged version
      const mergedResult = byIsbn.get(key) || byTitleAuthor.get(key);
      merged.push(mergedResult);
    }
  }
  return merged;
}

export function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}
