import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AppLayout from './pages/AppLayout'
import ClientDetail from './pages/ClientDetail'
import SessionEditor from './pages/SessionEditor'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* App shell with sidebar */}
          <Route
            path="/app"
            element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
          >
            <Route index element={<WelcomeScreen />} />
            <Route path="client/:id" element={<ClientDetail />} />
          </Route>

          {/* Full-screen session editor */}
          <Route
            path="/app/client/:clientId/session/new"
            element={<ProtectedRoute><SessionEditor /></ProtectedRoute>}
          />
          <Route
            path="/app/client/:clientId/session/:sessionId"
            element={<ProtectedRoute><SessionEditor /></ProtectedRoute>}
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div>
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            className="w-10 h-10 text-slate-300">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-600 mb-2">Select a Client</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Choose a client from the sidebar to view their sessions, or add a new client to get started.
        </p>
      </div>
    </div>
  )
}
