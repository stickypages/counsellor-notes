const initSqlJs = require('sql.js')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

let db
let dbFilePath
let SqlClass

// ── Initialize ────────────────────────────────────────────────────────────────

async function initialize(filePath) {
  dbFilePath = filePath

  // Resolve WASM path — works in both dev and packaged (asar.unpacked)
  let wasmPath
  try {
    const { app } = require('electron')
    wasmPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
      : path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  } catch {
    wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  }

  const SQL = await initSqlJs({ locateFile: () => wasmPath })
  SqlClass = SQL.Database

  if (fs.existsSync(filePath)) {
    const buf = fs.readFileSync(filePath)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')
  createTables()
  persistDb()
}

function persistDb() {
  const data = db.export()
  fs.writeFileSync(dbFilePath, Buffer.from(data))
}

// ── Low-level query helpers ───────────────────────────────────────────────────

function rows(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

function row(sql, params = []) {
  return rows(sql, params)[0] || null
}

// Run a write statement and return the last inserted rowid
function exec(sql, params = []) {
  db.run(sql, params)
  const id = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null
  persistDb()
  return id
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      dob        TEXT,
      phone      TEXT,
      email      TEXT,
      notes      TEXT DEFAULT '',
      pin_hash   TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id      INTEGER NOT NULL,
      date           TEXT NOT NULL,
      session_notes  TEXT DEFAULT '',
      outcomes       TEXT DEFAULT '',
      next_topics    TEXT DEFAULT '',
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `)
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyHash(password, stored) {
  const [salt, hash] = stored.split(':')
  const verify = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(verify, 'hex'), Buffer.from(hash, 'hex'))
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function isSetup() {
  return !!row("SELECT value FROM settings WHERE key = 'master_hash'")
}

function setupMasterPassword(password) {
  exec('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['master_hash', hashPassword(password)])
  return true
}

function verifyMasterPassword(password) {
  const r = row("SELECT value FROM settings WHERE key = 'master_hash'")
  if (!r) return false
  try { return verifyHash(password, r.value) } catch { return false }
}

function getBranding() {
  const businessName = row("SELECT value FROM settings WHERE key = 'business_name'")?.value || 'Counsellor Notes'
  const logoDataUrl = row("SELECT value FROM settings WHERE key = 'logo_data_url'")?.value || ''
  return { businessName, logoDataUrl }
}

function setBranding({ businessName, logoDataUrl }) {
  exec('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['business_name', businessName || 'Counsellor Notes'])
  exec('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['logo_data_url', logoDataUrl || ''])
  return getBranding()
}

// ── Clients ───────────────────────────────────────────────────────────────────

function getAllClients() {
  return rows('SELECT * FROM clients ORDER BY name ASC')
}

function getClient(id) {
  return row('SELECT * FROM clients WHERE id = ?', [id])
}

function createClient(data) {
  const { name, dob, phone, email, notes, pin } = data
  const pin_hash = pin ? hashPassword(String(pin)) : null
  const newId = exec(
    'INSERT INTO clients (name, dob, phone, email, notes, pin_hash) VALUES (?, ?, ?, ?, ?, ?)',
    [name, dob || null, phone || null, email || null, notes || '', pin_hash]
  )
  return getClient(newId)
}

function updateClient(id, data) {
  const current = getClient(id)
  if (!current) return null
  const { name, dob, phone, email, notes } = data
  let pin_hash = current.pin_hash
  if (data.pin !== undefined) {
    pin_hash = data.pin ? hashPassword(String(data.pin)) : null
  }
  exec(
    "UPDATE clients SET name=?, dob=?, phone=?, email=?, notes=?, pin_hash=?, updated_at=datetime('now') WHERE id=?",
    [name, dob || null, phone || null, email || null, notes || '', pin_hash, id]
  )
  return getClient(id)
}

function deleteClient(id) {
  exec('DELETE FROM clients WHERE id = ?', [id])
  return true
}

function verifyClientPin(id, pin) {
  const r = row('SELECT pin_hash FROM clients WHERE id = ?', [id])
  if (!r || !r.pin_hash) return true
  try { return verifyHash(String(pin), r.pin_hash) } catch { return false }
}

// ── Sessions ──────────────────────────────────────────────────────────────────

function getSessionsForClient(clientId) {
  return rows('SELECT * FROM sessions WHERE client_id = ? ORDER BY date DESC, created_at DESC', [clientId])
}

function getSession(id) {
  return row('SELECT * FROM sessions WHERE id = ?', [id])
}

function createSession(data) {
  const { client_id, date, session_notes, outcomes, next_topics } = data
  const newId = exec(
    'INSERT INTO sessions (client_id, date, session_notes, outcomes, next_topics) VALUES (?, ?, ?, ?, ?)',
    [client_id, date, session_notes || '', outcomes || '', next_topics || '']
  )
  return getSession(newId)
}

function updateSession(id, data) {
  const { date, session_notes, outcomes, next_topics } = data
  exec(
    "UPDATE sessions SET date=?, session_notes=?, outcomes=?, next_topics=?, updated_at=datetime('now') WHERE id=?",
    [date, session_notes || '', outcomes || '', next_topics || '', id]
  )
  return getSession(id)
}

function deleteSession(id) {
  exec('DELETE FROM sessions WHERE id = ?', [id])
  return true
}

// ── Backup ────────────────────────────────────────────────────────────────────

function exportTo(destPath) {
  persistDb()
  fs.copyFileSync(dbFilePath, destPath)
}

function importFrom(srcPath) {
  fs.copyFileSync(srcPath, dbFilePath)
  const buf = fs.readFileSync(dbFilePath)
  db.close()
  db = new SqlClass(buf)
  db.run('PRAGMA foreign_keys = ON')
  createTables()
  persistDb()
}

module.exports = {
  initialize,
  isSetup,
  setupMasterPassword,
  verifyMasterPassword,
  getBranding,
  setBranding,
  getAllClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  verifyClientPin,
  getSessionsForClient,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  exportTo,
  importFrom,
}
