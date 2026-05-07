import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import Modal from '../components/Modal'
import { formatDate, stripHtml, today } from '../utils'
import {
  Plus, Pencil, Trash2, Printer, FileText,
  Calendar, ChevronRight, Phone, Mail, Lock, AlertTriangle,
} from 'lucide-react'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { reloadClients } = useOutletContext()

  const [client, setClient] = useState(null)
  const [sessions, setSessions] = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteClient, setShowDeleteClient] = useState(false)
  const [deleteSessionId, setDeleteSessionId] = useState(null)

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      window.api.clients.get(Number(id)),
      window.api.sessions.getForClient(Number(id)),
    ])
    setClient(c)
    setSessions(s)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleDeleteClient = async () => {
    await window.api.clients.delete(Number(id))
    reloadClients()
    navigate('/app')
  }

  const handleDeleteSession = async () => {
    await window.api.sessions.delete(deleteSessionId)
    setDeleteSessionId(null)
    load()
  }

  const handlePrintAll = () => {
    window.print()
  }

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* ── Screen view ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col no-print">

        {/* Client header */}
        <div className="bg-white border-b border-slate-100 px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center
                              text-indigo-700 text-2xl font-bold flex-shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {client.name}
                  {client.pin_hash && (
                    <Lock size={14} className="text-slate-400" />
                  )}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {client.dob && (
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Calendar size={13} />
                      {formatDate(client.dob)}
                    </span>
                  )}
                  {client.phone && (
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Phone size={13} />
                      {client.phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Mail size={13} />
                      {client.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handlePrintAll}
                title="Print all sessions"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600
                           border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Printer size={14} />
                Print All
              </button>
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600
                           border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteClient(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500
                           border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>

          {client.notes && (
            <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
              {client.notes}
            </p>
          )}
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-800">
              Sessions
              {sessions.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">({sessions.length})</span>
              )}
            </h2>
            <button
              onClick={() => navigate(`/app/client/${id}/session/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700
                         text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={15} />
              New Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No sessions yet</p>
              <p className="text-slate-400 text-sm mt-1">Add the first session to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  clientId={id}
                  onDelete={() => setDeleteSessionId(session.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Print view (hidden on screen, visible when printing) ────────────── */}
      <div className="print-only print-page">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 700, margin: 0 }}>{client.name}</h1>
          {client.dob && <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '10pt' }}>
            Date of Birth: {formatDate(client.dob)}
          </p>}
          {client.phone && <p style={{ margin: 0, color: '#64748b', fontSize: '10pt' }}>Phone: {client.phone}</p>}
          {client.email && <p style={{ margin: 0, color: '#64748b', fontSize: '10pt' }}>Email: {client.email}</p>}
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '9pt' }}>
            Printed: {formatDate(today())} — Confidential
          </p>
        </div>

        {sessions.map((session) => (
          <div key={session.id} style={{ marginBottom: 32, pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '13pt', fontWeight: 700, margin: '0 0 4px', color: '#1e293b' }}>
              Session — {formatDate(session.date)}
            </h2>
            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 12px' }} />

            {session.session_notes && (
              <>
                <p className="print-section-title">Session Notes</p>
                <div
                  className="print-content"
                  dangerouslySetInnerHTML={{ __html: session.session_notes }}
                />
              </>
            )}
            {session.outcomes && (
              <>
                <p className="print-section-title">Outcomes</p>
                <div
                  className="print-content"
                  dangerouslySetInnerHTML={{ __html: session.outcomes }}
                />
              </>
            )}
            {session.next_topics && (
              <>
                <p className="print-section-title">For Next Session</p>
                <div
                  className="print-content"
                  dangerouslySetInnerHTML={{ __html: session.next_topics }}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}

      {showEdit && (
        <EditClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={() => { load(); reloadClients(); setShowEdit(false) }}
        />
      )}

      {showDeleteClient && (
        <ConfirmModal
          title="Delete Client"
          message={`Delete "${client.name}" and all their sessions? This cannot be undone.`}
          confirmLabel="Delete Client"
          onClose={() => setShowDeleteClient(false)}
          onConfirm={handleDeleteClient}
          danger
        />
      )}

      {deleteSessionId && (
        <ConfirmModal
          title="Delete Session"
          message="Delete this session permanently?"
          confirmLabel="Delete Session"
          onClose={() => setDeleteSessionId(null)}
          onConfirm={handleDeleteSession}
          danger
        />
      )}
    </>
  )
}

// ── Session Card ───────────────────────────────────────────────────────────────

function SessionCard({ session, clientId, onDelete }) {
  const navigate = useNavigate()
  const preview = stripHtml(session.session_notes).slice(0, 160)

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-200
                    hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-600 mb-1">
            {formatDate(session.date)}
          </p>
          {preview ? (
            <p className="text-sm text-slate-600 line-clamp-2">{preview}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">No notes recorded</p>
          )}

          {/* Badges */}
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {session.outcomes && stripHtml(session.outcomes) && (
              <Badge color="green">Outcomes recorded</Badge>
            )}
            {session.next_topics && stripHtml(session.next_topics) && (
              <Badge color="amber">Topics for next time</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => navigate(`/app/client/${clientId}/session/${session.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600
                       bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors font-medium"
          >
            Open
            <ChevronRight size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50
                       rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Badge({ color, children }) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

// ── Edit Client Modal ──────────────────────────────────────────────────────────

function EditClientModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: client.name || '',
    dob: client.dob || '',
    phone: client.phone || '',
    email: client.email || '',
    notes: client.notes || '',
    pin: '',
  })

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await window.api.clients.update(client.id, form)
    onSaved()
  }

  return (
    <Modal onClose={onClose} title="Edit Client" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name *" type="text" value={form.name} onChange={set('name')} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth" type="date" value={form.dob} onChange={set('dob')} />
          <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="Optional" />
        </div>
        <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="Optional" />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes / Background</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="General background notes…"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 resize-none
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       transition placeholder-slate-400"
          />
        </div>
        <Field
          label={client.pin_hash ? 'Change PIN (leave blank to keep existing)' : 'File PIN (optional)'}
          type="password"
          value={form.pin}
          onChange={set('pin')}
          placeholder={client.pin_hash ? 'Enter new PIN or leave blank' : 'Optional'}
        />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5
                       rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!form.name.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                       py-2.5 rounded-xl transition-colors disabled:opacity-50">
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, onClose, onConfirm, danger }) {
  return (
    <Modal onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5
                       rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-semibold py-2.5 rounded-xl transition-colors text-white ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                   transition placeholder-slate-400"
      />
    </div>
  )
}
