// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
const SESSION_FILE = path.join(__dirname, 'sessions', 'session.json');

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

// =================== CREATE WINDOW ===================
function createWindow() {
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
ipcMain.handle('api-request', async (event, { action, data }) => {
  const sessionData = loadSession();
  
  // 1. Kiểm tra session file
  if (!sessionData) {
    return { status: 'error', message: 'No session data found on disk' };
  }

  const FormData = require('form-data');
  const fetch = require('node-fetch');
  
  const API_ENDPOINT = Buffer.from(
    'aHR0cHM6Ly9raW5nY29uZ3N0dWRpby5jb20vYWpheHMvdHRzMy5waHA=',
    'base64'
  ).toString('utf-8');

  try {
    const form = new FormData();
    form.append('action', action);
    
    // Thêm thông tin xác thực vào Body
    form.append('session_id', sessionData.session_id);
    form.append('user_id', sessionData.user_id);
    
    // Thêm data tùy chỉnh
    if (data) {
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          form.append(key, data[key]);
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
        // console.log('🍪 Cookies attached:', cookieHeader); 
      } catch (err) {
        console.error('⚠️ Could not get cookies:', err);
      }
    }

    // Tạo headers
    const headers = form.getHeaders();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    // 3. Gửi Request
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: form,
      headers: headers
    });

    const result = await response.json();
    
    // 4. XỬ LÝ KHI SERVER TỪ CHỐI (AUTO LOGOUT)
    // Nếu PHP trả về lỗi yêu cầu login -> Xóa session cũ và đá ra trang login
    if (result.status === 'error' && (result.message.includes('login') || result.message.includes('Session'))) {
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

// =================== APP LIFECYCLE ===================
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});