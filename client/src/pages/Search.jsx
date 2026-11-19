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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const query = sp.get('q') || '';
    setQ(query);
    if (!query) {
      setResults([]);
      setTotal(0);
      setProviders([]);
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

  function providerStatusIcon(status) {
    const s = {
      ok: { color: '#166534', label: 'OK' },
      empty: { color: '#6b7280', label: 'Empty' },
      failed: { color: '#b91c1c', label: 'Failed' }
    }[status] || { color: '#6b7280', label: 'Unknown' };
    return s;
  }

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
        </div>
      </nav>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <SkeletonList count={6} />
      ) : results.length === 0 ? (
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
        <div className="grid grid-2">
          {results.map((book) => (
            <BookCard key={book.isbn || book.title} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
