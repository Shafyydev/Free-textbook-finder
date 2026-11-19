import React from 'react';
import { Link } from 'react-router-dom';
import { BookCard } from '../components/ui.jsx';

export default function Home() {
  return (
    <div className="container">
      <section className="hero">
        <div className="hero-inner">
          <h1>Free Textbook Finder</h1>
          <p className="hero-sub">Search legally free textbooks across all subjects — science, mathematics, business, nursing, medicine, humanities, computer science, and more. We link to official sources with verified license information.</p>
          <form className="hero-search" onSubmit={(e) => {
            e.preventDefault();
            const q = e.target.elements.q.value.trim();
            if (q) {
              const sp = new URLSearchParams(window.location.search);
              sp.set('q', q);
              window.location.search = sp.toString();
            }}
          >
            <label>Search textbook title, author, or subject</label>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <input name="q" autoFocus />
              <button type="submit" className="btn btn-hero">Search</button>
            </div>
          </form>
          <p className="small muted" style={{ marginTop: '.75rem', textAlign: 'center' }}>
            Example: "anatomy", "calculus", "pride and prejudice"
          </p>
        </div>
      </section>
    </div>
  );
}
