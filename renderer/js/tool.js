/**
 * KingCong Pro Tool - Advanced TTS Processing
 * Handles batch processing, voice library, multi-voice conversations, and more
 */

// ==================== LANGUAGE LIBRARY ====================
const LANGUAGES = {
    en: {
        // Status
        ready: 'Ready',
        processing: 'Processing...',
        pending: 'Pending',
        done: 'Done',
        failed: 'Failed',

        // Buttons
        start: 'Start',
        stop: 'Stop',
        save: 'Save',
        open: 'Open',
        delete: 'Delete',
        download: 'Download',
        refresh: 'Refresh',
        close: 'Close',
        cancel: 'Cancel',

        // Sections
        project: 'Project',
        provider: 'Provider',
        voice: 'Voice',
        voiceSettings: 'Voice Settings',
        options: 'Options',
        advanced: 'Advanced',

        // Voice Settings
        speed: 'Speed',
        stability: 'Stability',
        similarity: 'Similarity',
        style: 'Style',
        speakerBoost: 'Speaker Boost',
        autoSrt: 'Auto SRT',

        // Options
        splitByChars: 'Split by Characters',
        autoSplit: 'Auto Split',
        oneLine1File: '1 Line = 1 File',
        silentChar: 'Silent Char',

        // Table
        content: 'Content',
        status: 'Status',
        date: 'Date',

        // Messages
        noTasks: 'No tasks to process!',
        selectVoice: 'Please select Voice ID!',
        importSuccess: 'Imported {0} files',
        downloadSuccess: 'Downloaded: {0}',
        deleteConfirm: 'Delete {0} tasks?',
        clearConfirm: 'Clear all tasks?',

        // Backup
        backup: 'Backup',
        history: 'History',
        noHistory: 'No history',
        loadingHistory: 'Loading...',

        // Voice Library
        voiceLibrary: 'Voice Library',
        voiceId: 'Voice ID',
        voiceName: 'Name',
        model: 'Model',
        threads: 'Threads',

        // Errors
        error: 'Error',
        networkError: 'Network error',
        sessionExpired: 'Session expired'
    },
    vi: {
        // Status
        ready: 'Sẵn sàng',
        processing: 'Đang xử lý...',
        pending: 'Chờ xử lý',
        done: 'Hoàn thành',
        failed: 'Thất bại',

        // Buttons
        start: 'Bắt đầu',
        stop: 'Dừng',
        save: 'Lưu',
        open: 'Mở',
        delete: 'Xóa',
        download: 'Tải xuống',
        refresh: 'Làm mới',
        close: 'Đóng',
        cancel: 'Hủy',

        // Sections
        project: 'Dự án',
        provider: 'Nhà cung cấp',
        voice: 'Giọng nói',
        voiceSettings: 'Cài đặt giọng',
        options: 'Tùy chọn',
        advanced: 'Nâng cao',

        // Voice Settings
        speed: 'Tốc độ',
        stability: 'Độ ổn định',
        similarity: 'Độ tương đồng',
        style: 'Phong cách',
        speakerBoost: 'Tăng cường',
        autoSrt: 'Tự động SRT',

        // Options
        splitByChars: 'Chia theo ký tự',
        autoSplit: 'Tự động chia',
        oneLine1File: '1 Dòng = 1 File',
        silentChar: 'Ký tự im lặng',

        // Table
        content: 'Nội dung',
        status: 'Trạng thái',
        date: 'Ngày',

        // Messages
        noTasks: 'Không có tác vụ nào để xử lý!',
        selectVoice: 'Vui lòng chọn Voice ID!',
        importSuccess: 'Đã import {0} file',
        downloadSuccess: 'Đã tải: {0}',
        deleteConfirm: 'Xóa {0} tác vụ?',
        clearConfirm: 'Xóa tất cả tác vụ?',

        // Backup
        backup: 'Sao lưu',
        history: 'Lịch sử',
        noHistory: 'Không có lịch sử',
        loadingHistory: 'Đang tải...',

        // Voice Library
        voiceLibrary: 'Thư viện giọng nói',
        voiceId: 'Voice ID',
        voiceName: 'Tên',
        model: 'Mô hình',
        threads: 'Luồng',

        // Errors
        error: 'Lỗi',
        networkError: 'Lỗi mạng',
        sessionExpired: 'Phiên đã hết hạn'
    }
};

class ProToolManager {
    constructor() {
        this.tasks = [];
        this.voiceLibrary = [];
        this.isProcessing = false;
        this.currentTaskIndex = 0;
        this.completedCount = 0;
        this.processingCount = 0;

        // Language
        this.currentLang = 'vi';
        this.lang = LANGUAGES[this.currentLang];

        // Settings
        this.provider = 'elevenlabs';
        this.model = 'eleven_multilingual_v2';
        this.maxChars = 10000;
        this.delayBetween = 1;
        this.threadCount = 3;

        // Voice Settings
        this.voiceSpeed = 1.0;
        this.voiceStability = 0.5;
        this.voiceSimilarity = 0.75;
        this.voiceStyle = 0;
        this.speakerBoost = true; // Default ON for ElevenLabs
        this.autoSRT = false;
        this.autoSplitChars = '。、,:.!?';

        // ElevenLabs Library
        this.libraryVoices = [];
        this.libraryVoicesLoaded = false;
        this.libraryVoicesLoading = false;
        this.currentVoiceTab = 'default';

        this.init();
    }

    // Get translation
    t(key) {
        return this.lang[key] || LANGUAGES.en[key] || key;
    }

    // Change language
    setLanguage(langCode) {
        if (LANGUAGES[langCode]) {
            this.currentLang = langCode;
            this.lang = LANGUAGES[langCode];
            this.saveSettings();
        }
    }
    
    init() {
        this.setupFileInputs();
        this.setupModelSelect();
        this.loadVoiceLibrary();
        this.loadSettings();
        this.setupAutoSave();
        this.setupVoiceLibraryListener();
        this.loadResourcesOnInit(); // Load models & voices từ server
        this.updateVoiceSettingsUI(); // Initialize provider-specific settings
        console.log('✅ ProToolManager initialized');
    }

    // Listen for voice library updates from new window
    setupVoiceLibraryListener() {
        if (window.electronAPI && window.electronAPI.onVoiceLibraryUpdated) {
            window.electronAPI.onVoiceLibraryUpdated((voices) => {
                console.log('📚 Voice Library updated:', voices);
                this.voiceLibrary = voices;
                localStorage.setItem('voiceLibrary', JSON.stringify(voices));
                this.showNotification(`Đã lưu ${voices.length} voices`, 'success');
            });
        }

        // Listen for voice selection from child windows
        if (window.electronAPI && window.electronAPI.onVoiceSelected) {
            window.electronAPI.onVoiceSelected((voiceId) => {
                console.log('🎤 Voice selected from window:', voiceId);
                document.getElementById('selectedVoiceId').value = voiceId;
                this.showNotification(`Selected: ${voiceId}`, 'success');
            });
        }

        // Also listen for postMessage from popup window
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'voiceLibraryUpdated') {
                console.log('📚 Voice Library updated via postMessage:', event.data.voices);
                this.voiceLibrary = event.data.voices;
                localStorage.setItem('voiceLibrary', JSON.stringify(event.data.voices));
                this.showNotification(`Đã lưu ${event.data.voices.length} voices`, 'success');
            }

            // Listen for voice selection via postMessage
            if (event.data && event.data.type === 'voiceSelected') {
                console.log('🎤 Voice selected via postMessage:', event.data.voiceId);
                document.getElementById('selectedVoiceId').value = event.data.voiceId;
                this.showNotification(`Selected: ${event.data.voiceId}`, 'success');
            }

