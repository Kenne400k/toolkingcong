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
  openOutputFolder: (subfolder) => ipcRenderer.invoke('open-output-folder', subfolder),
  selectFiles: (options) => ipcRenderer.invoke('select-files', options),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  readFileAsBase64: (filePath) => ipcRenderer.invoke('read-file-base64', filePath),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  downloadFile: (options) => ipcRenderer.invoke('download-file', options),
  joinAudioLocal: (options) => ipcRenderer.invoke('join-audio-local', options),
  checkCompletedFiles: (options) => ipcRenderer.invoke('check-completed-files', options),

  // 🔥 Voice Library
  openVoiceLibrary: () => ipcRenderer.invoke('open-voice-library'),
  sendVoiceLibrary: (voices) => ipcRenderer.invoke('save-voice-library', voices),
  onVoiceLibraryUpdated: (callback) => ipcRenderer.on('voice-library-updated', (event, voices) => callback(voices)),

  // 🔥 Backup Window
  openBackupWindow: () => ipcRenderer.invoke('open-backup-window'),

  // 🔥 Voices Window
  openVoicesWindow: (provider) => ipcRenderer.invoke('open-voices-window', provider),
  selectVoiceFromWindow: (voiceId, voiceName) => ipcRenderer.invoke('select-voice-from-window', { voiceId, voiceName }),
  onVoiceSelected: (callback) => ipcRenderer.on('voice-selected', (event, data) => callback(data)),

  // 🔥 Cloned Voices Window
  openClonedVoicesWindow: () => ipcRenderer.invoke('open-cloned-voices-window'),
  openVoiceCloningToolWindow: () => ipcRenderer.invoke('open-voice-cloning-tool-window'),

  // 🔥 Voice Cloning API
  cloneVoice: (data) => ipcRenderer.invoke('clone-voice', data),
  getClonedVoices: () => ipcRenderer.invoke('get-cloned-voices'),
  deleteClonedVoice: (voiceId) => ipcRenderer.invoke('delete-cloned-voice', voiceId),

  // 🔥 Auto Update
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (updateInfo) => ipcRenderer.invoke('download-update', updateInfo),
  finishSplash: () => ipcRenderer.invoke('finish-splash'),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, progress) => callback(progress)),
  onUpdateComplete: (callback) => ipcRenderer.on('update-complete', (event, success) => callback(success))
});