import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageFade } from '../components/ui.jsx';

const emptyBook = { title: '', authors: '', edition: '', year: '', description: '', cover_url: '', featured: false, categories_locked: false };

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [books, setBooks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sourcesList, setSourcesList] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bookForm, setBookForm] = useState(emptyBook);
  const [bsForm, setBsForm] = useState({ book_id: '', source_id: '', official_url: '', direct_file_url: '', license: '', license_url: '', link_status: 'unknown', access_type: 'free' });
  const [editBookId, setEditBookId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', authors: '', edition: '', year: '', description: '', cover_url: '', featured: false, subject_ids: [], course_ids: [], categories_locked: false });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function login(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { await api.admin.listRequests(password); setAuthed(true); await refresh(); setMsg('Authenticated.'); }
    catch (e) { setErr(e.message || 'Auth failed'); }
  }

  async function refresh() {
    const [b, r, s, sub, c, cat] = await Promise.all([
      api.searchBooks({ limit: 100 }), api.admin.listRequests(password), api.getSources(), api.getSubjects(), api.getCourses(), api.getCategories()
    ]);
    setBooks(b.items || []); setRequests(r || []); setSourcesList(s || []); setSubjects(sub || []); setCourses(c || []); setCategories(cat || []);
  }

  async function createBook(e) {
    e.preventDefault(); setErr('');
    try {
      await api.admin.createBook(password, {
        ...bookForm,
        year: bookForm.year ? Number(bookForm.year) : null,
        featured: bookForm.featured === true,
        categories_locked: bookForm.categories_locked === true
      });
      setBookForm(emptyBook);
      await refresh();
      setMsg('Book created.');
    } catch (e) { setErr(e.message); }
  }

  async function editBook(id) {
    const b = books.find(x => x.id === id);
    if (!b) return;
    setEditBookId(id);
    setEditForm({
      title: b.title, authors: b.authors || '', edition: b.edition || '', year: b.year || '',
      description: b.description || '', cover_url: b.cover_url || '', featured: b.featured === true,
      subject_ids: [], course_ids: [], categories_locked: b.categories_locked === true
    });
  }

  async function cancelEdit() {
    setEditBookId(null);
    setEditForm({ title: '', authors: '', edition: '', year: '', description: '', cover_url: '', featured: false, subject_ids: [], course_ids: [], categories_locked: false });
  }

  async function saveEditBook(e) {
    e.preventDefault(); setErr('');
    try {
      await api.admin.updateBook(password, editBookId, {
        title: editForm.title || null,
        authors: editForm.authors || null,
        edition: editForm.edition || null,
        year: editForm.year ? Number(editForm.year) : null,
        description: editForm.description || null,
        cover_url: editForm.cover_url || null,
        featured: editForm.featured === true,
        categories_locked: editForm.categories_locked === true
      });
      setEditBookId(null);
      await refresh();
      setMsg('Book updated.');
    } catch (e) { setErr(e.message); }
  }

  async function deleteBook(id) {
    if (!confirm('Delete book?')) return;
    try { await api.admin.deleteBook(password, id); await refresh(); } catch (e) { setErr(e.message); }
  }

  async function createBookSource(e) {
    e.preventDefault(); setErr('');
    try {
      await api.admin.createBookSource(password, { ...bsForm, book_id: Number(bsForm.book_id), source_id: Number(bsForm.source_id) });
      setBsForm({ book_id: '', source_id: '', official_url: '', direct_file_url: '', license: '', license_url: '', link_status: 'unknown', access_type: 'free' });
      await refresh();
      setMsg('Book source added.');
    } catch (e) { setErr(e.message); }
  }

  async function setReqStatus(id, status) {
    try { await api.admin.updateRequest(password, id, status); await refresh(); } catch (e) { setErr(e.message); }
  }

  if (!authed) return (
    <PageFade>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1>Admin</h1>
        <p className="muted" style={{ textAlign: 'center' }}>Enter the admin password to manage books, sources, and requests.</p>
        <form className="card" onSubmit={login}>
          {err && <div className="error">{err}</div>}
          <label>Admin password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <div style={{ marginTop: '.75rem', textAlign: 'center' }}><button type="submit">Login</button></div>
        </form>
      </div>
    </PageFade>
  );

  return (
    <PageFade>
      <div>
        <h1>Admin</h1>
        {msg && <div className="success">{msg}</div>}
        {err && <div className="error">{err}</div>}
        <div className="grid grid-2">
          <form className="card" onSubmit={createBook}>
            <h3>Add book</h3>
            <label>Title *</label><input value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} required />
            <label>Authors</label><input value={bookForm.authors} onChange={e => setBookForm({ ...bookForm, authors: e.target.value })} />
            <label>Edition</label><input value={bookForm.edition} onChange={e => setBookForm({ ...bookForm, edition: e.target.value })} />
            <label>Year</label><input value={bookForm.year} onChange={e => setBookForm({ ...bookForm, year: e.target.value })} />
            <label>Description</label><textarea value={bookForm.description} onChange={e => setBookForm({ ...bookForm, description: e.target.value })} />
            <label>Cover URL</label><input value={bookForm.cover_url} onChange={e => setBookForm({ ...bookForm, cover_url: e.target.value })} />
            <label>Featured</label><select value={bookForm.featured ? 'true' : 'false'} onChange={e => setBookForm({ ...bookForm, featured: e.target.value === 'true' })}><option value="false">No</option><option value="true">Yes</option></select>
            <label>Categories locked</label><select value={bookForm.categories_locked ? 'true' : 'false'} onChange={e => setBookForm({ ...bookForm, categories_locked: e.target.value === 'true' })}><option value="false">No</option><option value="true">Yes</option></select>
            <p className="small muted" style={{ marginTop: '.5rem' }}>When locked, import/seed will not change this book's categories.</p>
            <div style={{ marginTop: '.5rem' }}><button type="submit">Create book</button></div>
            <p className="small muted" style={{ marginTop: '.5rem' }}>Subjects/courses can be linked by editing DB seed or extending this UI. Book-source records require verified license and official URL.</p>
          </form>
          <form className="card" onSubmit={createBookSource}>
            <h3>Add book source</h3>
            <label>Book</label><select value={bsForm.book_id} onChange={e => setBsForm({ ...bsForm, book_id: e.target.value })} required><option value="">Select book</option>{books.map(b => <option key={b.id} value={b.id}>{b.id}: {b.title}</option>)}</select>
            <label>Source</label><select value={bsForm.source_id} onChange={e => setBsForm({ ...bsForm, source_id: e.target.value })} required><option value="">Select source</option>{sourcesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <label>Official URL *</label><input value={bsForm.official_url} onChange={e => setBsForm({ ...bsForm, official_url: e.target.value })} required />
            <label>Direct file URL</label><input value={bsForm.direct_file_url} onChange={e => setBsForm({ ...bsForm, direct_file_url: e.target.value })} />
            <label>License *</label><input value={bsForm.license} onChange={e => setBsForm({ ...bsForm, license: e.target.value })} required placeholder="e.g. CC BY 4.0" />
            <label>License URL</label><input value={bsForm.license_url} onChange={e => setBsForm({ ...bsForm, license_url: e.target.value })} />
            <label>Access type *</label><select value={bsForm.access_type} onChange={e => setBsForm({ ...bsForm, access_type: e.target.value })} required><option value="free">Free</option><option value="paid">Paid</option></select>
            <div style={{ marginTop: '.5rem' }}><button type="submit">Add source link</button></div>
          </form>
        </div>
        <section className="section card">
          <h3>Books</h3>
          <table>
            <thead><tr><th>ID</th><th>Title</th><th>Featured</th><th>Locked</th><th>Authors</th><th></th></tr></thead>
            <tbody>
              {books.map(b => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.title}</td>
                  <td>{b.featured ? 'Yes' : 'No'}</td>
                  <td>{b.categories_locked ? 'Yes' : 'No'}</td>
                  <td className="small">{b.authors}</td>
                  <td>
                    {editBookId === b.id ? (
                      <button className="secondary" onClick={cancelEdit}>Cancel</button>
                    ) : (
                      <button className="secondary" onClick={() => editBook(b.id)}>Edit</button>
                    )}
                    <button className="secondary" onClick={() => deleteBook(b.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {editBookId !== null && (
          <section className="section card">
            <h3>Edit book #{editBookId}</h3>
            <form className="card" onSubmit={saveEditBook}>
              <label>Title</label><input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
              <label>Authors</label><input value={editForm.authors} onChange={e => setEditForm({ ...editForm, authors: e.target.value })} />
              <label>Edition</label><input value={editForm.edition} onChange={e => setEditForm({ ...editForm, edition: e.target.value })} />
              <label>Year</label><input value={editForm.year} onChange={e => setEditForm({ ...editForm, year: e.target.value })} />
              <label>Description</label><textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              <label>Cover URL</label><input value={editForm.cover_url} onChange={e => setEditForm({ ...editForm, cover_url: e.target.value })} />
              <label>Featured</label><select value={editForm.featured ? 'true' : 'false'} onChange={e => setEditForm({ ...editForm, featured: e.target.value === 'true' })}><option value="false">No</option><option value="true">Yes</option></select>
              <label>Categories locked</label><select value={editForm.categories_locked ? 'true' : 'false'} onChange={e => setEditForm({ ...editForm, categories_locked: e.target.value === 'true' })}><option value="false">No</option><option value="true">Yes</option></select>
              <p className="small muted" style={{ marginTop: '.5rem' }}>When locked, import/seed will not change this book's categories.</p>
              <div style={{ marginTop: '.5rem' }}>
                <button type="submit">Save</button>
                <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          </section>
        )}
        <section className="section card">
          <h3>Requests</h3>
          <table>
            <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Notes</th><th>Action</th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.requested_title}</td>
                  <td>{r.status}</td>
                  <td className="small">{r.notes}</td>
                  <td>
                    <button className="secondary" onClick={() => setReqStatus(r.id, 'found')}>Found</button>{' '}
                    <button className="secondary" onClick={() => setReqStatus(r.id, 'rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="small muted" style={{ textAlign: 'center', marginTop: '1.25rem' }}>Loaded subjects: {subjects.map(s => s.name).join(', ') || 'none'} · courses: {courses.map(c => c.name).join(', ') || 'none'}</p>
      </div>
    </PageFade>
  );
}
