import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { BookCard, SkeletonList, PageFade, useStaggeredAnimation } from '../components/ui.jsx';

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

export default function Home() {
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [course, setCourse] = useState('');
  const [category, setCategory] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const listRef = useStaggeredAnimation(featured.length);

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(() => setError('Failed to load subjects'));
    api.getCourses().then(setCourses).catch(() => setError('Failed to load courses'));
    api.getCategories().then(setCategories).catch(() => setError('Failed to load categories'));
    api.searchBooks({ limit: 6 })
      .then(d => setFeatured(d.items || []))
      .catch(() => setError('Failed to load featured books'))
      .finally(() => setLoading(false));
  }, []);

  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (subject) params.set('subject', subject);
    if (course) params.set('course', course);
    if (category) params.set('category', category);
    navigate(`/search?${params.toString()}`);
  }

  return (
    <PageFade>
      <div>
        {error && <div className="error">{error}</div>}
        <section className="hero">
          <HeroSparkle />
          <h1 className="hero-enter-heading">Free Textbook Finder</h1>
          <p className="muted hero-enter-sub">Find legally free textbooks across all subjects — science, mathematics, business, nursing, humanities, and more. Links to official sources with verified license info.</p>
        </section>
        <form className="card hero-enter-form" onSubmit={submit}>
          <div className="row">
            <div style={{ flex: '2 1 260px' }}>
              <label>Search</label>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Title, author, description..." />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label>Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="">All subjects</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label>Course</label>
              <select value={course} onChange={e => setCourse(e.target.value)}>
                <option value="">All courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><button type="submit">Search</button></div>
          </div>
        </form>
        <section className="section">
          <h2>Featured Textbooks</h2>
          <p className="small muted">Jump to results: <Link to="/search">all books</Link></p>
          {loading ? (
            <SkeletonList count={6} />
          ) : featured.length ? (
            <div className="list" ref={listRef}>
              {featured.map(b => <BookCard key={b.id} book={b} />)}
            </div>
          ) : (
            <p className="muted">No books loaded yet. Add seed data and run the database seed.</p>
          )}
        </section>
      </div>
    </PageFade>
  );
}
