// main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
let splashWindow;
// Use userData for writable files (sessions, logs, etc.)
const USER_DATA_PATH = app.getPath('userData');
const SESSION_DIR = path.join(USER_DATA_PATH, 'sessions');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

// =================== APP VERSION ===================
// Hardcode version - update this when releasing new version
const APP_VERSION = '1.10.52';

// =================== AUTO UPDATE CONFIG ===================
const UPDATE_SERVER_BASE = 'https://kingcongstudio.com/serverkingcong_tools';
const UPDATE_CHECK_URL = `${UPDATE_SERVER_BASE}/version.json`;
const UPDATE_EXE_URL = (version) => `${UPDATE_SERVER_BASE}/exeupdate/${version}.exe`;
const CONTACT_URL = 'https://kingcongstudio.com/lien-he'; // Trang liên hệ khi update fail
const MAX_RETRY_ATTEMPTS = 3;

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
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
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
    // Add timestamp to bypass GitHub CDN cache
    const urlWithCacheBust = `${UPDATE_CHECK_URL}?t=${Date.now()}`;
    const response = await fetch(urlWithCacheBust, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
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
  const fetch = require('node-fetch');
  const { exec } = require('child_process');
  const os = require('os');

  const version = updateInfo.version;
  const downloadUrl = UPDATE_EXE_URL(version);
  const tempDir = os.tmpdir();
  const tempExePath = path.join(tempDir, `KingCong_Update_${version}.exe`);
  const currentExePath = app.getPath('exe');
  const updaterBatPath = path.join(tempDir, 'kingcong_updater.bat');

  console.log(`🔄 Downloading update v${version} from: ${downloadUrl}`);

  // Retry logic
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`📥 Download attempt ${attempt}/${MAX_RETRY_ATTEMPTS}...`);

      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('update-progress', {
          percent: 5,
          status: `Đang tải... (Lần ${attempt}/${MAX_RETRY_ATTEMPTS})`
        });
      }

      // Download file với progress tracking
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = parseInt(response.headers.get('content-length'), 10);
      let downloadedBytes = 0;
      const chunks = [];

      // Stream download với progress
      for await (const chunk of response.body) {
        chunks.push(chunk);
        downloadedBytes += chunk.length;

        if (contentLength && splashWindow && !splashWindow.isDestroyed()) {
          const percent = Math.round((downloadedBytes / contentLength) * 90) + 5; // 5-95%
          const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(1);
          const totalMB = (contentLength / 1024 / 1024).toFixed(1);

          splashWindow.webContents.send('update-progress', {
            percent,
            status: `Đang tải... ${downloadedMB}/${totalMB} MB`
          });
        }
      }

      // Combine chunks and save to file
      const buffer = Buffer.concat(chunks);

      // Verify file size (if provided in bytes)
      if (updateInfo.size && typeof updateInfo.size === 'number' && buffer.length < updateInfo.size * 0.9) {
        throw new Error('File tải về không đầy đủ');
      }

      // Verify checksum if provided
      if (updateInfo.checksum) {
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        const expectedHash = updateInfo.checksum.replace('sha256:', '');

        if (hash !== expectedHash) {
          throw new Error('Checksum không khớp - file có thể bị lỗi');
        }
        console.log('✅ Checksum verified');
      }

      // Save file
      fs.writeFileSync(tempExePath, buffer);
      console.log(`✅ Downloaded to: ${tempExePath}`);

      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('update-progress', {
          percent: 98,
          status: 'Đang cài đặt bản cập nhật...'
        });
      }

      // Create updater batch script
      // This script will:
      // 1. Wait for current app to close
      // 2. Run uninstaller (silent)
      // 3. Run new installer (silent)
      // 4. Clean up

      // Get install directory and uninstaller path
      const installDir = path.dirname(currentExePath);
      const uninstallerPath = path.join(installDir, 'Uninstall KingCong TTS Tool.exe');

      // Escape paths for batch file
      const exeName = path.basename(currentExePath);
      const uninstallerPathEscaped = uninstallerPath.replace(/\\/g, '\\\\');
      const tempExePathEscaped = tempExePath.replace(/\\/g, '\\\\');

      const batchScript = `@echo off
chcp 65001 >nul
title KingCong Auto Updater
echo ========================================
echo    KingCong Auto Updater
echo ========================================
echo.
echo Dang cap nhat, vui long doi...
echo.

set "UNINSTALLER=${uninstallerPathEscaped}"
set "NEW_INSTALLER=${tempExePathEscaped}"
set "EXE_NAME=${exeName}"

:: Wait for old process to exit (max 30 seconds)
echo Dang doi app dong...
set /a count=0
:waitloop
tasklist /FI "IMAGENAME eq %EXE_NAME%" 2>NUL | find /I /N "%EXE_NAME%" >NUL
if "%ERRORLEVEL%"=="0" (
    set /a count+=1
    if %count% geq 30 (
        echo Timeout doi app dong. Dang tiep tuc...
        goto :uninstall
    )
    echo Dang doi... [%count%/30]
    timeout /t 1 /nobreak >nul
    goto :waitloop
)

:uninstall
echo.
echo Dang go cai dat phien ban cu...

:: Run uninstaller silently
if exist "%UNINSTALLER%" (
    "%UNINSTALLER%" /S
    :: Wait for uninstaller to finish
    timeout /t 5 /nobreak >nul
) else (
    echo Khong tim thay uninstaller, bo qua...
)

:install
echo.
echo Dang cai dat phien ban moi...

:: Run new installer silently
"%NEW_INSTALLER%" /S

if %ERRORLEVEL% neq 0 (
    echo LOI: Khong the cai dat!
    echo Vui long thu lai sau.
    timeout /t 5
    exit /b 1
)

echo.
echo ========================================
echo    Cap nhat thanh cong!
echo ========================================
echo.

:: Clean up
timeout /t 3 /nobreak >nul
del /f /q "%NEW_INSTALLER%" >nul 2>&1

:: Self-delete this batch file
(goto) 2>nul & del "%~f0"
`;

      fs.writeFileSync(updaterBatPath, batchScript, 'utf8');
      console.log(`✅ Updater script created: ${updaterBatPath}`);

      // Run updater batch (hidden window)
      console.log('🚀 Launching updater...');
      exec(`start /min "" "${updaterBatPath}"`, { windowsHide: true });

      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('update-progress', {
          percent: 100,
          status: 'Đang khởi động lại...'
        });
      }

      // Wait a bit then quit current app
      setTimeout(() => {
        console.log('👋 Closing app for update...');
        app.quit();
      }, 2000);

      return { success: true, message: 'Update downloaded, installing...' };

    } catch (error) {
      console.error(`❌ Download attempt ${attempt} failed:`, error.message);

      if (attempt < MAX_RETRY_ATTEMPTS) {
        // Wait before retry (exponential backoff)
        const waitTime = attempt * 2000;
        console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);

        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('update-progress', {
            percent: 0,
            status: `Lỗi tải. Thử lại sau ${waitTime/1000}s...`
          });
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // All retries failed - open contact page
        console.error('❌ All download attempts failed. Opening contact page...');

        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('update-failed', {
            message: 'Không thể tải bản cập nhật. Vui lòng liên hệ hỗ trợ.',
            contactUrl: CONTACT_URL
          });
        }

        // Open browser to contact page
        shell.openExternal(CONTACT_URL);

        return {
          success: false,
          error: 'Download failed after all retries',
          openedContact: true
        };
      }
    }
  }

  return { success: false, error: 'Unknown error' };
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
    icon: path.join(__dirname, 'image/kingcong.jpg'),
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
    headers['X-Tool-Version'] = APP_VERSION;

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
ipcMain.handle('open-output-folder', async (event, subfolder) => {
  let outputPath = path.join(app.getPath('userData'), 'output');

  // Create output folder and subfolders if not exist
  const subfolders = ['Backup', 'ImportFile', 'ImportFolder', 'Join'];
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  subfolders.forEach(folder => {
    const subPath = path.join(outputPath, folder);
    if (!fs.existsSync(subPath)) {
      fs.mkdirSync(subPath, { recursive: true });
    }
  });

  // If subfolder is provided, append it to path
  if (subfolder && typeof subfolder === 'string') {
    // Basic sanitization
    const safeSub = subfolder.replace(/[\\/.]/g, ''); // Prevent directory traversal
    const specificPath = path.join(outputPath, subfolder);
    if (fs.existsSync(specificPath)) {
      outputPath = specificPath;
    }
  }

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
    const outputDir = dir || path.join(app.getPath('userData'), 'output');

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
    let outputDir = path.join(app.getPath('userData'), 'output');

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
    width: 1100,
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

  // Also send to voice library window if open
  if (voiceLibraryWindow && !voiceLibraryWindow.isDestroyed()) {
    voiceLibraryWindow.webContents.send('voice-library-updated', voices);
  }

  return { success: true };
});

