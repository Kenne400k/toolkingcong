// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Login handling
  loginSuccess: (data) => ipcRenderer.send('login-success', data),
  
  // Session management
  getSession: () => ipcRenderer.invoke('get-session'),
  logout: () => ipcRenderer.invoke('logout'),
  
  // 🔥 API CALLS (GIẤU ENDPOINT)
  apiRequest: (action, data) => ipcRenderer.invoke('api-request', { action, data }),
  
  // 🔥 GET RESOURCES (Voices, Models)
  getResources: () => ipcRenderer.invoke('get-resources'),
  
  // Navigation
  loadTTSPage: () => ipcRenderer.invoke('load-tts-page'),
  loadDashboard: () => ipcRenderer.invoke('load-dashboard')
});