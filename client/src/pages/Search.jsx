import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { BookCard, SkeletonList, SkeletonCard } from '../components/ui.jsx';

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
      setResults(data.results || []);
      setTotal(data.total || 0);
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

  if (!q) {
    return (
      <div className="container">
        <section className="hero">
          <div className="hero-inner">
            <h1>Free Textbook Finder</h1>
            <p className="hero-sub">Search legally free textbooks across all subjects — science, mathematics, business, nursing, medicine, humanities, and more.</p>
            <form className="hero-search" onSubmit={handleHeroSubmit}>
              <label>Search textbook title, author, or subject</label>
              <input name="q" defaultValue={q} autoFocus />
              <button type="submit" className="btn btn-hero">Search</button>
            </form>
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
            <span> · {providers.map(p => `${p.name}: ${p.count}`).join(', ')}</span>
          )}
        </div>
      </nav>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <SkeletonList count={6} />
      ) : results.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <h2 style={{ color: 'var(--muted-text)', marginBottom: '.5rem' }}>No results found</h2>
          <p className="muted" style={{ marginBottom: '1rem' }}>We couldn&rsquo;t find any legally free textbooks matching "<strong>{q}</strong>".</p>
          <form onSubmit={handleRetrySubmit}>
            <label>Try a different title or author</label>
            <input name="q" defaultValue={q} />
            <button type="submit" className="btn">Search again</button>
          </form>
          <p className="small muted" style={{ marginTop: '1rem' }}>Want this book added? <Link to="/request">Request it</Link> and we&rsquo;ll look for it.</p>
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