// Broadcast language change
ipcMain.handle('set-language', async (event, lang) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('language-changed', lang);
  }
  if (voiceLibraryWindow && !voiceLibraryWindow.isDestroyed()) {
    voiceLibraryWindow.webContents.send('language-changed', lang);
  }
  // Broadcast to Voices Window
  if (voicesWindow && !voicesWindow.isDestroyed()) {
    voicesWindow.webContents.send('language-changed', lang);
  }
  // Broadcast to Voice Cloning Tool Window
  if (voiceCloningToolWindow && !voiceCloningToolWindow.isDestroyed()) {
    voiceCloningToolWindow.webContents.send('language-changed', lang);
  }
  // Broadcast to Cloned Voices Window
  if (clonedVoicesWindow && !clonedVoicesWindow.isDestroyed()) {
    clonedVoicesWindow.webContents.send('language-changed', lang);
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

// Open Voice Cloning Tool Window (Full Feature)
let voiceCloningToolWindow = null;

ipcMain.handle('open-voice-cloning-tool-window', async () => {
  if (voiceCloningToolWindow && !voiceCloningToolWindow.isDestroyed()) {
    voiceCloningToolWindow.focus();
    return { success: true };
  }

  voiceCloningToolWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Voice Cloning Studio',
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

  voiceCloningToolWindow.loadFile('renderer/tool-voice-cloning.html');

  voiceCloningToolWindow.on('closed', () => {
    voiceCloningToolWindow = null;
  });

  return { success: true };
});

// Send selected voice back to main window
ipcMain.handle('select-voice-from-window', async (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // data = { voiceId, voiceName }
    mainWindow.webContents.send('voice-selected', data);
  }
  return { success: true };
});

