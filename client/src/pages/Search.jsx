import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { BookCard, SkeletonList } from '../components/ui.jsx';

export default function Search() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(sp.get('q') || '');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [providers, setProviders] = useState([]);
  const [blockedCount, setBlockedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Initialize filter from URL param; default to 'all' for invalid values
  const validFilters = ['all', 'free', 'paid', 'preview', 'borrow', 'subscription', 'unverified'];
  const [filter, setFilter] = useState(validFilters.includes(sp.get('type')) ? sp.get('type') : 'all');

  useEffect(() => {
    const query = sp.get('q') || '';
    setQ(query);
    if (!query) {
      setResults([]);
      setTotal(0);
      setProviders([]);
      setBlockedCount(0);
      return;
    }
    doSearch(query);
  }, [sp]);

  async function doSearch(query) {
    setLoading(true);
    setError('');
    try {
      const data = await api.searchBooks({ q: query });
      let results = data.results || [];
      // Group results: free first, then paid, then borrow, then unknown
      const free = results.filter(r => r.status === 'free');
      const paid = results.filter(r => r.status === 'paid');
      const borrow = results.filter(r => r.status === 'borrow');
      const unknown = results.filter(r => r.status === 'unknown');
      // Only show unknown if there are no free/paid/borrow results, limited to first few
      const finalResults = [...free, ...paid, ...borrow, ...(free.length || paid.length || borrow.length ? [] : unknown.slice(0, 5))];
      setResults(finalResults);
      setTotal(finalResults.length);
      setProviders(data.providers || []);
      setBlockedCount(data.blockedCount || 0);
    } catch (e) {
      setError(e.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleHeroSubmit(e) {
    e.preventDefault();
    const q2 = e.target.elements.q.value.trim();
    if (q2) navigate(`/search?q=${encodeURIComponent(q2)}`);
  }

  function handleRetrySubmit(e) {
    e.preventDefault();
    const q2 = e.target.elements.q.value.trim();
    if (q2) navigate(`/search?q=${encodeURIComponent(q2)}`);
  }

  function setFilterWithUrl(filterVal) {
    setFilter(filterVal);
    const newSp = new URLSearchParams(window.location.search);
    if (filterVal === 'all') {
      newSp.delete('type');
    } else {
      newSp.set('type', filterVal);
    }
    navigate(`/search?${newSp.toString()}`);
  }

  function providerStatusIcon(status) {
    const s = {
      ok: { color: '#166534', label: 'OK' },
      empty: { color: '#6b7280', label: 'Empty' },
      failed: { color: '#b91c1c', label: 'Failed' }
    }[status] || { color: '#6b7280', label: 'Unknown' };
    return s;
  }

  // Badge config based on site type (from SPEC.md)
  function badgeFor(book) {
    const st = book.site_type || 'unknown';
    const license = book.license || '';
    const saleability = book.options?.[0]?.license || '';

    // Scribd is Subscription
    if (book._provider === 'scribd' || st === 'subscription') {
      return { label: 'Subscription', color: '#6b21a8', bg: '#faf5ff' };
    }
    // Retailers show Paid
    if (st === 'retailer') return { label: 'Paid', color: '#b42318', bg: '#fef2f2' };
    // Google Books shows Preview or Paid from saleInfo
    if (book._provider === 'Google Books') {
      if (saleability && saleability.includes('Paid') || book.status === 'paid') return { label: 'Paid', color: '#b42318', bg: '#fef2f2' };
      if (saleability && saleability.includes('Limited preview') || book.status === 'unknown') return { label: 'Preview', color: '#f59e0b', bg: '#fffbeb' };
      return { label: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
    }
    // Internet Archive lending items show Borrow
    if (st === 'library') return { label: 'Borrow', color: '#1d4ed8', bg: '#eff6ff' };
    // Open repositories show Free only when explicit open license or public domain
    if (st === 'open_repository') {
      if (license && (license.toLowerCase().includes('creative commons') ||
          license.toLowerCase().includes('public domain') ||
          license.toLowerCase().includes('open access') ||
          license.toLowerCase().includes('cc by') ||
          license.toLowerCase().includes('cc0'))) {
        return { label: 'Free', color: '#166534', bg: '#e7f6ea' };
      }
      return { label: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
    }
    // Anything else shows Unverified
    return { label: 'Unverified', color: '#6b7280', bg: '#f3f4f6' };
  }

  // Count results per badge type for filter counts
  const filterCounts = {
    all: results.length,
    free: results.filter(r => badgeFor(r).label === 'Free').length,
    paid: results.filter(r => badgeFor(r).label === 'Paid').length,
    preview: results.filter(r => badgeFor(r).label === 'Preview').length,
    borrow: results.filter(r => badgeFor(r).label === 'Borrow').length,
    subscription: results.filter(r => badgeFor(r).label === 'Subscription').length,
    unverified: results.filter(r => badgeFor(r).label === 'Unverified').length,
  };

  const filteredResults = filter === 'all'
    ? results
    : results.filter(r => {
        const badge = badgeFor(r);
        return badge.label.toLowerCase() === filter.toLowerCase();
      });

  if (!q) {
    return (
      <div className="container">
        <section className="hero">
          <div className="hero-inner">
            <h1>Free Textbook Finder</h1>
            <p className="hero-sub">Search legally free textbooks across all subjects — science, mathematics, business, nursing, medicine, humanities, computer science, and more. We link to official sources with verified license information.</p>
            <form className="hero-search" onSubmit={handleHeroSubmit}>
              <label>Search textbook title, author, or subject</label>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <input name="q" autoFocus />
                <button type="submit" className="btn btn-hero">Search</button>
              </div>
            </form>
            <p className="small muted" style={{ marginTop: '.75rem', textAlign: 'center' }}>
              Example: "anatomy", "calculus", "pride and prejudice"
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container">
      <nav style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
        <Link to="/" className="btn secondary">← New search</Link>
        <div className="muted small">
          {total} result{'s' !== total === 1 ? '' : 's'} for <strong>"{q}"</strong>
          {providers.length > 0 && (
            <>
              <span> · </span>
              {providers.map(p => {
                const st = providerStatusIcon(p.status || 'ok');
                const afterText = p.afterRelevance !== undefined && p.afterRelevance !== p.count
                  ? ` → ${p.afterRelevance} relevant`
                  : '';
                return (
                  <span key={p.name} style={{ marginLeft: '.35rem', color: st.color, fontSize: '.8rem', fontWeight: '600' }}>
                    {p.name}: {p.count}{afterText} ({st.label})
                  </span>
                );
              })}
            </>
          )}
          {blockedCount > 0 && (
            <span style={{ marginLeft: '.35rem', color: '#b42318', fontSize: '.8rem', fontWeight: '600' }}>
              {blockedCount} blocked
            </span>
          )}
        </div>
      </nav>

      {/* Type filter */}
      <div className="section card" style={{ padding: '.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
        <span className="muted small" style={{ fontWeight: '600' }}>Filter: </span>
        {['all', 'free', 'paid', 'preview', 'borrow', 'subscription', 'unverified'].map(f => {
          const count = filterCounts[f];
          // Hide options with 0 results (except All)
          if (filter !== 'all' && count === 0) return null;
          return (
            <button
              key={f}
              onClick={() => setFilterWithUrl(f)}
              className={filter === f ? 'btn' : 'btn secondary'}
              style={{ padding: '.35rem .75rem', fontSize: '.85rem' }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <SkeletonList count={6} />
      ) : filteredResults.length === 0 ? (
        results.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <h2 style={{ color: 'var(--muted-text)', marginBottom: '.5rem' }}>Not found</h2>
            <p className="muted" style={{ marginBottom: '.5rem' }}>We couldn&rsquo;t find a legal free copy or a clear listing for <strong>"{q}"</strong>.</p>
            <form onSubmit={handleRetrySubmit}>
              <label>Try a different title or author</label>
              <input name="q" defaultValue={q} />
              <button type="submit" className="btn">Search again</button>
            </form>
            <p className="small muted" style={{ marginTop: '1rem' }}>Want this book added? <Link to="/request">Request it</Link> and we&rsquo;ll look for it.</p>
            <p className="small muted" style={{ marginTop: '.5rem' }}>
              Or search the publisher&rsquo;s site:&nbsp;
              <a href={`https://www.google.com/search?q=${encodeURIComponent(q + ' publisher')}`} target="_blank" rel="noopener noreferrer">Publisher site</a>&nbsp;|&nbsp;
              <a href={`https://books.google.com/books?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer">Google Books</a>
            </p>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <h2 style={{ color: 'var(--muted-text)', marginBottom: '.5rem' }}>No results for this filter</h2>
            <p className="muted" style={{ marginBottom: '.5rem' }}>No books match the <strong>{filter.charAt(0).toUpperCase() + filter.slice(1)}</strong> filter.</p>
            <button className="btn" onClick={() => setFilterWithUrl('all')}>
              Reset to All
            </button>
            <p className="small muted" style={{ marginTop: '1rem' }}>
              Or search the publisher&rsquo;s site:&nbsp;
              <a href={`https://www.google.com/search?q=${encodeURIComponent(q + ' publisher')}`} target="_blank" rel="noopener noreferrer">Publisher site</a>&nbsp;|&nbsp;
              <a href={`https://books.google.com/books?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer">Google Books</a>
            </p>
          </div>
        )
      ) : (
        <>
          <div className="list">
            {filteredResults.map((book) => (
              <BookCard key={book.isbn || book.title} book={book} />
            ))}
          </div>

          {/* Search elsewhere panel */}
          <section className="section card" style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '.75rem' }}>Search elsewhere</h3>
            <p className="muted small" style={{ marginBottom: '.5rem' }}>Search for this title on other sites:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              <a
                key="Amazon.in"
                href={`https://www.amazon.in/s?k=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on Amazon.in
              </a>
              <a
                key="Flipkart"
                href={`https://www.flipkart.com/search?q=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on Flipkart
              </a>
              <a
                key="Google Books"
                href={`https://books.google.com/books?q=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on Google Books
              </a>
              <a
                key="Scribd"
                href={`https://www.scribd.com/search?query=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on Scribd
              </a>
              <a
                key="Open Library"
                href={`https://openlibrary.org/search?q=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on Open Library
              </a>
              <a
                key="Internet Archive"
                href={`https://archive.org/search?query=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on Internet Archive
              </a>
              <a
                key="WorldCat"
                href={`https://search.worldcat.org/search?q=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on WorldCat
              </a>
              <a
                key="DOAB"
                href={`https://directory.doabooks.org/search?query=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on DOAB
              </a>
              <a
                key="OAPEN"
                href={`https://library.oapen.org/search?query=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on OAPEN
              </a>
              <a
                key="OpenStax"
                href={`https://openstax.org/search?q=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on OpenStax
              </a>
              <a
                key="NCBI Bookshelf"
                href={`https://www.ncbi.nlm.nih.gov/books/?term=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn secondary"
                style={{ padding: '.35rem .75rem', fontSize: '.85rem', textDecoration: 'none' }}
              >
                Search on NCBI Bookshelf
              </a>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
