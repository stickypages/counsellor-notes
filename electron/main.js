const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const db = require('./db')
const packageJson = require('../package.json')

let mainWindow

function getReleasePageUrl() {
  const publishConfig = packageJson?.build?.publish
  const githubPublish = Array.isArray(publishConfig) ? publishConfig[0] : publishConfig
  const owner = githubPublish?.owner || 'stickypages'
  const repo = githubPublish?.repo || packageJson?.name || 'counsellor-notes'
  return `https://github.com/${owner}/${repo}/releases/latest`
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    title: 'Counsellor Notes',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(async () => {
  const dbPath = path.join(app.getPath('userData'), 'counsellor-notes.db')
  await db.initialize(dbPath)

  autoUpdater.autoDownload = false

  createWindow()

  if (app.isPackaged) {
    autoUpdater.checkForUpdates()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── Auth ─────────────────────────────────────────────────────────────────────
ipcMain.handle('auth:isSetup', () => db.isSetup())
ipcMain.handle('auth:setup', (_e, password) => db.setupMasterPassword(password))
ipcMain.handle('auth:verify', (_e, password) => db.verifyMasterPassword(password))

// ── Clients ───────────────────────────────────────────────────────────────────
ipcMain.handle('clients:getAll', () => db.getAllClients())
ipcMain.handle('clients:get', (_e, id) => db.getClient(id))
ipcMain.handle('clients:create', (_e, data) => db.createClient(data))
ipcMain.handle('clients:update', (_e, id, data) => db.updateClient(id, data))
ipcMain.handle('clients:delete', (_e, id) => db.deleteClient(id))
ipcMain.handle('clients:verifyPin', (_e, id, pin) => db.verifyClientPin(id, pin))

// ── Sessions ──────────────────────────────────────────────────────────────────
ipcMain.handle('sessions:getForClient', (_e, clientId) => db.getSessionsForClient(clientId))
ipcMain.handle('sessions:get', (_e, id) => db.getSession(id))
ipcMain.handle('sessions:create', (_e, data) => db.createSession(data))
ipcMain.handle('sessions:update', (_e, id, data) => db.updateSession(id, data))
ipcMain.handle('sessions:delete', (_e, id) => db.deleteSession(id))

// ── Backup ────────────────────────────────────────────────────────────────────
ipcMain.handle('backup:export', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Database Backup',
    defaultPath: `counsellor-notes-backup-${new Date().toISOString().slice(0, 10)}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  })
  if (!result.canceled && result.filePath) {
    db.exportTo(result.filePath)
    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('backup:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore from Backup',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    properties: ['openFile'],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      db.importFrom(result.filePaths[0])
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
  return { success: false }
})

// ── App info ──────────────────────────────────────────────────────────────────
ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getBranding', () => db.getBranding())
ipcMain.handle('app:setBranding', (_e, payload) => db.setBranding(payload))

// ── Auto-updater events ───────────────────────────────────────────────────────
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update:available')
})
ipcMain.handle('update:openReleasePage', async () => {
  await shell.openExternal(getReleasePageUrl())
  return { success: true }
})
