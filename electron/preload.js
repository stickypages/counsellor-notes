const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  auth: {
    isSetup: () => ipcRenderer.invoke('auth:isSetup'),
    setup: (password) => ipcRenderer.invoke('auth:setup', password),
    verify: (password) => ipcRenderer.invoke('auth:verify', password),
  },
  clients: {
    getAll: () => ipcRenderer.invoke('clients:getAll'),
    get: (id) => ipcRenderer.invoke('clients:get', id),
    create: (data) => ipcRenderer.invoke('clients:create', data),
    update: (id, data) => ipcRenderer.invoke('clients:update', id, data),
    delete: (id) => ipcRenderer.invoke('clients:delete', id),
    verifyPin: (id, pin) => ipcRenderer.invoke('clients:verifyPin', id, pin),
  },
  sessions: {
    getForClient: (clientId) => ipcRenderer.invoke('sessions:getForClient', clientId),
    get: (id) => ipcRenderer.invoke('sessions:get', id),
    create: (data) => ipcRenderer.invoke('sessions:create', data),
    update: (id, data) => ipcRenderer.invoke('sessions:update', id, data),
    delete: (id) => ipcRenderer.invoke('sessions:delete', id),
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getBranding: () => ipcRenderer.invoke('app:getBranding'),
    setBranding: (payload) => ipcRenderer.invoke('app:setBranding', payload),
  },
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', cb),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update:downloaded', cb),
  installUpdate: () => ipcRenderer.invoke('update:install'),
})