            // Listen for use voice from library
            if (event.data && event.data.type === 'useVoiceFromLibrary') {
                console.log('🎤 Use voice from library:', event.data.voice);
                this.applyVoiceFromLibrary(event.data.voice);
            }
        });
    }

    // Apply voice and settings from library
    applyVoiceFromLibrary(voice) {
        if (!voice) return;

        // Set voice ID
        document.getElementById('selectedVoiceId').value = voice.voiceId || '';

        // Switch provider if needed
        if (voice.provider && voice.provider !== this.provider) {
            this.provider = voice.provider;
            document.getElementById('providerSelect').value = voice.provider;
            this.updateModelOptions();
            this.updateVoiceSettingsUI();
        }

        // Apply settings based on provider
        if (voice.provider === 'minimax') {
            if (voice.settings) {
                document.getElementById('mmVoiceSpeed').value = voice.settings.speed || 1;
                document.getElementById('mmVoicePitch').value = voice.settings.pitch || 0;
                document.getElementById('mmVoiceVol').value = voice.settings.volume || 1;
                updateSlider('mmSpeed');
                updateSlider('mmPitch');
                updateSlider('mmVol');
            }
        } else {
            if (voice.settings) {
                document.getElementById('voiceSpeed').value = voice.settings.speed || 1;
                document.getElementById('voiceStability').value = voice.settings.stability || 0.5;
                document.getElementById('voiceSimilarity').value = voice.settings.similarity || 0.75;
                document.getElementById('voiceStyle').value = voice.settings.style || 0;
                document.getElementById('speakerBoost').checked = voice.settings.speakerBoost !== false;
                updateSlider('speed');
                updateSlider('stability');
                updateSlider('similarity');
                updateSlider('style');
            }
        }

        this.showNotification(`Applied: ${voice.name || voice.voiceId}`, 'success');
    }

    setupFileInputs() {
        // Provider select
        const providerSelect = document.getElementById('providerSelect');
        providerSelect?.addEventListener('change', (e) => {
            this.provider = e.target.value;
            this.updateModelOptions();
            this.updateVoiceSettingsUI();
            this.saveSettings();
        });

        // Initialize voice settings UI on load
        this.updateVoiceSettingsUI();
    }

    // Switch voice settings UI based on provider
    updateVoiceSettingsUI() {
        const elevenlabsSettings = document.getElementById('elevenlabsSettings');
        const minimaxSettings = document.getElementById('minimaxSettings');
        const voiceCloneSection = document.getElementById('voiceCloneSection');

        if (this.provider === 'minimax') {
            if (elevenlabsSettings) elevenlabsSettings.style.display = 'none';
            if (minimaxSettings) minimaxSettings.style.display = 'block';
            if (voiceCloneSection) voiceCloneSection.style.display = 'block';
        } else {
            if (elevenlabsSettings) elevenlabsSettings.style.display = 'block';
            if (minimaxSettings) minimaxSettings.style.display = 'none';
            if (voiceCloneSection) voiceCloneSection.style.display = 'none';
        }
    }

    setupModelSelect() {
        // Model select
        const modelSelect = document.getElementById('modelSelect');
        modelSelect?.addEventListener('change', (e) => {
            this.model = e.target.value;
            this.saveSettings();
        });
    }

    // Auto-save settings when changed
    setupAutoSave() {
        // Sliders
        ['voiceSpeed', 'voiceStability', 'voiceSimilarity', 'voiceStyle'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.saveSettings());
        });

        // Checkboxes
        ['speakerBoost', 'optAutoSRT', 'optLoop', 'optAutoSplit', 'opt1Line1File', 'optSilentChar', 'optDelayJoin'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.saveSettings());
        });

        // Inputs
        ['maxChars', 'threadCount', 'autoSplitChars', 'delayJoinTime', 'silentChars1', 'silentTime1', 'silentChars2', 'silentTime2'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.saveSettings());
        });
    }
    
    // Import file using Electron dialog
    async importFilesDialog() {
        console.log('📂 Import files dialog...');
        try {
            const result = await window.electronAPI.selectFiles({
                filters: [
                    { name: 'Text Files', extensions: ['txt', 'srt'] }
                ]
            });
            
            console.log('📂 Select result:', result);
            
            if (!result.success || result.canceled) {
                console.log('📂 Canceled or failed');
                return;
            }
            
            for (const filePath of result.filePaths) {
                console.log('📂 Reading file:', filePath);
                const fileResult = await window.electronAPI.readFile(filePath);
                console.log('📂 File result:', { success: fileResult.success, fileName: fileResult.fileName, contentLength: fileResult.content?.length });
                
                if (fileResult.success) {
                    await this.processImportedText(fileResult.content, fileResult.fileName);
                }
            }
            
            console.log('📂 Total tasks after import:', this.tasks.length);
            this.updateTaskDisplay();
        } catch (error) {
            console.error('❌ Import file error:', error);
            this.showNotification('Lỗi khi import file', 'error');
        }
    }
    
    // Import folder using Electron dialog
    async importFolderDialog() {
        try {
            const result = await window.electronAPI.selectFolder();
            
            if (!result.success || result.canceled) return;
            
            for (const filePath of result.files) {
                const fileResult = await window.electronAPI.readFile(filePath);
                if (fileResult.success) {
                    this.addTask({
                        id: this.generateTaskId(),
                        content: fileResult.content,
                        fileName: fileResult.fileName,
                        voiceId: document.getElementById('selectedVoiceId')?.value || '',
                        status: 'pending'
                    });
                }
            }
            
            this.updateTaskDisplay();
            this.showNotification(`Đã import ${result.files.length} file`, 'success');
        } catch (error) {
            console.error('Import folder error:', error);
            this.showNotification('Lỗi khi import folder', 'error');
        }
    }
    
    // Import audio files using Electron dialog
    async importAudioDialog() {
        try {
            const result = await window.electronAPI.selectAudioFiles();
            
            if (!result.success || result.canceled) return;
            
            // Sort by filename (1.mp3, 2.mp3, etc.)
            const sortedFiles = result.filePaths.sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                return numA - numB;
            });
            
            for (const filePath of sortedFiles) {
                const fileName = filePath.split(/[\\/]/).pop().replace('.mp3', '');
                this.addTask({
                    id: this.generateTaskId(),
                    content: `[MP3] ${fileName}.mp3`,
                    fileName: fileName,
                    filePath: filePath,
                    voiceId: 'import',
                    status: 'done',
                    isAudioImport: true
                });
            }
            
            this.updateTaskDisplay();
            this.showNotification(`Đã import ${sortedFiles.length} file MP3`, 'success');
        } catch (error) {
            console.error('Import audio error:', error);
            this.showNotification('Lỗi khi import audio', 'error');
        }
    }
    
    // Process imported text with options
    async processImportedText(text, fileName) {
        console.log('📄 Processing text:', fileName, '| Length:', text?.length);
        
        const optLoop = document.getElementById('optLoop')?.checked;
        const optAutoSplit = document.getElementById('optAutoSplit')?.checked;
        const opt1Line1File = document.getElementById('opt1Line1File')?.checked;
        
        console.log('⚙️ Options - Loop:', optLoop, '| AutoSplit:', optAutoSplit, '| 1Line1File:', opt1Line1File);
        
        // Check for multi-voice format (#1, #2, #3)
        const hasMultiVoice = /#\d+\s/.test(text);
        console.log('👥 Has multi-voice format:', hasMultiVoice);
        
        if (hasMultiVoice) {
            console.log('📄 Processing as multi-voice');
            this.processMultiVoiceText(text, fileName);
        } else if (optLoop) {
            console.log('📄 Processing as loop');
            this.processLoopText(text, fileName);
        } else if (optAutoSplit) {
            console.log('📄 Processing as auto-split');
            this.processAutoSplitText(text, fileName);
        } else if (opt1Line1File) {
            console.log('📄 Processing as 1-line-1-file');
            this.processLineByLineText(text, fileName);
        } else {
            console.log('📄 Processing as single task');
            const voiceId = document.getElementById('selectedVoiceId')?.value || '';
            console.log('📄 Using voiceId:', voiceId);
            
            this.addTask({
                id: this.generateTaskId(),
                content: text,
                fileName: fileName,
                voiceId: voiceId,
                status: 'pending'
            });
        }
    }
    
    updateModelOptions() {
        // Populate ElevenLabs model dropdown
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect && this.loadedModels?.elevenlabs?.length > 0) {
            const currentVal = modelSelect.value;
            modelSelect.innerHTML = this.loadedModels.elevenlabs.map(m =>
                `<option value="${m.id}">${m.name}${m.cost_factor && m.cost_factor < 1 ? ` (${Math.round((1-m.cost_factor)*100)}% rẻ hơn)` : ''}</option>`
            ).join('');
            // Restore selection if exists
            if (currentVal && [...modelSelect.options].some(o => o.value === currentVal)) {
                modelSelect.value = currentVal;
            }
        }

        // Populate Minimax model dropdown
        const minimaxModelSelect = document.getElementById('minimaxModelSelect');
        if (minimaxModelSelect && this.loadedModels?.minimax?.length > 0) {
            const currentVal = minimaxModelSelect.value;
            minimaxModelSelect.innerHTML = this.loadedModels.minimax.map(m =>
                `<option value="${m.id}">${m.name}${m.cost_factor && m.cost_factor < 1 ? ` (${Math.round((1-m.cost_factor)*100)}% rẻ hơn)` : ''}</option>`
            ).join('');
            // Restore selection if exists
            if (currentVal && [...minimaxModelSelect.options].some(o => o.value === currentVal)) {
                minimaxModelSelect.value = currentVal;
            }
        }

        // Update current model based on provider
        if (this.provider === 'elevenlabs') {
            this.model = modelSelect?.value || 'eleven_multilingual_v2';
            // Check if V3 model and apply settings
            if (typeof isModelV3 === 'function' && isModelV3(this.model)) {
                applyV3ModelSettings();
            } else if (typeof applyNormalModelSettings === 'function') {
                applyNormalModelSettings();
            }
        } else {
            this.model = minimaxModelSelect?.value || 'speech-02-hd';
        }
    }
    
    // Load resources khi khởi động
    async loadResourcesOnInit() {
        try {
            const res = await window.electronAPI.getResources();
            console.log('📦 Resources loaded:', res);
            
            if (res && res.status === 'success' && res.data) {
                // Lưu models
                this.loadedModels = {
                    elevenlabs: res.data.elevenlabs?.models || [],
                    minimax: res.data.minimax?.models || []
                };
                
                // Lưu voices
                this.loadedVoices = {
                    elevenlabs: res.data.elevenlabs?.voices || [],
                    minimax: res.data.minimax?.voices || []
                };
                
                console.log('✅ Models:', this.loadedModels);
                console.log('✅ Voices:', this.loadedVoices);
                
                // Update model dropdown
                this.updateModelOptions();
            }
        } catch (error) {
            console.error('❌ Load resources error:', error);
        }
    }
    
    // Load voices from server - mở cửa sổ riêng
    async loadVoicesFromServer() {
        // Open in separate window (disabled for now to use modal with tabs)
        // if (window.electronAPI && window.electronAPI.openVoicesWindow) {
        //     window.electronAPI.openVoicesWindow(this.provider);
        //     return;
        // }

        // Show modal
        document.getElementById('voicesModal').classList.add('show');

        // Show/hide Library tab based on provider
        const libraryTab = document.querySelector('.voice-tab[data-tab="library"]');
        if (libraryTab) {
            libraryTab.style.display = this.provider === 'elevenlabs' ? 'block' : 'none';
        }

        // Reset to default tab
        this.currentVoiceTab = 'default';
        this.switchVoiceTab('default');

        // Load default voices if not cached
        const cachedVoices = this.loadedVoices?.[this.provider];
        if (!cachedVoices || cachedVoices.length === 0) {
            const modalBody = document.getElementById('voicesModalBody');
            modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #555;">Loading voices...</div>`;

            try {
                const res = await window.electronAPI.getResources();
                console.log('✅ getResources response:', res);

                if (res && res.status === 'success' && res.data) {
                    this.loadedVoices = {
                        elevenlabs: res.data.elevenlabs?.voices || [],
                        minimax: res.data.minimax?.voices || []
                    };

                    this.loadedModels = {
                        elevenlabs: res.data.elevenlabs?.models || [],
                        minimax: res.data.minimax?.models || []
                    };
                    this.updateModelOptions();

                    this.renderDefaultVoices();
                } else {
                    console.error('❌ Invalid response:', res);
                    modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #f55;">Không thể tải voices</div>`;
                }
            } catch (error) {
                console.error('❌ Load voices error:', error);
                modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #f55;">Lỗi: ${error.message}</div>`;
            }
        }
    }

    renderVoicesModal(voices) {
        const modalBody = document.getElementById('voicesModalBody');
        
        if (!voices || voices.length === 0) {
            modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #555;">Không có voices</div>`;
            return;
        }
        
        modalBody.innerHTML = `
            <div style="margin-bottom: 12px;">
                <input type="text" class="form-input" id="voiceSearch" placeholder="Tìm kiếm voice..." oninput="proTool.filterVoices(this.value)">
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">${voices.length} voices</div>
            <div id="voicesList" style="max-height: 400px; overflow-y: auto;">
                ${voices.map(voice => `
                    <div class="voice-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #1a1a1a; cursor: pointer;" onclick="proTool.selectVoice('${voice.voice_id || voice.id}', '${voice.name}')">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 13px; color: #fff; font-weight: 500;">${voice.name}</div>
                            <div style="font-size: 10px; color: #555; margin-top: 2px;">${voice.voice_id || voice.id}</div>
                            ${voice.labels ? `<div style="font-size: 10px; color: #666; margin-top: 4px;">${Object.values(voice.labels).join(' • ')}</div>` : ''}
                        </div>
                        <button class="btn btn-sm" style="flex-shrink: 0;" onclick="event.stopPropagation(); proTool.selectVoice('${voice.voice_id || voice.id}', '${voice.name}')">Chọn</button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    filterVoices(query) {
        const items = document.querySelectorAll('#voicesList .voice-item');
        query = query.toLowerCase();
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    }
    
    selectVoice(voiceId, voiceName) {
        document.getElementById('selectedVoiceId').value = voiceId;
        this.showNotification(`Selected: ${voiceName}`, 'success');
        document.getElementById('voicesModal').classList.remove('show');
    }
    
    closeVoicesModal() {
        document.getElementById('voicesModal').classList.remove('show');
    }

    // ==================== VOICE TABS ====================

    switchVoiceTab(tab) {
        console.log('🔄 Switch voice tab:', tab);
        this.currentVoiceTab = tab;

        // Update tab UI
        document.querySelectorAll('.voice-tab').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.style.color = '#fff';
                btn.style.borderBottom = '2px solid #a855f7';
                btn.style.fontWeight = '500';
            } else {
                btn.style.color = '#888';
                btn.style.borderBottom = '2px solid transparent';
                btn.style.fontWeight = 'normal';
            }
        });

        // Load content based on tab
        if (tab === 'default') {
            this.renderDefaultVoices();
        } else if (tab === 'library') {
            this.loadElevenLabsLibrary();
        }
    }

    renderDefaultVoices() {
        const voices = this.loadedVoices?.[this.provider] || [];
        if (voices.length > 0) {
            this.renderVoicesModal(voices);
        } else {
            document.getElementById('voicesModalBody').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    Không có voices mặc định
                </div>
            `;
        }
    }

    async loadElevenLabsLibrary() {
        console.log('🔄 loadElevenLabsLibrary() called');

        // Nếu đã load rồi thì render luôn
        if (this.libraryVoicesLoaded && this.libraryVoices.length > 0) {
            this.renderLibraryVoices(this.libraryVoices);
            return;
        }

        // Đang loading thì hiển thị spinner
        if (this.libraryVoicesLoading) {
            this.showLibraryLoadingSpinner();
            return;
        }

        console.log('🌐 Fetching ElevenLabs Library from server...');
        this.showLibraryLoadingSpinner();
        this.libraryVoicesLoading = true;

        try {
            const res = await window.electronAPI.apiRequest(
                'https://kingcongstudio.com/ajaxs/get_voices.php?v=' + Date.now(),
                {}
            );

            console.log('📦 Library Response:', res);

            if (res && res.status === 'success' && res.data && res.data.length > 0) {
                this.libraryVoices = this.enhanceLibraryVoices(res.data);
                this.libraryVoicesLoaded = true;
                console.log(`✅ SUCCESS: ${res.count || res.data.length} library voices loaded!`);
                this.renderLibraryVoices(this.libraryVoices);
            } else {
                console.error('❌ Invalid response or empty');
                document.getElementById('voicesModalBody').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #f55;">
                        Không có dữ liệu thư viện
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Load library error:', error);
            document.getElementById('voicesModalBody').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #f55;">
                    Lỗi kết nối: ${error.message}
                </div>
            `;
        } finally {
            this.libraryVoicesLoading = false;
        }
    }

    showLibraryLoadingSpinner() {
        document.getElementById('voicesModalBody').innerHTML = `
            <div style="text-align: center; padding: 60px;">
                <div style="width: 40px; height: 40px; border: 3px solid #333; border-top-color: #a855f7; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                <div style="color: #888; font-size: 13px;">Đang tải thư viện ElevenLabs...</div>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
    }

    enhanceLibraryVoices(voices) {
        if (!voices || !Array.isArray(voices)) return [];

        return voices.map(v => ({
            id: v.voice_id || v.id,
            voice_id: v.voice_id || v.id,
            name: v.name || 'Unknown',
            avatar: v.image_url || v.avatar || null,
            preview_url: v.preview_url || null,
            description: v.description || '',
            gender: v.gender || 'unknown',
            age: v.age || 'unknown',
            accent: v.accent || 'neutral',
            language: v.language || 'en',
            use_case: v.use_case || 'conversational',
            category: v.category || 'shared',
            labels: v.labels || {},
            source: 'elevenlabs_library'
        }));
    }

    renderLibraryVoices(voices) {
        const modalBody = document.getElementById('voicesModalBody');

        if (!voices || voices.length === 0) {
            modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #555;">Thư viện trống</div>`;
            return;
        }

        modalBody.innerHTML = `
            <div style="margin-bottom: 12px;">
                <input type="text" class="form-input" id="libraryVoiceSearch" placeholder="Tìm kiếm trong thư viện..." oninput="proTool.filterLibraryVoices(this.value)">
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
                <i class="bi bi-collection"></i> ${voices.length} voices từ ElevenLabs Library
            </div>
            <div id="libraryVoicesList" style="max-height: 400px; overflow-y: auto;">
                ${voices.map(voice => `
                    <div class="voice-item" data-name="${voice.name.toLowerCase()}" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #1a1a1a; cursor: pointer; transition: background 0.2s;"
                         onclick="proTool.selectVoice('${voice.voice_id || voice.id}', '${voice.name}')"
                         onmouseover="this.style.background='#1a1a1a'"
                         onmouseout="this.style.background='transparent'">
                        ${voice.avatar ? `<img src="${voice.avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #2a2a2a; display: flex; align-items: center; justify-content: center; color: #666;"><i class="bi bi-person"></i></div>`}
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 13px; color: #fff; font-weight: 500;">${voice.name}</div>
                            <div style="font-size: 10px; color: #555; margin-top: 2px;">${voice.voice_id || voice.id}</div>
                            <div style="font-size: 10px; color: #666; margin-top: 4px;">
                                ${[voice.gender, voice.age, voice.accent].filter(x => x && x !== 'unknown' && x !== 'neutral').join(' • ')}
                            </div>
                        </div>
                        ${voice.preview_url ? `<button class="btn btn-sm" style="flex-shrink: 0;" onclick="event.stopPropagation(); proTool.playVoicePreview('${voice.preview_url}')"><i class="bi bi-play-fill"></i></button>` : ''}
                        <button class="btn btn-sm btn-primary" style="flex-shrink: 0;" onclick="event.stopPropagation(); proTool.selectVoice('${voice.voice_id || voice.id}', '${voice.name}')">Chọn</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    filterLibraryVoices(query) {
        const items = document.querySelectorAll('#libraryVoicesList .voice-item');
        query = query.toLowerCase();

        items.forEach(item => {
            const name = item.dataset.name || '';
            const text = item.textContent.toLowerCase();
            item.style.display = (name.includes(query) || text.includes(query)) ? 'flex' : 'none';
        });
    }

    playVoicePreview(url) {
        if (!url) return;
        const audio = new Audio(url);
        audio.play().catch(e => console.error('Preview error:', e));
    }

    // ==================== FILE HANDLING ====================
    
    async handleFileImport(files) {
        if (!files || files.length === 0) return;
        
        const optLoop = document.getElementById('optLoop')?.checked;
        const optAutoSplit = document.getElementById('optAutoSplit')?.checked;
        const opt1Line1File = document.getElementById('opt1Line1File')?.checked;
        
        for (const file of files) {
            const text = await this.readFileAsText(file);
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            
            // Check for multi-voice format (#1, #2, #3)
            const hasMultiVoice = /#\d+\s/.test(text);
            
            if (hasMultiVoice) {
                // Case 5: Multi-voice conversation
                this.processMultiVoiceText(text, fileName);
            } else if (optLoop) {
                // Case 2: Loop - split by character count
                this.processLoopText(text, fileName);
            } else if (optAutoSplit) {
                // Case 3: Auto Split by punctuation
                this.processAutoSplitText(text, fileName);
            } else if (opt1Line1File) {
                // Case 4: 1 Line = 1 File
                this.processLineByLineText(text, fileName);
            } else {
                // Case 1: Normal - full text
                this.addTask({
                    id: this.generateTaskId(),
                    content: text,
                    fileName: fileName,
                    voiceId: document.getElementById('selectedVoiceId')?.value || '',
                    status: 'pending'
                });
            }
        }
        
        this.updateTaskDisplay();
        document.getElementById('fileInput').value = '';
    }
    
    async handleFolderImport(files) {
        if (!files || files.length === 0) return;
        
        const textFiles = Array.from(files).filter(f => 
            f.name.endsWith('.txt') || f.name.endsWith('.srt')
        );
        
        for (const file of textFiles) {
            const text = await this.readFileAsText(file);
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            
            this.addTask({
                id: this.generateTaskId(),
                content: text,
                fileName: fileName,
                voiceId: document.getElementById('selectedVoiceId')?.value || '',
                status: 'pending'
            });
        }
        
        this.updateTaskDisplay();
        document.getElementById('folderInput').value = '';
    }
    
    handleVoiceImport(files) {
        if (!files || files.length === 0) return;
        
        // Filter MP3 files and sort by name (1.mp3, 2.mp3, etc.)
        const mp3Files = Array.from(files)
            .filter(f => f.name.endsWith('.mp3'))
            .sort((a, b) => {
                const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
                return numA - numB;
            });
        
        if (mp3Files.length === 0) {
            this.showNotification('Không tìm thấy file MP3!', 'error');
            return;
        }
        
        // Add to tasks for joining
        mp3Files.forEach((file, index) => {
            this.addTask({
                id: this.generateTaskId(),
                content: `[MP3] ${file.name}`,
                fileName: file.name.replace('.mp3', ''),
                filePath: file.path || URL.createObjectURL(file),
                voiceId: 'import',
                status: 'done',
                isAudioImport: true,
                file: file
            });
        });
        
        this.updateTaskDisplay();
        this.showNotification(`Đã import ${mp3Files.length} file MP3`, 'success');
        document.getElementById('voiceInput').value = '';
    }
    
    // ==================== TEXT PROCESSING ====================
    
    processMultiVoiceText(text, baseFileName) {
        // Parse text with #1, #2, #3 markers
        const lines = text.split('\n');
        let currentVoiceNum = null;
        let currentContent = '';
        let segmentNum = 1;
        
        const segments = [];
        
        for (const line of lines) {
            const match = line.match(/^#(\d+)\s*(.*)/);
            if (match) {
                // Save previous segment
                if (currentVoiceNum !== null && currentContent.trim()) {
                    segments.push({
                        voiceNum: currentVoiceNum,
                        content: currentContent.trim()
                    });
                }
                // Start new segment
                currentVoiceNum = parseInt(match[1]);
                currentContent = match[2] + '\n';
            } else if (currentVoiceNum !== null) {
                currentContent += line + '\n';
            }
        }
        
        // Add last segment
        if (currentVoiceNum !== null && currentContent.trim()) {
            segments.push({
                voiceNum: currentVoiceNum,
                content: currentContent.trim()
            });
        }
        
        // Create tasks with voice library mapping
        segments.forEach((seg, index) => {
            const voice = this.voiceLibrary.find(v => v.id === seg.voiceNum);
            this.addTask({
                id: this.generateTaskId(),
                content: seg.content,
                fileName: `${baseFileName}_${index + 1}`,
                voiceId: voice?.voiceId || '',
                voiceName: voice?.name || `Voice #${seg.voiceNum}`,
                voiceNum: seg.voiceNum,
                status: 'pending'
            });
        });
    }
    
    processLoopText(text, baseFileName) {
        const maxChars = parseInt(document.getElementById('maxChars')?.value) || 10000;
        const chunks = this.splitByCharCount(text, maxChars);
        
        chunks.forEach((chunk, index) => {
            this.addTask({
                id: this.generateTaskId(),
                content: chunk,
                fileName: `${baseFileName}_${index + 1}`,
                voiceId: document.getElementById('selectedVoiceId')?.value || '',
                status: 'pending'
            });
        });
    }
    
    processAutoSplitText(text, baseFileName) {
        // Split by punctuation marks: 。、,:.!?
        const parts = text.split(/([。、,:.!?]+)/);
        let segments = [];
        let current = '';
        
        for (let i = 0; i < parts.length; i++) {
            current += parts[i];
            if (i % 2 === 1) { // After punctuation
                if (current.trim()) {
                    segments.push(current.trim());
                }
                current = '';
            }
        }
        if (current.trim()) {
            segments.push(current.trim());
        }
        
        segments.forEach((seg, index) => {
            this.addTask({
                id: this.generateTaskId(),
                content: seg,
                fileName: `${baseFileName}_${index + 1}`,
                voiceId: document.getElementById('selectedVoiceId')?.value || '',
                status: 'pending'
            });
        });
    }
    
    processLineByLineText(text, baseFileName) {
        const lines = text.split('\n').filter(line => line.trim());
        
        lines.forEach((line, index) => {
            this.addTask({
                id: this.generateTaskId(),
                content: line.trim(),
                fileName: `${baseFileName}_${index + 1}`,
                voiceId: document.getElementById('selectedVoiceId')?.value || '',
                status: 'pending'
            });
        });
    }
    
    splitByCharCount(text, maxChars) {
        const chunks = [];
        let remaining = text;
        
        while (remaining.length > maxChars) {
            // Find good split point (end of sentence/word)
            let splitPoint = maxChars;
            const goodBreaks = ['. ', '! ', '? ', '。', '\n', ' '];
            
            for (const brk of goodBreaks) {
                const pos = remaining.lastIndexOf(brk, maxChars);
                if (pos > maxChars * 0.7) {
                    splitPoint = pos + brk.length;
                    break;
                }
            }
            
            chunks.push(remaining.substring(0, splitPoint).trim());
            remaining = remaining.substring(splitPoint).trim();
        }
        
        if (remaining.trim()) {
            chunks.push(remaining.trim());
        }
        
        return chunks;
    }
    
    applySilentCharacter(text) {
        const provider = this.provider;

        // Get custom settings from UI
        const chars1 = document.getElementById('silentChars1')?.value || ',;';
        const time1 = document.getElementById('silentTime1')?.value || '0.3';
        const chars2 = document.getElementById('silentChars2')?.value || '.:?!';
        const time2 = document.getElementById('silentTime2')?.value || '0.5';

        // Build regex from characters
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex1 = new RegExp(`[${escapeRegex(chars1)}]`, 'g');
        const regex2 = new RegExp(`[${escapeRegex(chars2)}]`, 'g');

        if (provider === 'elevenlabs') {
            // ElevenLabs format: <break time="0.3s"/>
            text = text.replace(regex1, `<break time="${time1}s"/>`);
            text = text.replace(regex2, `<break time="${time2}s"/>`);
        } else {
            // Minimax format: <#0.3#>
            text = text.replace(regex1, `<#${time1}#>`);
            text = text.replace(regex2, `<#${time2}#>`);
        }

        return text;
    }
    
    removeSpecialCharacters(text) {
        // Remove special characters that might cause issues with TTS
        // Keep basic punctuation: . , ! ? : ; ' "
        // Remove: @ # $ % ^ & * = + | \ / ~ ` [ ] { } < >
        return text
            .replace(/[@#$%^&*=+|\\\/~`\[\]{}]/g, '')
            .replace(/[<>]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    // ==================== TASK MANAGEMENT ====================
    
    addTask(task) {
        task.createdAt = new Date().toISOString();
        this.tasks.push(task);
        console.log('➕ Added task:', {
            id: task.id,
            fileName: task.fileName,
            contentLength: task.content?.length,
            voiceId: task.voiceId,
            status: task.status
        });
    }
    
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    updateTaskDisplay() {
        const taskTableBody = document.getElementById('taskTableBody');
        const progressText = document.getElementById('progressText');

        // Render tasks
        taskTableBody.innerHTML = this.tasks.map((task, index) => `
            <tr data-id="${task.id}">
                <td><input type="checkbox" class="task-checkbox" data-id="${task.id}" onchange="proTool.onTaskCheckChange()"></td>
                <td style="color: #444;">${index + 1}</td>
                <td>
                    <input type="text" class="form-input"
                           value="${this.escapeHtml(task.outputName || task.fileName || '')}"
                           data-id="${task.id}"
                           onchange="proTool.updateTaskField('${task.id}', 'outputName', this.value)"
                           placeholder="Output name..."
                           style="padding: 4px 6px; font-size: 11px; width: 90px;">
                </td>
                <td>
                    <textarea class="form-input task-content-input"
                              data-id="${task.id}"
                              onchange="proTool.updateTaskField('${task.id}', 'content', this.value)"
                              style="padding: 4px 6px; font-size: 11px; width: 100%; min-height: 32px; max-height: 80px; resize: vertical;"
                    >${this.escapeHtml(task.content || '')}</textarea>
                </td>
                <td>
                    <input type="text" class="form-input"
                           value="${this.escapeHtml(task.voiceId || '')}"
                           data-id="${task.id}"
                           onchange="proTool.updateTaskField('${task.id}', 'voiceId', this.value)"
                           placeholder="Voice ID..."
                           style="padding: 4px 6px; font-size: 11px; width: 110px;">
                </td>
                <td><span class="status ${task.status}">${this.getStatusText(task.status)}</span></td>
                <td>
                    ${task.resultUrl ? `<button class="btn btn-sm" onclick="proTool.downloadTask('${task.id}')" title="Tải xuống"><i class="bi bi-download"></i></button>` : ''}
                    <button class="btn btn-sm" onclick="proTool.removeTask('${task.id}')" title="Xóa"><i class="bi bi-x"></i></button>
                </td>
            </tr>
        `).join('');

        this.updateProgress();
        this.updateSelectionActions();
    }

    // Update task field (generic)
    updateTaskField(taskId, field, value) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task[field] = value;
        }
    }
    
    // Khi checkbox thay đổi
    onTaskCheckChange() {
        this.updateSelectionActions();
    }
    
    // Lấy các tasks đã chọn
    getSelectedTasks() {
        const checkboxes = document.querySelectorAll('.task-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);
        return this.tasks.filter(t => selectedIds.includes(t.id));
    }
    
    // Update hiển thị action bar khi có selection
    updateSelectionActions() {
        const selectedTasks = this.getSelectedTasks();
        const selectionBar = document.getElementById('selectionActions');
        
        if (!selectionBar) return;
        
        if (selectedTasks.length > 0) {
            const doneCount = selectedTasks.filter(t => t.status === 'done' && t.resultUrl).length;
            
            selectionBar.innerHTML = `
                <span style="color: #888; margin-right: 10px;">Đã chọn: ${selectedTasks.length}</span>
                ${doneCount > 0 ? `
                    <button class="btn btn-sm" onclick="proTool.downloadSelected()" title="Tải tất cả">
                        <i class="bi bi-download"></i> Tải (${doneCount})
                    </button>
                ` : ''}
                <button class="btn btn-sm" onclick="proTool.deleteSelected()" title="Xóa đã chọn">
                    <i class="bi bi-trash"></i> Xóa
                </button>
            `;
            selectionBar.style.display = 'flex';
        } else {
            selectionBar.style.display = 'none';
        }
    }
    
    // Download tất cả tasks đã chọn
    async downloadSelected() {
        const selectedTasks = this.getSelectedTasks();
        const doneTasks = selectedTasks.filter(t => t.status === 'done' && t.resultUrl);
        
        if (doneTasks.length === 0) {
            this.showNotification('Không có file hoàn thành để tải!', 'warning');
            return;
        }
        
        this.showNotification(`Đang tải ${doneTasks.length} file...`, 'info');
        
        for (const task of doneTasks) {
            await this.downloadFromUrl(task.resultUrl, (task.fileName || 'audio') + '.mp3');
            await new Promise(r => setTimeout(r, 500)); // Delay giữa các file
        }
        
        this.showNotification(`Đã tải ${doneTasks.length} file!`, 'success');
    }
    
    // Xóa tất cả tasks đã chọn
    deleteSelected() {
        const selectedTasks = this.getSelectedTasks();
        if (selectedTasks.length === 0) return;
        
        if (confirm(`Xóa ${selectedTasks.length} tasks đã chọn?`)) {
            const selectedIds = selectedTasks.map(t => t.id);
            this.tasks = this.tasks.filter(t => !selectedIds.includes(t.id));
            this.updateTaskDisplay();
            this.showNotification(`Đã xóa ${selectedTasks.length} tasks`, 'success');
        }
    }
    
    getStatusIcon(status) {
        const icons = {
            pending: '⏳',
            processing: '🔄',
            done: '✅',
            failed: '❌'
        };
        return icons[status] || '⏳';
    }
    
    getStatusText(status) {
        const texts = {
            pending: 'Chờ xử lý',
            processing: 'Đang xử lý',
            done: 'Hoàn thành',
            failed: 'Thất bại'
        };
        return texts[status] || status;
    }
    
    updateProgress() {
        const done = this.tasks.filter(t => t.status === 'done').length;
        const processing = this.tasks.filter(t => t.status === 'processing').length;
        const total = this.tasks.length;
        
        const progressText = document.getElementById('progressText');
        if (progressText) {
            if (total === 0) {
                progressText.textContent = '0 tasks';
            } else {
                progressText.textContent = `${done}/${total} done` + (processing > 0 ? ` • ${processing} processing` : '');
            }
        }
    }
    
    removeTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.updateTaskDisplay();
    }
    
    clearTasks() {
        if (this.isProcessing) {
            this.showNotification('Không thể xóa khi đang xử lý!', 'warning');
            return;
        }
        if (confirm('Xóa tất cả tác vụ?')) {
            this.tasks = [];
            this.updateTaskDisplay();
        }
    }
    
    // ==================== PROCESSING ====================

    async startProcessing() {
        console.log('🚀 Starting processing...');
        console.log('📊 Provider:', this.provider, '| Model:', this.model);

        if (this.isProcessing) {
            console.log('⚠️ Already processing');
            return;
        }

        const pendingTasks = this.tasks.filter(t => t.status === 'pending');
        console.log('📋 Pending tasks:', pendingTasks.length);

        if (pendingTasks.length === 0) {
            this.showNotification('Không có tác vụ nào để xử lý!', 'warning');
            return;
        }

        const selectedVoiceId = document.getElementById('selectedVoiceId')?.value;
        console.log('🎤 Selected Voice ID:', selectedVoiceId);

        const tasksWithoutVoice = pendingTasks.filter(t => !t.voiceId);
        console.log('📋 Tasks without voiceId:', tasksWithoutVoice.length);

        if (!selectedVoiceId && tasksWithoutVoice.length > 0) {
            console.log('❌ No voice ID selected for tasks that need it');
            this.showNotification('Vui lòng chọn Voice ID!', 'warning');
            return;
        }

        this.isProcessing = true;
        document.getElementById('btnStart').disabled = true;
        document.getElementById('btnStop').disabled = false;
        document.getElementById('statusText').textContent = 'Đang xử lý...';

        const optSilentChar = document.getElementById('optSilentChar')?.checked;

        // Get thread count from UI (max 10)
        const threadCount = Math.min(Math.max(parseInt(document.getElementById('threadCount')?.value) || 3, 1), 10);
        console.log(`📊 Using ${threadCount} parallel threads`);

        // Process tasks with parallel threads
        const processQueue = [...pendingTasks];
        let currentIndex = 0;
        let activeCount = 0;
        let completedCount = 0;
        const totalTasks = processQueue.length;

        const processTask = async (task, retryCount = 0) => {
            console.log('🔄 Processing task:', task.id, task.content?.substring(0, 50));
            task.status = 'processing';
            this.updateTaskDisplay();

            try {
                // Apply text transformations
                let content = task.content;
                console.log('📝 Original content length:', content?.length);

                // Apply silent character if enabled
                if (optSilentChar) {
                    content = this.applySilentCharacter(content);
                    console.log('🔧 After silentChar:', content?.length);
                }

                const voiceIdToUse = task.voiceId || selectedVoiceId;
                console.log('🎤 Voice ID to use:', voiceIdToUse);

                if (!voiceIdToUse) {
                    throw new Error('No Voice ID specified');
                }

                // Make API call
                const result = await this.createTTSTask(content, voiceIdToUse);
                console.log('📋 Create task result:', result);

                if (result.success) {
                    task.taskId = result.taskId;
                    task.status = 'processing';
                    console.log('⏳ Polling status for task:', result.taskId);

                    // Poll for completion
                    await this.pollTaskStatus(task);
                    console.log('✅ Task final status:', task.status);
                } else {
                    // Check for rate limit error
                    const isRateLimit = result.error?.includes('giới hạn') ||
                                       result.error?.includes('rate limit') ||
                                       result.error?.includes('10 yêu cầu');

                    if (isRateLimit && retryCount < 3) {
                        const waitTime = 60 + (retryCount * 10); // 60s, 70s, 80s
                        console.log(`⏳ Rate limit hit! Waiting ${waitTime}s before retry... (attempt ${retryCount + 1}/3)`);
                        task.error = `Đợi ${waitTime}s (rate limit)...`;
                        this.updateTaskDisplay();

                        await new Promise(r => setTimeout(r, waitTime * 1000));

                        if (this.isProcessing) {
                            return processTask(task, retryCount + 1);
                        }
                    } else {
                        task.status = 'failed';
                        task.error = result.error || 'Unknown error';
                        console.error('❌ Task failed:', task.error);
                    }
                }
            } catch (error) {
                console.error('❌ Task exception:', error);
                task.status = 'failed';
                task.error = error.message;
            }

            this.updateTaskDisplay();
        };

        // Parallel processing with thread limit using semaphore pattern
        console.log(`📊 Processing ${totalTasks} tasks with ${threadCount} parallel threads`);

        const runWorker = async () => {
            while (this.isProcessing) {
                // Get next task
                if (currentIndex >= processQueue.length) {
                    break;
                }

                const taskIndex = currentIndex++;
                const task = processQueue[taskIndex];

                activeCount++;

                // Update status
                document.getElementById('statusText').textContent =
                    `Đang xử lý... (${completedCount}/${totalTasks} done, ${activeCount} active)`;

                await processTask(task);

                activeCount--;
                completedCount++;

                // Update status after completion
                document.getElementById('statusText').textContent =
                    `Đang xử lý... (${completedCount}/${totalTasks} done, ${activeCount} active)`;
            }
        };

        // Start workers based on thread count
        const workers = [];
        for (let i = 0; i < threadCount; i++) {
            workers.push(runWorker());
        }

        // Wait for all workers to complete
        await Promise.all(workers);

        this.finishProcessing();
    }
    
    async createTTSTask(content, voiceId) {
        try {
            const optAutoSRT = document.getElementById('optAutoSRT')?.checked;

            // Get voice settings based on provider
            let speed, stability, similarity, style, speakerBoost, pitch, vol;

            if (this.provider === 'minimax') {
                // Minimax settings
                speed = parseFloat(document.getElementById('mmVoiceSpeed')?.value) || 1;
                pitch = parseInt(document.getElementById('mmVoicePitch')?.value) || 0;
                vol = parseFloat(document.getElementById('mmVoiceVol')?.value) || 1;
            } else {
                // ElevenLabs settings (slider 0-100 -> API 0-1)
                speed = parseFloat(document.getElementById('voiceSpeed')?.value) || 1;
                stability = (parseFloat(document.getElementById('voiceStability')?.value) || 50) / 100;
                similarity = (parseFloat(document.getElementById('voiceSimilarity')?.value) || 75) / 100;
                style = (parseFloat(document.getElementById('voiceStyle')?.value) || 0) / 100;
                speakerBoost = document.getElementById('speakerBoost')?.checked || false;
            }

            // Build params giống bên TTS tab
            const params = {
                action: 'create_speech', // ✅ Giống TTS tab
                provider: this.provider,
                text: content,
                voice_id: voiceId,
                voice_name: '', // Optional
                with_transcript: optAutoSRT,
                model_id: this.model // ✅ Giống TTS tab (model_id không phải model)
            };

            // Thêm params theo provider (giống TTS tab)
            if (this.provider === 'minimax') {
                params.vol = vol;
                params.speed = speed;
                params.pitch = pitch;
            } else {
                // ElevenLabs
                params.speed = speed;
                params.stability = stability;
                params.similarity = similarity; // ✅ Giống TTS tab (similarity không phải similarity_boost)
                params.style = style;
                params.use_boost = speakerBoost; // ✅ Giống TTS tab (boolean không phải string)
            }
            
            console.log('📤 API Request:', {
                ...params,
                text: content.substring(0, 100) + (content.length > 100 ? '...' : '')
            });
            console.log('📤 Full text length:', content.length);
            
            const response = await window.electronAPI.apiRequest(
                'https://kingcongstudio.com/ajaxs/tts3.php',
                params
            );
            
            console.log('📥 API Response:', response);
            
            // Check response (server trả về status: 'success' không phải success: true)
            if (response.status === 'success' && (response.task_id || response.history_id || response.queue_id)) {
                const taskId = response.task_id || response.history_id;
                console.log('✅ Task created:', taskId);
                return { success: true, taskId: taskId, queueId: response.queue_id };
            } else {
                console.error('❌ API Error:', response);
                return { success: false, error: response.message || response.error || 'Failed to create task' };
            }
        } catch (error) {
            console.error('❌ Request Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async pollTaskStatus(task, maxAttempts = 60) {
        console.log('⏳ Starting poll for task:', task.taskId);
        
        for (let i = 0; i < maxAttempts; i++) {
            if (!this.isProcessing) {
                console.log('⏸️ Processing stopped, breaking poll');
                break;
            }
            
            try {
                console.log(`🔄 Poll attempt ${i + 1}/${maxAttempts} for task:`, task.taskId);
                
                const response = await window.electronAPI.apiRequest(
                    'https://kingcongstudio.com/ajaxs/tts3.php',
                    {
                        action: 'check_status', // ✅ Giống TTS tab
                        task_id: task.taskId
                    }
                );
                
                console.log('📥 Poll response:', response);
                
                // Check task_status field (giống TTS tab)
                const taskStatus = response.task_status || response.status;
                const progress = parseInt(response.progress) || 0;
                
                console.log(`📊 Task ${task.taskId}: status=${taskStatus}, progress=${progress}%`);
                
                if (taskStatus === 'completed' || taskStatus === 'done') {
                    console.log('✅ Task completed:', task.taskId);
                    task.status = 'done';
                    task.resultUrl = response.result_url || response.audio_url || response.url;
                    task.duration = response.duration || '-';
                    task.progress = 100;

                    // Auto download to output folder
                    await this.autoDownloadTask(task);

                    return;
                } else if (taskStatus === 'failed' || taskStatus === 'error') {
                    console.log('❌ Task failed:', task.taskId, response.message);
                    task.status = 'failed';
                    task.error = response.message || 'Task failed';
                    return;
                }
                
                // Update progress
                task.progress = progress;
                this.updateTaskDisplay();
                
                // Still processing, wait
                await new Promise(r => setTimeout(r, 2000));
            } catch (error) {
                console.error('❌ Poll error:', error);
            }
        }
        
        console.log('⏰ Poll timeout for task:', task.taskId);
        // Timeout - mark as still processing (can check backup later)
        task.status = 'processing';
    }
    
    stopProcessing() {
        this.isProcessing = false;
        document.getElementById('btnStart').disabled = false;
        document.getElementById('btnStop').disabled = true;
        document.getElementById('statusText').textContent = 'Đã dừng';
    }
    
    finishProcessing() {
        this.isProcessing = false;
        document.getElementById('btnStart').disabled = false;
        document.getElementById('btnStop').disabled = true;
        
        const done = this.tasks.filter(t => t.status === 'done').length;
        const failed = this.tasks.filter(t => t.status === 'failed').length;
        
        document.getElementById('statusText').textContent = `Hoàn tất - ${done} thành công, ${failed} thất bại`;
        
        if (done > 0) {
            this.showNotification(`Đã xử lý ${done} tác vụ thành công!`, 'success');
        }
    }
    
    // ==================== VOICE LIBRARY ====================
    
    loadVoiceLibrary() {
        const saved = localStorage.getItem('voiceLibrary');
        if (saved) {
            try {
                this.voiceLibrary = JSON.parse(saved);
                this.renderVoiceLibraryTable();
            } catch (e) {
                this.voiceLibrary = [];
            }
        }
    }
    
    saveVoiceLibrary() {
        // Collect from table
        const rows = document.querySelectorAll('#voiceLibraryBody tr');
        this.voiceLibrary = [];
        
        rows.forEach((row, index) => {
            const inputs = row.querySelectorAll('input');
            const id = index + 1;
            const voiceId = inputs[0]?.value?.trim() || '';
            const name = inputs[1]?.value?.trim() || '';
            
            if (voiceId) {
                this.voiceLibrary.push({ id, voiceId, name });
            }
        });
        
        localStorage.setItem('voiceLibrary', JSON.stringify(this.voiceLibrary));
        console.log('✅ Voice Library saved:', this.voiceLibrary);
        this.showNotification('Saved!', 'success');
        
        // Close modal - use DOM directly
        const modal = document.getElementById('voiceLibraryModal');
        if (modal) modal.classList.remove('show');
    }
    
    renderVoiceLibraryTable() {
        const tbody = document.getElementById('voiceLibraryBody');
        if (!tbody) return;
        
        if (this.voiceLibrary.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td>1</td>
                    <td><input type="text" placeholder="Voice ID..."></td>
                    <td><input type="text" placeholder="Name..."></td>
                    <td><button class="btn btn-sm" onclick="removeVoiceRow(this)">×</button></td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.voiceLibrary.map((voice) => `
            <tr>
                <td>${voice.id}</td>
                <td><input type="text" value="${voice.voiceId}" placeholder="Voice ID..."></td>
                <td><input type="text" value="${voice.name || ''}" placeholder="Name..."></td>
                <td><button class="btn btn-sm" onclick="removeVoiceRow(this)">×</button></td>
            </tr>
        `).join('');
    }
    
    // ==================== JOIN MP3 & SRT ====================

    async joinMp3AndSrt() {
        const doneTasks = this.tasks.filter(t => t.status === 'done' || t.isAudioImport);

        if (doneTasks.length < 2) {
            this.showNotification('Cần ít nhất 2 file để nối!', 'warning');
            return;
        }

        // Get delay from Advanced Settings
        const useDelay = document.getElementById('optDelayJoin')?.checked;
        const delaySeconds = useDelay ? (parseFloat(document.getElementById('delayJoinTime')?.value) || 0.5) : 0;

        this.showNotification('Đang chuẩn bị nối file...', 'info');

        try {
            // Step 1: Download all files first
            const downloadedFiles = [];
            const taskData = [];

            for (const task of doneTasks) {
                if (task.isAudioImport && task.filePath) {
                    // Local file
                    downloadedFiles.push(task.filePath);
                    taskData.push({
                        content: task.content || task.fileName,
                        duration: task.duration || 3
                    });
                } else if (task.resultUrl) {
                    // Need to download
                    const fileName = `${task.outputName || task.fileName || task.id}.mp3`;
                    const result = await window.electronAPI.downloadFile({
                        url: task.resultUrl,
                        fileName: fileName,
                        subfolder: this.provider === 'elevenlabs' ? '11labs' : 'Minimax'
                    });

                    if (result.success) {
                        downloadedFiles.push(result.filePath);
                        taskData.push({
                            content: task.content || task.fileName,
                            duration: task.duration || 3
                        });
                    }
                }
            }

            if (downloadedFiles.length < 2) {
                this.showNotification('Không đủ file để nối!', 'warning');
                return;
            }

            // Step 2: Get output name from first task
            const firstTask = doneTasks[0];
            const baseName = firstTask.outputName || firstTask.fileName || 'joined';
            const outputName = `${baseName}_joined_${Date.now()}`;

            // Step 3: Join files with delay and create SRT
            const joinResult = await window.electronAPI.joinAudioLocal({
                files: downloadedFiles,
                delay: delaySeconds,
                outputName: outputName,
                createSrt: true,
                taskData: taskData
            });

            if (joinResult && joinResult.success) {
                let msg = `Đã nối ${downloadedFiles.length} file thành công!`;
                if (joinResult.srtPath) {
                    msg += ' + SRT';
                }
                this.showNotification(msg, 'success');
            } else {
                this.showNotification(joinResult?.message || 'Lỗi khi nối file', 'warning');
            }

        } catch (error) {
            console.error('Join error:', error);
            this.showNotification('Lỗi khi nối file: ' + error.message, 'error');
        }
    }

    async joinFiles() {
        // Redirect to new function
        return this.joinMp3AndSrt();
    }
    
    async createSRTFromTasks() {
        const doneTasks = this.tasks.filter(t => t.status === 'done' && t.duration);
        
        if (doneTasks.length === 0) {
            this.showNotification('Không có task hoàn thành để tạo SRT!', 'warning');
            return;
        }
        
        let srtContent = '';
        let currentTime = 0;
        
        doneTasks.forEach((task, index) => {
            const duration = parseFloat(task.duration) || 5;
            const startTime = this.formatSRTTime(currentTime);
            const endTime = this.formatSRTTime(currentTime + duration);
            
            srtContent += `${index + 1}\n`;
            srtContent += `${startTime} --> ${endTime}\n`;
            srtContent += `${task.content.substring(0, 200)}\n\n`;
            
            currentTime += duration;
            
            // Add delay
            const delay = parseFloat(document.getElementById('delayBetween')?.value) || 1;
            currentTime += delay;
        });
        
        const outputName = `subtitle_${Date.now()}.srt`;
        await window.electronAPI.saveFile({
            fileName: outputName,
            content: srtContent
        });
        
        this.showNotification(`Đã tạo file ${outputName}`, 'success');
    }
    
    formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }
    
    // ==================== BACKUP/HISTORY ====================

    async openBackup() {
        // Open in separate window
        if (window.electronAPI && window.electronAPI.openBackupWindow) {
            window.electronAPI.openBackupWindow();
            return;
        }

        // Fallback to modal
        document.getElementById('backupModal').classList.add('show');
        await this.loadBackupHistory();
    }
    
    closeBackup() {
        document.getElementById('backupModal').classList.remove('show');
    }
    
    async loadBackupHistory() {
        const backupBody = document.getElementById('backupBody');
        backupBody.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-hourglass"></i>
                <h4>Đang tải...</h4>
            </div>
        `;
        
        try {
            const response = await window.electronAPI.apiRequest(
                'https://kingcongstudio.com/ajaxs/tts3.php',
                { action: 'history', page: 1 }
            );
            
            if (response.success && response.tasks) {
                this.renderBackupHistory(response.tasks);
            } else {
                backupBody.innerHTML = `
                    <div class="empty-state">
                        <i class="bi bi-inbox"></i>
                        <h4>Không có lịch sử</h4>
                    </div>
                `;
            }
        } catch (error) {
            backupBody.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-exclamation-circle"></i>
                    <h4>Lỗi khi tải lịch sử</h4>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    renderBackupHistory(tasks) {
        const backupBody = document.getElementById('backupBody');

        backupBody.innerHTML = `
            <table class="task-table" style="font-size: 12px;">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Content</th>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => `
                        <tr>
                            <td style="color: #444; font-size: 10px;">${(task.id || task.task_id || '').substring(0, 8)}</td>
                            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${this.escapeHtml((task.text || task.input_text || '').substring(0, 50))}
                            </td>
                            <td style="color: #888; font-size: 11px;">${this.escapeHtml(task.project || task.project_name || '-')}</td>
                            <td><span class="status ${task.status?.toLowerCase()}">${this.getStatusText(task.status?.toLowerCase())}</span></td>
                            <td style="color: #555; font-size: 11px;">${task.created_at || task.date || '-'}</td>
                            <td>
                                ${task.result_url ? `<button class="btn btn-sm" onclick="proTool.downloadToBackup('${task.result_url}', '${(task.id || task.task_id || 'audio').substring(0, 8)}.mp3')" title="Download to Backup"><i class="bi bi-download"></i></button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    async refreshBackup() {
        await this.loadBackupHistory();
    }

    async deleteAllBackupTasks() {
        try {
            const response = await window.electronAPI.apiRequest(
                'https://kingcongstudio.com/ajaxs/tts3.php',
                {
                    action: 'delete_all_tasks'
                }
            );

            if (response.success || response.status === 'success') {
                this.showNotification('Đã xóa tất cả tasks!', 'success');
                await this.loadBackupHistory();
            } else {
                this.showNotification(response.message || 'Lỗi xóa tasks', 'error');
            }
        } catch (error) {
            console.error('Delete all tasks error:', error);
            this.showNotification('Lỗi xóa tasks: ' + error.message, 'error');
        }
    }

    // ==================== UTILITIES ====================
    
    async downloadTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task?.resultUrl) {
            this.showNotification('Không có file để tải!', 'warning');
            return;
        }
        
        this.downloadFromUrl(task.resultUrl, task.fileName + '.mp3');
    }
    
    downloadFromUrl(url, filename = 'audio.mp3') {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Download to Backup folder (for Backup modal)
    async downloadToBackup(url, filename = 'audio.mp3') {
        try {
            const result = await window.electronAPI.downloadFile({
                url: url,
                fileName: filename,
                subfolder: 'Backup'
            });

            if (result && result.success) {
                this.showNotification(`Downloaded to Backup: ${filename}`, 'success');
            } else {
                // Fallback to browser download
                this.downloadFromUrl(url, filename);
            }
        } catch (error) {
            console.error('Download to Backup error:', error);
            this.downloadFromUrl(url, filename);
        }
    }
    
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showNotification(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        const colors = {
            success: '#4ade80',
            error: '#ef4444',
            warning: '#fbbf24',
            info: '#667eea'
        };
        
        toast.style.background = colors[type] || colors.info;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    loadSettings() {
        // Load saved settings from localStorage
        const saved = localStorage.getItem('proToolSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                // Language
                this.currentLang = settings.language || 'vi';
                this.lang = LANGUAGES[this.currentLang];

                // Provider & Model
                this.provider = settings.provider || 'elevenlabs';
                this.model = settings.model || 'eleven_multilingual_v2';
                this.maxChars = settings.maxChars || 10000;
                this.threadCount = settings.threadCount || 3;

                // Voice Settings
                this.voiceSpeed = settings.voiceSpeed ?? 1.0;
                this.voiceStability = settings.voiceStability ?? 0.5;
                this.voiceSimilarity = settings.voiceSimilarity ?? 0.75;
                this.voiceStyle = settings.voiceStyle ?? 0;
                this.speakerBoost = settings.speakerBoost ?? true;
                this.autoSRT = settings.autoSRT ?? false;
                this.autoSplitChars = settings.autoSplitChars || '。、,:.!?';

                // Apply to UI
                const providerSelect = document.getElementById('providerSelect');
                if (providerSelect) providerSelect.value = this.provider;

                const maxCharsInput = document.getElementById('maxChars');
                if (maxCharsInput) maxCharsInput.value = this.maxChars;

                const threadInput = document.getElementById('threadCount');
                if (threadInput) threadInput.value = this.threadCount;

                // Voice settings UI
                const speedSlider = document.getElementById('voiceSpeed');
                if (speedSlider) {
                    speedSlider.value = this.voiceSpeed;
                    document.getElementById('speedValue').textContent = this.voiceSpeed;
                }

                const stabilitySlider = document.getElementById('voiceStability');
                if (stabilitySlider) {
                    stabilitySlider.value = this.voiceStability;
                    document.getElementById('stabilityValue').textContent = this.voiceStability;
                }

                const similaritySlider = document.getElementById('voiceSimilarity');
                if (similaritySlider) {
                    similaritySlider.value = this.voiceSimilarity;
                    document.getElementById('similarityValue').textContent = this.voiceSimilarity;
                }

                const styleSlider = document.getElementById('voiceStyle');
                if (styleSlider) {
                    styleSlider.value = this.voiceStyle;
                    document.getElementById('styleValue').textContent = this.voiceStyle;
                }

                const speakerBoostCb = document.getElementById('speakerBoost');
                if (speakerBoostCb) speakerBoostCb.checked = this.speakerBoost;

                const autoSrtCb = document.getElementById('optAutoSRT');
                if (autoSrtCb) autoSrtCb.checked = this.autoSRT;

                const autoSplitCharsInput = document.getElementById('autoSplitChars');
                if (autoSplitCharsInput) autoSplitCharsInput.value = this.autoSplitChars;

                // Options checkboxes
                const optLoopCb = document.getElementById('optLoop');
                if (optLoopCb) optLoopCb.checked = settings.optLoop ?? false;

                const optAutoSplitCb = document.getElementById('optAutoSplit');
                if (optAutoSplitCb) optAutoSplitCb.checked = settings.optAutoSplit ?? false;

                const opt1Line1FileCb = document.getElementById('opt1Line1File');
                if (opt1Line1FileCb) opt1Line1FileCb.checked = settings.opt1Line1File ?? false;

                const optSilentCharCb = document.getElementById('optSilentChar');
                if (optSilentCharCb) optSilentCharCb.checked = settings.optSilentChar ?? false;

                // Advanced settings
                const optDelayJoinCb = document.getElementById('optDelayJoin');
                if (optDelayJoinCb) optDelayJoinCb.checked = settings.optDelayJoin ?? false;

                const delayJoinTimeInput = document.getElementById('delayJoinTime');
                if (delayJoinTimeInput) delayJoinTimeInput.value = settings.delayJoinTime ?? 0.5;

                const silentChars1Input = document.getElementById('silentChars1');
                if (silentChars1Input) silentChars1Input.value = settings.silentChars1 || ',;';

                const silentTime1Input = document.getElementById('silentTime1');
                if (silentTime1Input) silentTime1Input.value = settings.silentTime1 ?? 0.3;

                const silentChars2Input = document.getElementById('silentChars2');
                if (silentChars2Input) silentChars2Input.value = settings.silentChars2 || '.:?!';

                const silentTime2Input = document.getElementById('silentTime2');
                if (silentTime2Input) silentTime2Input.value = settings.silentTime2 ?? 0.5;
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }

    saveSettings() {
        const settings = {
            language: this.currentLang,
            provider: this.provider,
            model: this.model,
            maxChars: parseInt(document.getElementById('maxChars')?.value) || 10000,
            threadCount: parseInt(document.getElementById('threadCount')?.value) || 3,
            // Voice settings
            voiceSpeed: parseFloat(document.getElementById('voiceSpeed')?.value) || 1.0,
            voiceStability: parseFloat(document.getElementById('voiceStability')?.value) || 0.5,
            voiceSimilarity: parseFloat(document.getElementById('voiceSimilarity')?.value) || 0.75,
            voiceStyle: parseFloat(document.getElementById('voiceStyle')?.value) || 0,
            speakerBoost: document.getElementById('speakerBoost')?.checked ?? true,
            autoSRT: document.getElementById('optAutoSRT')?.checked || false,
            autoSplitChars: document.getElementById('autoSplitChars')?.value || '。、,:.!?',
            // Options
            optLoop: document.getElementById('optLoop')?.checked || false,
            optAutoSplit: document.getElementById('optAutoSplit')?.checked || false,
            opt1Line1File: document.getElementById('opt1Line1File')?.checked || false,
            optSilentChar: document.getElementById('optSilentChar')?.checked || false,
            // Advanced settings
            optDelayJoin: document.getElementById('optDelayJoin')?.checked || false,
            delayJoinTime: parseFloat(document.getElementById('delayJoinTime')?.value) || 0.5,
            silentChars1: document.getElementById('silentChars1')?.value || ',;',
            silentTime1: parseFloat(document.getElementById('silentTime1')?.value) || 0.3,
            silentChars2: document.getElementById('silentChars2')?.value || '.:?!',
            silentTime2: parseFloat(document.getElementById('silentTime2')?.value) || 0.5
        };
        localStorage.setItem('proToolSettings', JSON.stringify(settings));
    }
    
    async openOutputFolder() {
        try {
            await window.electronAPI.openOutputFolder();
        } catch (error) {
            console.error('Failed to open output folder:', error);
        }
    }

    // ==================== AUTO DOWNLOAD ====================

    async autoDownloadTask(task) {
        if (!task.resultUrl) {
            console.log('⚠️ No resultUrl for task:', task.id);
            return;
        }

        try {
            // Use output name from task or filename
            const outputName = task.outputName || task.fileName || task.id;
            const fileName = `${outputName}.mp3`;

            // Determine subfolder based on provider
            const subfolder = this.provider === 'elevenlabs' ? '11labs' : 'Minimax';

            console.log(`📥 Auto downloading: ${fileName} to ${subfolder}/`);

            const result = await window.electronAPI.downloadFile({
                url: task.resultUrl,
                fileName: fileName,
                subfolder: subfolder
            });

            if (result && result.success) {
                task.localPath = result.filePath;
                console.log(`✅ Downloaded to: ${result.filePath}`);
                this.showNotification(`Downloaded: ${fileName}`, 'success');
            } else {
                console.error('❌ Download failed:', result?.error);
            }
        } catch (error) {
            console.error('❌ Auto download error:', error);
        }
    }

    // ==================== PROJECT MANAGEMENT ====================

    loadProjects() {
        const saved = localStorage.getItem('proToolProjects');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    saveProjectsToStorage(projects) {
        localStorage.setItem('proToolProjects', JSON.stringify(projects));
    }

    generateProjectId() {
        return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    saveProject() {
        const name = document.getElementById('projectName')?.value?.trim();

        if (!name) {
            this.showNotification('Vui lòng nhập tên dự án!', 'warning');
            return;
        }

        const doneTasks = this.tasks.filter(t => t.status === 'done');

        if (doneTasks.length === 0) {
            this.showNotification('Không có task hoàn thành để lưu!', 'warning');
            return;
        }

        const projects = this.loadProjects();

        // Check if project with same name exists
        const existingIndex = projects.findIndex(p => p.name === name);

        const project = {
            id: existingIndex >= 0 ? projects[existingIndex].id : this.generateProjectId(),
            name: name,
            createdAt: existingIndex >= 0 ? projects[existingIndex].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tasks: doneTasks.map(t => ({
                id: t.id,
                fileName: t.fileName,
                content: t.content?.substring(0, 200),
                voiceId: t.voiceId,
                voiceName: t.voiceName,
                resultUrl: t.resultUrl,
                localPath: t.localPath,
                duration: t.duration,
                status: t.status
            }))
        };

        if (existingIndex >= 0) {
            projects[existingIndex] = project;
        } else {
            projects.unshift(project);
        }

        this.saveProjectsToStorage(projects);
        this.showNotification(`Đã lưu project "${name}" (${doneTasks.length} files)`, 'success');
    }

    loadProject(projectId) {
        const projects = this.loadProjects();
        const project = projects.find(p => p.id === projectId);

        if (!project) {
            this.showNotification('Không tìm thấy project!', 'error');
            return;
        }

        // Set project name
        document.getElementById('projectName').value = project.name;

        // Load tasks
        this.tasks = project.tasks.map(t => ({
            ...t,
            status: t.status || 'done'
        }));

        this.updateTaskDisplay();
        this.closeProjectsModal();
        this.showNotification(`Đã load project "${project.name}"`, 'success');
    }

    deleteProject(projectId) {
        if (!confirm('Xóa project này?')) return;

        const projects = this.loadProjects();
        const filtered = projects.filter(p => p.id !== projectId);
        this.saveProjectsToStorage(filtered);

        this.renderProjectsModal();
        this.showNotification('Đã xóa project', 'success');
    }

    openProjectsModal() {
        document.getElementById('projectsModal').classList.add('show');
        this.renderProjectsModal();
    }

    closeProjectsModal() {
        document.getElementById('projectsModal').classList.remove('show');
    }

    renderProjectsModal() {
        const modalBody = document.getElementById('projectsModalBody');
        const projects = this.loadProjects();

        if (projects.length === 0) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #555;">
                    <i class="bi bi-folder2" style="font-size: 48px; opacity: 0.3;"></i>
                    <p style="margin-top: 12px;">Chưa có project nào được lưu</p>
                </div>
            `;
            return;
        }

        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${projects.map(project => `
                    <div style="display: flex; align-items: center; padding: 14px; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 14px; font-weight: 500; color: #fff;">${this.escapeHtml(project.name)}</div>
                            <div style="font-size: 11px; color: #666; margin-top: 4px;">
                                ${project.tasks?.length || 0} files • ${new Date(project.updatedAt).toLocaleDateString('vi-VN')}
                            </div>
                        </div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <button class="btn btn-sm" onclick="proTool.loadProject('${project.id}')" title="Load">
                                <i class="bi bi-folder2-open"></i>
                            </button>
                            <button class="btn btn-sm" style="color: #f55;" onclick="proTool.deleteProject('${project.id}')" title="Xóa">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// ==================== GLOBAL FUNCTIONS ====================

let proTool;

document.addEventListener('DOMContentLoaded', () => {
    proTool = new ProToolManager();
});

function importFile() {
    proTool.importFilesDialog();
}

function importFolder() {
    proTool.importFolderDialog();
}

function importVoice() {
    proTool.importAudioDialog();
}

function toggleAdvanced() {
    const panel = document.getElementById('advancedPanel');
    panel.classList.toggle('show');
}

function toggleAdvancedSettings() {
    const panel = document.getElementById('advancedSettingsPanel');
    const icon = document.getElementById('advSettingsIcon');

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-up');
    } else {
        panel.style.display = 'none';
        icon.classList.remove('bi-chevron-up');
        icon.classList.add('bi-chevron-down');
    }
}

function resetVoiceSettings() {
    // Reset to defaults
    document.getElementById('voiceSpeed').value = 1.0;
    document.getElementById('speedValue').textContent = '1.0';

    document.getElementById('voiceStability').value = 0.5;
    document.getElementById('stabilityValue').textContent = '0.5';

    document.getElementById('voiceSimilarity').value = 0.75;
    document.getElementById('similarityValue').textContent = '0.75';

    document.getElementById('voiceStyle').value = 0;
    document.getElementById('styleValue').textContent = '0.0';

    document.getElementById('speakerBoost').checked = true;
    document.getElementById('optAutoSRT').checked = false;

    // Reset advanced settings
    document.getElementById('optDelayJoin').checked = false;
    document.getElementById('delayJoinTime').value = 0.5;
    document.getElementById('optSilentChar').checked = false;
    document.getElementById('silentChars1').value = ',;';
    document.getElementById('silentTime1').value = 0.3;
    document.getElementById('silentChars2').value = '.:?!';
    document.getElementById('silentTime2').value = 0.5;

    proTool.saveSettings();
    proTool.showNotification('Đã reset về mặc định', 'success');
}

function openVoiceLibrary() {
    // Open new window instead of modal
    if (window.electronAPI && window.electronAPI.openVoiceLibrary) {
        window.electronAPI.openVoiceLibrary();
    } else {
        // Fallback to modal if not in Electron
        document.getElementById('voiceLibraryModal').classList.add('show');
        proTool.renderVoiceLibraryTable();
    }
}

function closeVoiceLibrary() {
    document.getElementById('voiceLibraryModal').classList.remove('show');
}

function saveVoiceLibrary() {
    proTool.saveVoiceLibrary();
}

function addVoiceRow() {
    const tbody = document.getElementById('voiceLibraryBody');
    const rows = tbody.querySelectorAll('tr');
    const nextId = rows.length + 1;

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${nextId}</td>
        <td><input type="text" placeholder="Voice ID..."></td>
        <td><input type="text" placeholder="Name..."></td>
        <td><button class="btn btn-sm" onclick="removeVoiceRow(this)">×</button></td>
    `;
    tbody.appendChild(newRow);
}

function removeVoiceRow(btn) {
    const row = btn.closest('tr');
    const tbody = row.parentElement;

    if (tbody.querySelectorAll('tr').length > 1) {
        row.remove();
        // Re-number IDs
        tbody.querySelectorAll('tr').forEach((tr, idx) => {
            tr.querySelector('td').textContent = idx + 1;
        });
    }
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.task-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    proTool.updateSelectionActions();
}

function startProcessing() {
    proTool.startProcessing();
}

function stopProcessing() {
    proTool.stopProcessing();
}

function clearTasks() {
    proTool.clearTasks();
}

function joinFiles() {
    proTool.joinFiles();
}

function joinMp3AndSrt() {
    proTool.joinMp3AndSrt();
}

function createSRT() {
    proTool.createSRTFromTasks();
}

function openBackup() {
    proTool.openBackup();
}

function closeBackup() {
    proTool.closeBackup();
}

function openOutputFolder() {
    proTool.openOutputFolder();
}

function selectProvider(provider) {
    proTool.provider = provider;
    document.getElementById('providerSelect').value = provider;

    // Update dropdown UI
    const dropdown = document.getElementById('providerDropdown');
    dropdown.classList.remove('open');

    // Update selected display - dùng đúng URL logo như TTS
    const providerImg = document.getElementById('providerImg');
    const providerName = document.getElementById('providerName');

    if (provider === 'elevenlabs') {
        providerImg.src = 'https://help.elevenlabs.io/hc/theming_assets/01HZQ08B6SDY5X53YN9ABG4B99';
        providerName.textContent = 'ElevenLabs';
    } else {
        providerImg.src = 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/minimax-color.png';
        providerName.textContent = 'Minimax';
    }

    // Update active state
    document.querySelectorAll('.provider-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.provider === provider) {
            opt.classList.add('active');
        }
    });

    // Show/hide Voice Clone button (only for Minimax)
    const voiceCloneSection = document.getElementById('voiceCloneSection');
    if (voiceCloneSection) {
        voiceCloneSection.style.display = provider === 'minimax' ? 'block' : 'none';
    }

    // Show/hide Model groups
    const elevenlabsModelGroup = document.getElementById('elevenlabsModelGroup');
    const minimaxModelGroup = document.getElementById('minimaxModelGroup');
    if (elevenlabsModelGroup) {
        elevenlabsModelGroup.style.display = provider === 'elevenlabs' ? 'block' : 'none';
    }
    if (minimaxModelGroup) {
        minimaxModelGroup.style.display = provider === 'minimax' ? 'block' : 'none';
    }

    // Show/hide Voice Settings
    const elevenlabsSettings = document.getElementById('elevenlabsSettings');
    const minimaxSettings = document.getElementById('minimaxSettings');
    if (elevenlabsSettings) {
        elevenlabsSettings.style.display = provider === 'elevenlabs' ? 'block' : 'none';
    }
    if (minimaxSettings) {
        minimaxSettings.style.display = provider === 'minimax' ? 'block' : 'none';
    }

    // Reset V3 mode when switching providers
    if (provider === 'elevenlabs') {
        const currentModel = document.getElementById('modelSelect')?.value;
        if (typeof isModelV3 === 'function' && isModelV3(currentModel)) {
            applyV3ModelSettings();
        } else {
            applyNormalModelSettings();
        }
    }

    proTool.updateModelOptions();
}

function loadVoicesFromServer() {
    proTool.loadVoicesFromServer();
}

function closeVoicesModal() {
    proTool.closeVoicesModal();
}

// Project Management
function saveProject() {
    proTool.saveProject();
}

function openProjectsModal() {
    proTool.openProjectsModal();
}

function closeProjectsModal() {
    proTool.closeProjectsModal();
}

// ==================== ADD TO LIBRARY ====================
function addToLibrary() {
    const voiceId = document.getElementById('selectedVoiceId')?.value?.trim();
    const model = document.getElementById('modelSelect')?.value;
    const provider = document.getElementById('providerSelect')?.value || 'elevenlabs';

    // Pre-fill modal
    document.getElementById('libVoiceId').value = voiceId || '';
    document.getElementById('libVoiceName').value = '';
    document.getElementById('libProvider').value = provider;
    document.getElementById('libModel').value = model || '';
    document.getElementById('libSpeed').value = document.getElementById('voiceSpeed')?.value || 1;
    document.getElementById('libStability').value = document.getElementById('voiceStability')?.value || 0.5;
    document.getElementById('libSimilarity').value = document.getElementById('voiceSimilarity')?.value || 0.75;
    document.getElementById('libStyle').value = document.getElementById('voiceStyle')?.value || 0;

    document.getElementById('addToLibraryModal').classList.add('show');
}

function closeAddToLibraryModal() {
    document.getElementById('addToLibraryModal').classList.remove('show');
}

function saveToLibrary() {
    const voiceId = document.getElementById('libVoiceId')?.value?.trim();
    const voiceName = document.getElementById('libVoiceName')?.value?.trim();
    const provider = document.getElementById('libProvider')?.value;
    const model = document.getElementById('libModel')?.value;

    if (!voiceId) {
        proTool.showNotification('Vui lòng nhập Voice ID!', 'warning');
        return;
    }

    const voiceData = {
        id: Date.now(),
        voiceId: voiceId,
        name: voiceName || voiceId,
        provider: provider,
        model: model,
        settings: {
            speed: parseFloat(document.getElementById('libSpeed')?.value) || 1,
            stability: parseFloat(document.getElementById('libStability')?.value) || 0.5,
            similarity: parseFloat(document.getElementById('libSimilarity')?.value) || 0.75,
            style: parseFloat(document.getElementById('libStyle')?.value) || 0
        }
    };

    // Load existing library
    let library = [];
    try {
        library = JSON.parse(localStorage.getItem('voiceLibraryAdvanced') || '[]');
    } catch (e) {
        library = [];
    }

    // Check if voiceId already exists
    const existingIndex = library.findIndex(v => v.voiceId === voiceId && v.provider === provider);
    if (existingIndex >= 0) {
        library[existingIndex] = voiceData;
    } else {
        library.push(voiceData);
    }

    localStorage.setItem('voiceLibraryAdvanced', JSON.stringify(library));

    closeAddToLibraryModal();
    proTool.showNotification(`Đã lưu "${voiceName || voiceId}" vào thư viện!`, 'success');
}

// ==================== VOICE CLONE (MINIMAX) ====================
let cloneAudioFilePath = null;

function openVoiceCloneModal() {
    cloneAudioFilePath = null;
    document.getElementById('cloneVoiceName').value = '';
    document.getElementById('cloneAudioPath').value = '';
    document.getElementById('cloneStatus').style.display = 'none';
    document.getElementById('btnStartClone').disabled = false;
    document.getElementById('voiceCloneModal').classList.add('show');
}

function closeVoiceCloneModal() {
    document.getElementById('voiceCloneModal').classList.remove('show');
}

async function selectCloneAudioFile() {
    try {
        const result = await window.electronAPI.selectAudioFiles();
        if (result.success && result.filePaths && result.filePaths.length > 0) {
            cloneAudioFilePath = result.filePaths[0];
            document.getElementById('cloneAudioPath').value = cloneAudioFilePath;
        }
    } catch (error) {
        console.error('Select audio file error:', error);
        proTool.showNotification('Lỗi chọn file!', 'error');
    }
}

async function startVoiceClone() {
    const voiceName = document.getElementById('cloneVoiceName')?.value?.trim();
    const language = document.getElementById('cloneLanguage')?.value;
    const previewText = document.getElementById('clonePreviewText')?.value?.trim();

    if (!voiceName) {
        proTool.showNotification('Vui lòng nhập tên giọng nói!', 'warning');
        return;
    }

    if (!cloneAudioFilePath) {
        proTool.showNotification('Vui lòng chọn file audio!', 'warning');
        return;
    }

    // Show status
    document.getElementById('cloneStatus').style.display = 'block';
    document.getElementById('cloneStatusText').textContent = 'Đang clone giọng nói...';
    document.getElementById('btnStartClone').disabled = true;

    try {
        // Read audio file as base64
        const audioData = await window.electronAPI.readFileAsBase64(cloneAudioFilePath);

        if (!audioData || !audioData.success) {
            throw new Error('Không thể đọc file audio');
        }

        // Call clone API
        const response = await window.electronAPI.apiRequest(
            'https://kingcongstudio.com/ajaxs/tts3.php',
            {
                action: 'clone_voice',
                provider: 'minimax',
                voice_name: voiceName,
                language: language,
                preview_text: previewText || 'Hello world',
                audio_data: audioData.base64,
                audio_filename: audioData.fileName
            }
        );

        if (response.success || response.status === 'success') {
            const clonedVoiceId = response.cloned_voice_id || response.voice_id;

            document.getElementById('cloneStatusText').textContent = `Clone thành công! Voice ID: ${clonedVoiceId}`;

            // Set voice ID to input
            document.getElementById('selectedVoiceId').value = clonedVoiceId;

            proTool.showNotification(`Clone thành công: ${voiceName}`, 'success');

            setTimeout(() => {
                closeVoiceCloneModal();
            }, 2000);
        } else {
            throw new Error(response.message || 'Clone thất bại');
        }
    } catch (error) {
        console.error('Voice clone error:', error);
        document.getElementById('cloneStatusText').textContent = `Lỗi: ${error.message}`;
        proTool.showNotification(`Lỗi clone: ${error.message}`, 'error');
    } finally {
        document.getElementById('btnStartClone').disabled = false;
    }
}

// ==================== CLONED VOICES LIST (MINIMAX) ====================

// localStorage helpers for cloned voices
function getLocalClonedVoices() {
    try {
        const saved = localStorage.getItem('minimaxClonedVoices');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalClonedVoices(voices) {
    localStorage.setItem('minimaxClonedVoices', JSON.stringify(voices));
}

async function openClonedVoicesModal() {
    // Open in separate window
    if (window.electronAPI && window.electronAPI.openClonedVoicesWindow) {
        window.electronAPI.openClonedVoicesWindow();
        return;
    }

    // Fallback to modal
    document.getElementById('clonedVoicesModal').classList.add('show');
    document.getElementById('clonedVoicesBody').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #555;">
            <div class="spinner" style="width: 24px; height: 24px; border: 2px solid #333; border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px;"></div>
            Loading...
        </div>
    `;

    try {
        const response = await window.electronAPI.apiRequest(
            'https://kingcongstudio.com/ajaxs/tts3.php',
            {
                action: 'get_cloned_voices',
                provider: 'minimax'
            }
        );

        console.log('📦 Cloned voices response:', response);

        if (response.success || response.status === 'success') {
            const voices = response.voices || response.cloned_voices || [];
            if (voices.length > 0) {
                saveLocalClonedVoices(voices);
            }
            renderClonedVoicesModal(voices);
        } else {
            // API error, try localStorage fallback
            const localVoices = getLocalClonedVoices();
            renderClonedVoicesModal(localVoices);
        }
    } catch (error) {
        console.error('Load cloned voices error:', error);
        // API failed, try localStorage fallback
        const localVoices = getLocalClonedVoices();
        renderClonedVoicesModal(localVoices);
    }
}

function renderClonedVoicesModal(voices) {
    const body = document.getElementById('clonedVoicesBody');

    if (!voices || voices.length === 0) {
        body.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #555;">
                <i class="bi bi-mic" style="font-size: 48px; opacity: 0.3;"></i>
                <p style="margin-top: 12px;">Chưa có voice nào được clone</p>
                <p style="font-size: 11px; color: #444; margin-top: 8px;">Dùng nút "Voice Clone" để tạo giọng nói mới</p>
            </div>
        `;
        return;
    }

    body.innerHTML = `
        <div style="margin-bottom: 12px; font-size: 12px; color: #666;">${voices.length} cloned voices</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${voices.map(voice => `
                <div style="display: flex; align-items: center; padding: 12px; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 500; color: #fff;">${voice.name || voice.voice_name || 'Unnamed'}</div>
                        <div style="font-size: 11px; color: #666; margin-top: 4px;">
                            ID: ${voice.voice_id || voice.id || '-'}
                        </div>
                        ${voice.language ? `<div style="font-size: 10px; color: #888; margin-top: 2px;">${voice.language}</div>` : ''}
                        ${voice.created_at ? `<div style="font-size: 10px; color: #444; margin-top: 2px;">${voice.created_at}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 6px; flex-shrink: 0;">
                        <button class="btn btn-sm" onclick="selectClonedVoice('${voice.voice_id || voice.id}')" title="Sử dụng voice này">
                            <i class="bi bi-check-lg"></i> Chọn
                        </button>
                        <button class="btn btn-sm" style="color: #f55;" onclick="deleteClonedVoice('${voice.voice_id || voice.id}', '${voice.name || voice.voice_name || 'Voice'}')" title="Xóa voice">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function closeClonedVoicesModal() {
    document.getElementById('clonedVoicesModal').classList.remove('show');
}

function selectClonedVoice(voiceId) {
    document.getElementById('selectedVoiceId').value = voiceId;
    proTool.showNotification(`Selected voice: ${voiceId}`, 'success');
    closeClonedVoicesModal();
}

async function deleteClonedVoice(voiceId, voiceName) {
    if (!confirm(`Xóa voice "${voiceName}"? Hành động này không thể hoàn tác!`)) {
        return;
    }

    // Delete from localStorage first
    const localVoices = getLocalClonedVoices();
    const updatedVoices = localVoices.filter(v => (v.voice_id || v.id) !== voiceId);
    saveLocalClonedVoices(updatedVoices);

    try {
        const response = await window.electronAPI.apiRequest(
            'https://kingcongstudio.com/ajaxs/tts3.php',
            {
                action: 'delete_cloned_voice',
                provider: 'minimax',
                voice_id: voiceId
            }
        );

        if (response.success || response.status === 'success') {
            proTool.showNotification(`Đã xóa voice "${voiceName}"`, 'success');
        } else {
            proTool.showNotification(`Đã xóa voice "${voiceName}" locally`, 'success');
        }
    } catch (error) {
        console.error('Delete cloned voice error:', error);
        proTool.showNotification(`Đã xóa voice "${voiceName}" locally`, 'success');
    }

    // Reload list
    openClonedVoicesModal();
}

// ==================== BACKUP FUNCTIONS ====================
function deleteAllBackupTasks() {
    if (!confirm('Xóa tất cả tasks trong backup? Hành động này không thể hoàn tác!')) {
        return;
    }

    proTool.deleteAllBackupTasks();
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ==================== SLIDER UPDATE FUNCTIONS ====================
let isV3Model = false; // Track if current model is V3

function updateSlider(type) {
    switch (type) {
        case 'speed':
            document.getElementById('speedValue').textContent = parseFloat(document.getElementById('voiceSpeed').value).toFixed(2);
            break;
        case 'stability':
            const stabVal = parseInt(document.getElementById('voiceStability').value);
            const stabDisplay = document.getElementById('stabilityValue');
            if (isV3Model) {
                // V3 mode: Creative/Natural/Robust (white text)
                if (stabVal <= 25) {
                    stabDisplay.textContent = 'Creative';
                } else if (stabVal <= 75) {
                    stabDisplay.textContent = 'Natural';
                } else {
                    stabDisplay.textContent = 'Robust';
                }
                stabDisplay.style.color = '#fff';
            } else {
                stabDisplay.textContent = stabVal + '%';
                stabDisplay.style.color = '#fff';
            }
            break;
        case 'similarity':
            document.getElementById('similarityValue').textContent = document.getElementById('voiceSimilarity').value + '%';
            break;
        case 'style':
            document.getElementById('styleValue').textContent = document.getElementById('voiceStyle').value + '%';
            break;
        // Minimax sliders
        case 'mmSpeed':
            document.getElementById('mmSpeedValue').textContent = parseFloat(document.getElementById('mmVoiceSpeed').value).toFixed(2);
            break;
        case 'mmPitch':
            document.getElementById('mmPitchValue').textContent = document.getElementById('mmVoicePitch').value;
            break;
        case 'mmVol':
            document.getElementById('mmVolValue').textContent = parseFloat(document.getElementById('mmVoiceVol').value).toFixed(2);
            break;
    }
}

// Apply V3 model settings (only Stability with 3 tiers)
function applyV3ModelSettings() {
    isV3Model = true;
    // Hide Speed, Similarity, Style for V3
    document.getElementById('slider-speed').style.display = 'none';
    document.getElementById('slider-similarity').style.display = 'none';
    document.getElementById('slider-style').style.display = 'none';
    document.getElementById('toggle-boost').style.display = 'none';

    // Configure Stability slider for V3 (3 tiers: 0, 50, 100)
    const stabSlider = document.getElementById('voiceStability');
    stabSlider.setAttribute('step', '50');
    stabSlider.value = 50;

    // Show V3 labels
    document.getElementById('stability-labels').style.display = 'flex';

    updateSlider('stability');
}

// Apply normal model settings
function applyNormalModelSettings() {
    isV3Model = false;
    // Show all settings
    document.getElementById('slider-speed').style.display = 'block';
    document.getElementById('slider-similarity').style.display = 'block';
    document.getElementById('slider-style').style.display = 'block';
    document.getElementById('toggle-boost').style.display = 'flex';

    // Configure Stability slider back to normal
    const stabSlider = document.getElementById('voiceStability');
    stabSlider.setAttribute('step', '1');

    // Hide V3 labels
    document.getElementById('stability-labels').style.display = 'none';

    updateSlider('stability');
}

function resetVoiceSettings() {
    const provider = proTool?.provider || 'elevenlabs';

    if (provider === 'minimax') {
        document.getElementById('mmVoiceSpeed').value = 1;
        document.getElementById('mmVoicePitch').value = 0;
        document.getElementById('mmVoiceVol').value = 1;
        updateSlider('mmSpeed');
        updateSlider('mmPitch');
        updateSlider('mmVol');
    } else {
        document.getElementById('voiceSpeed').value = 1;
        document.getElementById('voiceStability').value = 50;
        document.getElementById('voiceSimilarity').value = 75;
        document.getElementById('voiceStyle').value = 0;
        document.getElementById('speakerBoost').checked = true;
        updateSlider('speed');
        updateSlider('stability');
        updateSlider('similarity');
        updateSlider('style');
    }

    proTool?.showNotification?.('Reset voice settings', 'success');
}

// Check if model is V3
function isModelV3(modelId) {
    if (!modelId) return false;
    const id = modelId.toLowerCase();
    return id.includes('v3') || id.includes('_v3') || id === 'eleven_v3';
}

// Model change handler for ElevenLabs
function onModelChange() {
    const modelId = document.getElementById('modelSelect')?.value;
    proTool.model = modelId;

    if (isModelV3(modelId)) {
        applyV3ModelSettings();
    } else {
        applyNormalModelSettings();
    }
}

// Model change handler for Minimax
function onMinimaxModelChange() {
    const modelId = document.getElementById('minimaxModelSelect')?.value;
    proTool.model = modelId;
}
