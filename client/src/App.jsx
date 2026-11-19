import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import BookDetail from './pages/BookDetail.jsx';
import RequestBook from './pages/RequestBook.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/request" element={<RequestBook />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<div className="card"><h2>Page not found</h2></div>} />
      </Routes>
    </Layout>
  );
}
