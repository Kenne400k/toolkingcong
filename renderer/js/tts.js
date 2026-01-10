// renderer/js/tts.js - TTS Tool Full Implementation

class TTSManager {
    constructor() {
        // Session & API
        this.session = null;
        this.api = window.apiHandler;
        
        // Provider & Resources
        this.currentProvider = 'minimax';
        this.loadedVoices = { elevenlabs: [], minimax: [] };
        this.loadedModels = { elevenlabs: [], minimax: [] };
        
        // Voice Selection
        this.selectedVoice = null;
        this.selectedModel = null;
        
        // Audio
        this.currentAudio = null;
        this.previewAudio = null;
        
        // Polling
        this.pollingIntervals = {};
        this.processingTasks = [];
        
        // History
        this.historyData = [];
        
        // Current voice tab
        this.currentVoiceTab = 'library';
        
        // Settings defaults
        this.settings = {
            minimax: {
                model: 'speech-2.6-hd',
                speed: 1.0,
                pitch: 0,
                vol: 1.0,
                language: 'Auto',
                withTranscript: false
            },
            elevenlabs: {
                model: 'eleven_multilingual_v2',
                speed: 1.0,
                stability: 0.5,
                similarity: 0.75,
                style: 0,
                useBoost: true,
                withTranscript: false
            }
        };
    }

    // =================== INITIALIZATION ===================
    async init() {
        console.log('🚀 TTS Manager initializing...');
        
        try {
            // Init API handler
            await this.api.init();
            
            // Load session
            this.session = window.__SESSION__ || await window.electronAPI.getSession();
            
            if (!this.session) {
                console.error('❌ No session found');
                return;
            }
            
            // Update UI with session info
            this.updateSessionUI();
            
            // Load resources (voices, models)
            await this.loadResources();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup sliders
            this.setupSliders();
            
            // Load history
            await this.loadHistory();
            
            console.log('✅ TTS Manager initialized');
            
        } catch (error) {
            console.error('❌ TTS Init error:', error);
            this.showNotification('Không thể khởi tạo TTS: ' + error.message, 'error');
        }
    }

