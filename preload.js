// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Login handling
  loginSuccess: (data) => ipcRenderer.send('login-success', data),
  
  // Session management
  getSession: () => ipcRenderer.invoke('get-session'),
  logout: () => ipcRenderer.invoke('logout'),
  
  // 🔥 API CALLS - Support both formats:
  // 1. apiRequest(url, data) - New format for TTS JS
  // 2. apiRequest({action, data}) - Old format for backwards compatibility
  apiRequest: (urlOrAction, data) => {
    if (typeof urlOrAction === 'string' && urlOrAction.startsWith('http')) {
      // New format: apiRequest(url, data)
      return ipcRenderer.invoke('api-request', urlOrAction, data);
    } else if (typeof urlOrAction === 'object') {
      // Old format: apiRequest({action, data})
      return ipcRenderer.invoke('api-request', urlOrAction);
    } else {
      // Assume it's just an action string
      return ipcRenderer.invoke('api-request', { action: urlOrAction, data });
    }
  },
  
  // 🔥 GET RESOURCES (Voices, Models)
  getResources: () => ipcRenderer.invoke('get-resources'),
  
  // Navigation
  loadTTSPage: () => ipcRenderer.invoke('load-tts-page'),
  loadDashboard: () => ipcRenderer.invoke('load-dashboard'),
  loadToolPage: () => ipcRenderer.invoke('load-tool-page'),
  
  // 🔥 PRO TOOL - File Operations
  openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),
  selectFiles: (options) => ipcRenderer.invoke('select-files', options),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  downloadFile: (options) => ipcRenderer.invoke('download-file', options),
  joinAudioLocal: (options) => ipcRenderer.invoke('join-audio-local', options),

  // 🔥 Voice Library
  openVoiceLibrary: () => ipcRenderer.invoke('open-voice-library'),
  sendVoiceLibrary: (voices) => ipcRenderer.invoke('save-voice-library', voices),
  onVoiceLibraryUpdated: (callback) => ipcRenderer.on('voice-library-updated', (event, voices) => callback(voices))
});