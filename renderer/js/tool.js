/**
 * KingCong Pro Tool - Advanced TTS Processing
 * Handles batch processing, voice library, multi-voice conversations, and more
 */

class ProToolManager {
    constructor() {
        this.tasks = [];
        this.voiceLibrary = [];
        this.isProcessing = false;
        this.currentTaskIndex = 0;
        this.completedCount = 0;
        this.processingCount = 0;
        
        // Settings
        this.provider = 'elevenlabs';
        this.model = 'eleven_multilingual_v2';
        this.maxChars = 10000;
        this.delayBetween = 1;
        this.threadCount = 3;
        
        this.init();
    }
    
    init() {
        this.setupFileInputs();
        this.loadVoiceLibrary();
        this.loadSettings();
        this.loadResourcesOnInit(); // Load models & voices từ server
        console.log('✅ ProToolManager initialized');
    }
    
    setupFileInputs() {
        // Provider select
        const providerSelect = document.getElementById('providerSelect');
        providerSelect?.addEventListener('change', (e) => {
            this.provider = e.target.value;
            this.updateModelOptions();
        });
        
        // Model select
        const modelSelect = document.getElementById('modelSelect');
        modelSelect?.addEventListener('change', (e) => this.model = e.target.value);
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
        const modelSelect = document.getElementById('modelSelect');
        if (!modelSelect) return;
        
        // Nếu đã load models từ server thì dùng
        const models = this.loadedModels?.[this.provider] || [];
        
        if (models.length > 0) {
            modelSelect.innerHTML = models.map(m => 
                `<option value="${m.id}">${m.name}${m.cost_factor < 1 ? ` (${Math.round((1-m.cost_factor)*100)}% rẻ hơn)` : ''}</option>`
            ).join('');
        } else {
            // Fallback nếu chưa load
            if (this.provider === 'elevenlabs') {
                modelSelect.innerHTML = `
                    <option value="eleven_multilingual_v2">Multilingual V2</option>
                    <option value="eleven_turbo_v2_5">Turbo V2.5</option>
                    <option value="eleven_flash_v2">Flash V2</option>
                `;
            } else {
                modelSelect.innerHTML = `
                    <option value="speech-02-hd">Speech 02 HD</option>
                    <option value="speech-02-turbo">Speech 02 Turbo</option>
                `;
            }
        }
        this.model = modelSelect.value;
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
    
    // Load voices from server - giống tts.js
    async loadVoicesFromServer() {
        const modalBody = document.getElementById('voicesModalBody');
        document.getElementById('voicesModal').classList.add('show');
        
        // Nếu đã có voices trong cache thì dùng luôn
        const cachedVoices = this.loadedVoices?.[this.provider];
        if (cachedVoices && cachedVoices.length > 0) {
            console.log(`✅ Using cached ${cachedVoices.length} voices for ${this.provider}`);
            this.renderVoicesModal(cachedVoices);
            return;
        }
        
        modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #555;">Loading voices...</div>`;
        
        try {
            const res = await window.electronAPI.getResources();
            console.log('✅ getResources response:', res);
            
            if (res && res.status === 'success' && res.data) {
                // Lưu tất cả voices
                this.loadedVoices = {
                    elevenlabs: res.data.elevenlabs?.voices || [],
                    minimax: res.data.minimax?.voices || []
                };
                
                // Lưu models luôn
                this.loadedModels = {
                    elevenlabs: res.data.elevenlabs?.models || [],
                    minimax: res.data.minimax?.models || []
                };
                this.updateModelOptions();
                
                const voices = this.loadedVoices[this.provider] || [];
                console.log(`✅ Found ${voices.length} voices for ${this.provider}`);
                
                if (voices.length > 0) {
                    this.renderVoicesModal(voices);
                } else {
                    modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #888;">Không có voices cho ${this.provider}</div>`;
                }
            } else {
                console.error('❌ Invalid response:', res);
                modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #f55;">Không thể tải voices</div>`;
            }
        } catch (error) {
            console.error('❌ Load voices error:', error);
            modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: #f55;">Lỗi: ${error.message}</div>`;
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
        
        if (provider === 'elevenlabs') {
            // ,; -> <break time="0.3s"/>
            text = text.replace(/[,;，；]/g, '<break time="0.3s"/>');
            // .:?! -> <break time="0.5s"/>
            text = text.replace(/[.:?!。：？！]/g, '<break time="0.5s"/>');
        } else { // minimax
            text = text.replace(/[,;，；]/g, '<#0.3#>');
            text = text.replace(/[.:?!。：？！]/g, '<#0.5#>');
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
                    <div class="task-content">${this.escapeHtml(task.content.substring(0, 100))}</div>
                    <div class="task-filename">${task.fileName}</div>
                </td>
                <td style="font-size: 12px; color: #888;">
                    ${task.voiceName || (task.voiceId ? task.voiceId.substring(0, 8) : '-')}
                    ${task.voiceNum ? `<span style="color: #666;"> #${task.voiceNum}</span>` : ''}
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
        const optRemoveSpecial = document.getElementById('optRemoveSpecial')?.checked;
        
        // Process tasks sequentially to avoid rate limit
        const processQueue = [...pendingTasks];
        
        const processTask = async (task, retryCount = 0) => {
            console.log('🔄 Processing task:', task.id, task.content?.substring(0, 50));
            task.status = 'processing';
            this.updateTaskDisplay();
            
            try {
                // Apply text transformations
                let content = task.content;
                console.log('📝 Original content length:', content?.length);
                
                // Remove special characters if enabled
                if (optRemoveSpecial) {
                    content = this.removeSpecialCharacters(content);
                    console.log('🔧 After removeSpecial:', content?.length);
                }
                
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
        
        // Process sequentially with delay to avoid rate limit (10 req/min)
        // Delay giữa mỗi request = 7 giây để an toàn
        const REQUEST_DELAY = 7000;
        
        console.log(`📊 Processing ${processQueue.length} tasks with ${REQUEST_DELAY/1000}s delay between requests`);
        
        for (let i = 0; i < processQueue.length && this.isProcessing; i++) {
            const task = processQueue[i];
            
            // Hiển thị progress
            document.getElementById('statusText').textContent = `Đang xử lý ${i + 1}/${processQueue.length}...`;
            
            await processTask(task);
            
            // Delay trước task tiếp theo (trừ task cuối)
            if (i < processQueue.length - 1 && this.isProcessing) {
                console.log(`⏱️ Waiting ${REQUEST_DELAY/1000}s before next request...`);
                await new Promise(r => setTimeout(r, REQUEST_DELAY));
            }
        }
        
        this.finishProcessing();
    }
    
    async createTTSTask(content, voiceId) {
        try {
            const optAutoSRT = document.getElementById('optAutoSRT')?.checked;
            
            // Get voice settings (giống bên tts.js)
            const speed = parseFloat(document.getElementById('voiceSpeed')?.value) || 1;
            const stability = parseFloat(document.getElementById('voiceStability')?.value) || 0.5;
            const similarity = parseFloat(document.getElementById('voiceSimilarity')?.value) || 0.75;
            const style = parseFloat(document.getElementById('voiceStyle')?.value) || 0;
            const speakerBoost = document.getElementById('speakerBoost')?.checked || false;
            
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
                params.vol = 1;
                params.speed = speed;
                params.pitch = 0;
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
    
    // ==================== JOIN FILES ====================
    
    async joinFiles() {
        const doneTasks = this.tasks.filter(t => t.status === 'done' || t.isAudioImport);
        
        if (doneTasks.length < 2) {
            this.showNotification('Cần ít nhất 2 file để nối!', 'warning');
            return;
        }
        
        const delay = document.getElementById('delayBetween')?.value || '1s';
        const delaySeconds = parseFloat(delay) || 1;
        
        this.showNotification('Đang chuẩn bị nối file...', 'info');
        
        try {
            // Step 1: Download all files first
            const downloadedFiles = [];
            
            for (const task of doneTasks) {
                if (task.isAudioImport && task.filePath) {
                    // Local file
                    downloadedFiles.push(task.filePath);
                } else if (task.resultUrl) {
                    // Need to download
                    const fileName = `${task.fileName || task.id}.mp3`;
                    const result = await window.electronAPI.downloadFile({
                        url: task.resultUrl,
                        fileName: fileName
                    });
                    
                    if (result.success) {
                        downloadedFiles.push(result.filePath);
                    }
                }
            }
            
            if (downloadedFiles.length < 2) {
                this.showNotification('Không đủ file để nối!', 'warning');
                return;
            }
            
            // Step 2: Create file list for ffmpeg
            const fileListContent = downloadedFiles.map(f => `file '${f}'`).join('\n');
            const outputName = `joined_${Date.now()}`;
            
            // Save file list
            await window.electronAPI.saveFile({
                fileName: `${outputName}_file_list.txt`,
                content: fileListContent
            });
            
            // Step 3: Try to join using backend
            const joinResult = await window.electronAPI.joinAudioLocal({
                files: downloadedFiles,
                delay: delaySeconds,
                outputName: outputName
            });
            
            if (joinResult && joinResult.success) {
                this.showNotification(`Đã nối ${downloadedFiles.length} file thành công!`, 'success');
            } else {
                // Create a manual instruction
                this.showNotification(`Đã tạo file list. Dùng ffmpeg để nối: ffmpeg -f concat -safe 0 -i file_list.txt -c copy output.mp3`, 'info');
            }
            
        } catch (error) {
            console.error('Join error:', error);
            this.showNotification('Lỗi khi nối file: ' + error.message, 'error');
        }
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
                        <th>Status</th>
                        <th>Date</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => `
                        <tr>
                            <td style="color: #444; font-size: 10px;">${(task.id || task.task_id || '').substring(0, 8)}</td>
                            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${this.escapeHtml((task.text || task.input_text || '').substring(0, 60))}
                            </td>
                            <td><span class="status ${task.status?.toLowerCase()}">${this.getStatusText(task.status?.toLowerCase())}</span></td>
                            <td style="color: #555; font-size: 11px;">${task.created_at || task.date || '-'}</td>
                            <td>
                                ${task.result_url ? `<button class="btn btn-sm" onclick="proTool.downloadFromUrl('${task.result_url}')"><i class="bi bi-download"></i></button>` : ''}
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
                this.provider = settings.provider || 'elevenlabs';
                this.model = settings.model || 'eleven_multilingual_v2';
                this.maxChars = settings.maxChars || 10000;
                this.threadCount = settings.threadCount || 3;
                
                // Apply to UI
                const providerSelect = document.getElementById('providerSelect');
                if (providerSelect) providerSelect.value = this.provider;
                
                const maxCharsInput = document.getElementById('maxChars');
                if (maxCharsInput) maxCharsInput.value = this.maxChars;
                
                const threadInput = document.getElementById('threadCount');
                if (threadInput) threadInput.value = this.threadCount;
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }
    
    saveSettings() {
        const settings = {
            provider: this.provider,
            model: this.model,
            maxChars: parseInt(document.getElementById('maxChars')?.value) || 10000,
            threadCount: parseInt(document.getElementById('threadCount')?.value) || 3
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
            const projectName = document.getElementById('projectName')?.value?.trim() || 'default';
            const fileName = `${task.fileName || task.id}.mp3`;

            console.log(`📥 Auto downloading: ${fileName} to ${projectName}/`);

            const result = await window.electronAPI.downloadFile({
                url: task.resultUrl,
                fileName: fileName,
                subfolder: projectName
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

function openVoiceLibrary() {
    document.getElementById('voiceLibraryModal').classList.add('show');
    proTool.renderVoiceLibraryTable();
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
