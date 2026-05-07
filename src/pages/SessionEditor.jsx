import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import RichEditor from '../components/RichEditor'
import { formatDate, today } from '../utils'
import { ArrowLeft, Save, Printer, CheckCircle, Circle } from 'lucide-react'

export default function SessionEditor() {
  const { clientId, sessionId } = useParams()
  const navigate = useNavigate()
  const isNew = !sessionId

  const [client, setClient] = useState(null)
  const [date, setDate] = useState(today())
  const [sessionNotes, setSessionNotes] = useState('')
  const [outcomes, setOutcomes] = useState('')
  const [nextTopics, setNextTopics] = useState('')
  const [saved, setSaved] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [sessionData, setSessionData] = useState(null)

  // Track dirty state
  const [dirty, setDirty] = useState(false)

  const markDirty = useCallback((setter) => (val) => {
    setter(val)
    setDirty(true)
    setSaved(false)
  }, [])

  useEffect(() => {
    window.api.clients.get(Number(clientId)).then(setClient)

    if (!isNew) {
      window.api.sessions.get(Number(sessionId)).then((s) => {
        if (s) {
          setSessionData(s)
          setDate(s.date)
          setSessionNotes(s.session_notes || '')
          setOutcomes(s.outcomes || '')
          setNextTopics(s.next_topics || '')
          setDirty(false)
          setSaved(true)
        }
      })
    }
  }, [clientId, sessionId, isNew])

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      client_id: Number(clientId),
      date,
      session_notes: sessionNotes,
      outcomes,
      next_topics: nextTopics,
    }

    if (isNew) {
      const created = await window.api.sessions.create(payload)
      setSessionData(created)
      // Replace URL so back-navigation works correctly
      navigate(`/app/client/${clientId}/session/${created.id}`, { replace: true })
    } else {
      const updated = await window.api.sessions.update(Number(sessionId), payload)
      setSessionData(updated)
    }

    setDirty(false)
    setSaved(true)
    setSaving(false)
  }

  const handlePrint = () => window.print()

  const handleBack = () => navigate(`/app/client/${clientId}`)

  return (
    <>
      {/* ── Screen layout ────────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-slate-50 flex flex-col no-print">

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-3
                        flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800
                         transition-colors flex-shrink-0"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <div className="min-w-0">
              <p className="text-sm text-slate-500 truncate">
                {client?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Save status */}
            {saved && !dirty ? (
              <span className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle size={14} />
                Saved
              </span>
            ) : dirty ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-500">
                <Circle size={14} />
                Unsaved changes
              </span>
            ) : null}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600
                         border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer size={14} />
              Print / PDF
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold
                         bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg
                         transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 space-y-6">

          {/* Date */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-600 w-28 flex-shrink-0">
              Session Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setDirty(true); setSaved(false) }}
              className="border border-slate-200 rounded-xl px-4 py-2 text-slate-800
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         transition"
            />
          </div>

          {/* Session Notes */}
          <EditorSection
            label="Session Notes"
            color="indigo"
            description="What was discussed during this session"
            value={sessionNotes}
            onChange={markDirty(setSessionNotes)}
            placeholder="Document what was discussed, observations, client responses…"
          />

          {/* Outcomes */}
          <EditorSection
            label="Outcomes"
            color="green"
            description="Progress made, goals achieved, key takeaways"
            value={outcomes}
            onChange={markDirty(setOutcomes)}
            placeholder="What was achieved? Any breakthroughs or progress noted…"
          />

          {/* Next Session Topics */}
          <EditorSection
            label="For Next Session"
            color="amber"
            description="Topics, tasks or goals for the next appointment"
            value={nextTopics}
            onChange={markDirty(setNextTopics)}
            placeholder="What to follow up on, homework assigned, topics to revisit…"
          />

        </div>
      </div>

      {/* ── Print layout ─────────────────────────────────────────────────────── */}
      <div className="print-only print-page">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: '16pt', fontWeight: 700, margin: 0 }}>{client?.name}</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '10pt' }}>
            Session Date: {formatDate(date)}
          </p>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '9pt' }}>
            Printed: {formatDate(today())} — Confidential
          </p>
        </div>

        {sessionNotes && (
          <>
            <p className="print-section-title">Session Notes</p>
            <div className="print-content" dangerouslySetInnerHTML={{ __html: sessionNotes }} />
          </>
        )}
        {outcomes && (
          <>
            <p className="print-section-title">Outcomes</p>
            <div className="print-content" dangerouslySetInnerHTML={{ __html: outcomes }} />
          </>
        )}
        {nextTopics && (
          <>
            <p className="print-section-title">For Next Session</p>
            <div className="print-content" dangerouslySetInnerHTML={{ __html: nextTopics }} />
          </>
        )}
      </div>
    </>
  )
}

// ── Editor Section ─────────────────────────────────────────────────────────────

const sectionColors = {
  indigo: {
    border: 'border-indigo-100',
    header: 'bg-indigo-50 border-b border-indigo-100',
    dot: 'bg-indigo-500',
    label: 'text-indigo-800',
    desc: 'text-indigo-400',
  },
  green: {
    border: 'border-green-100',
    header: 'bg-green-50 border-b border-green-100',
    dot: 'bg-green-500',
    label: 'text-green-800',
    desc: 'text-green-400',
  },
  amber: {
    border: 'border-amber-100',
    header: 'bg-amber-50 border-b border-amber-100',
    dot: 'bg-amber-500',
    label: 'text-amber-800',
    desc: 'text-amber-400',
  },
}

function EditorSection({ label, color, description, value, onChange, placeholder }) {
  const c = sectionColors[color]
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${c.border}`}>
      <div className={`px-5 py-3 flex items-center gap-2.5 ${c.header}`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
        <div>
          <p className={`text-sm font-semibold ${c.label}`}>{label}</p>
          <p className={`text-xs ${c.desc}`}>{description}</p>
        </div>
      </div>
      <div className="p-1">
        <RichEditor value={value} onChange={onChange} placeholder={placeholder} />
      </div>
    </div>
  )
}
