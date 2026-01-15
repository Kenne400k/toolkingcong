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
            window.electronAPI.onVoiceLibraryUpdated((data) => {
                console.log('📚 Voice Library updated via IPC:', data);

                // Handle new format with separate providers
                if (data.elevenlabs || data.minimax) {
                    if (data.elevenlabs) {
                        this.voiceLibraryElevenlabs = data.elevenlabs;
                        localStorage.setItem('voiceLibrary_elevenlabs', JSON.stringify(data.elevenlabs));
                    }
                    if (data.minimax) {
                        this.voiceLibraryMinimax = data.minimax;
                        localStorage.setItem('voiceLibrary_minimax', JSON.stringify(data.minimax));
                    }
                    this.voiceLibrary = [...(this.voiceLibraryElevenlabs || []), ...(this.voiceLibraryMinimax || [])];
                    this.showNotification(`Voice library đã được cập nhật`, 'success');
                }
                // Handle voice added from voices-window
                else if (data.action === 'added' && data.voice) {
                    const provider = data.provider || data.voice.provider || 'elevenlabs';
                    const storageKey = provider === 'elevenlabs' ? 'voiceLibrary_elevenlabs' : 'voiceLibrary_minimax';

                    if (provider === 'elevenlabs') {
                        if (!this.voiceLibraryElevenlabs.find(v => v.voiceId === data.voice.voiceId)) {
                            this.voiceLibraryElevenlabs.push(data.voice);
                            localStorage.setItem(storageKey, JSON.stringify(this.voiceLibraryElevenlabs));
                        }
                    } else {
                        if (!this.voiceLibraryMinimax.find(v => v.voiceId === data.voice.voiceId)) {
                            this.voiceLibraryMinimax.push(data.voice);
                            localStorage.setItem(storageKey, JSON.stringify(this.voiceLibraryMinimax));
                        }
                    }
                    this.voiceLibrary = [...(this.voiceLibraryElevenlabs || []), ...(this.voiceLibraryMinimax || [])];
                    this.showNotification(`Đã thêm "${data.voice.name}" vào thư viện`, 'success');
                }
                // Handle use voice action
                else if (data.action === 'use' && data.voice) {
                    this.applyVoiceFromLibrary(data.voice);
                }
            });
        }

        // Listen for voice selection from child windows
        if (window.electronAPI && window.electronAPI.onVoiceSelected) {
            window.electronAPI.onVoiceSelected((data) => {
                // data = { voiceId, voiceName }
                const voiceId = data?.voiceId || data;
                const voiceName = data?.voiceName || '';
                console.log('🎤 Voice selected from window:', voiceId, voiceName);
                document.getElementById('selectedVoiceId').value = voiceId;
                document.getElementById('selectedVoiceName').value = voiceName;
                this.showNotification(`Selected: ${voiceName || voiceId}`, 'success');
            });
        }

        // Also listen for postMessage from popup window
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'voiceLibraryUpdated') {
                console.log('📚 Voice Library updated via postMessage:', event.data);
                // Handle new format with separate providers
                if (event.data.elevenlabs) {
                    this.voiceLibraryElevenlabs = event.data.elevenlabs;
                    localStorage.setItem('voiceLibrary_elevenlabs', JSON.stringify(event.data.elevenlabs));
                }
                if (event.data.minimax) {
                    this.voiceLibraryMinimax = event.data.minimax;
                    localStorage.setItem('voiceLibrary_minimax', JSON.stringify(event.data.minimax));
                }
                this.voiceLibrary = [...(this.voiceLibraryElevenlabs || []), ...(this.voiceLibraryMinimax || [])];
                this.showNotification(`Voice library đã được cập nhật`, 'success');
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
        // Set import source for download folder tracking
        this.currentImportSource = 'ImportFile';

        try {
            const result = await window.electronAPI.selectFiles({
                filters: [
                    { name: 'Text Files', extensions: ['txt', 'srt'] }
                ]
            });

            console.log('📂 Select result:', result);

            if (!result.success || result.canceled) {
                console.log('📂 Canceled or failed');
                this.currentImportSource = null;
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
            this.currentImportSource = null;
        } catch (error) {
            console.error('❌ Import file error:', error);
            this.showNotification('Lỗi khi import file', 'error');
            this.currentImportSource = null;
        }
    }

    // Import folder using Electron dialog
    async importFolderDialog() {
        // Set import source for download folder tracking
        this.currentImportSource = 'ImportFolder';

        try {
            const result = await window.electronAPI.selectFolder();

            if (!result.success || result.canceled) {
                this.currentImportSource = null;
                return;
            }

            // Collect file names for checking
            const fileNames = [];
            const fileDataList = [];

            for (const filePath of result.files) {
                const fileResult = await window.electronAPI.readFile(filePath);
                if (fileResult.success) {
                    fileNames.push(fileResult.fileName);
                    fileDataList.push({
                        content: fileResult.content,
                        fileName: fileResult.fileName
                    });
                }
            }

            // Check which files already exist
            const completedFiles = await this.checkCompletedFiles(fileNames, 'ImportFolder');

            let completedCount = 0;
            for (const fileData of fileDataList) {
                const isCompleted = completedFiles[fileData.fileName]?.exists;

                if (isCompleted) completedCount++;

                this.addTask({
                    id: this.generateTaskId(),
                    content: fileData.content,
                    fileName: fileData.fileName,
                    voiceId: document.getElementById('selectedVoiceId')?.value || '',
                    status: isCompleted ? 'done' : 'pending',
                    filePath: completedFiles[fileData.fileName]?.filePath || null,
                    importSource: 'ImportFolder'
                });
            }

            this.updateTaskDisplay();

            if (completedCount > 0) {
                this.showNotification(`Đã import ${result.files.length} file (${completedCount} đã hoàn thành)`, 'success');
            } else {
                this.showNotification(`Đã import ${result.files.length} file`, 'success');
            }

            this.currentImportSource = null;
        } catch (error) {
            console.error('Import folder error:', error);
            this.showNotification('Lỗi khi import folder', 'error');
            this.currentImportSource = null;
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
            await this.processMultiVoiceText(text, fileName);
        } else if (optLoop) {
            console.log('📄 Processing as loop');
            await this.processLoopText(text, fileName);
        } else if (optAutoSplit) {
            console.log('📄 Processing as auto-split');
            await this.processAutoSplitText(text, fileName);
        } else if (opt1Line1File) {
            console.log('📄 Processing as 1-line-1-file');
            await this.processLineByLineText(text, fileName);
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
        // Open separate window
        if (window.electronAPI && window.electronAPI.openVoicesWindow) {
            window.electronAPI.openVoicesWindow(this.provider);
            return;
        }

        // Fallback to modal
        document.getElementById('voicesModal').classList.add('show');

        // Update tabs visibility based on provider
        this.updateVoiceTabsVisibility();

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
                ${voices.map(voice => {
                    const voiceId = voice.voice_id || voice.id;
                    // Ưu tiên voice_name trước, sau đó name (tránh trường hợp name = voice_id)
                    const voiceName = (voice.voice_name || voice.name || 'Unknown').replace(/'/g, "\\'");
                    const previewUrl = (voice.preview_url || voice.sample_audio || '').replace(/'/g, "\\'");
                    const labels = voice.labels ? Object.values(voice.labels).join(' • ') : '';

                    return `
                    <div class="voice-item" style="display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid #1a1a1a; cursor: pointer;"
                         onclick="proTool.selectVoice('${voiceId}', '${voiceName}')"
                         onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='transparent'">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 13px; color: #fff; font-weight: 500;">${voice.voice_name || voice.name || 'Unknown'}</div>
                            <div style="font-size: 10px; color: #555; margin-top: 2px;">${voiceId}</div>
                            ${labels ? `<div style="font-size: 10px; color: #666; margin-top: 4px;">${labels}</div>` : ''}
                        </div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            ${previewUrl ? `<button class="btn btn-sm" onclick="event.stopPropagation(); proTool.toggleVoicePreview('${previewUrl}')" title="Nghe thử"><i class="bi bi-volume-up"></i></button>` : ''}
                            <button class="btn btn-sm" onclick="event.stopPropagation(); proTool.addVoiceToLibraryFromModal('${voiceId}', '${voiceName}', '${previewUrl}')" title="Thêm vào thư viện"><i class="bi bi-plus-lg"></i></button>
                            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); proTool.selectVoice('${voiceId}', '${voiceName}')">Chọn</button>
                        </div>
                    </div>`;
                }).join('')}
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
        // Lưu voice name để dùng khi add to library
        document.getElementById('selectedVoiceName').value = voiceName || '';
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
        } else if (tab === 'clones') {
            this.loadClonedVoices();
        }
    }

    // Update tabs visibility based on provider
    updateVoiceTabsVisibility() {
        const libraryTab = document.querySelector('.voice-tab[data-tab="library"]');
        const clonesTab = document.querySelector('.voice-tab[data-tab="clones"]');

        if (this.provider === 'elevenlabs') {
            if (libraryTab) libraryTab.style.display = 'block';
            if (clonesTab) clonesTab.style.display = 'none';
        } else {
            if (libraryTab) libraryTab.style.display = 'none';
            if (clonesTab) clonesTab.style.display = 'block';
        }
    }

    // Load cloned voices from API
    async loadClonedVoices() {
        const modalBody = document.getElementById('voicesModalBody');
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 60px;">
                <div style="width: 40px; height: 40px; border: 3px solid #333; border-top-color: #a855f7; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                <div style="color: #888; font-size: 13px;">Đang tải giọng nhân bản...</div>
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

            console.log('🎤 Cloned voices response:', response);

            if (response.success || response.status === 'success') {
                const voices = response.voices || response.cloned_voices || [];
                this.clonedVoices = voices;
                this.renderClonedVoices(voices);
            } else {
                this.renderClonedVoices([]);
            }
        } catch (error) {
            console.error('❌ Load cloned voices error:', error);
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #f55;">
                    <i class="bi bi-exclamation-triangle" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                    <p>Lỗi tải danh sách giọng clone</p>
                    <button class="btn btn-sm" onclick="proTool.loadClonedVoices()" style="margin-top: 16px;">Thử lại</button>
                </div>
            `;
        }
    }

    renderClonedVoices(voices) {
        const modalBody = document.getElementById('voicesModalBody');

        if (!voices || voices.length === 0) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #666;">
                    <i class="bi bi-mic" style="font-size: 48px; opacity: 0.3; display: block; margin-bottom: 16px;"></i>
                    <h4 style="margin-bottom: 8px;">Chưa có giọng nhân bản</h4>
                    <p style="font-size: 12px;">Dùng "Voice Clone" trong sidebar để tạo giọng mới</p>
                </div>
            `;
            return;
        }

        modalBody.innerHTML = `
            <div style="margin-bottom: 12px;">
                <input type="text" class="form-input" id="cloneVoiceSearch" placeholder="Tìm kiếm giọng clone..." oninput="proTool.filterClonedVoices(this.value)">
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
                <i class="bi bi-mic"></i> ${voices.length} giọng nhân bản
            </div>
            <div id="clonedVoicesList" style="max-height: 400px; overflow-y: auto;">
                ${voices.map(voice => {
                    const voiceId = voice.voice_id || voice.id;
                    // Ưu tiên voice_name trước, sau đó name (tránh trường hợp name = voice_id)
                    const voiceName = (voice.voice_name || voice.name || 'Unnamed').replace(/'/g, "\\'");
                    const previewUrl = (voice.sample_audio || voice.preview_url || '').replace(/'/g, "\\'");
                    const language = voice.language || 'VN';
                    const createdAt = voice.created_at || '';

                    return `
                    <div class="voice-item" data-name="${voiceName.toLowerCase()}" style="display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid #1a1a1a; border-radius: 8px; margin-bottom: 8px; cursor: pointer; background: #0a0a0a;"
                         onclick="proTool.selectVoice('${voiceId}', '${voiceName}')"
                         onmouseover="this.style.background='#111'; this.style.borderColor='#333'"
                         onmouseout="this.style.background='#0a0a0a'; this.style.borderColor='#1a1a1a'">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 14px; color: #fff; font-weight: 500;">${voice.voice_name || voice.name || 'Unnamed'}</div>
                            <div style="font-size: 10px; color: #555; margin-top: 3px;">${voiceId}</div>
                            <div style="font-size: 10px; color: #666; margin-top: 4px;">
                                ${[language, createdAt].filter(x => x).join(' • ')}
                            </div>
                        </div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            ${previewUrl ? `<button class="btn btn-sm" onclick="event.stopPropagation(); proTool.toggleVoicePreview('${previewUrl}')" title="Nghe thử"><i class="bi bi-volume-up"></i></button>` : ''}
                            <button class="btn btn-sm" onclick="event.stopPropagation(); proTool.addVoiceToLibraryFromModal('${voiceId}', '${voiceName}', '${previewUrl}')" title="Thêm vào thư viện"><i class="bi bi-plus-lg"></i></button>
                            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); proTool.selectVoice('${voiceId}', '${voiceName}')">Chọn</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    }

    filterClonedVoices(query) {
        const items = document.querySelectorAll('#clonedVoicesList .voice-item');
        query = query.toLowerCase();

        items.forEach(item => {
            const name = item.dataset.name || '';
            const text = item.textContent.toLowerCase();
            item.style.display = (name.includes(query) || text.includes(query)) ? 'flex' : 'none';
        });
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
        const audio = document.getElementById('previewAudio');
        if (audio) {
            audio.src = url;
            audio.play().catch(e => console.error('Preview error:', e));
        }
    }

    toggleVoicePreview(url) {
        if (!url) {
            this.showNotification('Không có audio mẫu!', 'warning');
            return;
        }
        const audio = document.getElementById('previewAudio');
        if (!audio) return;

        // Toggle play/pause
        if (audio.src === url && !audio.paused) {
            audio.pause();
        } else {
            audio.src = url;
            audio.play().catch(e => {
                console.error('Preview error:', e);
                this.showNotification('Không thể phát audio!', 'error');
            });
        }
    }

    addVoiceToLibraryFromModal(voiceId, voiceName, previewUrl) {
        const provider = this.provider;
        const model = provider === 'elevenlabs'
            ? (document.getElementById('modelSelect')?.value || 'eleven_multilingual_v2')
            : (document.getElementById('minimaxModelSelect')?.value || 'speech-02-hd');

        const voiceData = {
            id: Date.now(),
            voiceId: voiceId,
            name: voiceName,
            project: '',
            provider: provider,
            model: model,
            preview_url: previewUrl || '',
            settings: provider === 'elevenlabs' ? {
                speed: 1,
                stability: 0.5,
                similarity: 0.75,
                style: 0,
                speakerBoost: true
            } : {
                speed: 1,
                pitch: 0,
                vol: 1
            }
        };

        // Load and update library
        const storageKey = provider === 'elevenlabs' ? 'voiceLibrary_elevenlabs' : 'voiceLibrary_minimax';
        let library = [];
        try {
            library = JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch (e) { library = []; }

        // Check duplicate
        if (library.find(v => v.voiceId === voiceId)) {
            this.showNotification(`Voice "${voiceName}" đã có trong thư viện!`, 'warning');
            return;
        }

        library.push(voiceData);
        localStorage.setItem(storageKey, JSON.stringify(library));

        // Update in memory
        if (provider === 'elevenlabs') {
            this.voiceLibraryElevenlabs = library;
        } else {
            this.voiceLibraryMinimax = library;
        }
        this.voiceLibrary = [...(this.voiceLibraryElevenlabs || []), ...(this.voiceLibraryMinimax || [])];

        this.showNotification(`Đã thêm "${voiceName}" vào thư viện!`, 'success');
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
    
    async processMultiVoiceText(text, baseFileName) {
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

        const importSource = this.currentImportSource || 'ImportFile';

        // Generate file names for checking
        const fileNames = segments.map((_, index) => `${baseFileName}_${index + 1}`);

        // Check which files already exist
        const completedFiles = await this.checkCompletedFiles(fileNames, importSource);

        // Create tasks with voice library mapping
        // #1 = voice at position 1 (index 0), #2 = position 2 (index 1), etc.
        let completedCount = 0;
        segments.forEach((seg, index) => {
            const voiceIndex = seg.voiceNum - 1; // #1 = index 0, #2 = index 1
            const voice = this.voiceLibrary[voiceIndex];
            const fileName = `${baseFileName}_${index + 1}`;
            const isCompleted = completedFiles[fileName]?.exists;

            if (isCompleted) completedCount++;

            this.addTask({
                id: this.generateTaskId(),
                content: seg.content,
                fileName: fileName,
                voiceId: voice?.voiceId || '',
                voiceName: voice?.name || `Voice #${seg.voiceNum}`,
                voiceNum: seg.voiceNum,
                status: isCompleted ? 'done' : 'pending',
                filePath: completedFiles[fileName]?.filePath || null,
                importSource: importSource
            });
        });

        if (completedCount > 0) {
            this.showNotification(`Đã có ${completedCount}/${segments.length} file hoàn thành`, 'info');
        }
    }
    
    async processLoopText(text, baseFileName) {
        const maxChars = parseInt(document.getElementById('maxChars')?.value) || 10000;
        const chunks = this.splitByCharCount(text, maxChars);
        const importSource = this.currentImportSource || 'ImportFile';

        // Generate file names for checking
        const fileNames = chunks.map((_, index) => `${baseFileName}_${index + 1}`);

        // Check which files already exist
        const completedFiles = await this.checkCompletedFiles(fileNames, importSource);

        let completedCount = 0;
        chunks.forEach((chunk, index) => {
            const fileName = `${baseFileName}_${index + 1}`;
            const isCompleted = completedFiles[fileName]?.exists;

            if (isCompleted) completedCount++;

            this.addTask({
                id: this.generateTaskId(),
                content: chunk,
                fileName: fileName,
                voiceId: document.getElementById('selectedVoiceId')?.value || '',
                status: isCompleted ? 'done' : 'pending',
                filePath: completedFiles[fileName]?.filePath || null,
                importSource: importSource
            });
        });

        if (completedCount > 0) {
            this.showNotification(`Đã có ${completedCount}/${chunks.length} file hoàn thành`, 'info');
        }
    }

    async processAutoSplitText(text, baseFileName) {
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

        const importSource = this.currentImportSource || 'ImportFile';

        // Generate file names for checking
        const fileNames = segments.map((_, index) => `${baseFileName}_${index + 1}`);

        // Check which files already exist
        const completedFiles = await this.checkCompletedFiles(fileNames, importSource);

        let completedCount = 0;
        segments.forEach((seg, index) => {
            const fileName = `${baseFileName}_${index + 1}`;
            const isCompleted = completedFiles[fileName]?.exists;

            if (isCompleted) completedCount++;

            this.addTask({
                id: this.generateTaskId(),
                content: seg,
                fileName: fileName,
                voiceId: document.getElementById('selectedVoiceId')?.value || '',
                status: isCompleted ? 'done' : 'pending',
                filePath: completedFiles[fileName]?.filePath || null,
                importSource: importSource
            });
        });

        if (completedCount > 0) {
            this.showNotification(`Đã có ${completedCount}/${segments.length} file hoàn thành`, 'info');
        }
    }

    async processLineByLineText(text, baseFileName) {
        const lines = text.split('\n').filter(line => line.trim());
        const importSource = this.currentImportSource || 'ImportFile';

        // Generate file names for checking
        const fileNames = lines.map((_, index) => `${baseFileName}_${index + 1}`);

        // Check which files already exist
        const completedFiles = await this.checkCompletedFiles(fileNames, importSource);

        let completedCount = 0;
        lines.forEach((line, index) => {
            const fileName = `${baseFileName}_${index + 1}`;
            const isCompleted = completedFiles[fileName]?.exists;

            if (isCompleted) completedCount++;

            this.addTask({
                id: this.generateTaskId(),
                content: line.trim(),
                fileName: fileName,
                voiceId: document.getElementById('selectedVoiceId')?.value || '',
                status: isCompleted ? 'done' : 'pending',
                filePath: completedFiles[fileName]?.filePath || null,
                importSource: importSource
            });
        });

        if (completedCount > 0) {
            this.showNotification(`Đã có ${completedCount}/${lines.length} file hoàn thành`, 'info');
        }
    }

    // Check which files already exist in output folder
    async checkCompletedFiles(fileNames, subfolder) {
        try {
            if (window.electronAPI && window.electronAPI.checkCompletedFiles) {
                const result = await window.electronAPI.checkCompletedFiles({
                    fileNames: fileNames,
                    subfolder: subfolder
                });
                return result.completedFiles || {};
            }
        } catch (error) {
            console.error('Check completed files error:', error);
        }
        return {};
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
        // Auto-add importSource if not set and currentImportSource is available
        if (!task.importSource && this.currentImportSource) {
            task.importSource = this.currentImportSource;
        }
        this.tasks.push(task);
        console.log('➕ Added task:', {
            id: task.id,
            fileName: task.fileName,
            contentLength: task.content?.length,
            voiceId: task.voiceId,
            status: task.status,
            importSource: task.importSource
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
                <td>
                    ${task.status === 'processing' ? `
                        <div class="status-progress-wrapper">
                            <div class="status-progress-bar">
                                <div class="status-progress-fill" style="width: ${task.progress || 0}%"></div>
                            </div>
                            <span class="status-progress-text">${task.progress || 0}%</span>
                        </div>
                    ` : `<span class="status ${task.status}">${this.getStatusText(task.status)}</span>`}
                </td>
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
            task.progress = 0;
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
                    this.updateTaskDisplay();

                    // Auto download to output folder
                    await this.autoDownloadTask(task);

                    return;
                } else if (taskStatus === 'failed' || taskStatus === 'error') {
                    console.log('❌ Task failed:', task.taskId, response.message);
                    task.status = 'failed';
                    task.error = response.message || 'Task failed';
                    this.updateTaskDisplay();
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
        // Load both libraries
        try {
            const elevenlabs = localStorage.getItem('voiceLibrary_elevenlabs');
            this.voiceLibraryElevenlabs = elevenlabs ? JSON.parse(elevenlabs) : [];
            if (!Array.isArray(this.voiceLibraryElevenlabs)) this.voiceLibraryElevenlabs = [];
        } catch (e) {
            this.voiceLibraryElevenlabs = [];
        }

        try {
            const minimax = localStorage.getItem('voiceLibrary_minimax');
            this.voiceLibraryMinimax = minimax ? JSON.parse(minimax) : [];
            if (!Array.isArray(this.voiceLibraryMinimax)) this.voiceLibraryMinimax = [];
        } catch (e) {
            this.voiceLibraryMinimax = [];
        }

        // Also load old format for migration
        try {
            const old = localStorage.getItem('voiceLibrary');
            if (old) {
                const oldLib = JSON.parse(old);
                if (Array.isArray(oldLib) && oldLib.length > 0) {
                    // Migrate old data to elevenlabs
                    oldLib.forEach(v => {
                        if (v.provider === 'minimax') {
                            if (!this.voiceLibraryMinimax.find(x => x.voiceId === v.voiceId)) {
                                this.voiceLibraryMinimax.push(v);
                            }
                        } else {
                            if (!this.voiceLibraryElevenlabs.find(x => x.voiceId === v.voiceId)) {
                                this.voiceLibraryElevenlabs.push(v);
                            }
                        }
                    });
                    // Save migrated data
                    localStorage.setItem('voiceLibrary_elevenlabs', JSON.stringify(this.voiceLibraryElevenlabs));
                    localStorage.setItem('voiceLibrary_minimax', JSON.stringify(this.voiceLibraryMinimax));
                    // Remove old key
                    localStorage.removeItem('voiceLibrary');
                    console.log('📚 Migrated old voiceLibrary to new format');
                }
            }
        } catch (e) {
            console.error('Migration error:', e);
        }

        // Combined for backward compatibility
        this.voiceLibrary = [...this.voiceLibraryElevenlabs, ...this.voiceLibraryMinimax];
    }

    saveVoiceLibrary() {
        // Save ElevenLabs library
        // Thứ tự columns: #, Project, Name, Voice ID, Model, Speed, Stability, Similarity, Style, Boost, Actions
        // inputs: [0]=Project, [1]=Name, [2]=VoiceID, [3]=Speed, [4]=Stability, [5]=Similarity, [6]=Style, [7]=Boost(checkbox)
        const elevenlabsRows = document.querySelectorAll('#elevenlabsLibraryBody tr');
        this.voiceLibraryElevenlabs = [];

        elevenlabsRows.forEach((row, index) => {
            const inputs = row.querySelectorAll('input');
            const selects = row.querySelectorAll('select');
            const voice = {
                id: index + 1,
                provider: 'elevenlabs',
                project: inputs[0]?.value?.trim() || '',
                name: inputs[1]?.value?.trim() || '',
                voiceId: inputs[2]?.value?.trim() || '',
                model: selects[0]?.value || 'eleven_multilingual_v2',
                settings: {
                    speed: parseFloat(inputs[3]?.value) || 1,
                    stability: parseFloat(inputs[4]?.value) || 0.5,
                    similarity: parseFloat(inputs[5]?.value) || 0.75,
                    style: parseFloat(inputs[6]?.value) || 0,
                    speakerBoost: inputs[7]?.checked !== false
                }
            };
            if (voice.voiceId) {
                this.voiceLibraryElevenlabs.push(voice);
            }
        });

        // Save Minimax library
        // Thứ tự columns: #, Project, Name, Voice ID, Model, Speed, Pitch, Vol, Actions
        // inputs: [0]=Project, [1]=Name, [2]=VoiceID, [3]=Speed, [4]=Pitch, [5]=Vol
        const minimaxRows = document.querySelectorAll('#minimaxLibraryBody tr');
        this.voiceLibraryMinimax = [];

        minimaxRows.forEach((row, index) => {
            const inputs = row.querySelectorAll('input');
            const selects = row.querySelectorAll('select');
            const voice = {
                id: index + 1,
                provider: 'minimax',
                project: inputs[0]?.value?.trim() || '',
                name: inputs[1]?.value?.trim() || '',
                voiceId: inputs[2]?.value?.trim() || '',
                model: selects[0]?.value || 'speech-02-hd',
                settings: {
                    speed: parseFloat(inputs[3]?.value) || 1,
                    pitch: parseFloat(inputs[4]?.value) || 0,
                    vol: parseFloat(inputs[5]?.value) || 1
                }
            };
            if (voice.voiceId) {
                this.voiceLibraryMinimax.push(voice);
            }
        });

        localStorage.setItem('voiceLibrary_elevenlabs', JSON.stringify(this.voiceLibraryElevenlabs));
        localStorage.setItem('voiceLibrary_minimax', JSON.stringify(this.voiceLibraryMinimax));

        // Combined for backward compatibility
        this.voiceLibrary = [...this.voiceLibraryElevenlabs, ...this.voiceLibraryMinimax];

        console.log('✅ Voice Library saved - ElevenLabs:', this.voiceLibraryElevenlabs.length, 'Minimax:', this.voiceLibraryMinimax.length);
        this.showNotification('Đã lưu thư viện!', 'success');

        // Close modal
        const modal = document.getElementById('voiceLibraryModal');
        if (modal) modal.classList.remove('show');
    }

    renderVoiceLibraryTable() {
        this.renderElevenlabsLibrary();
        this.renderMinimaxLibrary();
    }

    renderElevenlabsLibrary() {
        const tbody = document.getElementById('elevenlabsLibraryBody');
        if (!tbody) return;

        if (!this.voiceLibraryElevenlabs || this.voiceLibraryElevenlabs.length === 0) {
            tbody.innerHTML = '';
            return;
        }

        tbody.innerHTML = this.voiceLibraryElevenlabs.map((voice, idx) => `
            <tr data-idx="${idx}" data-provider="elevenlabs">
                <td>${idx + 1}</td>
                <td><input type="text" value="${voice.project || ''}" placeholder="Project..." style="width: 70px;" onchange="updateLibraryVoice('elevenlabs', ${idx}, 'project', this.value)"></td>
                <td><input type="text" value="${voice.name || ''}" placeholder="Name..." style="width: 90px;" onchange="updateLibraryVoice('elevenlabs', ${idx}, 'name', this.value)"></td>
                <td><input type="text" value="${voice.voiceId || ''}" placeholder="Voice ID..." style="width: 140px;" onchange="updateLibraryVoice('elevenlabs', ${idx}, 'voiceId', this.value)"></td>
                <td>
                    <select style="width: 110px; padding: 4px;" onchange="updateLibraryVoice('elevenlabs', ${idx}, 'model', this.value)">
                        <option value="eleven_v3" ${voice.model === 'eleven_v3' ? 'selected' : ''}>Eleven V3</option>
                        <option value="eleven_multilingual_v2" ${voice.model === 'eleven_multilingual_v2' ? 'selected' : ''}>Multilingual V2</option>
                        <option value="eleven_turbo_v2_5" ${voice.model === 'eleven_turbo_v2_5' ? 'selected' : ''}>Turbo V2.5</option>
                        <option value="eleven_turbo_v2" ${voice.model === 'eleven_turbo_v2' ? 'selected' : ''}>Turbo V2</option>
                        <option value="eleven_flash_v2_5" ${voice.model === 'eleven_flash_v2_5' ? 'selected' : ''}>Flash V2.5</option>
                        <option value="eleven_flash_v2" ${voice.model === 'eleven_flash_v2' ? 'selected' : ''}>Flash V2</option>
                        <option value="eleven_monolingual_v1" ${voice.model === 'eleven_monolingual_v1' ? 'selected' : ''}>Monolingual V1</option>
                    </select>
                </td>
                <td><input type="number" value="${voice.settings?.speed || 1}" step="0.1" min="0.5" max="2" style="width: 50px;" onchange="updateLibrarySetting('elevenlabs', ${idx}, 'speed', parseFloat(this.value))"></td>
                <td><input type="number" value="${voice.settings?.stability || 0.5}" step="0.1" min="0" max="1" style="width: 55px;" onchange="updateLibrarySetting('elevenlabs', ${idx}, 'stability', parseFloat(this.value))"></td>
                <td><input type="number" value="${voice.settings?.similarity || 0.75}" step="0.1" min="0" max="1" style="width: 55px;" onchange="updateLibrarySetting('elevenlabs', ${idx}, 'similarity', parseFloat(this.value))"></td>
                <td><input type="number" value="${voice.settings?.style || 0}" step="0.1" min="0" max="1" style="width: 45px;" onchange="updateLibrarySetting('elevenlabs', ${idx}, 'style', parseFloat(this.value))"></td>
                <td style="text-align: center;"><input type="checkbox" ${voice.settings?.speakerBoost !== false ? 'checked' : ''} onchange="updateLibrarySetting('elevenlabs', ${idx}, 'speakerBoost', this.checked)"></td>
                <td style="display: flex; gap: 4px;">
                    <button class="btn btn-sm" onclick="previewLibraryVoice('elevenlabs', ${idx})" title="Nghe thử"><i class="bi bi-volume-up"></i></button>
                    <button class="btn btn-sm" onclick="useLibraryVoice('elevenlabs', ${idx})" title="Sử dụng"><i class="bi bi-check-lg"></i></button>
                    <button class="btn btn-sm" onclick="removeLibraryRow('elevenlabs', ${idx})" title="Xóa" style="color: #f55;"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    renderMinimaxLibrary() {
        const tbody = document.getElementById('minimaxLibraryBody');
        if (!tbody) return;

        if (!this.voiceLibraryMinimax || this.voiceLibraryMinimax.length === 0) {
            tbody.innerHTML = '';
            return;
        }

        tbody.innerHTML = this.voiceLibraryMinimax.map((voice, idx) => {
            // Lấy tên: ưu tiên voice_name > name, tránh trường hợp name = voiceId
            const displayName = voice.voice_name || voice.name || '';
            // Lấy voice ID: ưu tiên voiceId > voice_id > id
            const displayVoiceId = voice.voiceId || voice.voice_id || voice.id || '';
            // Model: default là speech-02-hd nếu không có
            const currentModel = voice.model || 'speech-02-hd';

            return `
            <tr data-idx="${idx}" data-provider="minimax">
                <td>${idx + 1}</td>
                <td><input type="text" value="${voice.project || ''}" placeholder="Project..." style="width: 70px;" onchange="updateLibraryVoice('minimax', ${idx}, 'project', this.value)"></td>
                <td><input type="text" value="${this.escapeHtml(displayName)}" placeholder="Name..." style="width: 90px;" onchange="updateLibraryVoice('minimax', ${idx}, 'name', this.value)"></td>
                <td><input type="text" value="${displayVoiceId}" placeholder="Voice ID..." style="width: 140px;" onchange="updateLibraryVoice('minimax', ${idx}, 'voiceId', this.value)"></td>
                <td>
                    <select style="width: 100px; padding: 4px;" onchange="updateLibraryVoice('minimax', ${idx}, 'model', this.value)">
                        <option value="speech-02-hd" ${currentModel === 'speech-02-hd' ? 'selected' : ''}>Speech HD 2.6</option>
                        <option value="speech-02-turbo" ${currentModel === 'speech-02-turbo' ? 'selected' : ''}>Speech Turbo 2.6</option>
                        <option value="speech-01-hd" ${currentModel === 'speech-01-hd' ? 'selected' : ''}>Speech HD 2.5</option>
                        <option value="speech-01-turbo" ${currentModel === 'speech-01-turbo' ? 'selected' : ''}>Speech Turbo 2.5</option>
                    </select>
                </td>
                <td><input type="number" value="${voice.settings?.speed || 1}" step="0.1" min="0.5" max="2" style="width: 50px;" onchange="updateLibrarySetting('minimax', ${idx}, 'speed', parseFloat(this.value))"></td>
                <td><input type="number" value="${voice.settings?.pitch || 0}" step="1" min="-12" max="12" style="width: 50px;" onchange="updateLibrarySetting('minimax', ${idx}, 'pitch', parseFloat(this.value))"></td>
                <td><input type="number" value="${voice.settings?.vol || 1}" step="0.1" min="0.1" max="10" style="width: 50px;" onchange="updateLibrarySetting('minimax', ${idx}, 'vol', parseFloat(this.value))"></td>
                <td style="display: flex; gap: 4px;">
                    <button class="btn btn-sm" onclick="previewLibraryVoice('minimax', ${idx})" title="Nghe thử"><i class="bi bi-volume-up"></i></button>
                    <button class="btn btn-sm" onclick="useLibraryVoice('minimax', ${idx})" title="Sử dụng"><i class="bi bi-check-lg"></i></button>
                    <button class="btn btn-sm" onclick="removeLibraryRow('minimax', ${idx})" title="Xóa" style="color: #f55;"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }
    
    // ==================== JOIN MP3 & SRT ====================

    async joinMp3AndSrt() {
        const doneTasks = this.tasks.filter(t => t.status === 'done' || t.isAudioImport);

        if (doneTasks.length < 2) {
            this.showNotification('Cần ít nhất 2 file để nối!', 'warning');
            return;
        }

        // Get default delay from Advanced Settings
        const useDelay = document.getElementById('optDelayJoin')?.checked;
        const defaultDelay = useDelay ? (parseFloat(document.getElementById('delayJoinTime')?.value) || 0.5) : 0;

        // Show confirmation dialog with delay input
        const delaySeconds = await this.showJoinConfirmDialog(doneTasks.length, defaultDelay);
        if (delaySeconds === null) {
            // User cancelled
            return;
        }

        this.showNotification('Đang chuẩn bị nối file...', 'info');

        try {
            // Step 1: Download all files first
            const downloadedFiles = [];
            const taskData = [];
            const fileNames = [];

            for (const task of doneTasks) {
                if (task.isAudioImport && task.filePath) {
                    // Local file
                    downloadedFiles.push(task.filePath);
                    taskData.push({
                        content: task.content || task.fileName,
                        duration: task.duration || 3
                    });
                    fileNames.push(task.fileName || task.outputName || '');
                } else if (task.resultUrl) {
                    // Need to download
                    const fileName = `${task.outputName || task.fileName || task.id}.mp3`;
                    const result = await window.electronAPI.downloadFile({
                        url: task.resultUrl,
                        fileName: fileName,
                        subfolder: 'Backup'
                    });

                    if (result.success) {
                        downloadedFiles.push(result.filePath);
                        taskData.push({
                            content: task.content || task.fileName,
                            duration: task.duration || 3
                        });
                        fileNames.push(task.outputName || task.fileName || '');
                    }
                }
            }

            if (downloadedFiles.length < 2) {
                this.showNotification('Không đủ file để nối!', 'warning');
                return;
            }

            // Step 2: Get output name - find common prefix from file names
            const outputName = this.getJoinOutputName(fileNames);

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

    // Show confirmation dialog for join with delay input
    showJoinConfirmDialog(fileCount, defaultDelay) {
        return new Promise((resolve) => {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.id = 'joinConfirmModal';
            modal.innerHTML = `
                <div class="modal-box" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3><i class="bi bi-link"></i> Join ${fileCount} Files</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Khoảng trống giữa các đoạn (giây)</label>
                            <input type="number" class="form-input" id="joinDelayInput"
                                   value="${defaultDelay}" step="0.1" min="0" max="10"
                                   style="font-size: 16px; text-align: center;">
                            <div style="font-size: 11px; color: #666; margin-top: 4px;">
                                Để 0 nếu không muốn có khoảng trống
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" id="joinCancelBtn">Hủy</button>
                        <button class="btn btn-primary" id="joinConfirmBtn">
                            <i class="bi bi-check-lg"></i> Xác nhận
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Focus input
            setTimeout(() => {
                const input = document.getElementById('joinDelayInput');
                input?.focus();
                input?.select();
            }, 100);

            // Handle confirm
            document.getElementById('joinConfirmBtn').onclick = () => {
                const delay = parseFloat(document.getElementById('joinDelayInput').value) || 0;
                modal.remove();
                resolve(delay);
            };

            // Handle cancel
            document.getElementById('joinCancelBtn').onclick = () => {
                modal.remove();
                resolve(null);
            };

            // Handle Enter key
            document.getElementById('joinDelayInput').onkeydown = (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('joinConfirmBtn').click();
                }
            };

            // Handle close button
            modal.querySelector('.modal-close').onclick = () => {
                modal.remove();
                resolve(null);
            };
        });
    }

    // Get output name for joined file - find common prefix
    getJoinOutputName(fileNames) {
        if (!fileNames || fileNames.length === 0) {
            return 'joined_' + Date.now();
        }

        // Clean file names (remove extension and numbers/suffixes)
        const cleanNames = fileNames.map(name => {
            // Remove extension
            let clean = name.replace(/\.(mp3|wav|ogg)$/i, '');
            // Remove trailing numbers like _1, _2, -1, -2, (1), (2)
            clean = clean.replace(/[_\-\s]?\d+$/, '');
            clean = clean.replace(/\s*\(\d+\)$/, '');
            return clean.trim();
        });

        // Find common prefix
        if (cleanNames.length === 0) {
            return 'joined_' + Date.now();
        }

        // Check if all names are the same after cleaning
        const firstName = cleanNames[0];
        const allSame = cleanNames.every(n => n === firstName);

        if (allSame && firstName) {
            return firstName + '_join';
        }

        // Find longest common prefix
        let prefix = cleanNames[0];
        for (let i = 1; i < cleanNames.length; i++) {
            while (cleanNames[i].indexOf(prefix) !== 0 && prefix.length > 0) {
                prefix = prefix.substring(0, prefix.length - 1);
            }
        }

        // Clean up prefix (remove trailing underscores, dashes, spaces)
        prefix = prefix.replace(/[_\-\s]+$/, '').trim();

        if (prefix && prefix.length >= 2) {
            return prefix + '_join';
        }

        // Fallback to first file name
        return (cleanNames[0] || 'joined') + '_join';
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
        // Show modal with new style
        document.getElementById('backupModal').style.display = 'flex';
        await this.loadBackupHistory();
    }

    closeBackup() {
        const modal = document.getElementById('backupModal');
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
        }, 200);
    }
    
    async loadBackupHistory() {
        const backupBody = document.getElementById('backupBody');
        backupBody.innerHTML = `<div style="padding: 40px; text-align: center; color: #666;">
            <div style="width: 2rem; height: 2rem; border: 2px solid #333; border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            <p style="margin-top: 10px;">Đang tải...</p>
        </div>`;

        try {
            // Dùng API giống Lịch Sử Chi Tiết trong TTS
            const response = await window.electronAPI.apiRequest(
                'https://kingcongstudio.com/ajaxs/tts3.php',
                {
                    action: 'get_history_detailed_v2',
                    limit: 50,
                    page: 1
                }
            );

            console.log('📥 Backup History Response:', response);

            if (response.status === 'success' && response.data && response.data.length > 0) {
                this.renderBackupHistory(response.data);
            } else if (response.success && response.tasks && response.tasks.length > 0) {
                // Fallback cho response cũ
                this.renderBackupHistory(response.tasks);
            } else {
                backupBody.innerHTML = `<div style="padding: 40px; text-align: center; color: #666;">
                    <i class="bi bi-inbox" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                    <p>Không có lịch sử</p>
                </div>`;
            }
        } catch (error) {
            console.error('❌ Load backup history error:', error);
            backupBody.innerHTML = `<div style="padding: 40px; text-align: center; color: #ef4444;">
                <i class="bi bi-exclamation-circle" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                <p>Lỗi khi tải lịch sử</p>
                <p style="font-size: 11px; color: #888;">${error.message}</p>
            </div>`;
        }
    }
    
    renderBackupHistory(tasks) {
        const backupBody = document.getElementById('backupBody');

        // Tìm voice info trong library
        const findVoiceInfo = (voiceId) => {
            if (!voiceId) return { project: '', name: '' };

            // Tìm trong ElevenLabs library
            let voice = (this.voiceLibraryElevenlabs || []).find(v => v.voiceId === voiceId);
            if (voice) return { project: voice.project || '', name: voice.name || '' };

            // Tìm trong Minimax library
            voice = (this.voiceLibraryMinimax || []).find(v => v.voiceId === voiceId);
            if (voice) return { project: voice.project || '', name: voice.name || '' };

            return { project: '', name: '' };
        };

        // Helper: lấy provider logo
        const getProviderLogo = (provider) => {
            if (provider === 'minimax') {
                return 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/minimax-color.png';
            }
            return 'https://help.elevenlabs.io/hc/theming_assets/01HZQ08B6SDY5X53YN9ABG4B99';
        };

        // Helper: format thời gian audio
        const formatTime = (seconds) => {
            if (!seconds || isNaN(seconds)) return '--:--';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // Helper: format ngày giờ (giống TTS)
        const formatDateTime = (dateStr) => {
            if (!dateStr) return '-';

            // Parse nhiều format khác nhau
            let d;

            // Format: DD/MM/YYYY HH:mm:ss
            const match1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
            if (match1) {
                const [_, day, month, year, hour, minute, second] = match1;
                d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second || 0));
            }

            // Format: YYYY-MM-DD HH:mm:ss
            if (!d || isNaN(d.getTime())) {
                const match2 = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
                if (match2) {
                    const [_, year, month, day, hour, minute, second] = match2;
                    d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second || 0));
                }
            }

            // Fallback: try native parsing
            if (!d || isNaN(d.getTime())) {
                d = new Date(dateStr);
            }

            if (isNaN(d.getTime())) return dateStr;
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}`;
        };

        // Header row
        let html = `
        <div class="bk-header-row">
            <div></div>
            <div>Thời gian / Nội dung</div>
            <div>Project</div>
            <div>Voice ID</div>
            <div>Tên giọng</div>
            <div>Trạng thái</div>
            <div>Player</div>
            <div>Credits</div>
        </div>
        `;
        tasks.forEach((task, index) => {
            // Lấy task_id (ưu tiên task_id, sau đó id)
            const taskId = task.task_id || task.id || '';
            if (!taskId) return; // Skip nếu không có ID

            const status = (task.status || '').toLowerCase();
            // Lấy text (ưu tiên text_input từ API mới)
            const text = task.text_input || task.text || task.input_text || '';
            const provider = task.provider || 'elevenlabs';
            const voiceId = task.voice_id || task.voiceId || '';
            const voiceInfo = findVoiceInfo(voiceId);
            const project = task.project || task.project_name || voiceInfo.project || '';
            const voiceName = task.voice_name || voiceInfo.name || '';
            const creditCost = task.credit_cost || 0;
            // Lấy audio URL (ưu tiên audio_url từ API mới)
            const audioUrl = task.audio_url || task.result_url || '';
            const srtUrl = task.srt_url || '';
            const jsonUrl = task.json_url || '';
            const duration = task.duration || (task.metadata ? task.metadata.duration : 0) || 0;
            const providerLogo = getProviderLogo(provider);
            const safeText = this.escapeHtml(text.substring(0, 200));

            let statusBadge = '';
            let contentArea = '';
            let creditLabel = 'Tín dụng sử dụng';

            if (status === 'done') {
                statusBadge = `<span class="bk-status-badge bk-badge-done">Xong</span>`;

                // Player với download dropdown (giống TTS)
                const downloadDropdown = `
                    <div class="bk-download-wrapper">
                        <button class="bk-download-btn" onclick="toggleBkDownloadMenu(event, '${taskId}')" title="Tải xuống">
                            <i class="bi bi-download"></i>
                        </button>
                        <div class="bk-download-menu" id="bk-download-menu-${taskId}">
                            <div class="bk-download-header">Tải xuống (hết hạn sau 72 giờ)</div>
                            <!-- Audio -->
                            ${audioUrl ? `
                                <a href="${audioUrl}" download class="bk-download-item">
                                    <i class="bi bi-music-note-beamed"></i>
                                    <span>Audio</span>
                                </a>` : `
                                <div class="bk-download-item bk-download-disabled">
                                    <i class="bi bi-music-note-beamed"></i>
                                    <span>Audio</span>
                                </div>`}
                            <!-- SRT -->
                            ${srtUrl ? `
                                <a href="${srtUrl}" download class="bk-download-item">
                                    <i class="bi bi-file-earmark-text"></i>
                                    <span>Phụ đề (SRT)</span>
                                </a>` : `
                                <div class="bk-download-item bk-download-disabled">
                                    <i class="bi bi-file-earmark-text"></i>
                                    <span>Phụ đề (SRT)</span>
                                </div>`}
                            <!-- JSON -->
                            ${jsonUrl ? `
                                <a href="${jsonUrl}" download class="bk-download-item">
                                    <i class="bi bi-file-earmark-code"></i>
                                    <span>Phụ đề (JSON)</span>
                                </a>` : `
                                <div class="bk-download-item bk-download-disabled">
                                    <i class="bi bi-file-earmark-code"></i>
                                    <span>Phụ đề (JSON)</span>
                                </div>`}
                        </div>
                    </div>
                `;

                contentArea = `
                    <div class="bk-player">
                        <button class="bk-play-btn" onclick="playBkAudio('${taskId}', '${audioUrl}')" ${!audioUrl ? 'disabled' : ''}>
                            <i class="bi bi-play-fill"></i>
                        </button>
                        <div class="bk-progress-track" onclick="seekBkAudio(event, '${taskId}')">
                            <div class="bk-progress-bar" id="bk-progress-${taskId}"></div>
                        </div>
                        <div class="bk-timer" id="bk-timer-${taskId}">0:00 / ${formatTime(duration)}</div>
                        <div class="bk-actions-group">
                            ${downloadDropdown}
                            <button class="bk-delete-btn" onclick="deleteBkTask('${taskId}', '${safeText}', '${status}', ${creditCost})" title="Xóa">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            } else if (status === 'failed') {
                statusBadge = `<span class="bk-status-badge bk-badge-error">Lỗi</span>`;
                creditLabel = 'Đã hoàn trả';
                const errorMsg = task.error_message || 'Lỗi không xác định';
                contentArea = `
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div class="bk-status-text bk-text-error">
                            <i class="bi bi-exclamation-circle"></i> ${errorMsg}
                        </div>
                        <button class="bk-delete-btn" onclick="deleteBkTask('${taskId}', '${safeText}', '${status}', ${creditCost})" title="Xóa">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
            } else if (['queued', 'pending', 'processing', 'doing'].includes(status)) {
                statusBadge = `<span class="bk-status-badge bk-badge-processing">Đang xử lý</span>`;
                creditLabel = 'Tín dụng đóng băng';
                const progress = task.progress || 0;
                contentArea = `
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div class="bk-status-text bk-text-processing">
                            <div style="width: 1rem; height: 1rem; border: 2px solid #333; border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <span>Xử lý ${progress}%</span>
                        </div>
                        <button class="bk-delete-btn" onclick="deleteBkTask('${taskId}', '${safeText}', '${status}', ${creditCost})" title="Xóa">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
            }

            html += `
            <div class="bk-row" id="bk-row-${taskId}" data-task-id="${taskId}">
                <div class="bk-checkbox-wrapper">
                    <input type="checkbox" class="bk-item-checkbox" value="${taskId}"
                        data-audio="${audioUrl}"
                        onchange="updateBkBulkActions()">
                </div>

                <div class="bk-info">
                    <div class="bk-time">
                        ${formatDateTime(task.created_at)}
                        <img src="${providerLogo}" class="bk-provider-icon" alt="${provider}">
                    </div>
                    <div class="bk-text-preview" title="${safeText}">
                        ${safeText || 'N/A'}
                    </div>
                </div>

                <div class="bk-project" title="${project}">${project || '-'}</div>
                <div class="bk-voice-id">
                    ${voiceId ? `
                        <span class="bk-voice-id-text" title="${voiceId}" onclick="copyBkVoiceId('${voiceId}')">${voiceId}</span>
                        <button class="bk-copy-btn" onclick="copyBkVoiceId('${voiceId}')" title="Copy Voice ID">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    ` : '-'}
                </div>
                <div class="bk-voice-name" title="${voiceName}">${voiceName || '-'}</div>

                ${statusBadge}

                <div class="bk-content-area">
                    ${contentArea}
                </div>

                <div class="bk-credits">
                    <span class="bk-credits-val">${creditCost}</span>
                    <span class="bk-credits-label">${creditLabel}</span>
                </div>
            </div>
            `;
        });

        backupBody.innerHTML = html;
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

            // Determine subfolder based on import source (ImportFile, ImportFolder, or Backup)
            const subfolder = task.importSource || 'ImportFile';

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
    // Open separate window
    if (window.electronAPI && window.electronAPI.openVoiceLibrary) {
        window.electronAPI.openVoiceLibrary();
    } else {
        // Fallback to modal
        document.getElementById('voiceLibraryModal').classList.add('show');
        proTool.loadVoiceLibrary();
        proTool.renderVoiceLibraryTable();
        const currentProvider = document.getElementById('providerSelect')?.value || 'elevenlabs';
        switchLibraryTab(currentProvider);
    }
}

function closeVoiceLibrary() {
    document.getElementById('voiceLibraryModal').classList.remove('show');
}

function saveVoiceLibrary() {
    proTool.saveVoiceLibrary();
}

// Switch between library tabs
function switchLibraryTab(provider) {
    // Update tabs
    document.querySelectorAll('.lib-tab').forEach(tab => {
        if (tab.dataset.provider === provider) {
            tab.style.color = '#fff';
            tab.style.borderBottom = '2px solid #a855f7';
            tab.classList.add('active');
        } else {
            tab.style.color = '#888';
            tab.style.borderBottom = '2px solid transparent';
            tab.classList.remove('active');
        }
    });

    // Show/hide library content
    document.getElementById('elevenlabsLibrary').style.display = provider === 'elevenlabs' ? 'block' : 'none';
    document.getElementById('minimaxLibrary').style.display = provider === 'minimax' ? 'block' : 'none';
}

// Add new row to library
function addLibraryRow(provider) {
    const tbody = document.getElementById(provider === 'elevenlabs' ? 'elevenlabsLibraryBody' : 'minimaxLibraryBody');
    const rows = tbody.querySelectorAll('tr');
    const nextId = rows.length + 1;

    const newRow = document.createElement('tr');

    if (provider === 'elevenlabs') {
        newRow.innerHTML = `
            <td>${nextId}</td>
            <td><input type="text" placeholder="Name..." style="width: 90px;"></td>
            <td><input type="text" placeholder="Voice ID..." style="width: 160px;"></td>
            <td>
                <select style="width: 110px; padding: 4px;">
                    <option value="eleven_multilingual_v2">Multilingual V2</option>
                    <option value="eleven_turbo_v2_5">Turbo V2.5</option>
                    <option value="eleven_flash_v2">Flash V2</option>
                    <option value="eleven_flash_v2_5">Flash V2.5</option>
                    <option value="eleven_v3">Eleven V3</option>
                </select>
            </td>
            <td><input type="number" value="1" step="0.1" min="0.5" max="2" style="width: 60px;"></td>
            <td><input type="number" value="0.5" step="0.1" min="0" max="1" style="width: 60px;"></td>
            <td><input type="number" value="0.75" step="0.1" min="0" max="1" style="width: 60px;"></td>
            <td><input type="number" value="0" step="0.1" min="0" max="1" style="width: 50px;"></td>
            <td style="text-align: center;"><input type="checkbox" checked></td>
            <td>
                <button class="btn btn-sm" onclick="useLibraryVoice('elevenlabs', ${nextId - 1})" title="Sử dụng"><i class="bi bi-play-fill"></i></button>
                <button class="btn btn-sm" onclick="removeLibraryRow('elevenlabs', this)" title="Xóa" style="color: #f55;"><i class="bi bi-trash"></i></button>
            </td>
        `;
    } else {
        newRow.innerHTML = `
            <td>${nextId}</td>
            <td><input type="text" placeholder="Name..." style="width: 90px;"></td>
            <td><input type="text" placeholder="Voice ID..." style="width: 160px;"></td>
            <td>
                <select style="width: 110px; padding: 4px;">
                    <option value="speech-02-hd">Speech HD 2.6</option>
                    <option value="speech-02-turbo">Speech Turbo 2.6</option>
                    <option value="speech-01-hd">Speech HD 2.5</option>
                    <option value="speech-01-turbo">Speech Turbo 2.5</option>
                </select>
            </td>
            <td><input type="number" value="1" step="0.1" min="0.5" max="2" style="width: 60px;"></td>
            <td><input type="number" value="0" step="1" min="-12" max="12" style="width: 60px;"></td>
            <td><input type="number" value="1" step="0.1" min="0.1" max="10" style="width: 60px;"></td>
            <td>
                <button class="btn btn-sm" onclick="useLibraryVoice('minimax', ${nextId - 1})" title="Sử dụng"><i class="bi bi-play-fill"></i></button>
                <button class="btn btn-sm" onclick="removeLibraryRow('minimax', this)" title="Xóa" style="color: #f55;"><i class="bi bi-trash"></i></button>
            </td>
        `;
    }

    tbody.appendChild(newRow);
}

// Remove row from library - now accepts index directly
function removeLibraryRow(provider, index) {
    if (provider === 'elevenlabs') {
        proTool.voiceLibraryElevenlabs.splice(index, 1);
        proTool.renderElevenlabsLibrary();
    } else {
        proTool.voiceLibraryMinimax.splice(index, 1);
        proTool.renderMinimaxLibrary();
    }
    // Mark as unsaved
    proTool.voiceLibrary = [...(proTool.voiceLibraryElevenlabs || []), ...(proTool.voiceLibraryMinimax || [])];
}

// Update voice field in library (project, name, voiceId, model)
function updateLibraryVoice(provider, index, field, value) {
    const library = provider === 'elevenlabs' ? proTool.voiceLibraryElevenlabs : proTool.voiceLibraryMinimax;
    if (library && library[index]) {
        library[index][field] = value;
    }
}

// Update voice setting in library (speed, stability, similarity, style, speakerBoost, pitch, vol)
function updateLibrarySetting(provider, index, field, value) {
    const library = provider === 'elevenlabs' ? proTool.voiceLibraryElevenlabs : proTool.voiceLibraryMinimax;
    if (library && library[index]) {
        if (!library[index].settings) {
            library[index].settings = {};
        }
        library[index].settings[field] = value;
    }
}

// Preview voice from library - use preview_url or fetch from API
let currentPreviewUrl = null;

async function previewLibraryVoice(provider, index) {
    const library = provider === 'elevenlabs' ? proTool.voiceLibraryElevenlabs : proTool.voiceLibraryMinimax;
    const voice = library?.[index];
    const previewAudio = document.getElementById('previewAudio');

    if (!voice || !voice.voiceId) {
        proTool.showNotification('Voice ID trống!', 'warning');
        return;
    }

    let previewUrl = voice.preview_url || '';

    // If no preview_url, try to fetch from API
    if (!previewUrl) {
        proTool.showNotification('Đang tìm audio mẫu...', 'info');
        try {
            const res = await window.electronAPI.apiRequest(
                'https://kingcongstudio.com/ajaxs/get_resources2.php?action=search_voice_id',
                { voice_id: voice.voiceId }
            );

            if (res && res.status === 'success' && res.data) {
                previewUrl = res.data.preview_url || res.data.sample_audio || '';
                // Save for future use
                if (previewUrl) {
                    voice.preview_url = previewUrl;
                }
            }
        } catch (error) {
            console.error('Fetch preview error:', error);
        }
    }

    if (!previewUrl) {
        proTool.showNotification('Không có audio mẫu cho voice này!', 'warning');
        return;
    }

    // Toggle play/pause
    if (currentPreviewUrl === previewUrl && previewAudio && !previewAudio.paused) {
        previewAudio.pause();
        currentPreviewUrl = null;
        return;
    }

    // Play audio
    if (previewAudio) {
        previewAudio.src = previewUrl;
        previewAudio.play().catch(e => {
            console.error('Play error:', e);
            proTool.showNotification('Không thể phát audio!', 'error');
        });
        currentPreviewUrl = previewUrl;
        proTool.showNotification('Đang phát...', 'success');
    }
}

// Use voice from library
function useLibraryVoice(provider, index) {
    const library = provider === 'elevenlabs' ? proTool.voiceLibraryElevenlabs : proTool.voiceLibraryMinimax;
    const voice = library[index];

    if (!voice) {
        proTool.showNotification('Voice not found!', 'error');
        return;
    }

    // Switch provider if needed
    if (document.getElementById('providerSelect')?.value !== provider) {
        selectProvider(provider);
    }

    // Set voice ID
    document.getElementById('selectedVoiceId').value = voice.voiceId;

    // Set model
    if (provider === 'elevenlabs') {
        document.getElementById('modelSelect').value = voice.model || 'eleven_multilingual_v2';
        // Set settings
        if (voice.settings) {
            document.getElementById('voiceSpeed').value = voice.settings.speed || 1;
            document.getElementById('voiceStability').value = (voice.settings.stability || 0.5) * 100;
            document.getElementById('voiceSimilarity').value = (voice.settings.similarity || 0.75) * 100;
            document.getElementById('voiceStyle').value = (voice.settings.style || 0) * 100;
            document.getElementById('speakerBoost').checked = voice.settings.speakerBoost !== false;

            // Update slider displays
            updateSlider('speed');
            updateSlider('stability');
            updateSlider('similarity');
            updateSlider('style');
        }
    } else {
        document.getElementById('minimaxModelSelect').value = voice.model || 'speech-02-hd';
        // Set settings
        if (voice.settings) {
            document.getElementById('mmVoiceSpeed').value = voice.settings.speed || 1;
            document.getElementById('mmVoicePitch').value = voice.settings.pitch || 0;
            document.getElementById('mmVoiceVol').value = voice.settings.vol || 1;

            // Update slider displays
            updateSlider('mmSpeed');
            updateSlider('mmPitch');
            updateSlider('mmVol');
        }
    }

    closeVoiceLibrary();
    proTool.showNotification(`Đã chọn voice: ${voice.name || voice.voiceId}`, 'success');
}

// Keep old function for backward compatibility
function addVoiceRow() {
    const currentProvider = document.getElementById('providerSelect')?.value || 'elevenlabs';
    addLibraryRow(currentProvider);
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

// Backup/History
function openBackup() {
    proTool.openBackup();
}

function closeBackup() {
    proTool.closeBackup();
}

function refreshBackup() {
    proTool.refreshBackup();
}

function openOutputFolder() {
    proTool.openOutputFolder();
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
async function addToLibrary() {
    const voiceId = document.getElementById('selectedVoiceId')?.value?.trim();
    const provider = document.getElementById('providerSelect')?.value || 'elevenlabs';

    if (!voiceId) {
        proTool.showNotification('Vui lòng nhập Voice ID!', 'warning');
        return;
    }

    // Lấy voice name từ input hidden (đã lưu khi chọn từ window "Chọn giọng nói")
    let voiceName = document.getElementById('selectedVoiceName')?.value?.trim() || '';
    let previewUrl = ''; // Preview URL for listening

    // Nếu không có voice name (user nhập tay voiceId), thì mới gọi API
    if (!voiceName || voiceName === voiceId) {
        proTool.showNotification('Đang tìm thông tin voice...', 'info');

        try {
            // Call API to get voice info
            const res = await window.electronAPI.apiRequest(
                'https://kingcongstudio.com/ajaxs/get_resources2.php?action=search_voice_id',
                { voice_id: voiceId }
            );

            console.log('🔍 Voice Info Result:', res);

            if (res && res.status === 'success' && res.data) {
                // Ưu tiên voice_name trước, sau đó name (tránh trường hợp name = voice_id)
                voiceName = res.data.voice_name || res.data.name || voiceId;
                previewUrl = res.data.preview_url || res.data.sample_audio || '';
                console.log('✅ Found voice name:', voiceName, 'preview:', previewUrl);
            } else {
                console.log('⚠️ Voice not found, using ID as name');
                voiceName = voiceId;
            }
        } catch (error) {
            console.error('❌ Error fetching voice info:', error);
            voiceName = voiceId; // Fallback to voiceId
        }
    } else {
        console.log('✅ Using cached voice name:', voiceName);
    }

    // Get current settings based on provider
    let voiceData;

    if (provider === 'elevenlabs') {
        const model = document.getElementById('modelSelect')?.value || 'eleven_multilingual_v2';
        voiceData = {
            id: Date.now(),
            voiceId: voiceId,
            name: voiceName,
            project: '', // Default empty project
            provider: provider,
            model: model,
            preview_url: previewUrl,
            settings: {
                speed: parseFloat(document.getElementById('voiceSpeed')?.value) || 1,
                stability: (parseFloat(document.getElementById('voiceStability')?.value) || 50) / 100,
                similarity: (parseFloat(document.getElementById('voiceSimilarity')?.value) || 75) / 100,
                style: (parseFloat(document.getElementById('voiceStyle')?.value) || 0) / 100,
                speakerBoost: document.getElementById('speakerBoost')?.checked !== false
            }
        };
    } else {
        const model = document.getElementById('minimaxModelSelect')?.value || 'speech-02-hd';
        voiceData = {
            id: Date.now(),
            voiceId: voiceId,
            name: voiceName,
            project: '', // Default empty project
            provider: provider,
            model: model,
            preview_url: previewUrl,
            settings: {
                speed: parseFloat(document.getElementById('mmVoiceSpeed')?.value) || 1,
                pitch: parseFloat(document.getElementById('mmVoicePitch')?.value) || 0,
                vol: parseFloat(document.getElementById('mmVoiceVol')?.value) || 1
            }
        };
    }

    console.log('📚 Adding to library:', voiceData);

    // Load existing library for the provider
    const storageKey = provider === 'elevenlabs' ? 'voiceLibrary_elevenlabs' : 'voiceLibrary_minimax';
    let library = [];
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        library = Array.isArray(stored) ? stored : [];
    } catch (e) {
        library = [];
    }

    // Check if voiceId already exists
    const existingIndex = library.findIndex(v => v.voiceId === voiceId);
    if (existingIndex >= 0) {
        library[existingIndex] = voiceData;
        proTool.showNotification(`Đã cập nhật "${voiceName}" trong thư viện!`, 'success');
    } else {
        library.push(voiceData);
        proTool.showNotification(`Đã thêm "${voiceName}" vào thư viện!`, 'success');
    }

    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(library));

    // Update proTool library in memory
    if (provider === 'elevenlabs') {
        proTool.voiceLibraryElevenlabs = library;
    } else {
        proTool.voiceLibraryMinimax = library;
    }
    proTool.voiceLibrary = [...(proTool.voiceLibraryElevenlabs || []), ...(proTool.voiceLibraryMinimax || [])];

    console.log('📚 Library saved:', library.length, 'voices for', provider);
}

// Old modal-based add to library (kept for reference)
function addToLibraryModal() {
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
    const provider = document.getElementById('libProvider')?.value || 'elevenlabs';
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

    // Load existing library for the provider
    const storageKey = provider === 'elevenlabs' ? 'voiceLibrary_elevenlabs' : 'voiceLibrary_minimax';
    let library = [];
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        library = Array.isArray(stored) ? stored : [];
    } catch (e) {
        library = [];
    }

    // Check if voiceId already exists
    const existingIndex = library.findIndex(v => v.voiceId === voiceId);
    if (existingIndex >= 0) {
        library[existingIndex] = voiceData;
    } else {
        library.push(voiceData);
    }

    localStorage.setItem(storageKey, JSON.stringify(library));

    // Update proTool library in memory
    if (provider === 'elevenlabs') {
        proTool.voiceLibraryElevenlabs = library;
    } else {
        proTool.voiceLibraryMinimax = library;
    }
    proTool.voiceLibrary = [...(proTool.voiceLibraryElevenlabs || []), ...(proTool.voiceLibraryMinimax || [])];

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

// Audio player state for backup modal
let bkCurrentAudio = null;
let bkCurrentTaskId = null;

function deleteAllBackupTasks() {
    if (!confirm('Xóa tất cả tasks trong backup? Hành động này không thể hoàn tác!')) {
        return;
    }

    proTool.deleteAllBackupTasks();
}

// Copy Voice ID to clipboard
function copyBkVoiceId(voiceId) {
    navigator.clipboard.writeText(voiceId).then(() => {
        proTool.showNotification(`Đã copy: ${voiceId}`, 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = voiceId;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        proTool.showNotification(`Đã copy: ${voiceId}`, 'success');
    });
}

// Toggle download dropdown menu
function toggleBkDownloadMenu(event, taskId) {
    event.stopPropagation();

    const menuId = `#bk-download-menu-${taskId}`;
    const $menu = $(menuId);

    // Close all other menus
    $('.bk-download-menu').not($menu).hide();

    // Toggle current menu
    $menu.toggle();
}

// Close dropdown when clicking outside
$(document).on('click', function(e) {
    if (!$(e.target).closest('.bk-download-wrapper').length) {
        $('.bk-download-menu').hide();
    }
});

// Play audio in backup modal
function playBkAudio(taskId, audioUrl) {
    if (!audioUrl) return;

    const btn = document.querySelector(`#bk-row-${taskId} .bk-play-btn`);
    const progressBar = document.getElementById(`bk-progress-${taskId}`);
    const timer = document.getElementById(`bk-timer-${taskId}`);

    // If clicking same audio that's playing, toggle pause/play
    if (bkCurrentTaskId === taskId && bkCurrentAudio) {
        if (bkCurrentAudio.paused) {
            bkCurrentAudio.play();
            btn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        } else {
            bkCurrentAudio.pause();
            btn.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
        return;
    }

    // Stop previous audio
    if (bkCurrentAudio) {
        bkCurrentAudio.pause();
        const prevBtn = document.querySelector(`#bk-row-${bkCurrentTaskId} .bk-play-btn`);
        if (prevBtn) prevBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
    }

    // Create new audio
    bkCurrentAudio = new Audio(audioUrl);
    bkCurrentTaskId = taskId;

    bkCurrentAudio.play();
    btn.innerHTML = '<i class="bi bi-pause-fill"></i>';

    // Update progress
    bkCurrentAudio.ontimeupdate = () => {
        if (bkCurrentAudio.duration) {
            const percent = (bkCurrentAudio.currentTime / bkCurrentAudio.duration) * 100;
            progressBar.style.width = percent + '%';
            timer.textContent = formatBkTime(bkCurrentAudio.currentTime) + ' / ' + formatBkTime(bkCurrentAudio.duration);
        }
    };

    // On end
    bkCurrentAudio.onended = () => {
        btn.innerHTML = '<i class="bi bi-play-fill"></i>';
        progressBar.style.width = '0%';
        bkCurrentTaskId = null;
    };
}

// Seek audio
function seekBkAudio(event, taskId) {
    if (bkCurrentTaskId !== taskId || !bkCurrentAudio) return;

    const track = event.currentTarget;
    const rect = track.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    bkCurrentAudio.currentTime = percent * bkCurrentAudio.duration;
}

// Format time helper
function formatBkTime(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Delete task from backup
function deleteBkTask(taskId, textPreview, status, creditCost) {
    if (!confirm(`Xóa task này?\n\n"${textPreview.substring(0, 100)}..."`)) return;

    // Call delete API
    window.electronAPI.apiRequest(
        'https://kingcongstudio.com/ajaxs/tts3.php',
        {
            action: status === 'done' || status === 'failed' ? 'delete_history' : 'cancel_task',
            task_id: taskId
        }
    ).then(response => {
        if (response.success || response.status === 'success') {
            // Remove row from UI
            const row = document.getElementById(`bk-row-${taskId}`);
            if (row) row.remove();
            proTool.showNotification('Đã xóa task', 'success');
        } else {
            proTool.showNotification(response.message || 'Lỗi xóa task', 'error');
        }
    }).catch(error => {
        proTool.showNotification('Lỗi: ' + error.message, 'error');
    });
}

// Update bulk action buttons
function updateBkBulkActions() {
    const checkboxes = document.querySelectorAll('.bk-item-checkbox:checked');
    const count = checkboxes.length;

    document.getElementById('bkSelectedCount').textContent = count;
    document.getElementById('bkSelectedCount2').textContent = count;
    document.getElementById('bkBulkDownload').disabled = count === 0;
    document.getElementById('bkBulkDelete').disabled = count === 0;
}

// Bulk download
async function bulkDownloadBackup() {
    const checkboxes = document.querySelectorAll('.bk-item-checkbox:checked');
    if (checkboxes.length === 0) {
        proTool.showNotification('Chưa chọn task nào!', 'warning');
        return;
    }

    proTool.showNotification(`Đang tải ${checkboxes.length} file...`, 'info');

    let successCount = 0;
    for (const cb of checkboxes) {
        const audioUrl = cb.dataset.audio;
        if (audioUrl) {
            try {
                const fileName = cb.value.substring(0, 8) + '.mp3';
                const result = await window.electronAPI.downloadFile({
                    url: audioUrl,
                    fileName: fileName,
                    subfolder: 'Backup'
                });
                if (result && result.success) successCount++;
            } catch (e) {
                console.error('Download error:', e);
            }
        }
    }

    proTool.showNotification(`Đã tải ${successCount}/${checkboxes.length} file`, 'success');
}

// Bulk delete
async function bulkDeleteBackup() {
    const checkboxes = document.querySelectorAll('.bk-item-checkbox:checked');
    if (checkboxes.length === 0) {
        proTool.showNotification('Chưa chọn task nào!', 'warning');
        return;
    }

    if (!confirm(`Xóa ${checkboxes.length} tasks đã chọn?`)) return;

    proTool.showNotification(`Đang xóa ${checkboxes.length} tasks...`, 'info');

    let successCount = 0;
    for (const cb of checkboxes) {
        try {
            const response = await window.electronAPI.apiRequest(
                'https://kingcongstudio.com/ajaxs/tts3.php',
                {
                    action: 'delete_history',
                    task_id: cb.value
                }
            );
            if (response.success || response.status === 'success') {
                successCount++;
                const row = document.getElementById(`bk-row-${cb.value}`);
                if (row) row.remove();
            }
        } catch (e) {
            console.error('Delete error:', e);
        }
    }

    proTool.showNotification(`Đã xóa ${successCount}/${checkboxes.length} tasks`, 'success');
    updateBkBulkActions();
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

// Check if current model is V3
function checkIsV3() {
    const modelId = document.getElementById('modelSelect')?.value || '';
    return modelId.toLowerCase().includes('v3');
}

function updateSlider(type) {
    switch (type) {
        case 'speed':
            document.getElementById('speedValue').textContent = parseFloat(document.getElementById('voiceSpeed').value).toFixed(2);
            break;
        case 'stability':
            const stabVal = parseInt(document.getElementById('voiceStability').value);
            const stabDisplay = document.getElementById('stabilityValue');
            // Check V3 directly from model select
            const currentIsV3 = isV3Model || checkIsV3();
            if (currentIsV3) {
                // V3 mode: Creative/Natural/Robust (white text)
                if (stabVal <= 25) {
                    stabDisplay.textContent = 'Creative';
                } else if (stabVal <= 75) {
                    stabDisplay.textContent = 'Natural';
                } else {
                    stabDisplay.textContent = 'Robust';
                }
            } else {
                stabDisplay.textContent = stabVal + '%';
            }
            stabDisplay.style.color = '#fff';
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

// Reset all settings - clear localStorage and reload
function resetAllSettings() {
    if (!confirm('Are you sure you want to reset ALL settings?\n\nThis will clear:\n- Voice Library\n- All voice settings\n- Provider & Model preferences\n- All saved configurations\n\nThe app will reload after reset.')) {
        return;
    }

    try {
        // Clear all localStorage
        localStorage.removeItem('proToolSettings');
        localStorage.removeItem('voiceLibrary');
        localStorage.removeItem('ttsSettings');
        localStorage.removeItem('lastVoiceId');
        localStorage.removeItem('lastProvider');
        localStorage.removeItem('lastModel');

        // Clear all localStorage items (in case there are more)
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Show success message
        proTool?.showNotification?.('All settings have been reset!', 'success');

        // Reload page after short delay
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error('Error resetting settings:', error);
        proTool?.showNotification?.('Failed to reset settings: ' + error.message, 'error');
    }
}
