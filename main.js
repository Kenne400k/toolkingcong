// main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
let splashWindow;
const SESSION_FILE = path.join(__dirname, 'sessions', 'session.json');

// =================== APP VERSION ===================
const APP_VERSION = '1.3.0';
const GITHUB_OWNER = 'Kenne400k';
const GITHUB_REPO = 'toolkingcong';
const UPDATE_CHECK_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/version.json`;

// ⚠️ IMPORTANT: Load from environment variables
// For development, create a .env file (see .env.example)
require('dotenv').config();

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-key-change-this';
const SESSION_SALT = process.env.SESSION_SALT || 'salt';

if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  WARNING: Using default SESSION_SECRET. Set SESSION_SECRET in .env for production!');
}

const ENCRYPTION_KEY = crypto.scryptSync(SESSION_SECRET, SESSION_SALT, 32);
const IV_LENGTH = 16;

// Đảm bảo folder sessions tồn tại
if (!fs.existsSync(path.join(__dirname, 'sessions'))) {
  fs.mkdirSync(path.join(__dirname, 'sessions'));
}

// =================== ENCRYPTION HELPERS ===================
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// =================== SPLASH WINDOW ===================
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 600,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'image', 'Kingcong.jpg'),
    backgroundColor: '#0a0a0a'
  });

  splashWindow.loadFile('renderer/splash.html');

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

// =================== AUTO UPDATE ===================
async function checkForUpdates() {
  const fetch = require('node-fetch');

  try {
    console.log('🔍 Checking for updates...');
    const response = await fetch(UPDATE_CHECK_URL, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      console.log('⚠️ Could not fetch version info');
      return { updateAvailable: false };
    }

    const remoteVersion = await response.json();
    console.log(`📦 Current: ${APP_VERSION} | Remote: ${remoteVersion.version}`);

    if (compareVersions(remoteVersion.version, APP_VERSION) > 0) {
      console.log('🆕 Update available!');
      return {
        updateAvailable: true,
        version: remoteVersion.version,
        changelog: remoteVersion.changelog || [],
        downloadUrl: remoteVersion.downloadUrl || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        forceUpdate: remoteVersion.forceUpdate || false
      };
    }

    console.log('✅ App is up to date');
    return { updateAvailable: false };

  } catch (error) {
    console.error('❌ Update check error:', error.message);
    return { updateAvailable: false, error: error.message };
  }
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

async function downloadUpdate(updateInfo) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  try {
    console.log('🔄 Auto-updating via git pull...');

    // Notify splash about progress
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('update-progress', { percent: 30, status: 'Pulling updates...' });
    }

    // Run git pull to update
    const { stdout, stderr } = await execPromise('git pull origin main', {
      cwd: __dirname
    });

    console.log('✅ Git pull output:', stdout);

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('update-progress', { percent: 100, status: 'Update complete!' });
    }

    // Update successful - need to restart app
    console.log('🔄 Update complete! Restarting app...');

    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 1500);

    return { success: true, message: 'Updated successfully' };

  } catch (error) {
    console.error('❌ Auto-update error:', error);

    // Fallback: try to continue anyway
    return { success: false, error: error.message };
  }
}

function finishSplashAndShowMain() {
  // Close splash window
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  // Create main window
  createMainWindow();
}

// =================== CREATE MAIN WINDOW ===================
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'KingCong Studio - TTS Tool',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      devTools: process.env.NODE_ENV !== 'production' // 🔒 Disable DevTools in production
    },
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#101322'
  });

  const savedSession = loadSession();

  if (savedSession) {
    console.log('✅ Session found, loading Dashboard...');
    
    mainWindow.loadFile('renderer/dashboard.html');
    
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        window.__SESSION__ = ${JSON.stringify(savedSession)};
        console.log('✅ Session restored');
      `);
    });

  } else {
    console.log('❌ No session, showing Login...');
    mainWindow.loadURL('https://kingcongstudio.com/serverkingcong_tools/login.php');
  }

  // Inject login detection cho trang web
  mainWindow.webContents.on('did-finish-load', () => {
    const currentURL = mainWindow.webContents.getURL();
    if (currentURL.includes('login.php')) {
      console.log('✅ Detecting Login Page...');
      injectLoginDetection();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
function injectLoginDetection() {
  const injectionScript = `
    (function() {
      if (window.__electronInjected) return;
      window.__electronInjected = true;
      console.log('🚀 Login Detector & Name Fetcher Active');
      
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(async (response) => {
          const url = args[0];
          
          if (url.includes('/login.php') || url.includes('/login-apikey.php')) {
            const clone = response.clone();
            try {
              const data = await clone.json();
              
              if (data.success || data.status === 'success') {
                 const userCode = data.user?.username || data.username;
                 
                 if (userCode) {
                    console.log('⚡ Đang hỏi server tên + avatar của:', userCode);

                    const formData = new FormData();
                    formData.append('username', userCode);
                    
                    fetch('https://kingcongstudio.com/ajaxs/get_user_info_tool.php', {
                        method: 'POST',
                        body: formData
                    })
                    .then(res => res.json())
                    .then(nameData => {
                        console.log('✅ SERVER TRẢ VỀ:', nameData);
                        
                        let displayName = nameData.name || data.user?.name || userCode;
                        let avatarUrl = nameData.avatar || null; // 🔥 LẤY AVATAR
                        
                        console.log('✅ TÊN:', displayName);
                        console.log('✅ AVATAR:', avatarUrl);
                        
                        // Gửi data hoàn chỉnh
                        window.electronAPI.loginSuccess({
                            username: userCode,
                            display_name: displayName,
                            avatar_url: avatarUrl, // 🔥 THÊM AVATAR
                            user_id: data.user?.id || 'unknown',
                            credits3: data.credits3 || data.user?.credits3 || 0,
                            email: data.user?.email || '',
                            session_id: 'session_' + Date.now(),
                            timestamp: new Date().toISOString()
                        });
                    })
                    .catch(err => {
                        console.error('❌ Lỗi gọi PHP:', err);
                        window.electronAPI.loginSuccess({
                            username: userCode,
                            display_name: data.user?.name || userCode,
                            avatar_url: null, // 🔥 NULL NẾU LỖI
                            user_id: data.user?.id || 'unknown',
                            credits3: data.credits3 || 0,
                            email: data.user?.email || '',
                            session_id: 'session_' + Date.now()
                        });
                    });
                 }
              }
            } catch (e) { 
              console.error('❌ Parse login response error:', e);
            }
          }
          return response;
        });
      };
    })();
  `;
  
  mainWindow.webContents.executeJavaScript(injectionScript);
}
// =================== IPC HANDLERS ===================
ipcMain.on('login-success', (event, loginData) => {
  // 🔥 THÊM ĐOẠN LOG NÀY:
  console.log('=============================================');
  console.log('🔍 SOI DATA SERVER TRẢ VỀ (RAW):');
  console.log(JSON.stringify(loginData._debug_data, null, 2)); 
  console.log('=============================================');

  console.log('✅ LOGIN SUCCESS | User:', loginData.username);
  
  saveSession(loginData);
  
  setTimeout(() => {
    console.log('🔄 Loading Dashboard...');
    mainWindow.loadFile('renderer/dashboard.html');
    
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        window.__SESSION__ = ${JSON.stringify(loginData)};
        console.log('✅ Session injected');
      `);
    });
  }, 1000);
});

// =================== FILE: main.js ===================

// =================== FILE: main.js ===================

ipcMain.handle('logout', async () => {
  console.log('👋 Đang đăng xuất...');

  // 1. Xóa file session lưu trên máy
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
  }

  // 2. Xóa sạch Cookie & Cache của trình duyệt Electron (Quan trọng)
  // Cái này tương đương với việc gọi file logout.php, server sẽ tự mất session
  if (mainWindow) {
    const ses = mainWindow.webContents.session;
    await ses.clearStorageData({
      storages: ['cookies', 'localstorage', 'cache']
    });
  }

  // 3. Load lại trang Login chuẩn của ông
  // (Đã sửa lại link đúng theo log cũ của ông)
  mainWindow.loadURL('https://kingcongstudio.com/serverkingcong_tools/login.php');

  return { success: true };
});

ipcMain.handle('get-session', async () => {
  return loadSession();
});

// 🔥 API PROXY - ĐÃ FIX LOGIN COOKIE & AUTO LOGOUT
// Updated to support dynamic URL
ipcMain.handle('api-request', async (event, urlOrObject, data) => {
  const sessionData = loadSession();
  
  // 1. Kiểm tra session file
  if (!sessionData) {
    return { status: 'error', message: 'No session data found on disk' };
  }

  const FormData = require('form-data');
  const fetch = require('node-fetch');
  
  // Support both old format {action, data} and new format (url, data)
  let API_ENDPOINT;
  let requestData;
  
  if (typeof urlOrObject === 'string') {
    // New format: api-request(url, data)
    API_ENDPOINT = urlOrObject;
    requestData = data || {};
  } else if (urlOrObject && urlOrObject.action) {
    // Old format: api-request({action, data})
    API_ENDPOINT = 'https://kingcongstudio.com/ajaxs/tts3.php';
    requestData = { action: urlOrObject.action, ...(urlOrObject.data || {}) };
  } else {
    return { status: 'error', message: 'Invalid API request format' };
  }

  try {
    const form = new FormData();
    
    // Thêm thông tin xác thực vào Body
    form.append('session_id', sessionData.session_id);
    form.append('user_id', sessionData.user_id);
    form.append('username', sessionData.username);
    
    // 🔥 Thêm source để backend biết request từ Electron Tool
    // Backend check: if ($_POST['source'] === 'electron-tool') → rate limit 20/min
    form.append('source', 'electron-tool');
    
    // Thêm data tùy chỉnh
    if (requestData) {
      Object.keys(requestData).forEach(key => {
        const value = requestData[key];
        if (value !== undefined && value !== null) {
          // Convert boolean to string for FormData
          if (typeof value === 'boolean') {
            form.append(key, value ? 'true' : 'false');
          } else if (typeof value === 'number') {
            form.append(key, String(value));
          } else {
            form.append(key, value);
          }
        }
      });
    }

    // 2. LẤY COOKIE TỪ TRÌNH DUYỆT (QUAN TRỌNG NHẤT)
    let cookieHeader = '';
    if (mainWindow) {
      try {
        // Lấy cookie từ domain gốc
        const cookies = await mainWindow.webContents.session.cookies.get({ url: 'https://kingcongstudio.com' });
        cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      } catch (err) {
        console.error('⚠️ Could not get cookies:', err);
      }
    }

    // Tạo headers
    const headers = form.getHeaders();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    // 🔥 Thêm header để backend biết đây là request từ Electron Tool
    // Backend có thể check header này để áp dụng rate limit 20/min thay vì 10/min
    headers['X-Client'] = 'kingcong-electron-tool';
    headers['X-Tool-Version'] = '1.0.0';

    console.log(`📡 API Request: ${API_ENDPOINT}`);

    // 3. Gửi Request
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: form,
      headers: headers
    });

    const result = await response.json();
    
    // 4. XỬ LÝ KHI SERVER TỪ CHỐI (AUTO LOGOUT)
    if (result.status === 'error' && result.message && (result.message.includes('login') || result.message.includes('Session'))) {
       console.log('❌ Session expired. Auto logging out...');
       
       if (fs.existsSync(SESSION_FILE)) {
           fs.unlinkSync(SESSION_FILE);
       }
       
       // Load lại trang login
       if (mainWindow) {
           mainWindow.loadURL('https://kingcongstudio.com/serverkingcong_tools/login.php');
       }
       return { status: 'error', message: 'Session expired. Please login again.' };
    }

    return result;

  } catch (error) {
    console.error('❌ API Error:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
});

// 🔥 GET RESOURCES (Voices, Models)
ipcMain.handle('get-resources', async () => {
  const fetch = require('node-fetch');
  
  const RESOURCES_ENDPOINT = Buffer.from(
    'aHR0cHM6Ly9raW5nY29uZ3N0dWRpby5jb20vYWpheHMvZ2V0X3Jlc291cmNlczMucGhw',
    'base64'
  ).toString('utf-8');

  try {
    // Lấy cookie từ session
    let cookieHeader = '';
    if (mainWindow) {
      try {
        const cookies = await mainWindow.webContents.session.cookies.get({ url: 'https://kingcongstudio.com' });
        cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      } catch (err) {
        console.error('⚠️ Could not get cookies for resources:', err);
      }
    }

    const response = await fetch(RESOURCES_ENDPOINT, {
      method: 'GET',
      headers: cookieHeader ? { 'Cookie': cookieHeader } : {}
    });

    const result = await response.json();
    console.log('✅ Resources loaded');
    return result;

  } catch (error) {
    console.error('❌ Get Resources Error:', error);
    return { 
      status: 'error', 
      message: error.message 
    };
  }
});

// 🔥 LOAD TTS PAGE
ipcMain.handle('load-tts-page', async () => {
  mainWindow.loadFile('renderer/tts.html');
  const session = loadSession();
  
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.__SESSION__ = ${JSON.stringify(session)};
      if (window.initTTS) window.initTTS();
    `);
  });
  
  return { success: true };
});

// 🔥 LOAD DASHBOARD
ipcMain.handle('load-dashboard', async () => {
  mainWindow.loadFile('renderer/dashboard.html');
  const session = loadSession();
  
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.__SESSION__ = ${JSON.stringify(session)};
    `);
  });
  
  return { success: true };
});

// =================== SESSION MANAGEMENT ===================
function saveSession(data) {
  try {
    const encrypted = encrypt(JSON.stringify(data));
    fs.writeFileSync(SESSION_FILE, encrypted);
    console.log('💾 Session saved (encrypted)');
  } catch (error) {
    console.error('❌ Save session error:', error);
  }
}

function loadSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const encrypted = fs.readFileSync(SESSION_FILE, 'utf8');
      const decrypted = decrypt(encrypted);
      return JSON.parse(decrypted);
    }
  } catch (error) {
    console.error('❌ Load session error:', error);
  }
  return null;
}

// =================== PRO TOOL HANDLERS ===================

// Open output folder
ipcMain.handle('open-output-folder', async () => {
  const outputPath = path.join(__dirname, 'output');

  // Create output folder and subfolders if not exist
  const subfolders = ['11labs', 'Minimax', 'Join', 'Backup'];
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  subfolders.forEach(folder => {
    const subPath = path.join(outputPath, folder);
    if (!fs.existsSync(subPath)) {
      fs.mkdirSync(subPath, { recursive: true });
    }
  });

  shell.openPath(outputPath);
  return { success: true, path: outputPath };
});

// Open file dialog for selecting files
ipcMain.handle('select-files', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: options.filters || [
      { name: 'Text Files', extensions: ['txt', 'srt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.canceled) {
    return { success: false, canceled: true };
  }
  
  return { success: true, filePaths: result.filePaths };
});

// Open folder dialog
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled) {
    return { success: false, canceled: true };
  }
  
  // Read all text files in folder
  const folderPath = result.filePaths[0];
  const files = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.txt') || f.endsWith('.srt'))
    .map(f => path.join(folderPath, f));
  
  return { success: true, folderPath, files };
});

// Select MP3 files for import
ipcMain.handle('select-audio-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg'] }
    ]
  });
  
  if (result.canceled) {
    return { success: false, canceled: true };
  }
  
  return { success: true, filePaths: result.filePaths };
});

// Read file content
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, path.extname(filePath));
    return { success: true, content, fileName, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Read file as Base64 (for Voice Clone)
ipcMain.handle('read-file-base64', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Determine MIME type
    let mimeType = 'audio/mpeg';
    if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.ogg') mimeType = 'audio/ogg';
    else if (ext === '.m4a') mimeType = 'audio/m4a';

    return {
      success: true,
      base64: `data:${mimeType};base64,${base64}`,
      fileName: fileName,
      filePath: filePath
    };
  } catch (error) {
    console.error('Read file as base64 error:', error);
    return { success: false, error: error.message };
  }
});

// Save file
ipcMain.handle('save-file', async (event, { fileName, content, dir }) => {
  try {
    const outputDir = dir || path.join(__dirname, 'output');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, content);
    
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Download file from URL (supports subfolder for project organization)
ipcMain.handle('download-file', async (event, { url, fileName, subfolder }) => {
  const fetch = require('node-fetch');

  try {
    // Build output directory path with optional subfolder
    let outputDir = path.join(__dirname, 'output');

    if (subfolder) {
      // Sanitize subfolder name (remove invalid characters)
      const safeFolderName = subfolder.replace(/[<>:"/\\|?*]/g, '_').trim();
      outputDir = path.join(outputDir, safeFolderName);
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const response = await fetch(url);
    const buffer = await response.buffer();

    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ Downloaded: ${filePath}`);

    return { success: true, filePath };
  } catch (error) {
    console.error('❌ Download error:', error);
    return { success: false, error: error.message };
  }
});

