import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { BookCard } from '../components/ui.jsx';

export default function Search() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [subject, setSubject] = useState(sp.get('subject') || '');
  const [course, setCourse] = useState(sp.get('course') || '');
  const [source, setSource] = useState(sp.get('source') || '');
  const [category, setCategory] = useState(sp.get('category') || '');
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.getSubjects().then(setSubjects).catch(()=>{}); api.getCourses().then(setCourses).catch(()=>{}); api.getCategories().then(setCategories).catch(()=>{}); api.getSources().then(setSources).catch(()=>{}); }, []);
  useEffect(() => {
    setLoading(true); setError('');
    api.searchBooks({ q: sp.get('q') || '', subject: sp.get('subject') || '', course: sp.get('course') || '', source: sp.get('source') || '', category: sp.get('category') || '', page: sp.get('page') || 1 })
      .then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [sp]);

  function apply(e){ e?.preventDefault?.(); const next={}; if(q)next.q=q; if(subject)next.subject=subject; if(course)next.course=course; if(source)next.source=source; if(category)next.category=category; next.page='1'; setSp(next); }

  return (
    <div>
      <h1>Search</h1>
      <form className="card" onSubmit={apply}>
        <div className="row">
          <div style={{flex:'2 1 240px'}}><label>Query</label><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Title, author, description" /></div>
          <div style={{flex:'1 1 160px'}}><label>Subject</label><select value={subject} onChange={e=>setSubject(e.target.value)}><option value="">All</option>{subjects.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div style={{flex:'1 1 160px'}}><label>Course</label><select value={course} onChange={e=>setCourse(e.target.value)}><option value="">All</option>{courses.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div style={{flex:'1 1 160px'}}><label>Source</label><select value={source} onChange={e=>setSource(e.target.value)}><option value="">All</option>{sources.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div style={{flex:'1 1 160px'}}><label>Category</label><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All</option>{categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><button type="submit">Apply</button></div>
        </div>
      </form>
      {error && <div className="error">{error}</div>}
      {loading ? <p className="muted">Loading...</p> : <>
        <p className="muted small">{data.total} result(s)</p>
        <div className="list">{(data.items||[]).map(b => <BookCard key={b.id} book={b} />)}</div>
        {!data.items?.length && q ? (
          <>
            <p className="muted">No books found. Try broader terms or clear filters.</p>
            <p className="small"><Link to={{ pathname: '/request', search: `?title=${encodeURIComponent(q)}` }}>Request this book</Link></p>
          </>
        ) : !data.items?.length && <p className="muted">No books found. Try broader terms or clear filters.</p>}
      </>}
    </div>
  );
}
