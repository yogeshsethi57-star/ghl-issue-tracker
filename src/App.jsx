import { useState, useEffect } from 'react'
import { db } from './firebase'
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, orderBy, query, serverTimestamp
} from 'firebase/firestore'
import './App.css'

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export default function App() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', status: 'Open', priority: 'Medium', contact: '', resolution: '' })
  const [filter, setFilter] = useState('All')
  const [editId, setEditId] = useState(null)

  const fetchIssues = async () => {
    setLoading(true)
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { fetchIssues() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editId) {
      await updateDoc(doc(db, 'issues', editId), { ...form, updatedAt: serverTimestamp() })
      setEditId(null)
    } else {
      await addDoc(collection(db, 'issues'), { ...form, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    }
    setForm({ title: '', description: '', status: 'Open', priority: 'Medium', contact: '' })
    setShowForm(false)
    fetchIssues()
  }

  const handleEdit = (issue) => {
    setForm({ title: issue.title, description: issue.description, status: issue.status, priority: issue.priority, contact: issue.contact || '', resolution: issue.resolution || '' })
    setEditId(issue.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this issue?')) {
      await deleteDoc(doc(db, 'issues', id))
      fetchIssues()
    }
  }

  const handleStatusChange = async (id, status) => {
    await updateDoc(doc(db, 'issues', id), { status, updatedAt: serverTimestamp() })
    fetchIssues()
  }

  const filtered = filter === 'All' ? issues : issues.filter(i => i.status === filter)

  const priorityColor = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444', Critical: '#7c3aed' }
  const statusColor = { Open: '#3b82f6', 'In Progress': '#f59e0b', Resolved: '#22c55e', Closed: '#6b7280' }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>GHL Issue Tracker</h1>
            <p>GoHighLevel CRM — Bug & Issue Management</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', description: '', status: 'Open', priority: 'Medium', contact: '' }) }}>
            + New Issue
          </button>
        </div>
      </header>

      <main className="main">
        {/* Stats */}
        <div className="stats">
          {['All', ...STATUSES].map(s => (
            <button key={s} className={`stat-card ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              <span className="stat-num">{s === 'All' ? issues.length : issues.filter(i => i.status === s).length}</span>
              <span className="stat-label">{s}</span>
            </button>
          ))}
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>{editId ? 'Edit Issue' : 'New Issue'}</h2>
              <form onSubmit={handleSubmit}>
                <label>Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Brief description of the issue" />
                <label>Contact / GHL Account</label>
                <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="e.g. John Smith / Agency XYZ" />
                <label>Description</label>
                <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Steps to reproduce, expected vs actual..." />
                {editId && (
                  <>
                    <label>Developer Notes / Resolution</label>
                    <textarea rows={3} value={form.resolution} onChange={e => setForm({ ...form, resolution: e.target.value })} placeholder="What was done to fix this issue..." />
                  </>
                )}
                <div className="row">
                  <div>
                    <label>Priority</label>
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'} Issue</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Issues List */}
        {loading ? (
          <div className="empty">Loading issues...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No issues found. Click "+ New Issue" to add one.</div>
        ) : (
          <div className="issues">
            {filtered.map(issue => (
              <div key={issue.id} className="issue-card">
                <div className="issue-top">
                  <div className="issue-title">{issue.title}</div>
                  <div className="issue-actions">
                    <button className="btn-icon" onClick={() => handleEdit(issue)}>✏️</button>
                    <button className="btn-icon" onClick={() => handleDelete(issue.id)}>🗑️</button>
                  </div>
                </div>
                {issue.contact && <div className="issue-contact">👤 {issue.contact}</div>}
                {issue.description && <div className="issue-desc">{issue.description}</div>}
                {issue.resolution && <div className="issue-resolution">🔧 <strong>Dev Notes:</strong> {issue.resolution}</div>}
                <div className="issue-meta">
                  <span className="badge" style={{ background: priorityColor[issue.priority] }}>{issue.priority}</span>
                  <select
                    className="status-select"
                    value={issue.status}
                    style={{ borderColor: statusColor[issue.status], color: statusColor[issue.status] }}
                    onChange={e => handleStatusChange(issue.id, e.target.value)}
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <span className="issue-date">{issue.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Just now'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