// Check which files already exist in output folder (for resume functionality)
ipcMain.handle('check-completed-files', async (event, { fileNames, subfolder }) => {
  try {
    const outputDir = path.join(app.getPath('userData'), 'output', subfolder || 'ImportFile');

    if (!fs.existsSync(outputDir)) {
      return { success: true, completedFiles: {} };
    }
    const files = fs.readdirSync(outputDir);
    const completedFiles = {};

    if (fileNames && Array.isArray(fileNames)) {
      fileNames.forEach(fileName => {
        const found = files.find(f => f === fileName || f === `${fileName}.mp3`);
        if (found) {
          completedFiles[fileName] = {
            exists: true,
            filePath: path.join(outputDir, found),
            fileName: found
          };
        }
      });
    }

    return { success: true, completedFiles };
  } catch (error) {
    console.error('Check completed files error:', error);
    return { success: false, error: error.message };
  }
});
// Join audio files locally (using ffmpeg if available)
ipcMain.handle('join-audio-local', async (event, { files, delay, outputName, createSrt, taskData }) => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  // Save to Join subfolder in UserData
  const outputDir = path.join(app.getPath('userData'), 'output', 'Join');

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

// Quit app from splash when update fails
ipcMain.handle('quit-app', async () => {
  app.quit();
  return { success: true };
});

// Open external URL
ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
  return { success: true };
});

