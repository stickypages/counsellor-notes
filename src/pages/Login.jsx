import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('checking') // checking | login | setup
  const [branding, setBranding] = useState({ businessName: 'Counsellor Notes', logoDataUrl: '' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.api.auth.isSetup().then((isSetup) => {
      setMode(isSetup ? 'login' : 'setup')
    })
    window.api.app.getBranding().then((data) => {
      if (data) setBranding(data)
    })
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const ok = await window.api.auth.verify(password)
    setLoading(false)
    if (ok) {
      login()
      navigate('/app')
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  const handleSetup = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    await window.api.auth.setup(password)
    login()
    navigate('/app')
  }

  if (mode === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950
                    flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          {branding.logoDataUrl ? (
            <img
              src={branding.logoDataUrl}
              alt="Business logo"
              className="w-16 h-16 object-cover rounded-2xl mx-auto mb-4 border border-white/20"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16
                            bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-900/50">
              <Lock size={28} className="text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white tracking-tight">{branding.businessName || 'Counsellor Notes'}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {mode === 'setup' ? 'Create your secure workspace' : 'Sign in to continue'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {mode === 'setup' ? (
            <form onSubmit={handleSetup} className="space-y-5">
              <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl">
                <ShieldCheck size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-indigo-700">
                  Set a master password to protect all client files. Store it somewhere safe — it cannot be recovered.
                </p>
              </div>

              <PasswordInput
                label="Master Password"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                placeholder="Min. 8 characters"
                autoFocus
              />
              <PasswordInput
                label="Confirm Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                placeholder="Repeat password"
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                           py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Setting up…' : 'Create Workspace'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-0.5">Welcome back</h2>
                <p className="text-sm text-slate-500">Enter your master password to unlock.</p>
              </div>

              <PasswordInput
                label="Password"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                placeholder="Enter your password"
                autoFocus
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                           py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Unlocking…' : 'Unlock'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-5">
          All data stored locally on this device
        </p>
      </div>
    </div>
  )
}

function PasswordInput({ label, value, onChange, show, onToggle, placeholder, autoFocus }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-11
                     text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-transparent transition"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}
