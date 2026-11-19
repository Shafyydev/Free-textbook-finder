import { SearchResult, OPTION_TYPE } from './types.js';

export const PROVIDER_NAME = 'gutenberg';

// Project Gutenberg does not publish an official JSON API. Gutendex
// (gutendex.com) is a community-run wrapper, not an official Gutenberg
// service. Per SPEC.md, sources with no official API or that forbid
// automated access must be skipped. This provider is intentionally a
// no-op. If Project Gutenberg publishes an official API in the future,
// this stub can be replaced.
export async function search(query, { limit = 10 } = {}) {
  console.log(`Gutenberg provider skipped for "${query}": no official API (gutendex.com is third-party, not official)`);
  return [];
}
