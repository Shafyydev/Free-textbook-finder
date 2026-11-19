import React from 'react';
import { Link } from 'react-router-dom';

export function Layout({ children }) {
  return (
    <>
      <nav className="nav">
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
  return (
    <div className="card">
      <h3 style={{margin:'0 0 .25rem'}}><Link to={`/books/${book.id}`}>{book.title}</Link></h3>
      <div className="meta">{[book.authors, book.edition, book.year].filter(Boolean).join(' · ')}</div>
      {book.description && <p className="small" style={{margin:'.4rem 0'}}>{String(book.description).slice(0, 220)}{String(book.description).length>220?'…':''}</p>}
      <div>{(book.subjects || []).map(s => <span key={s.id} className="badge">{s.name}</span>)}</div>
      {(book.licenses || []).map(lic => <span key={lic} className="badge" style={{background:'#f0f4f8',color:'#4a5568',borderColor:'#cbd5e0'}}>{lic}</span>)}
      <div className="muted small" style={{marginTop:'.35rem'}}>{book.source_count ?? 0} source(s)</div>
    </div>
  );
}

export function SourceList({ sources = [] }) {
  if (!sources.length) return <p className="muted">No sources listed yet.</p>;
  return (
    <div className="sources">
      {sources.map(src => (
        <div key={src.id || src.official_url} className="source">
          <div><strong>{src.source_name || 'Source'}</strong></div>
          <div className="small">License: <strong>{src.license || 'Unknown'}</strong>{src.license_url ? <> · <a href={src.license_url} target="_blank" rel="noopener noreferrer">license details</a></> : null}</div>
          <div className="small" style={{marginTop:'.25rem'}}>
            <a href={src.official_url} target="_blank" rel="noopener noreferrer">Official page</a>
            {src.direct_file_url ? <> · <a href={src.direct_file_url} target="_blank" rel="noopener noreferrer">Direct file (official)</a></> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
