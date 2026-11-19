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
    // Cards start visible (CSS handles reveal animation).
    // Only add staggered animation delay if not reduced motion.
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
  const statusBadge = {
    free: { label: 'Free', bg: '#e7f6ea', text: '#166534', border: '#86efac' },
    paid: { label: 'Paid', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    borrow: { label: 'Borrow', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    unknown: { label: 'Not found', bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
  }[book.status] || { label: 'Unknown', bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };

  const authorsText = (book.authors || []).slice(0, 3).join(', ') + ((book.authors || []).length > 3 ? ' et al.' : '');
  const isFree = book.status === 'free';
  const downloadOpt = isFree && book.options?.find(o => o.type === 'download');
  const readOpt = book.options?.find(o => o.type === 'read');
  const borrowOpt = book.options?.find(o => o.type === 'borrow');
  const buyOpt = book.options?.find(o => o.type === 'buy');
  const primaryOpt = downloadOpt || readOpt || borrowOpt || buyOpt || book.options?.[0];
  const officialOpt = book.options?.find(o => o.type === 'read' || o.type === 'download') || book.options?.[0];

  return (
    <div className="card compact animate-on-scroll" style={{ borderColor: statusBadge.border }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', marginBottom: '.2rem' }}>
        <h3 style={{ margin: '0 0 .1rem', fontSize: '1.05rem', flex: 1 }}>
          <Link to={`/books/${book.isbn || book.title.replace(/\s+/g, '-')}`}>{book.title}</Link>
        </h3>
        <span className="badge" style={{ background: statusBadge.bg, color: statusBadge.text, borderColor: statusBadge.border, fontSize: '.7rem' }}>{statusBadge.label}</span>
      </div>
      <div className="meta">{authorsText}</div>
      {book.license && (
        <div className="small" style={{ color: 'var(--indigo-muted)', marginBottom: '.2rem' }}>
          License: <strong>{book.license}</strong>
        </div>
      )}
      <div className="card-bottom" style={{ marginTop: '.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem', alignItems: 'center', flex: 1 }}>
          {(book.options || []).slice(0, 3).map((o, i) => (
            <span key={i} className="badge" style={{ background: '#eef2f7', color: '#1f2937', borderColor: '#cbd5e0', fontSize: '.7rem' }}>
              {o.source}
            </span>
          ))}
        </div>
        {primaryOpt ? (
          <a href={primaryOpt.url} target="_blank" rel="noopener noreferrer"
            className={`btn ${downloadOpt ? '' : 'secondary'}`}
            style={{ padding: '.35rem .75rem', fontSize: '.82rem', whiteSpace: 'nowrap' }}>
            {downloadOpt ? 'Download PDF' : readOpt ? 'Read online' : borrowOpt ? 'Borrow' : 'View'}
          </a>
        ) : (
          // Fallback: always show a link even if no typed option
          officialOpt ? (
            <a href={officialOpt.url} target="_blank" rel="noopener noreferrer"
              className="btn secondary"
              style={{ padding: '.35rem .75rem', fontSize: '.82rem', whiteSpace: 'nowrap' }}>
              Check official page
            </a>
          ) : null
        )}
      </div>
    </div>
  );
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
