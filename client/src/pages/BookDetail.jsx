import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { SourceList } from '../components/ui.jsx';

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.getBook(id).then(setBook).catch(e=>setError(e.message)); }, [id]);

  if (error) return <div className="error">{error} <Link to="/search">Back to search</Link></div>;
  if (!book) return <p className="muted">Loading...</p>;

  return (
    <div>
      <p className="small"><Link to="/search">← Back to search</Link></p>
      <div className="card">
        <h1 style={{marginTop:0}}>{book.title}</h1>
        <div className="meta">{[book.authors, book.edition, book.year].filter(Boolean).join(' · ')}</div>
        {book.description && <p>{book.description}</p>}
        <div style={{marginTop:'.5rem'}}>
          <strong>Subjects:</strong> {(book.subjects||[]).map(s=> <span key={s.id} className="badge">{s.name}</span>)}{!(book.subjects||[]).length && <span className="muted"> None</span>}
        </div>
        <div style={{marginTop:'.25rem'}}>
          <strong>Courses:</strong> {(book.courses||[]).map(c=> <span key={c.id} className="badge">{c.name}</span>)}{!(book.courses||[]).length && <span className="muted"> None</span>}
        </div>
      </div>
      <section className="section">
        <h2>Official sources</h2>
        <p className="small muted">License is shown for each source. Links open the official provider in a new tab.</p>
        <SourceList sources={book.sources} />
      </section>
    </div>
  );
}
