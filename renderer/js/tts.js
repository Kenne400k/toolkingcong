// tts.js - SKELETON (đợi mày giải thích BE)

let SESSION = null;
let currentProvider = 'elevenlabs';
let selectedVoiceId = null;
let selectedVoiceName = 'Chọn giọng đọc';

// =================== INIT ===================
function initTTS() {
    console.log('🚀 TTS UI Initialized');
    
    // Load session
    SESSION = window.__SESSION__;
    console.log('📦 Session:', SESSION);
    
    if (SESSION) {
        updateCreditsDisplay(SESSION.credits3);
    }
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.provider-dropdown-wrapper')) {
            closeProviderDropdown();
        }
    });
}

// =================== CREDITS DISPLAY ===================
function updateCreditsDisplay(credits) {
    const creditsValue = document.getElementById('creditsValue');
    if (creditsValue) {
        creditsValue.textContent = credits.toLocaleString();
    }
}

// =================== PROVIDER SELECTION ===================
function toggleProviderDropdown() {
    const menu = document.getElementById('providerDropdownMenu');
    menu.classList.toggle('show');
}

function closeProviderDropdown() {
    const menu = document.getElementById('providerDropdownMenu');
    menu.classList.remove('show');
}

function selectProvider(provider) {
    currentProvider = provider;
    
    // Update UI
    const options = document.querySelectorAll('.provider-option');
    options.forEach(opt => opt.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    
    // Update button
    const providerName = provider === 'elevenlabs' ? 'ElevenLabs' : 'Minimax';
    document.getElementById('currentProviderName').textContent = providerName;
    
    closeProviderDropdown();
    
    console.log('✅ Provider switched to:', provider);
}

// =================== TAB SWITCHING ===================
function switchTab(tabName) {
    // Remove active from all
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.sidebar-content').forEach(content => content.classList.remove('show'));
    
    // Add active to selected
    event.currentTarget.classList.add('active');
    
    if (tabName === 'settings') {
        document.getElementById('settingsTab').classList.add('show');
    } else {
        document.getElementById('historyTab').classList.add('show');
        loadHistory();
    }
}

// =================== CHAR COUNT ===================
function updateCharCount() {
    const text = document.getElementById('txtInput').value;
    const charCount = text.length;
    
    document.getElementById('charCount').textContent = charCount.toLocaleString() + ' ký tự';
    
    // Calculate cost (placeholder)
    const estimatedCost = Math.ceil(charCount * 1.12);
    document.getElementById('estimatedCost').textContent = estimatedCost.toLocaleString() + ' credits';
}

// =================== FILE UPLOAD ===================
function openFileUpload() {
    document.getElementById('fileInput').click();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('txtInput').value = e.target.result;
        updateCharCount();
    };
    reader.readAsText(file);
}

// =================== VOICE MODAL ===================
function openVoiceModal() {
    document.getElementById('voiceModal').style.display = 'flex';
    loadVoices();
}

function closeVoiceModal() {
    document.getElementById('voiceModal').style.display = 'none';
}

function loadVoices() {
    // TODO: Load voices from API
    console.log('📋 Loading voices...');
}

// =================== TTS GENERATION ===================
async function startTTS() {
    const text = document.getElementById('txtInput').value.trim();
    
    if (!text) {
        alert('Vui lòng nhập văn bản!');
        return;
    }
    
    if (!selectedVoiceId) {
        alert('Vui lòng chọn giọng đọc!');
        return;
    }
    
    console.log('🎙️ Starting TTS...');
    console.log('Provider:', currentProvider);
    console.log('Voice:', selectedVoiceId);
    console.log('Text length:', text.length);
    
    // TODO: Call API
    alert('🔧 TTS function - Đợi BE implementation!');
}

// =================== HISTORY ===================
function loadHistory() {
    console.log('📋 Loading history...');
    // TODO: Load from API
}

// =================== LOGOUT ===================
async function handleLogout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        if (window.electronAPI && window.electronAPI.logout) {
            await window.electronAPI.logout();
        }
    }
}

// =================== AUTO INIT ===================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTTS);
} else {
    initTTS();
}