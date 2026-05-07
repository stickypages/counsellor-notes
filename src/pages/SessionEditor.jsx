import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import RichEditor from '../components/RichEditor'
import { formatDate, today } from '../utils'
import { ArrowLeft, Save, Printer, CheckCircle, Circle, Plus, Trash2 } from 'lucide-react'

function parseList(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.text === 'string')
      .map((item) => ({ text: item.text.trim(), done: !!item.done }))
      .filter((item) => item.text)
  } catch {
    return []
  }
}

function parseLegacyChecklist(html) {
  if (!html) return []

  const liMatches = [...html.matchAll(/<li[^>]*>(.*?)<\/li>/gis)]
  const rawItems = liMatches.length > 0
    ? liMatches.map((m) => m[1])
    : html.split(/<br\s*\/?>(?:\n)?|\n/gi)

  const cleaned = rawItems
    .map((line) => String(line)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean)

  return cleaned.map((text) => {
    const done = /^([☑✅]|\[x\])/i.test(text)
    const normalized = text.replace(/^([☑☐✅]|\[[x ]\])\s*/i, '')
    return { text: normalized, done }
  }).filter((item) => item.text)
}

function mergeLists(sessions, key, currentId) {
  const map = new Map()
  for (const session of sessions) {
    if (session.id === currentId) continue
    const legacyKey = key === 'outcomes_list' ? 'outcomes' : 'next_topics'
    const parsed = parseList(session[key])
    const items = parsed.length ? parsed : parseLegacyChecklist(session[legacyKey])
    for (const item of items) {
      if (!map.has(item.text)) {
        map.set(item.text, { text: item.text, done: item.done })
      } else if (item.done) {
        map.get(item.text).done = true
      }
    }
  }
  return Array.from(map.values())
}

function listToHtml(list) {
  if (!list.length) return ''
  const rows = list
    .map((item) => {
      const mark = item.done ? '☑' : '☐'
      const safeText = item.text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
      return `<li>${mark} ${safeText}</li>`
    })
    .join('')
  return `<ul>${rows}</ul>`
}

export default function SessionEditor() {
  const { clientId, sessionId } = useParams()
  const navigate = useNavigate()
  const isNew = !sessionId

  const [client, setClient] = useState(null)
  const [date, setDate] = useState(today())
  const [sessionNotes, setSessionNotes] = useState('')
  const [outcomesList, setOutcomesList] = useState([])
  const [goalsList, setGoalsList] = useState([])
  const [saved, setSaved] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [sessionData, setSessionData] = useState(null)

  const inFlightRef = useRef(false)

  const markDirty = useCallback((setter) => (val) => {
    setter(val)
    setDirty(true)
    setSaved(false)
  }, [])

  useEffect(() => {
    let alive = true

    async function loadAll() {
      const [nextClient, sessions, currentFromDb] = await Promise.all([
        window.api.clients.get(Number(clientId)),
        window.api.sessions.getForClient(Number(clientId)),
        !isNew ? window.api.sessions.get(Number(sessionId)) : Promise.resolve(null),
      ])
      if (!alive) return
      setClient(nextClient)

      const currentSession = !isNew ? (currentFromDb || sessions.find((s) => String(s.id) === String(sessionId)) || null) : null

      const mergedOutcomes = mergeLists(sessions, 'outcomes_list', currentSession?.id)
      const mergedGoals = mergeLists(sessions, 'goals_list', currentSession?.id)

      if (currentSession) {
        setSessionData(currentSession)
        setDate(currentSession.date)
        setSessionNotes(currentSession.session_notes || '')

        const currentOutcomes = (() => {
          const parsed = parseList(currentSession.outcomes_list)
          return parsed.length ? parsed : parseLegacyChecklist(currentSession.outcomes)
        })()
        const currentGoals = (() => {
          const parsed = parseList(currentSession.goals_list)
          return parsed.length ? parsed : parseLegacyChecklist(currentSession.next_topics)
        })()

        setOutcomesList(currentOutcomes.length ? currentOutcomes : mergedOutcomes)
        setGoalsList(currentGoals.length ? currentGoals : mergedGoals)
      } else {
        setDate(today())
        setSessionNotes('')
        setOutcomesList(mergedOutcomes)
        setGoalsList(mergedGoals)
      }

      setDirty(false)
      setSaved(true)
    }

    loadAll()
    return () => { alive = false }
  }, [clientId, sessionId, isNew])

  const persistSession = useCallback(async (origin = 'manual') => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setSaving(true)

    const outcomes = outcomesList.filter((item) => item.text.trim())
    const goals = goalsList.filter((item) => item.text.trim())

    const payload = {
      client_id: Number(clientId),
      date,
      session_notes: sessionNotes,
      outcomes: listToHtml(outcomes),
      next_topics: listToHtml(goals),
      outcomes_list: JSON.stringify(outcomes),
      goals_list: JSON.stringify(goals),
    }

    try {
      if (isNew && !sessionData?.id) {
        const created = await window.api.sessions.create(payload)
        setSessionData(created)
        navigate(`/app/client/${clientId}/session/${created.id}`, { replace: true })
      } else {
        const idToUpdate = Number(sessionData?.id || sessionId)
        const updated = await window.api.sessions.update(idToUpdate, payload)
        setSessionData(updated)
      }
      setDirty(false)
      setSaved(true)
    } finally {
      inFlightRef.current = false
      setSaving(false)
    }
  }, [clientId, date, goalsList, isNew, navigate, outcomesList, sessionData?.id, sessionId, sessionNotes])

  useEffect(() => {
    if (!dirty) return
    const timer = setInterval(() => {
      persistSession('auto')
    }, 15000)
    return () => clearInterval(timer)
  }, [dirty, persistSession])

  const handlePrint = () => window.print()
  const handleBack = () => navigate(`/app/client/${clientId}`)

  const outcomesText = useMemo(() => outcomesList.map((i) => `${i.done ? '[x]' : '[ ]'} ${i.text}`).join('\n'), [outcomesList])
  const goalsText = useMemo(() => goalsList.map((i) => `${i.done ? '[x]' : '[ ]'} ${i.text}`).join('\n'), [goalsList])

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col no-print">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0">
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <div className="min-w-0">
              <p className="text-sm text-slate-500 truncate">{client?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {saved && !dirty ? (
              <span className="flex items-center gap-1.5 text-xs text-green-600"><CheckCircle size={14} />Saved</span>
            ) : dirty ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-500"><Circle size={14} />Auto-saving every 15s</span>
            ) : null}

            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Printer size={14} />
              Print / PDF
            </button>

            <button onClick={() => persistSession('manual')} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50">
              <Save size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-600 w-28 flex-shrink-0">Session Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setDirty(true); setSaved(false) }}
                className="border border-slate-200 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-sm">
              <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                <p className="text-sm font-semibold text-indigo-800">Session Notes</p>
                <p className="text-xs text-indigo-500">Detailed notes for this session</p>
              </div>
              <div className="p-1">
                <RichEditor
                  value={sessionNotes}
                  onChange={markDirty(setSessionNotes)}
                  placeholder="Document what was discussed, observations, and client responses..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <ChecklistPanel
              title="Outcomes"
              subtitle="Carried over across sessions"
              items={outcomesList}
              setItems={setOutcomesList}
              onDirty={() => { setDirty(true); setSaved(false) }}
              color="green"
            />
            <ChecklistPanel
              title="Goals"
              subtitle="Track and carry forward"
              items={goalsList}
              setItems={setGoalsList}
              onDirty={() => { setDirty(true); setSaved(false) }}
              color="amber"
            />
          </div>
        </div>
      </div>

      <div className="print-only print-page">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: '16pt', fontWeight: 700, margin: 0 }}>{client?.name}</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '10pt' }}>Session Date: {formatDate(date)}</p>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '9pt' }}>Printed: {formatDate(today())} — Confidential</p>
        </div>

        {sessionNotes && (
          <>
            <p className="print-section-title">Session Notes</p>
            <div className="print-content" dangerouslySetInnerHTML={{ __html: sessionNotes }} />
          </>
        )}

        {outcomesText && (
          <>
            <p className="print-section-title">Outcomes</p>
            <pre className="print-content" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{outcomesText}</pre>
          </>
        )}

        {goalsText && (
          <>
            <p className="print-section-title">Goals</p>
            <pre className="print-content" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{goalsText}</pre>
          </>
        )}
      </div>
    </>
  )
}

