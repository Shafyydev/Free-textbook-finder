import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';

/* ===== Custom Hooks ===== */

/** Compact navbar on scroll + scroll-progress bar */
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

/** IntersectionObserver-based scroll animation */
export function useScrollAnimation() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect reduced-motion
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

/** Staggered scroll animation for lists of cards */
export function useStaggeredAnimation(count) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('visible'));
      return;
    }
    const cards = container.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    cards.forEach((card, i) => {
      card.style.transitionDelay = `${i * 50}ms`;
      observer.observe(card);
    });
    return () => observer.disconnect();
  }, [count]);

  return containerRef;
}

/* ===== Components ===== */

/** Sparkle SVG for the hero */
function HeroSparkle() {
  return (
    <div className="hero-sparkle" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 2l3.09 10.91L32 18l-10.91 3.09L18 32l-3.09-10.91L4 18l10.91-3.09L18 2z"
              fill="var(--cream)" fillOpacity=".85" />
      </svg>
    </div>
  );
}

/** Skeleton card for loading states */
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

/** Multiple skeleton cards */
export function SkeletonList({ count = 6 }) {
  return (
    <div className="list">
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

/** Page wrapper with fade-in animation */
export function PageFade({ children }) {
  const location = useLocation();
  const [key, setKey] = useState(location.key);
  useEffect(() => { setKey(location.key); }, [location.key]);
  return <div className="page-fade-enter" key={key}>{children}</div>;
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
        <div className="footer">Only legal, openly licensed or public-domain textbooks. We link to official sources and do not host book files.</div>
      </div>
    </>
  );
}

export function BookCard({ book }) {
  const sources = book.sources || [];
  const freeSource = sources.find(src => src.access_type === 'free');
  const paidOnly = sources.length > 0 && !freeSource;

  const pdfUrl = freeSource?.direct_file_url;
  const viewUrl = freeSource?.official_url || (paidOnly && sources[0]?.official_url);

  const authorList = book.authors ? String(book.authors).split(/,\s*/) : [];
  const authorsShown = authorList.slice(0, 3);
  const authorsText = authorsShown.join(', ') + (authorList.length > 3 ? ' et al.' : '');

  return (
    <div className="card compact animate-on-scroll">
      <h3 style={{ margin: '0 0 .2rem' }}><Link to={`/books/${book.id}`}>{book.title}</Link></h3>
      <div className="meta">{[authorsText, book.edition, book.year].filter(Boolean).join(' · ')}</div>
      {book.description && (
        <p className="small desc-line" style={{ margin: '.2rem 0' }}>
          {String(book.description)}
        </p>
      )}
      <div className="card-bottom" style={{ marginTop: '.3rem' }}>
        <div style={{ flex: '1', display: 'flex', flexWrap: 'wrap', gap: '.25rem', alignItems: 'center' }}>
          {(book.subjects || []).map(s => <span key={s.id} className="badge">{s.name}</span>)}
          {(book.licenses || []).map(lic => <span key={lic} className="badge">{lic}</span>)}
          {paidOnly && <span className="badge paid">Paid book</span>}
          <span className="muted small">{book.source_count ?? 0} source(s)</span>
        </div>
        <a href={pdfUrl || viewUrl} target="_blank" rel="noopener noreferrer"
          className={pdfUrl ? 'btn' : 'btn secondary'}
          style={{ padding: '.3rem .6rem', fontSize: '.85rem', whiteSpace: 'nowrap' }}>
          {pdfUrl ? 'Download PDF' : 'Open book page'}
        </a>
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
          <div className="small">
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
