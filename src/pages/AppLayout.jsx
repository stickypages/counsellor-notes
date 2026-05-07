import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import {
  Plus, Search, Lock, LogOut, Download, Upload,
  ChevronRight, Users, RefreshCw, Image,
} from 'lucide-react'
import { formatDate } from '../utils'

export default function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { id: activeId } = useParams()

  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [showAddClient, setShowAddClient] = useState(false)
  const [pinPrompt, setPinPrompt] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [version, setVersion] = useState('')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [showBranding, setShowBranding] = useState(false)
  const [branding, setBranding] = useState({ businessName: 'Counsellor Notes', logoDataUrl: '' })

  const loadClients = useCallback(async () => {
    const data = await window.api.clients.getAll()
    setClients(data)
  }, [])

  useEffect(() => {
    loadClients()
    window.api.app.getVersion().then(setVersion)
    if (typeof window.api?.app?.getBranding === 'function') {
      window.api.app.getBranding().then((data) => {
        if (data) setBranding(data)
      })
    }
    window.api.onUpdateAvailable(() => {
      setUpdateAvailable(true)
    })
  }, [loadClients])

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleClientClick = (client) => {
    if (client.pin_hash) {
      setPinPrompt(client)
      setPin('')
      setPinError('')
    } else {
      navigate(`/app/client/${client.id}`)
    }
  }

  const handlePinSubmit = async (e) => {
    e.preventDefault()
    const ok = await window.api.clients.verifyPin(pinPrompt.id, pin)
    if (ok) {
      const id = pinPrompt.id
      setPinPrompt(null)
      navigate(`/app/client/${id}`)
    } else {
      setPinError('Incorrect PIN.')
      setPin('')
    }
  }

  const handleExport = () => window.api.backup.export()
  const handleImport = async () => {
    const result = await window.api.backup.import()
    if (result.success) {
      loadClients()
      navigate('/app')
    }
  }

  const handleDownloadUpdate = () => window.api.openUpdatePage()

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50 print:block print:h-auto print:overflow-visible print:bg-white">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 bg-slate-900 no-print" style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', height: '100vh' }}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            {branding.logoDataUrl ? (
              <img
                src={branding.logoDataUrl}
                alt="Business logo"
                className="w-8 h-8 rounded-lg object-cover border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock size={15} className="text-white" />
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-sm leading-tight truncate max-w-[180px]">{branding.businessName || 'Counsellor Notes'}</p>
              {version && <p className="text-slate-500 text-xs">v{version}</p>}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-700/60">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 placeholder-slate-500 rounded-lg
                         pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Client list scrollable area */}
        <div className="overflow-y-auto py-2">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider px-4 py-1.5">
            Clients {filtered.length > 0 && `· ${filtered.length}`}
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Users size={22} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                {search ? 'No matches found' : 'No clients yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {filtered.map((client) => {
                const isActive = String(client.id) === String(activeId)
                return (
                  <button
                    key={client.id}
                    onClick={() => handleClientClick(client)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg
                               transition-colors group ${
                                 isActive
                                   ? 'bg-indigo-600'
                                   : 'hover:bg-slate-800'
                               }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                    text-sm font-semibold flex-shrink-0 ${
                                      isActive
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-slate-700 text-slate-300'
                                    }`}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}>
                        {client.name}
                      </p>
                      {client.dob && (
                        <p className={`text-xs truncate ${
                          isActive ? 'text-indigo-200' : 'text-slate-500'
                        }`}>
                          {formatDate(client.dob)}
                        </p>
                      )}
                    </div>
                    {client.pin_hash && (
                      <Lock size={11} className={isActive ? 'text-indigo-300' : 'text-slate-600'} />
                    )}
                    <ChevronRight size={13} className={`flex-shrink-0 ${
                      isActive ? 'text-indigo-200' : 'text-slate-600 group-hover:text-slate-400'
                    }`} />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex-shrink-0 p-3 border-t border-slate-700/60 space-y-1.5">
          {/* Update banner */}
          {updateAvailable && (
            <div className="px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
                <RefreshCw size={13} />
                An update is available.
              </div>
              <button
                onClick={handleDownloadUpdate}
                className="w-full px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-semibold rounded-lg transition-colors"
              >
                Download Update
              </button>
            </div>
          )}

          {/* Add client */}
          <button
            onClick={() => setShowAddClient(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700
                       text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Add Client
          </button>

          <button
            onClick={() => setShowBranding(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700
                       text-slate-200 text-sm font-medium rounded-lg transition-colors"
          >
            <Image size={15} />
            Branding
          </button>

          {/* Backup / Restore / Lock */}
          <div className="flex gap-1">
            <SideBtn onClick={handleExport} title="Backup database">
              <Download size={13} />
              <span>Backup</span>
            </SideBtn>
            <SideBtn onClick={handleImport} title="Restore from backup">
              <Upload size={13} />
              <span>Restore</span>
            </SideBtn>
            <SideBtn
              onClick={() => { logout(); navigate('/') }}
              title="Lock & sign out"
              danger
            >
              <LogOut size={13} />
              <span>Lock</span>
            </SideBtn>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="min-h-0 flex-1 overflow-y-auto flex flex-col print:w-full print:overflow-visible print:block">
        <Outlet context={{ reloadClients: loadClients }} />
      </main>

      {/* ── Add Client Modal ──────────────────────────────────────────────────── */}
      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onCreated={(client) => {
            loadClients()
            setShowAddClient(false)
            navigate(`/app/client/${client.id}`)
          }}
        />
      )}

      {/* ── PIN Prompt ────────────────────────────────────────────────────────── */}
      {pinPrompt && (
        <Modal onClose={() => setPinPrompt(null)} title={`Unlock — ${pinPrompt.name}`} size="sm">
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <p className="text-sm text-slate-500">
              This client file is PIN-protected. Enter the PIN to continue.
            </p>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center
                         text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {pinError && <p className="text-red-500 text-sm text-center">{pinError}</p>}
            <button
              type="submit"
              disabled={!pin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                         py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              Unlock
            </button>
          </form>
        </Modal>
      )}

      {showBranding && (
        <BrandingModal
          branding={branding}
          onClose={() => setShowBranding(false)}
          onSaved={(nextBranding) => {
            setBranding(nextBranding)
            setShowBranding(false)
          }}
        />
      )}
    </div>
  )
}

function BrandingModal({ branding, onClose, onSaved }) {
  const [businessName, setBusinessName] = useState(branding.businessName || 'Counsellor Notes')
  const [logoDataUrl, setLogoDataUrl] = useState(branding.logoDataUrl || '')
  const [error, setError] = useState('')

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be 2MB or smaller.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ''))
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const save = async (e) => {
    e.preventDefault()
    if (typeof window.api?.app?.setBranding !== 'function') {
      setError('Please restart the app to use branding settings.')
      return
    }
    const updated = await window.api.app.setBranding({
      businessName: businessName.trim() || 'Counsellor Notes',
      logoDataUrl,
    })
    onSaved(updated)
  }

  return (
    <Modal onClose={onClose} title="Branding" size="md">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Name</label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            maxLength={80}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo</label>
          <div className="flex items-center gap-3">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo preview" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200" />
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFile}
                className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3
                           file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700
                           hover:file:bg-slate-200"
              />
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG, or WEBP. Max 2MB.</p>
            </div>
          </div>
          {logoDataUrl && (
            <button
              type="button"
              onClick={() => setLogoDataUrl('')}
              className="mt-2 text-xs text-slate-500 hover:text-red-500"
            >
              Remove logo
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl"
          >
            Save Branding
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Add Client Modal ───────────────────────────────────────────────────────────

function AddClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', dob: '', phone: '', email: '', pin: '' })

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const client = await window.api.clients.create(form)
    onCreated(client)
  }

  return (
    <Modal onClose={onClose} title="Add New Client">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name *" type="text" value={form.name} onChange={set('name')} autoFocus placeholder="Client full name" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth" type="date" value={form.dob} onChange={set('dob')} />
          <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="Optional" />
        </div>
        <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="Optional" />
        <Field
          label="File PIN (optional)"
          type="password"
          value={form.pin}
          onChange={set('pin')}
          placeholder="Lock this file with a PIN"
        />
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5
                       rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.name.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                       py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            Add Client
          </button>
        </div>
      </form>
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

function SideBtn({ onClick, title, danger, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg
                  text-xs transition-colors ${
                    danger
                      ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
    >
      {children}
    </button>
  )
}