function ChecklistPanel({ title, subtitle, items, setItems, onDirty, color }) {
  const [draft, setDraft] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  const palette = color === 'green'
    ? { border: 'border-green-100', bg: 'bg-green-50', title: 'text-green-800', subtitle: 'text-green-500', btn: 'bg-green-600 hover:bg-green-700' }
    : { border: 'border-amber-100', bg: 'bg-amber-50', title: 'text-amber-800', subtitle: 'text-amber-500', btn: 'bg-amber-600 hover:bg-amber-700' }

  const toggle = (idx) => {
    const next = items.map((item, i) => (i === idx ? { ...item, done: !item.done } : item))
    setItems(next)
    onDirty()
  }

  const remove = (idx) => {
    const next = items.filter((_, i) => i !== idx)
    setItems(next)
    onDirty()
  }

  const add = () => {
    const text = draft.trim()
    if (!text) return
    if (items.some((i) => i.text.toLowerCase() === text.toLowerCase())) {
      setDraft('')
      return
    }
    setItems([...items, { text, done: false }])
    setDraft('')
    onDirty()
  }

  const indexed = items.map((item, idx) => ({ ...item, idx }))
  const activeItems = indexed.filter((item) => !item.done)
  const completedItems = indexed.filter((item) => item.done)

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${palette.border}`}>
      <div className={`px-4 py-3 border-b ${palette.bg} ${palette.border}`}>
        <p className={`text-sm font-semibold ${palette.title}`}>{title}</p>
        <p className={`text-xs ${palette.subtitle}`}>{subtitle}</p>
      </div>

      <div className="p-3 space-y-2 max-h-[44vh] overflow-y-auto">
        {activeItems.length === 0 && (
          <p className="text-xs text-slate-400">No open items.</p>
        )}

        {activeItems.map((item) => (
          <div key={`${item.text}-${item.idx}`} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5">
            <input type="checkbox" checked={item.done} onChange={() => toggle(item.idx)} className="w-4 h-4" />
            <span className={`text-sm flex-1 ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
            <button onClick={() => remove(item.idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        ))}

        {completedItems.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className="text-[11px] uppercase tracking-wide text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showCompleted ? 'Hide' : 'Show'} Completed ({completedItems.length})
            </button>

            {showCompleted && (
              <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                {completedItems.map((item) => (
                  <div key={`${item.text}-${item.idx}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                    <input type="checkbox" checked={item.done} onChange={() => toggle(item.idx)} className="w-4 h-4" />
                    <span className="text-sm flex-1 line-through text-slate-400">{item.text}</span>
                    <button onClick={() => remove(item.idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={`Add ${title.toLowerCase()} item...`}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button onClick={add} className={`px-3 py-2 rounded-lg text-white ${palette.btn}`}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
