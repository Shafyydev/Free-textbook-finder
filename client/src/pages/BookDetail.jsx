import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { SourceList, SkeletonList, PageFade, useScrollAnimation } from '../components/ui.jsx';

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');
  const sectionRef = useScrollAnimation();

  useEffect(() => { api.getBook(id).then(setBook).catch(e => setError(e.message)); }, [id]);

  if (error) return <div className="error">{error} <Link to="/search">Back to search</Link></div>;
  if (!book) return <SkeletonList count={1} />;

  const sources = book.sources || [];
  const freeSource = sources.find(src => src.access_type === 'free');
  const pdfUrl = freeSource?.direct_file_url;
  const viewUrl = freeSource?.official_url || (sources[0]?.official_url);

  return (
    <PageFade>
      <div>
        <p className="small"><Link to="/search">← Back to search</Link></p>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>{book.title}</h1>
          <div className="meta">{[book.authors, book.edition, book.year].filter(Boolean).join(' · ')}</div>
          {book.description && <p>{book.description}</p>}
          <div style={{ marginTop: '.5rem' }}>
            <strong>Subjects:</strong>{' '}
            {(book.subjects || []).map(s => <span key={s.id} className="badge">{s.name}</span>)}
            {!(book.subjects || []).length && <span className="muted"> None</span>}
          </div>
          <div style={{ marginTop: '.25rem' }}>
            <strong>Courses:</strong>{' '}
            {(book.courses || []).map(c => <span key={c.id} className="badge">{c.name}</span>)}
            {!(book.courses || []).length && <span className="muted"> None</span>}
          </div>
          <div style={{ marginTop: '.25rem' }}>
            <strong>Category:</strong>{' '}
            {(book.categories || []).map(c => <span key={c.id} className="badge">{c.name}</span>)}
            {!(book.categories || []).length && <span className="muted"> None</span>}
          </div>
        </div>
        <section className="section animate-on-scroll" ref={sectionRef}>
          <h2>Official sources</h2>
          <p className="small muted">License is shown for each source. Links open the official provider in a new tab.</p>
          <div style={{ marginBottom: '.75rem', textAlign: 'center' }}>
            {pdfUrl ? (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn"
                style={{ padding: '.5rem .8rem', fontSize: '1rem', fontWeight: '600' }}>
                Download PDF
              </a>
            ) : (
              <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="btn secondary"
                style={{ padding: '.5rem .8rem', fontSize: '1rem', fontWeight: '600' }}>
                Open book page
              </a>
            )}
          </div>
          <SourceList sources={book.sources} />
        </section>
      </div>
    </PageFade>
  );
}