// =================== VOICE CLONING API ===================
// Clone Voice
ipcMain.handle('clone-voice', async (event, data) => {
  const sessionData = loadSession();
  if (!sessionData) {
    return { status: 'error', message: 'No session found' };
  }

  const FormData = require('form-data');
  const fetch = require('node-fetch');

  const API_ENDPOINT = 'https://kingcongstudio.com/ajaxs/voice_cloning3.php';

  try {
    const form = new FormData();
    form.append('action', 'create_clone');
    form.append('session_id', sessionData.session_id);
    form.append('user_id', sessionData.user_id);
    form.append('username', sessionData.username);
    form.append('source', 'electron-tool');

    form.append('voice_name', data.voice_name);
    form.append('gender', data.gender);
    form.append('language', data.language);
    form.append('preview_text', data.preview_text);
    form.append('need_noise_reduction', data.need_noise_reduction ? 'true' : 'false');

    // Convert base64 to buffer and append as file
    if (data.file_data) {
      const base64Data = data.file_data.replace(/^data:audio\/[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      form.append('file', buffer, {
        filename: data.file_name || 'audio.mp3',
        contentType: 'audio/mpeg'
      });
    }

    // Get cookies
    let cookieHeader = '';
    if (mainWindow) {
      try {
        const cookies = await mainWindow.webContents.session.cookies.get({ url: 'https://kingcongstudio.com' });
        cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      } catch (err) {
        console.error('Could not get cookies:', err);
      }
    }

    const headers = form.getHeaders();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    headers['X-Client'] = 'kingcong-electron-tool';

    console.log('Cloning voice:', data.voice_name);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: form,
      headers: headers,
      timeout: 300000 // 5 minutes timeout for cloning
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Clone voice error:', error);
    return { status: 'error', message: error.message };
  }
});

// Get Cloned Voices
ipcMain.handle('get-cloned-voices', async () => {
  const sessionData = loadSession();
  if (!sessionData) {
    return { status: 'error', message: 'No session found', voices: [] };
  }

  const FormData = require('form-data');
  const fetch = require('node-fetch');

  const API_ENDPOINT = 'https://kingcongstudio.com/ajaxs/voice_cloning3.php';

  try {
    const form = new FormData();
    form.append('action', 'list_clones');
    form.append('session_id', sessionData.session_id);
    form.append('user_id', sessionData.user_id);
    form.append('username', sessionData.username);
    form.append('source', 'electron-tool');

    let cookieHeader = '';
    if (mainWindow) {
      try {
        const cookies = await mainWindow.webContents.session.cookies.get({ url: 'https://kingcongstudio.com' });
        cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      } catch (err) {
        console.error('Could not get cookies:', err);
      }
    }

    const headers = form.getHeaders();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    headers['X-Client'] = 'kingcong-electron-tool';

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: form,
      headers: headers
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Get cloned voices error:', error);
    return { status: 'error', message: error.message, voices: [] };
  }
});

// Delete Cloned Voice
ipcMain.handle('delete-cloned-voice', async (event, voiceId) => {
  const sessionData = loadSession();
  if (!sessionData) {
    return { status: 'error', message: 'No session found' };
  }

  const FormData = require('form-data');
  const fetch = require('node-fetch');

  const API_ENDPOINT = 'https://kingcongstudio.com/ajaxs/voice_cloning3.php';

  try {
    const form = new FormData();
    form.append('action', 'delete_clone');
    form.append('voice_id', voiceId);
    form.append('session_id', sessionData.session_id);
    form.append('user_id', sessionData.user_id);
    form.append('username', sessionData.username);
    form.append('source', 'electron-tool');

    let cookieHeader = '';
    if (mainWindow) {
      try {
        const cookies = await mainWindow.webContents.session.cookies.get({ url: 'https://kingcongstudio.com' });
        cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      } catch (err) {
        console.error('Could not get cookies:', err);
      }
    }

    const headers = form.getHeaders();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    headers['X-Client'] = 'kingcong-electron-tool';

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: form,
      headers: headers
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Delete cloned voice error:', error);
    return { status: 'error', message: error.message };
  }
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