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
                useBoost: false,
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
        document.getElementById('header-credits').textContent = (credits3 || 0).toLocaleString();
        document.getElementById('header-email').textContent = email || username || '';
        
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
                this.renderModels();
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
            txtInput.addEventListener('input', () => this.updateCharCount());
            txtInput.addEventListener('focus', () => {
                document.getElementById('emptyState')?.classList.add('hidden');
            });
            txtInput.addEventListener('blur', () => {
                if (!txtInput.value.trim()) {
                    document.getElementById('emptyState')?.classList.remove('hidden');
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
            if (e.target.id === 'voiceModal') {
                this.closeVoiceModal();
            }
        });
        
        // Voice search
        document.getElementById('voiceSearch')?.addEventListener('input', (e) => {
            this.filterVoices(e.target.value);
        });
    }

    // =================== CHAR COUNT & COST ===================
    updateCharCount() {
        const text = document.getElementById('txtInput')?.value || '';
        const charCount = text.length;
        
        document.getElementById('charCount').textContent = `${charCount.toLocaleString()} ký tự`;
        
        // Estimate cost
        const costFactor = this.getModelCostFactor();
        const estimatedCost = Math.ceil(charCount * 1.12 * costFactor);
        document.getElementById('estimatedCost').textContent = `~${estimatedCost.toLocaleString()} credits`;
        
        // Estimate duration (~150 chars per second)
        const duration = Math.ceil(charCount / 15);
        document.getElementById('estimatedDuration').textContent = `~${duration}s`;
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
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            document.getElementById('txtInput').value = content;
            this.updateCharCount();
            document.getElementById('emptyState')?.classList.add('hidden');
            
            // Check if SRT file
            if (file.name.endsWith('.srt')) {
                this.settings[this.currentProvider].withTranscript = true;
                document.getElementById('srtCheckbox').checked = true;
            }
        };
        reader.readAsText(file);
        
        // Reset input
        event.target.value = '';
    }

    // =================== PROVIDER & MODEL ===================
    switchProvider(provider) {
        this.currentProvider = provider;
        
        // Update UI
        document.querySelectorAll('.provider-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.provider === provider);
        });
        
        // Update provider badge
        const badge = document.getElementById('providerBadge');
        if (badge) {
            badge.querySelector('span').textContent = provider === 'elevenlabs' ? 'ElevenLabs' : 'Minimax';
        }
        
        // Show/hide provider-specific settings
        document.getElementById('minimaxSettings')?.classList.toggle('hidden', provider !== 'minimax');
        document.getElementById('elevenlabsSettings')?.classList.toggle('hidden', provider !== 'elevenlabs');
        
        // Clear voice selection
        this.selectedVoice = null;
        document.getElementById('selectedVoiceName').textContent = 'Chọn giọng đọc...';
        document.getElementById('selectedVoiceAvatar').src = '';
        document.getElementById('selectedVoiceAvatar').classList.add('hidden');
        
        // Render models
        this.renderModels();
        
        // Update cost
        this.updateCharCount();
        
        console.log('🔄 Switched to provider:', provider);
    }

    renderModels() {
        const models = this.loadedModels[this.currentProvider] || [];
        const select = document.getElementById('modelSelect');
        
        if (!select) return;
        
        select.innerHTML = models.map(m => `
            <option value="${m.id}" ${m.id === this.settings[this.currentProvider].model ? 'selected' : ''}>
                ${m.name}
            </option>
        `).join('');
        
        select.addEventListener('change', (e) => {
            this.settings[this.currentProvider].model = e.target.value;
            this.updateCharCount();
        });
    }

    // =================== VOICE MODAL ===================
    openVoiceModal() {
        const modal = document.getElementById('voiceModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderVoices();
        }
    }

    closeVoiceModal() {
        document.getElementById('voiceModal')?.classList.add('hidden');
    }

    renderVoices(filter = '') {
        const container = document.getElementById('voiceGrid');
        if (!container) return;
        
        let voices = this.loadedVoices[this.currentProvider] || [];
        
        // Filter
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            voices = voices.filter(v => 
                v.name.toLowerCase().includes(lowerFilter) ||
                (v.tags && v.tags.some(t => t.toLowerCase().includes(lowerFilter)))
            );
        }
        
        if (voices.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <i class="bi bi-search text-4xl mb-4 block"></i>
                    <p>Không tìm thấy giọng nói</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = voices.map(voice => `
            <div class="voice-card ${this.selectedVoice?.id === voice.id ? 'selected' : ''}" 
                 data-voice-id="${voice.id}"
                 onclick="ttsManager.selectVoice('${voice.id}')">
                <div class="voice-avatar">
                    <img src="${voice.avatar}" alt="${voice.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(voice.name)}&background=random'">
                    ${voice.preview_url ? `
                        <button class="preview-btn" onclick="event.stopPropagation(); ttsManager.previewVoice('${voice.preview_url}')">
                            <i class="bi bi-play-fill"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="voice-info">
                    <h4>${voice.name}</h4>
                    <div class="voice-tags">
                        ${voice.tags.slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterVoices(query) {
        this.renderVoices(query);
    }

    selectVoice(voiceId) {
        const voices = this.loadedVoices[this.currentProvider] || [];
        const voice = voices.find(v => v.id == voiceId);
        
        if (!voice) return;
        
        this.selectedVoice = voice;
        
        // Update UI
        document.getElementById('selectedVoiceName').textContent = voice.name;
        const avatar = document.getElementById('selectedVoiceAvatar');
        if (avatar) {
            avatar.src = voice.avatar;
            avatar.classList.remove('hidden');
        }
        
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
        const estimatedCost = Math.ceil(text.length * 1.12 * this.getModelCostFactor());
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
        btn.innerHTML = '<span class="spinner"></span> Đang xử lý...';
        
        try {
            const response = await this.api.createSpeech(params);
            
            if (response.status === 'success' && response.task_id) {
                // Update credits
                this.session.credits3 = response.new_balance;
                document.getElementById('header-credits').textContent = response.new_balance.toLocaleString();
                
                // Add to history
                this.addPendingTask({
                    task_id: response.task_id,
                    text_preview: text.substring(0, 100) + '...',
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
                
                // Clear input (optional)
                // document.getElementById('txtInput').value = '';
                // this.updateCharCount();
                
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
                        
                        // Play notification sound (optional)
                        // new Audio('notification.mp3').play();
                        
                    } else if (taskStatus === 'failed') {
                        this.stopPolling(taskId);
                        this.showNotification('Tác vụ thất bại: ' + (response.error_message || ''), 'error');
                    }
                }
                
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000); // Poll every 3 seconds
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
        const badge = card.querySelector('.status-badge');
        if (badge) {
            badge.className = 'status-badge ' + status;
            badge.textContent = this.getStatusText(status);
        }
        
        // Update progress
        if (data.progress !== undefined) {
            const progress = card.querySelector('.progress-bar');
            if (progress) {
                progress.style.width = data.progress + '%';
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
        const container = document.getElementById('historyList');
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
            <div class="history-card" data-task-id="${task.task_id}">
                <div class="hc-header">
                    <span class="hc-time">${this.formatTime(task.created_at)}</span>
                    <span class="status-badge ${task.status}">${this.getStatusText(task.status)}</span>
                </div>
                <p class="hc-preview">${this.escapeHtml(task.text_preview || task.text_input?.substring(0, 100) || '')}</p>
                <div class="task-content">
                    ${task.status === 'done' && task.audio_url 
                        ? this.renderPlayerHTML(task.task_id, task.audio_url)
                        : task.status === 'failed'
                            ? `<div class="error-msg"><i class="bi bi-exclamation-circle"></i> ${task.error_message || 'Thất bại'}</div>`
                            : `<div class="processing-status"><div class="spinner"></div> Đang xử lý...</div>`
                    }
                </div>
                <div class="hc-footer">
                    <span class="credit-cost">${task.credit_cost || 0} credits</span>
                    <button class="btn-delete" onclick="ttsManager.deleteTask('${task.task_id}')" title="Xóa">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderPlayerHTML(taskId, audioUrl) {
        return `
            <div class="audio-player" id="player-${taskId}">
                <button class="play-btn" onclick="ttsManager.playAudio('${taskId}', '${audioUrl}')">
                    <i class="bi bi-play-fill"></i>
                </button>
                <div class="progress-track" onclick="ttsManager.seekAudio(event, '${taskId}')">
                    <div class="progress-bar" id="progress-${taskId}"></div>
                </div>
                <span class="timer" id="timer-${taskId}">0:00</span>
                <a href="${audioUrl}" download class="download-btn" title="Tải xuống">
                    <i class="bi bi-download"></i>
                </a>
            </div>
        `;
    }

    // =================== AUDIO PLAYBACK ===================
    playAudio(taskId, url) {
        const playBtn = document.querySelector(`#player-${taskId} .play-btn`);
        
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
            const prevBtn = document.querySelector(`#player-${this.currentAudio.dataset.taskId} .play-btn`);
            if (prevBtn) prevBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
        
        // Create new audio
        this.currentAudio = new Audio(url);
        this.currentAudio.dataset.taskId = taskId;
        
        this.currentAudio.onplay = () => {
            playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        };
        
        this.currentAudio.onpause = () => {
            playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        };
        
        this.currentAudio.onended = () => {
            playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
            document.getElementById(`progress-${taskId}`).style.width = '0%';
        };
        
        this.currentAudio.ontimeupdate = () => {
            const progress = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
            document.getElementById(`progress-${taskId}`).style.width = progress + '%';
            document.getElementById(`timer-${taskId}`).textContent = this.formatDuration(this.currentAudio.currentTime);
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
            
            this.showNotification('Đã xóa', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Không thể xóa: ' + error.message, 'error');
        }
    }

    // =================== TAB SWITCHING ===================
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.getElementById('tabSettings')?.classList.toggle('show', tabName === 'settings');
        document.getElementById('tabHistory')?.classList.toggle('show', tabName === 'history');
    }

    // =================== UTILITIES ===================
    showLoading(show) {
        document.getElementById('loadingOverlay')?.classList.toggle('show', show);
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
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
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    formatDuration(seconds) {
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

// =================== INIT ===================
function initTTS() {
    ttsManager.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTTS);
} else {
    initTTS();
}
