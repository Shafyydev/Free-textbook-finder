import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

/* ===== Custom Hooks ===== */

function useScrollEffects() {
  const [compact, setCompact] = useState(false);
  const progressRef = useRef(null);

  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 40);
      if (progressRef.current) {
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docH > 0 ? window.scrollY / docH : 0;
        progressRef.current.style.transform = `scaleX(${pct})`;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { compact, progressRef };
}

export function useScrollAnimation() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('visible');
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); observer.unobserve(el); } },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

export function useStaggeredAnimation(count) {
  const containerRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const cards = container.querySelectorAll('.animate-on-scroll');
    cards.forEach((card, i) => {
      card.style.transitionDelay = `${i * 50}ms`;
      card.classList.add('reveal');
    });
    return () => {
      cards.forEach((card) => {
        card.style.transitionDelay = '';
        card.classList.remove('reveal');
      });
    };
  }, [count]);
  return containerRef;
}

/* ===== Error Boundary ===== */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ error, info: errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <h2 style={{ color: '#b42318', marginBottom: '.5rem' }}>Card failed to load</h2>
          <p className="muted">{this.state.error?.message || 'Unknown error'}</p>
          <button
            className="btn"
            style={{ marginTop: '.5rem' }}
            onClick={() => this.setState({ hasError: false, error: null, info: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ===== Components ===== */

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line w-75"></div>
      <div className="skeleton-line w-50"></div>
      <div className="skeleton-line w-40"></div>
      <div className="skeleton-line w-30"></div>
    </div>
  );
}

export function SkeletonList({ count = 6 }) {
  return (
    <div className="list">
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function PageFade({ children }) {
  const location = useLocation();
  return <div className="page-fade-enter" key={location.key}>{children}</div>;
}

export function Layout({ children }) {
  const { compact, progressRef } = useScrollEffects();

  return (
    <>
      <div className="scroll-progress" ref={progressRef} />
      <nav className={`nav${compact ? ' compact' : ''}`}>
        <div className="nav-inner">
          <Link className="brand" to="/">Free Textbook Finder</Link>
          <div className="links">
            <Link to="/search">Search</Link>
            <Link to="/request">Request</Link>
            <Link to="/admin">Admin</Link>
          </div>
        </div>
      </nav>
      <div className="container">
        <main>{children}</main>
      </div>
      <footer className="footer">
        <div className="footer-inner">
          Only legal, openly licensed or public-domain textbooks. We link to official sources and do not host book files.
        </div>
      </footer>
    </>
  );
}

export function BookCard({ book }) {
  return (
    <ErrorBoundary>
      <CardInner book={book} />
    </ErrorBoundary>
  );
}

function CardInner({ book }) {
  const badge = badgeFor(book);

  const authorsText = (book.authors || []).slice(0, 3).join(', ') + ((book.authors || []).length > 3 ? ' et al.' : '');
  const downloadOpt = book.status === 'free' && book.options?.find(o => o.type === 'download');
  const readOpt = book.options?.find(o => o.type === 'read');
  const borrowOpt = book.options?.find(o => o.type === 'borrow');
  const buyOpt = book.options?.find(o => o.type === 'buy');

  const openUrl = downloadOpt?.url || readOpt?.url || borrowOpt?.url || buyOpt?.url || book.options?.[0]?.url || book.official_url || '';

  return (
    <div className="card" style={{ borderColor: badge.border }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.25rem' }}>
        {book.favicon && (
          <img
            src={book.favicon}
            alt={book.options?.[0]?.source || 'Source'}
            width="16"
            height="16"
            style={{ borderRadius: '2px' }}
          />
        )}
        <span className="badge" style={{ background: badge.bg, color: badge.text, borderColor: badge.border, fontSize: '.7rem' }}>{badge.label}</span>
      </div>
      <h3 style={{ margin: '0 0 .25rem', fontSize: '1.1rem', lineHeight: '1.3' }}>
        <Link to={`/books/${book.isbn || book.title.replace(/\s+/g, '-')}`}>{book.title}</Link>
      </h3>
      <div className="meta">{authorsText}</div>
      {book.snippet && (
        <div className="small" style={{ color: 'var(--muted-text)', marginBottom: '.25rem' }}>
          {book.snippet}
        </div>
      )}
      <div className="card-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem', alignItems: 'center', flex: 1 }}>
          {(book.options || []).slice(0, 3).map((o, i) => (
            <span key={i} className="badge" style={{ background: '#eef2f7', color: '#1f2937', borderColor: '#cbd5e0', fontSize: '.7rem' }}>
              {o.source}
            </span>
          ))}
        </div>
        <a href={openUrl} target="_blank" rel="noopener noreferrer"
          className="btn"
          style={{ padding: '.35rem .75rem', fontSize: '.85rem', whiteSpace: 'nowrap' }}>
          Open
        </a>
      </div>
    </div>
  );
}

function badgeFor(book) {
  const st = book.site_type || 'unknown';
  const license = book.license || '';
  const saleability = book.options?.[0]?.license || '';

  // Scribd is Subscription
  if (book._provider === 'scribd' || st === 'subscription') {
    return { badge: 'Subscription', color: '#6b21a8', bg: '#faf5ff' };
  }

  // Retailers show Paid
  if (st === 'retailer') return { label: 'Paid', color: '#b42318', bg: '#fef2f2' };
  if (book._provider === 'Google Books') {
    if (saleability && saleability.includes('Paid') || book.status === 'paid') return { label: 'Paid', color: '#b42318', bg: '#fef2f2' };
    if (saleability && saleability.includes('Limited preview') || book.status === 'unknown') return { label: 'Preview', color: '#f59e0b', bg: '#fffbeb' };
    return { label: 'Unknown', color: '#6b7280', bg: '#f3f4f6' };
  }
  if (st === 'library') return { label: 'Borrow', color: '#1d4ed8', bg: '#eff6ff' };
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
  return { label: 'Unverified', color: '#6b7280', bg: '#f3f4f6' };
}

export function SourceList({ sources = [] }) {
  if (!sources.length) return <p className="muted">No sources listed yet.</p>;
  return (
    <div className="sources">
      {sources.map(src => (
        <div key={src.id || src.official_url} className="source animate-on-scroll">
          <div>
            <strong>{src.source_name || 'Source'}</strong>
            <span className="badge" style={{ fontSize: '.75rem', marginLeft: '.5rem' }}>
              {src.access_type === 'paid' ? 'Paid' : 'Free'}
            </span>
          </div>
          <div className="small" style={{ marginTop: '.2rem' }}>
            License: <strong>{src.license || 'Unknown'}</strong>
            {src.license_url ? <> · <a href={src.license_url} target="_blank" rel="noopener noreferrer">license details</a></> : null}
          </div>
          <div className="small" style={{ marginTop: '.25rem' }}>
            <a href={src.official_url} target="_blank" rel="noopener noreferrer">Official page</a>
            {src.direct_file_url ? <> · <a href={src.direct_file_url} target="_blank" rel="noopener noreferrer">Direct file (official)</a></> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