// Load Tool page
ipcMain.handle('load-tool-page', async () => {
  mainWindow.loadFile('renderer/tool.html');
  const session = loadSession();

  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.__SESSION__ = ${JSON.stringify(session)};
    `);
  });

  return { success: true };
});

// Open Voice Library window
let voiceLibraryWindow = null;

ipcMain.handle('open-voice-library', async () => {
  // If window already exists, focus it
  if (voiceLibraryWindow && !voiceLibraryWindow.isDestroyed()) {
    voiceLibraryWindow.focus();
    return { success: true };
  }

  voiceLibraryWindow = new BrowserWindow({
    width: 600,
    height: 500,
    title: 'Voice Library',
    parent: mainWindow,
    modal: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#0a0a0a'
  });

  voiceLibraryWindow.loadFile('renderer/voice-library.html');

  voiceLibraryWindow.on('closed', () => {
    voiceLibraryWindow = null;
  });

  return { success: true };
});

// Receive voice library data from window
ipcMain.handle('save-voice-library', async (event, voices) => {
  // Send to main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('voice-library-updated', voices);
  }
  return { success: true };
});

// Open Backup window
let backupWindow = null;

ipcMain.handle('open-backup-window', async () => {
  // If window already exists, focus it
  if (backupWindow && !backupWindow.isDestroyed()) {
    backupWindow.focus();
    return { success: true };
  }

  backupWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'Backup / History',
    parent: mainWindow,
    modal: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#0a0a0a'
  });

  backupWindow.loadFile('renderer/backup-window.html');

  backupWindow.on('closed', () => {
    backupWindow = null;
  });

  return { success: true };
});

// Open Voices window
let voicesWindow = null;

ipcMain.handle('open-voices-window', async (event, provider) => {
  // If window already exists, focus it
  if (voicesWindow && !voicesWindow.isDestroyed()) {
    voicesWindow.focus();
    return { success: true };
  }

  voicesWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: `Voices - ${provider || 'All'}`,
    parent: mainWindow,
    modal: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#0a0a0a'
  });

  // Pass provider as query param
  voicesWindow.loadFile('renderer/voices-window.html', {
    query: { provider: provider || 'elevenlabs' }
  });

  voicesWindow.on('closed', () => {
    voicesWindow = null;
  });

  return { success: true };
});

// Open Cloned Voices window
let clonedVoicesWindow = null;

ipcMain.handle('open-cloned-voices-window', async () => {
  // If window already exists, focus it
  if (clonedVoicesWindow && !clonedVoicesWindow.isDestroyed()) {
    clonedVoicesWindow.focus();
    return { success: true };
  }

  clonedVoicesWindow = new BrowserWindow({
    width: 700,
    height: 600,
    title: 'My Cloned Voices (Minimax)',
    parent: mainWindow,
    modal: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#0a0a0a'
  });

  clonedVoicesWindow.loadFile('renderer/cloned-voices-window.html');

  clonedVoicesWindow.on('closed', () => {
    clonedVoicesWindow = null;
  });

  return { success: true };
});

// Send selected voice back to main window
ipcMain.handle('select-voice-from-window', async (event, voiceId) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('voice-selected', voiceId);
  }
  return { success: true };
});

// Join audio files locally (using ffmpeg if available)
ipcMain.handle('join-audio-local', async (event, { files, delay, outputName, createSrt, taskData }) => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  // Save to Join subfolder
  const outputDir = path.join(__dirname, 'output', 'Join');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Create silent audio file if delay > 0
    let silentFilePath = null;
    if (delay && delay > 0) {
      silentFilePath = path.join(outputDir, `silent_${delay}s.mp3`);
      if (!fs.existsSync(silentFilePath)) {
        try {
          // Generate silent audio using ffmpeg
          const silentCmd = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${delay} -q:a 9 -acodec libmp3lame "${silentFilePath}" -y`;
          await execPromise(silentCmd);
          console.log(`✅ Created silent file: ${silentFilePath}`);
        } catch (e) {
          console.warn('Could not create silent file:', e.message);
          silentFilePath = null;
        }
      }
    }

    // Create file list for ffmpeg with delay between files
    const fileListPath = path.join(outputDir, `${outputName}_filelist.txt`);
    let fileListLines = [];

    files.forEach((f, index) => {
      fileListLines.push(`file '${f.replace(/'/g, "'\\''")}'`);
      // Add silent audio between files (not after last file)
      if (silentFilePath && index < files.length - 1) {
        fileListLines.push(`file '${silentFilePath.replace(/'/g, "'\\''")}'`);
      }
    });

    fs.writeFileSync(fileListPath, fileListLines.join('\n'));
    console.log('📝 File list created:', fileListPath);

    const outputPath = path.join(outputDir, `${outputName}.mp3`);

    // Try using ffmpeg
    try {
      const ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${outputPath}" -y`;
      await execPromise(ffmpegCmd);
      console.log(`✅ Joined to: ${outputPath}`);

      // Create SRT file if requested
      let srtPath = null;
      if (createSrt && taskData && taskData.length > 0) {
        srtPath = path.join(outputDir, `${outputName}.srt`);
        let srtContent = '';
        let currentTime = 0;

        taskData.forEach((task, index) => {
          const duration = task.duration || 3; // Default 3 seconds if no duration
          const startTime = formatSrtTime(currentTime);
          currentTime += duration;
          if (delay && delay > 0 && index < taskData.length - 1) {
            currentTime += delay;
          }
          const endTime = formatSrtTime(currentTime);

          srtContent += `${index + 1}\n`;
          srtContent += `${startTime} --> ${endTime}\n`;
          srtContent += `${task.content || task.text || ''}\n\n`;
        });

        fs.writeFileSync(srtPath, srtContent, 'utf8');
        console.log(`✅ SRT created: ${srtPath}`);
      }

      return {
        success: true,
        filePath: outputPath,
        srtPath,
        message: `Joined ${files.length} files successfully`
      };
    } catch (ffmpegError) {
      console.warn('ffmpeg not available or failed:', ffmpegError.message);

      return {
        success: false,
        fileListPath,
        message: 'ffmpeg not available. File list created for manual joining.'
      };
    }
  } catch (error) {
    console.error('Join audio error:', error);
    return { success: false, error: error.message };
  }
});

// Helper function to format time for SRT
function formatSrtTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// =================== UPDATE IPC HANDLERS ===================
ipcMain.handle('get-version', () => {
  return APP_VERSION;
});

ipcMain.handle('check-for-updates', async () => {
  return await checkForUpdates();
});

ipcMain.handle('download-update', async (event, updateInfo) => {
  return await downloadUpdate(updateInfo);
});

ipcMain.handle('finish-splash', async () => {
  finishSplashAndShowMain();
  return { success: true };
});

// =================== APP LIFECYCLE ===================
app.whenReady().then(() => {
  // Show splash window first
  createSplashWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});