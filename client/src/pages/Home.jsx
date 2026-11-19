import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { BookCard } from '../components/ui.jsx';

export default function Home() {
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [course, setCourse] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(()=>setError('Failed to load subjects'));
    api.getCourses().then(setCourses).catch(()=>setError('Failed to load courses'));
    api.searchBooks({ limit: 6 }).then(d => setFeatured(d.items || [])).catch(()=>setError('Failed to load featured books'));
  }, []);

  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (subject) params.set('subject', subject);
    if (course) params.set('course', course);
    navigate(`/search?${params.toString()}`);
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <section className="hero">
        <h1>Find legally free textbooks</h1>
        <p className="muted">Search open and public-domain textbooks with links to official sources and clear license info.</p>
      </section>
      <form className="card" onSubmit={submit}>
        <div className="row">
          <div style={{flex:'2 1 260px'}}>
            <label>Search</label>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Title, author, description..." />
          </div>
          <div style={{flex:'1 1 180px'}}>
            <label>Subject</label>
            <select value={subject} onChange={e=>setSubject(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{flex:'1 1 180px'}}>
            <label>Course</label>
            <select value={course} onChange={e=>setCourse(e.target.value)}>
              <option value="">All courses</option>
              {courses.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><button type="submit">Search</button></div>
        </div>
      </form>
      <section className="section">
        <h2>Browse</h2>
        <p className="small muted">Jump to results: <Link to="/search">all books</Link></p>
        {featured.length ? <div className="list">{featured.map(b => <BookCard key={b.id} book={b} />)}</div> : <p className="muted">No books loaded yet. Add seed data and run the database seed.</p>}
      </section>
    </div>
  );
}
