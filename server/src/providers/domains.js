// Domain classifications for search results.
// Per SPEC.md: badges are decided by site type.
// Retailers show Paid, Google Books shows Preview or Paid from saleInfo,
// Internet Archive lending items show Borrow, Scribd shows Subscription,
// open repositories show Free only when their own record states an open license
// or public domain. Any other site shows Unverified.

// Blocked domains: file-sharing or document-hosting sites that host user-uploaded
// copies. Never show results from these domains, even when the search engine
// returns them. Keep domains here with a reason.
export const BLOCKED_DOMAINS = [
  { domain: 'pdfcoffee.com', reason: 'User-uploaded document hosting (file-sharing)' },
  { domain: 'pdfcoffee.com.cn', reason: 'User-uploaded document hosting (file-sharing)' },
  { domain: 'vdoc.pub', reason: 'User-uploaded document hosting (file-sharing)' },
  { domain: 'dokumen.pub', reason: 'User-uploaded document hosting (file-sharing)' },
  { domain: 'z-lib.io', reason: 'Shadow-library / copyright-infringing host' },
  { domain: 'z-library.sk', reason: 'Shadow-library / copyright-infringing host' },
  { domain: 'annas-archive.org', reason: 'Shadow-library / copyright-infringing host' },
  { domain: 'libgen.is', reason: 'Shadow-library / copyright-infringing host' },
  { domain: 'library.lol', reason: 'Shadow-library / copyright-infringing host' },
  { domain: 'booksc.xyz', reason: 'Shadow-library / copyright-infringing host' },
  { domain: 'slideplayer.com', reason: 'User-uploaded presentation hosting' },
  { domain: 'studylib.net', reason: 'User-uploaded document hosting' },
  { domain: 'coursehero.com', reason: 'User-uploaded document hosting (subscription-gated)' },
  { domain: 'chegg.com', reason: 'User-uploaded document hosting (subscription-gated)' },
  { domain: 'academia.edu', reason: 'User-uploaded document hosting (registration-gated)' },
];

export const BLOCKED_DOMAIN_SET = new Set(
  BLOCKED_DOMAINS.map(d => d.domain.toLowerCase())
);

// Domain type classification: retailer, library, open_repository, retailer_or_unknown
// Returns one of: 'retailer', 'library', 'open_repository', 'aggregator', 'unknown'
export function classifyDomain(urlOrHost) {
  const host = (urlOrHost || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase();

  // Scribd is a subscription-based document hosting service
  if (host.includes('scribd.com')) {
    return { badge: 'Subscription', color: '#6b21a8', bg: '#faf5ff' };
  }

  // Retailers (commercial bookstores)
  const retailers = [
    'books.google.com',
    'play.google.com',
    'amazon.com',
    'amazon.co.uk',
    'amazon.ca',
    'amazon.de',
    'amazon.fr',
    'amazon.it',
    'amazon.es',
    'amazon.in',
    'amazon.com.au',
    'amazon.co.jp',
    'barnesandnoble.com',
    'books-a-million.com',
    'booktopia.com.au',
    'bookdepository.com',
    'wiley.com',
    'springer.com',
    'link.springer.com',
    'elsevier.com',
    'sciencedirect.com',
    'taylorfrancis.com',
    'crcpress.com',
    'routledge.com',
    'cambridge.org',
    'oxford.com',
    'oup.com',
    'palgrave.com',
    'macmillanlearning.com',
    'mheducation.com',
    'pearson.com',
    'cengage.com',
    'nelson.com',
    'johnwiley.com',
  ];

  // Libraries / lending
  const libraries = [
    'archive.org',
    'archive.org/details',
    'openlibrary.org',
    'loc.gov',
    'hathitrust.org',
  ];

  // Open repositories (open access, public domain)
  const openRepositories = [
    'openstax.org',
    'directory.doabooks.org',
    'doabooks.org',
    'gutendex.com',
    'gutenberg.org',
    'pressbooks.pub',
    'opentextbc.ca',
    'open.umn.edu',
    'milneopentextbooks.org',
    'oapen.org',
    'doaj.org',
    'ncbi.nlm.nih.gov',
    'books.ncbi.nlm.nih.gov',
    'babel.hathitrust.org',
    'babel.hathitrust.org/cgi/pt',
  ];

  // Aggregators / search
  const aggregators = [
    'books.google.com',
    'scholar.google.com',
    'worldcat.org',
    'worldcat.org/search',
  ];

  if (retailers.includes(host)) return 'retailer';
  if (libraries.includes(host)) return 'library';
  if (openRepositories.includes(host)) return 'open_repository';
  if (aggregators.includes(host)) return 'aggregator';

  return 'unknown';
}

// Determine site badge from domain classification + source-specific data
export function classifyBadge(domainClassification, source, book) {
  const { access_type, license, license_url, saleability, viewability, public_domain } = book;

  // Retailers → Paid
  if (domainClassification === 'retailer') {
    return { badge: 'Paid', color: '#b42318', bg: '#fef2f2' };
  }

  // Google Books → Preview or Paid from saleInfo
  if (source === 'Google Books') {
    if (saleability === 'FOR_SALE') {
      return { badge: 'Paid', color: '#b42318', bg: '#fef2f2' };
    }
    if (viewability === 'PARTIAL' || saleability === 'FREE') {
      return { badge: 'Preview', color: '#f59e0b', bg: '#fffbeb' };
    }
    return { badge: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
  }

  // Open repositories → Free only when explicit open license or public domain
  if (domainClassification === 'open_repository') {
    if (license && (license.toLowerCase().includes('creative commons') ||
        license.toLowerCase().includes('public domain') ||
        license.toLowerCase().includes('open access') ||
        license.toLowerCase().includes('cc by') ||
        license.toLowerCase().includes('cc0'))) {
      return { badge: 'Free', color: '#166534', bg: '#e7f6ea' };
    }
    if (public_domain === true) {
      return { badge: 'Free', color: '#166534', bg: '#e7f6ea' };
    }
    return { badge: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
  }

  // Libraries → Borrow
  if (domainClassification === 'library') {
    return { badge: 'Borrow', color: '#1d4ed8', bg: '#eff6ff' };
  }

  // Aggregators → Unknown (they just point to other sites)
  if (domainClassification === 'aggregator') {
    return { badge: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
  }

  // Anything else → Unverified
  return { badge: 'Unverified', color: '#6b7280', bg: '#f3f4f6' };
}