    updateSessionUI() {
        const { display_name, username, email, credits3, avatar_url } = this.session;
        
        // Header
        const headerCredits = document.getElementById('header-credits');
        if (headerCredits) headerCredits.textContent = (credits3 || 0).toLocaleString();
        
        const headerEmail = document.getElementById('header-email');
        if (headerEmail) headerEmail.textContent = email || username || '';
        
        // User Credits in footer
        const userCredits = document.getElementById('userCredits');
        if (userCredits) userCredits.textContent = (credits3 || 0).toLocaleString();
        
        // Sidebar
        const nameEl = document.getElementById('user-name');
        if (nameEl) nameEl.textContent = display_name || username || 'User';
        
        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) {
            if (avatar_url) {
                avatarEl.innerHTML = `<img src="${avatar_url}" class="w-full h-full object-cover rounded-full" alt="Avatar">`;
            } else {
                avatarEl.innerHTML = `<span class="text-sm font-bold text-white">${(display_name || username || 'U').charAt(0).toUpperCase()}</span>`;
            }
        }
    }

    // =================== LOAD RESOURCES ===================
    async loadResources() {
        try {
            this.showLoading(true);
            
            const response = await this.api.getResources();
            
            if (response.status === 'success' && response.data) {
                // ElevenLabs
                if (response.data.elevenlabs) {
                    this.loadedVoices.elevenlabs = this.enhanceVoiceData(response.data.elevenlabs.voices || [], 'elevenlabs');
                    this.loadedModels.elevenlabs = response.data.elevenlabs.models || [];
                }
                
                // Minimax
                if (response.data.minimax) {
                    this.loadedVoices.minimax = this.enhanceVoiceData(response.data.minimax.voices || [], 'minimax');
                    this.loadedModels.minimax = response.data.minimax.models || [];
                }
                
                console.log(`✅ Loaded: ${this.loadedVoices.elevenlabs.length} ElevenLabs, ${this.loadedVoices.minimax.length} Minimax voices`);
                
                // Render models
                this.renderMinimaxModels();
                this.renderElevenLabsModels();
            }
            
        } catch (error) {
            console.error('❌ Load resources error:', error);
            this.showNotification('Không thể tải danh sách giọng nói', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    enhanceVoiceData(voices, provider) {
        if (!voices || !Array.isArray(voices)) return [];
        
        return voices.map(v => {
            let gender = 'Male';
            const nameLower = (v.name || '').toLowerCase();
            
            if (nameLower.includes('girl') || nameLower.includes('woman') || 
                nameLower.includes('female') || (v.gender && v.gender.toLowerCase() === 'female')) {
                gender = 'Female';
            }
            
            return {
                id: v.id,
                name: v.name,
                avatar: v.avatar || v.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.name)}&background=random&size=128&color=fff&bold=true`,
                tags: v.tags || [],
                gender: v.gender || gender,
                age: v.age || 'middle_aged',
                language: v.language || 'en',
                description: v.description || '',
                preview_url: v.preview_url || v.sample_url,
                source: v.source || 'system',
                server_type: v.server_type || 'ai33',
                provider: provider
            };
        });
    }

    // =================== EVENT LISTENERS ===================
    setupEventListeners() {
        // Text input - char count
        const txtInput = document.getElementById('txtInput');
        if (txtInput) {
            txtInput.addEventListener('input', () => {
                this.updateCharCount();
                const emptyState = document.getElementById('emptyState');
                if (txtInput.value.trim()) {
                    emptyState?.classList.add('hidden');
                } else {
                    emptyState?.classList.remove('hidden');
                }
            });
        }
        
        // File input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href !== '#') {
                    // Let the default behavior handle navigation
                    return;
                }
                e.preventDefault();
                const page = link.dataset.page;
                if (page === 'dashboard') {
                    window.electronAPI.loadDashboard();
                }
            });
        });
        
        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
                await window.electronAPI.logout();
            }
        });
        
        // Close modal on click outside
        document.getElementById('voiceModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('voice-modal')) {
                this.closeVoiceModal();
            }
        });
        
        // Voice search
        document.getElementById('voiceSearch')?.addEventListener('input', (e) => {
            this.filterVoices();
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.provider-dropdown-wrapper')) {
                document.getElementById('providerDropdown')?.classList.remove('show');
            }
            if (!e.target.closest('.lang-selector-wrapper')) {
                document.getElementById('langDropdown')?.classList.remove('show');
            }
            if (!e.target.closest('#minimaxModelBtn') && !e.target.closest('#minimaxModelDropdown')) {
                document.getElementById('minimaxModelDropdown')?.classList.remove('show');
            }
        });
        
        // Drag and drop for file upload
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleDroppedFile(files[0]);
                }
            });
        }
    }

    setupSliders() {
        // Minimax sliders
        this.setupSlider('speed', 'speedVal', (v) => parseFloat(v).toFixed(2), (v) => {
            this.settings.minimax.speed = parseFloat(v);
        });
        this.setupSlider('pitch', 'pitchVal', (v) => v, (v) => {
            this.settings.minimax.pitch = parseInt(v);
        });
        this.setupSlider('vol', 'volVal', (v) => parseFloat(v).toFixed(2), (v) => {
            this.settings.minimax.vol = parseFloat(v);
        });
        
        // ElevenLabs sliders
        this.setupSlider('elevenSpeed', 'elevenSpeedVal', (v) => parseFloat(v).toFixed(2), (v) => {
            this.settings.elevenlabs.speed = parseFloat(v);
        });
        this.setupSlider('stability', 'stabilityVal', (v) => v + '%', (v) => {
            this.settings.elevenlabs.stability = parseInt(v) / 100;
        });
        this.setupSlider('similarity', 'similarityVal', (v) => v + '%', (v) => {
            this.settings.elevenlabs.similarity = parseInt(v) / 100;
        });
        this.setupSlider('style', 'styleVal', (v) => v + '%', (v) => {
            this.settings.elevenlabs.style = parseInt(v) / 100;
        });
        
        // Boost checkbox
        const boostCheck = document.getElementById('boostCheck');
        if (boostCheck) {
            boostCheck.addEventListener('change', () => {
                this.settings.elevenlabs.useBoost = boostCheck.checked;
            });
        }
        
        // Subtitle checkbox
        const subtitleCheck = document.getElementById('subtitleCheck');
        if (subtitleCheck) {
            subtitleCheck.addEventListener('change', () => {
                this.settings[this.currentProvider].withTranscript = subtitleCheck.checked;
                this.updateEstimatedCost();
            });
        }
    }

    setupSlider(sliderId, displayId, formatFn, onChangeFn) {
        const slider = document.getElementById(sliderId);
        const display = document.getElementById(displayId);
        
        if (slider && display) {
            const updateSlider = () => {
                display.textContent = formatFn(slider.value);
                // Update CSS variable for fill
                const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
                slider.style.setProperty('--value', percent + '%');
                if (onChangeFn) onChangeFn(slider.value);
            };
            
            slider.addEventListener('input', updateSlider);
            updateSlider(); // Initial update
        }
    }

    // =================== CHAR COUNT & COST ===================
    updateCharCount() {
        const text = document.getElementById('txtInput')?.value || '';
        const charCount = text.length;
        
        document.getElementById('charCount').textContent = charCount.toLocaleString();
        
        this.updateEstimatedCost();
    }

    updateEstimatedCost() {
        const text = document.getElementById('txtInput')?.value || '';
        const charCount = text.length;
        
        // Base cost
        const costFactor = this.getModelCostFactor();
        let estimatedCost = Math.ceil(charCount * 1.12 * costFactor);
        
        // Add subtitle cost (+15%)
        const subtitleCheck = document.getElementById('subtitleCheck');
        if (subtitleCheck?.checked) {
            estimatedCost = Math.ceil(estimatedCost * 1.15);
        }
        
        document.getElementById('estimatedCost').textContent = estimatedCost.toLocaleString();
    }

    getModelCostFactor() {
        const models = this.loadedModels[this.currentProvider] || [];
        const currentModel = this.settings[this.currentProvider].model;
        const model = models.find(m => m.id === currentModel);
        return model?.cost_factor || 1.0;
    }

    // =================== FILE UPLOAD ===================
    openFileUpload() {
        document.getElementById('fileInput')?.click();
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.handleDroppedFile(file);
        event.target.value = '';
    }

    handleDroppedFile(file) {
        const validExtensions = ['.txt', '.srt'];
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(extension)) {
            this.showNotification('Chỉ hỗ trợ file .txt và .srt', 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            document.getElementById('txtInput').value = content;
            this.updateCharCount();
            document.getElementById('emptyState')?.classList.add('hidden');
            
            // Show file name
            const fileDisplay = document.getElementById('fileNameDisplay');
            if (fileDisplay) {
                fileDisplay.textContent = file.name;
                fileDisplay.style.display = 'block';
            }
            
            // Check if SRT file
            if (extension === '.srt') {
                document.getElementById('subtitleCheck').checked = true;
                this.settings[this.currentProvider].withTranscript = true;
                this.updateEstimatedCost();
            }
        };
        reader.readAsText(file);
    }

    clearTextInput() {
        const txtInput = document.getElementById('txtInput');
        if (txtInput && txtInput.value.trim()) {
            if (confirm('Bạn có chắc muốn xóa toàn bộ văn bản?')) {
                txtInput.value = '';
                this.updateCharCount();
                document.getElementById('emptyState')?.classList.remove('hidden');
                document.getElementById('fileNameDisplay').style.display = 'none';
            }
        }
    }

    // =================== PROVIDER DROPDOWN ===================
    toggleProviderDropdown() {
        const dropdown = document.getElementById('providerDropdown');
        dropdown?.classList.toggle('show');
    }

    selectProvider(provider) {
        this.currentProvider = provider;
        
        // Update dropdown button
        const logoImg = document.getElementById('currentProviderLogo');
        const nameSpan = document.getElementById('currentProviderName');
        
        if (provider === 'elevenlabs') {
            logoImg.src = 'https://help.elevenlabs.io/hc/theming_assets/01HZQ08B6SDY5X53YN9ABG4B99';
            nameSpan.textContent = 'ElevenLabs';
        } else {
            logoImg.src = 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/minimax-color.png';
            nameSpan.textContent = 'Minimax';
        }
        
        // Update active state in dropdown
        document.querySelectorAll('.provider-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.provider === provider);
        });
        
        // Close dropdown
        document.getElementById('providerDropdown')?.classList.remove('show');
        
        // Show/hide provider-specific settings
        document.getElementById('minimax-settings')?.classList.toggle('hidden', provider !== 'minimax');
        document.getElementById('elevenlabs-settings')?.classList.toggle('hidden', provider !== 'elevenlabs');
        
        // Clear voice selection
        this.selectedVoice = null;
        document.getElementById('selectedVoiceName').textContent = 'Chọn giọng nói...';
        
        // Update cost
        this.updateEstimatedCost();
        
        console.log('🔄 Switched to provider:', provider);
    }

    // =================== LANGUAGE DROPDOWN ===================
    toggleLangDropdown() {
        const dropdown = document.getElementById('langDropdown');
        dropdown?.classList.toggle('show');
    }

    selectLanguage(langCode, langName) {
        this.settings.minimax.language = langCode;
        document.getElementById('selectedLang').textContent = langName;
        
        // Update active state
        document.querySelectorAll('.lang-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.lang === langCode);
        });
        
        // Close dropdown
        document.getElementById('langDropdown')?.classList.remove('show');
    }

    // =================== MODEL SELECTION ===================
    toggleMinimaxModelDropdown() {
        const dropdown = document.getElementById('minimaxModelDropdown');
        dropdown?.classList.toggle('show');
    }

    renderMinimaxModels() {
        const container = document.getElementById('minimaxModelDropdown');
        const models = this.loadedModels.minimax || [];
        
        if (!container || models.length === 0) return;
        
        container.innerHTML = models.map(m => `
            <div class="provider-option ${m.id === this.settings.minimax.model ? 'active' : ''}" 
                 onclick="ttsManager.selectMinimaxModel('${m.id}', '${m.name}')">
                <div class="provider-info">
                    <div class="provider-name">${m.name}</div>
                    <div class="provider-desc">${m.description || ''}</div>
                </div>
                <i class="bi bi-check-lg check-icon"></i>
            </div>
        `).join('');
    }

    selectMinimaxModel(modelId, modelName) {
        this.settings.minimax.model = modelId;
        document.getElementById('selectedMinimaxModel').textContent = modelName;
        
        // Update active state
        document.querySelectorAll('#minimaxModelDropdown .provider-option').forEach(opt => {
            opt.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        
        // Close dropdown
        document.getElementById('minimaxModelDropdown')?.classList.remove('show');
        
        // Update cost
        this.updateEstimatedCost();
    }

    renderElevenLabsModels() {
        const container = document.getElementById('mdContent');
        const models = this.loadedModels.elevenlabs || [];
        
        if (!container || models.length === 0) return;
        
        container.innerHTML = models.map(m => `
            <div class="model-option ${m.id === this.settings.elevenlabs.model ? 'selected' : ''}" 
                 onclick="ttsManager.selectElevenLabsModel('${m.id}', '${m.name}')">
                <div class="mo-header">
                    <div>
                        <div class="mo-name">${m.name}</div>
                    </div>
                </div>
                <div class="mo-desc">${m.description || ''}</div>
            </div>
        `).join('');
        
        // Update selected model name in button
        const currentModel = models.find(m => m.id === this.settings.elevenlabs.model);
        if (currentModel) {
            document.getElementById('selectedModelName').textContent = currentModel.name;
        }
    }

    selectElevenLabsModel(modelId, modelName) {
        this.settings.elevenlabs.model = modelId;
        document.getElementById('selectedModelName').textContent = modelName;
        
        // Update active state
        document.querySelectorAll('.model-option').forEach(opt => {
            opt.classList.toggle('selected', opt.querySelector('.mo-name')?.textContent === modelName);
        });
        
        // Close sidebar
        this.hideModelDetails();
        
        // Update cost
        this.updateEstimatedCost();
    }

    showModelDetails() {
        document.getElementById('modelSidebar')?.classList.add('active');
    }

    hideModelDetails() {
        document.getElementById('modelSidebar')?.classList.remove('active');
    }

    // =================== VOICE MODAL ===================
    openVoiceModal() {
        const modal = document.getElementById('voiceModal');
        if (modal) {
            modal.classList.add('show');
            this.renderVoices();
        }
    }

    closeVoiceModal() {
        document.getElementById('voiceModal')?.classList.remove('show');
    }

    switchVoiceTab(tabName) {
        this.currentVoiceTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.vm-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Re-render voices
        this.renderVoices();
    }

    renderVoices() {
        const container = document.getElementById('voiceGrid');
        if (!container) return;
        
        let voices = this.loadedVoices[this.currentProvider] || [];
        
        // Apply filters
        const searchQuery = document.getElementById('voiceSearch')?.value?.toLowerCase() || '';
        const langFilter = document.getElementById('filterLang')?.value || '';
        const genderFilter = document.getElementById('filterGender')?.value || '';
        const ageFilter = document.getElementById('filterAge')?.value || '';
        
        voices = voices.filter(v => {
            // Search filter
            if (searchQuery) {
                const matchName = v.name.toLowerCase().includes(searchQuery);
                const matchTags = v.tags?.some(t => t.toLowerCase().includes(searchQuery));
                if (!matchName && !matchTags) return false;
            }
            
            // Language filter
            if (langFilter && v.language !== langFilter) return false;
            
            // Gender filter
            if (genderFilter && v.gender?.toLowerCase() !== genderFilter) return false;
            
            // Age filter
            if (ageFilter && v.age !== ageFilter) return false;
            
            return true;
        });
        
        if (voices.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px;">
                    <i class="bi bi-search" style="font-size: 48px; color: #444; display: block; margin-bottom: 16px;"></i>
                    <p style="color:#888; font-size:14px;">Không tìm thấy giọng nói</p>
                    <button onclick="ttsManager.resetFilters()" style="margin-top: 16px; padding: 8px 16px; background: #1a1a1a; border: 1px solid #333; color: #fff; border-radius: 6px; cursor: pointer;">
                        Xóa bộ lọc
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = voices.map(voice => `
            <div class="voice-card ${this.selectedVoice?.id === voice.id ? 'selected' : ''}" 
                 data-voice-id="${voice.id}">
                <div class="vc-top">
                    <img class="vc-avatar" src="${voice.avatar}" alt="${voice.name}" 
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(voice.name)}&background=random&size=128'">
                    <div class="vc-info">
                        <div class="vc-name">${voice.name}</div>
                        <div class="vc-tags">
                            ${voice.tags?.slice(0, 3).map(t => `<span class="vc-tag">${t}</span>`).join('') || ''}
                        </div>
                    </div>
                </div>
                ${voice.description ? `<div class="vc-desc">${voice.description}</div>` : ''}
                <div class="vc-footer">
                    <div class="vc-actions">
                        ${voice.preview_url ? `
                            <i class="bi bi-play-circle" onclick="event.stopPropagation(); ttsManager.previewVoice('${voice.preview_url}')" title="Nghe thử"></i>
                        ` : ''}
                    </div>
                    <button class="vc-use-btn" onclick="ttsManager.selectVoice('${voice.id}')">Dùng</button>
                </div>
            </div>
        `).join('');
    }

    filterVoices() {
        this.renderVoices();
    }

    resetFilters() {
        document.getElementById('voiceSearch').value = '';
        document.getElementById('filterLang').value = '';
        document.getElementById('filterGender').value = '';
        document.getElementById('filterAge').value = '';
        this.renderVoices();
    }

    selectVoice(voiceId) {
        const voices = this.loadedVoices[this.currentProvider] || [];
        const voice = voices.find(v => v.id == voiceId);
        
        if (!voice) return;
        
        this.selectedVoice = voice;
        
        // Update UI
        document.getElementById('selectedVoiceName').textContent = voice.name;
        document.getElementById('voiceIdVal').value = voice.id;
        
        // Update modal selection
        document.querySelectorAll('.voice-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.voiceId == voiceId);
        });
        
        // Close modal
        this.closeVoiceModal();
        
        console.log('✅ Selected voice:', voice.name);
    }

    previewVoice(url) {
        if (!url) return;
        
        if (this.previewAudio) {
            this.previewAudio.pause();
        }
        
        this.previewAudio = new Audio(url);
        this.previewAudio.play().catch(err => {
            console.error('Preview error:', err);
        });
    }

    // =================== RESET SETTINGS ===================
    resetCurrentSettings() {
        if (this.currentProvider === 'minimax') {
            this.settings.minimax = {
                model: 'speech-2.6-hd',
                speed: 1.0,
                pitch: 0,
                vol: 1.0,
                language: 'Auto',
                withTranscript: false
            };
            
            // Reset sliders
            document.getElementById('speed').value = 1.0;
            document.getElementById('pitch').value = 0;
            document.getElementById('vol').value = 1.0;
            document.getElementById('speedVal').textContent = '1.00';
            document.getElementById('pitchVal').textContent = '0';
            document.getElementById('volVal').textContent = '1.00';
            document.getElementById('selectedLang').textContent = 'Tự xác định';
            
        } else {
            this.settings.elevenlabs = {
                model: 'eleven_multilingual_v2',
                speed: 1.0,
                stability: 0.5,
                similarity: 0.75,
                style: 0,
                useBoost: true,
                withTranscript: false
            };
            
            // Reset sliders
            document.getElementById('elevenSpeed').value = 1.0;
            document.getElementById('stability').value = 50;
            document.getElementById('similarity').value = 75;
            document.getElementById('style').value = 0;
            document.getElementById('elevenSpeedVal').textContent = '1.00';
            document.getElementById('stabilityVal').textContent = '50%';
            document.getElementById('similarityVal').textContent = '75%';
            document.getElementById('styleVal').textContent = '0%';
            document.getElementById('boostCheck').checked = true;
        }
        
        // Reset subtitle
        document.getElementById('subtitleCheck').checked = false;
        this.settings[this.currentProvider].withTranscript = false;
        
        // Update cost
        this.updateEstimatedCost();
        
        this.showNotification('Đã đặt lại cài đặt', 'success');
    }

    // =================== TTS GENERATION ===================
    async startTTS() {
        const text = document.getElementById('txtInput')?.value.trim();
        
        // Validation
        if (!text) {
            this.showNotification('Vui lòng nhập văn bản!', 'warning');
            document.getElementById('txtInput')?.focus();
            return;
        }
        
        if (!this.selectedVoice) {
            this.showNotification('Vui lòng chọn giọng đọc!', 'warning');
            this.openVoiceModal();
            return;
        }
        
        // Check credits
        const estimatedCost = parseInt(document.getElementById('estimatedCost').textContent.replace(/,/g, ''));
        if (estimatedCost > (this.session.credits3 || 0)) {
            this.showNotification('Không đủ credits!', 'error');
            return;
        }
        
        // Build params
        const params = {
            provider: this.currentProvider,
            text: text,
            voice_id: this.selectedVoice.id,
            voice_name: this.selectedVoice.name,
            model_id: this.settings[this.currentProvider].model,
            with_transcript: this.settings[this.currentProvider].withTranscript
        };
        
        // Add provider-specific settings
        if (this.currentProvider === 'minimax') {
            params.speed = this.settings.minimax.speed;
            params.pitch = this.settings.minimax.pitch;
            params.vol = this.settings.minimax.vol;
            params.language_boost = this.settings.minimax.language;
        } else {
            params.speed = this.settings.elevenlabs.speed;
            params.stability = this.settings.elevenlabs.stability;
            params.similarity = this.settings.elevenlabs.similarity;
            params.style = this.settings.elevenlabs.style;
            params.use_boost = this.settings.elevenlabs.useBoost;
        }
        
        console.log('🎙️ Starting TTS:', params);
        
        // UI Loading
        const btn = document.getElementById('btnProcess');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';
        
        try {
            const response = await this.api.createSpeech(params);
            
            if (response.status === 'success' && response.task_id) {
                // Update credits
                this.session.credits3 = response.new_balance;
                document.getElementById('header-credits').textContent = response.new_balance.toLocaleString();
                document.getElementById('userCredits').textContent = response.new_balance.toLocaleString();
                
                // Add to history
                this.addPendingTask({
                    task_id: response.task_id,
                    text_preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    credit_cost: response.credit_cost,
                    provider: this.currentProvider,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
                
                // Start polling
                this.startPolling(response.task_id);
                
                // Switch to history tab
                this.switchTab('history');
                
                this.showNotification('Đang xử lý yêu cầu...', 'success');
                
            } else {
                throw new Error(response.message || 'Tạo TTS thất bại');
            }
            
        } catch (error) {
            console.error('❌ TTS Error:', error);
            this.showNotification('Lỗi: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    // =================== POLLING ===================
    startPolling(taskId) {
        if (this.pollingIntervals[taskId]) return;
        
        console.log('🔄 Start polling:', taskId);
        
        this.pollingIntervals[taskId] = setInterval(async () => {
            try {
                const response = await this.api.checkStatus(taskId);
                
                if (response.status === 'success') {
                    const taskStatus = response.task_status;
                    
                    // Update UI
                    this.updateTaskUI(taskId, response);
                    
                    if (taskStatus === 'done') {
                        this.stopPolling(taskId);
                        this.showNotification('Hoàn thành!', 'success');
                        
                    } else if (taskStatus === 'failed') {
                        this.stopPolling(taskId);
                        this.showNotification('Tác vụ thất bại: ' + (response.error_message || ''), 'error');
                    }
                }
                
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);
    }

    stopPolling(taskId) {
        if (this.pollingIntervals[taskId]) {
            clearInterval(this.pollingIntervals[taskId]);
            delete this.pollingIntervals[taskId];
            console.log('⏹️ Stop polling:', taskId);
        }
    }

    // =================== HISTORY ===================
    async loadHistory() {
        try {
            const response = await this.api.getHistory(1, 20);
            
            if (response.status === 'success') {
                this.historyData = response.data || [];
                this.renderHistory();
                
                // Start polling for pending tasks
                this.historyData.forEach(task => {
                    if (['pending', 'processing', 'queued'].includes(task.status)) {
                        this.startPolling(task.task_id);
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Load history error:', error);
        }
    }

    addPendingTask(task) {
        this.historyData.unshift(task);
        this.renderHistory();
    }

    updateTaskUI(taskId, data) {
        const card = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!card) return;
        
        const status = data.task_status;
        
        // Update status badge
        const badge = card.querySelector('.hc-status');
        if (badge) {
            badge.className = 'hc-status status-' + status;
            badge.textContent = this.getStatusText(status);
        }
        
        // Update class for processing animation
        card.classList.toggle('processing', ['pending', 'processing', 'queued'].includes(status));
        
        // Update progress
        if (data.progress !== undefined) {
            const progressFill = card.querySelector('.hc-progress-fill');
            if (progressFill) {
                progressFill.style.width = data.progress + '%';
            }
        }
        
        // If done, show player
        if (status === 'done' && data.audio_url) {
            const content = card.querySelector('.task-content');
            if (content) {
                content.innerHTML = this.renderPlayerHTML(taskId, data.audio_url);
            }
            
            // Update history data
            const task = this.historyData.find(t => t.task_id === taskId);
            if (task) {
                task.status = 'done';
                task.audio_url = data.audio_url;
                task.srt_url = data.srt_url;
            }
        }
    }

    renderHistory() {
        const container = document.getElementById('historyListContainer');
        if (!container) return;
        
        if (this.historyData.length === 0) {
            container.innerHTML = `
                <div class="empty-history">
                    <i class="bi bi-inbox"></i>
                    <p>Chưa có lịch sử</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.historyData.map(task => `
            <div class="history-card ${['pending', 'processing', 'queued'].includes(task.status) ? 'processing' : ''}" data-task-id="${task.task_id}">
                <div class="hc-header">
                    <span class="hc-time">
                        <i class="bi bi-clock"></i>
                        ${this.formatTime(task.created_at)}
                    </span>
                    <span class="hc-status status-${task.status}">${this.getStatusText(task.status)}</span>
                </div>
                <p class="hc-content">${this.escapeHtml(task.text_preview || task.text_input?.substring(0, 100) || '')}</p>
                <div class="task-content">
                    ${task.status === 'done' && task.audio_url 
                        ? this.renderPlayerHTML(task.task_id, task.audio_url)
                        : task.status === 'failed'
                            ? `<div style="color: #ef4444; font-size: 13px;"><i class="bi bi-exclamation-circle"></i> ${task.error_message || 'Thất bại'}</div>`
                            : `
                                <div class="hc-progress-track">
                                    <div class="hc-progress-fill" style="width: ${task.progress || 0}%"></div>
                                </div>
                            `
                    }
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #222;">
                    <span class="hc-cost"><i class="bi bi-coin"></i> ${task.credit_cost || 0}</span>
                    <button onclick="ttsManager.deleteTask('${task.task_id}')" style="background: transparent; border: none; color: #666; cursor: pointer; padding: 6px;" title="Xóa">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderPlayerHTML(taskId, audioUrl) {
        return `
            <div class="hc-player" id="player-${taskId}">
                <button class="hc-play-btn" onclick="ttsManager.playAudio('${taskId}', '${audioUrl}')">
                    <i class="bi bi-play-fill"></i>
                </button>
                <div class="hc-progress-container">
                    <div class="hc-progress" onclick="ttsManager.seekAudio(event, '${taskId}')">
                        <div class="hc-progress-bar" id="progress-${taskId}"></div>
                    </div>
                    <div class="hc-time-display">
                        <span id="currentTime-${taskId}">0:00</span>
                        <span id="duration-${taskId}">0:00</span>
                    </div>
                </div>
                <div class="hc-actions">
                    <a href="${audioUrl}" download class="hc-action-btn" title="Tải xuống">
                        <i class="bi bi-download"></i>
                    </a>
                </div>
            </div>
        `;
    }

    // =================== AUDIO PLAYBACK ===================
    playAudio(taskId, url) {
        const playBtn = document.querySelector(`#player-${taskId} .hc-play-btn`);
        
        // If same audio is playing, toggle pause/play
        if (this.currentAudio && this.currentAudio.dataset.taskId === taskId) {
            if (this.currentAudio.paused) {
                this.currentAudio.play();
                playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
            } else {
                this.currentAudio.pause();
                playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
            }
            return;
        }
        
        // Stop previous audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            const prevBtn = document.querySelector(`#player-${this.currentAudio.dataset.taskId} .hc-play-btn`);
            if (prevBtn) prevBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
        
        // Create new audio
        this.currentAudio = new Audio(url);
        this.currentAudio.dataset.taskId = taskId;
        
        this.currentAudio.onloadedmetadata = () => {
            document.getElementById(`duration-${taskId}`).textContent = this.formatDuration(this.currentAudio.duration);
        };
        
        this.currentAudio.onplay = () => {
            playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        };
        
        this.currentAudio.onpause = () => {
            playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        };
        
        this.currentAudio.onended = () => {
            playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
            document.getElementById(`progress-${taskId}`).style.width = '0%';
            document.getElementById(`currentTime-${taskId}`).textContent = '0:00';
        };
        
        this.currentAudio.ontimeupdate = () => {
            const progress = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
            document.getElementById(`progress-${taskId}`).style.width = progress + '%';
            document.getElementById(`currentTime-${taskId}`).textContent = this.formatDuration(this.currentAudio.currentTime);
        };
        
        this.currentAudio.play().catch(err => console.error('Play error:', err));
    }

    seekAudio(event, taskId) {
        if (!this.currentAudio || this.currentAudio.dataset.taskId !== taskId) return;
        
        const track = event.currentTarget;
        const rect = track.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.currentAudio.currentTime = percent * this.currentAudio.duration;
    }

    // =================== DELETE TASK ===================
    async deleteTask(taskId) {
        if (!confirm('Bạn có chắc muốn xóa task này?')) return;
        
        try {
            await this.api.deleteTask(taskId);
            
            // Remove from array
            this.historyData = this.historyData.filter(t => t.task_id !== taskId);
            
            // Remove from UI
            document.querySelector(`[data-task-id="${taskId}"]`)?.remove();
            
            // Stop polling
            this.stopPolling(taskId);
            
            // Check if list is empty
            if (this.historyData.length === 0) {
                this.renderHistory();
            }
            
            this.showNotification('Đã xóa', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Không thể xóa: ' + error.message, 'error');
        }
    }

    // =================== TAB SWITCHING ===================
    switchTab(tabName) {
        // Update tab buttons
        document.getElementById('btnSettings')?.classList.toggle('active', tabName === 'settings');
        document.getElementById('btnHistory')?.classList.toggle('active', tabName === 'history');
        
        // Show/hide content
        document.getElementById('viewSettings')?.classList.toggle('show', tabName === 'settings');
        document.getElementById('viewHistory')?.classList.toggle('show', tabName === 'history');
        
        // Show/hide provider selector
        document.getElementById('providerWrapper').style.display = tabName === 'settings' ? 'block' : 'none';
    }

    // =================== UTILITIES ===================
    showLoading(show) {
        document.getElementById('loadingOverlay')?.classList.toggle('show', show);
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        // Add animation keyframes
        if (!document.getElementById('notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(100px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getStatusText(status) {
        const texts = {
            'pending': 'Đang chờ',
            'processing': 'Đang xử lý',
            'queued': 'Hàng đợi',
            'done': 'Hoàn thành',
            'failed': 'Thất bại'
        };
        return texts[status] || status;
    }

    formatTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + 
               date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }

    formatDuration(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// =================== GLOBAL INSTANCE ===================
const ttsManager = new TTSManager();

// =================== GLOBAL FUNCTIONS (for onclick handlers) ===================
function openVoiceModal() { ttsManager.openVoiceModal(); }
function closeVoiceModal() { ttsManager.closeVoiceModal(); }
function openFileUpload() { ttsManager.openFileUpload(); }
function startTTS() { ttsManager.startTTS(); }
function switchTab(tab) { ttsManager.switchTab(tab); }
function switchProvider(provider) { ttsManager.switchProvider(provider); }
function selectProvider(provider) { ttsManager.selectProvider(provider); }
function toggleProviderDropdown() { ttsManager.toggleProviderDropdown(); }
function toggleLangDropdown() { ttsManager.toggleLangDropdown(); }
function selectLanguage(code, name) { ttsManager.selectLanguage(code, name); }
function toggleMinimaxModelDropdown() { ttsManager.toggleMinimaxModelDropdown(); }
function showModelDetails() { ttsManager.showModelDetails(); }
function hideModelDetails() { ttsManager.hideModelDetails(); }
function filterVoices() { ttsManager.filterVoices(); }
function resetFilters() { ttsManager.resetFilters(); }
function switchVoiceTab(tab) { ttsManager.switchVoiceTab(tab); }
function clearTextInput() { ttsManager.clearTextInput(); }
function resetCurrentSettings() { ttsManager.resetCurrentSettings(); }
function updateEstimatedCost() { ttsManager.updateEstimatedCost(); }

// =================== INIT ===================
function initTTS() {
    ttsManager.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTTS);
} else {
    initTTS();
}
