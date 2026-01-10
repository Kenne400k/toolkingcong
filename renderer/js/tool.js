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
        try {
            const result = await window.electronAPI.selectFiles({
                filters: [
                    { name: 'Text Files', extensions: ['txt', 'srt'] }
                ]
            });
            
            if (!result.success || result.canceled) return;
            
            for (const filePath of result.filePaths) {
                const fileResult = await window.electronAPI.readFile(filePath);
                if (fileResult.success) {
                    await this.processImportedText(fileResult.content, fileResult.fileName);
                }
            }
            
            this.updateTaskDisplay();
        } catch (error) {
            console.error('Import file error:', error);
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
        const optLoop = document.getElementById('optLoop')?.checked;
        const optAutoSplit = document.getElementById('optAutoSplit')?.checked;
        const opt1Line1File = document.getElementById('opt1Line1File')?.checked;
        
        // Check for multi-voice format (#1, #2, #3)
        const hasMultiVoice = /#\d+\s/.test(text);
        
        if (hasMultiVoice) {
            this.processMultiVoiceText(text, fileName);
        } else if (optLoop) {
            this.processLoopText(text, fileName);
        } else if (optAutoSplit) {
            this.processAutoSplitText(text, fileName);
        } else if (opt1Line1File) {
            this.processLineByLineText(text, fileName);
        } else {
            this.addTask({
                id: this.generateTaskId(),
                content: text,
                fileName: fileName,
                voiceId: document.getElementById('selectedVoiceId')?.value || '',
                status: 'pending'
            });
        }
    }
    
    updateModelOptions() {
        const modelSelect = document.getElementById('modelSelect');
        if (!modelSelect) return;
        
        if (this.provider === 'elevenlabs') {
            modelSelect.innerHTML = `
                <option value="eleven_multilingual_v2">Multilingual V2</option>
                <option value="eleven_turbo_v2_5">Turbo V2.5</option>
                <option value="eleven_flash_v2">Flash V2</option>
                <option value="eleven_monolingual_v1">Monolingual V1</option>
            `;
        } else {
            modelSelect.innerHTML = `
                <option value="speech-2.5-hd-preview">Speech 2.5 HD</option>
                <option value="speech-2.5-turbo-preview">Speech 2.5 Turbo</option>
                <option value="speech-02-hd">Speech 02 HD</option>
                <option value="speech-02-turbo">Speech 02 Turbo</option>
            `;
        }
        this.model = modelSelect.value;
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
    }
    
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    updateTaskDisplay() {
        const emptyState = document.getElementById('emptyState');
        const taskTable = document.getElementById('taskTable');
        const taskTableBody = document.getElementById('taskTableBody');
        const taskCount = document.getElementById('taskCount');
        
        if (this.tasks.length === 0) {
            emptyState.style.display = 'flex';
            taskTable.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            taskTable.style.display = 'table';
        }
        
        taskCount.textContent = `(${this.tasks.length} files)`;
        
        // Render tasks
        taskTableBody.innerHTML = this.tasks.map((task, index) => `
            <tr data-id="${task.id}">
                <td>
                    <input type="checkbox" class="task-checkbox" data-id="${task.id}">
                </td>
                <td>${index + 1}</td>
                <td>
                    <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.escapeHtml(task.content.substring(0, 100))}${task.content.length > 100 ? '...' : ''}
                    </div>
                    <div style="font-size: 11px; color: var(--text-dim);">${task.fileName}</div>
                </td>
                <td>
                    ${task.voiceName || task.voiceId?.substring(0, 10) || '-'}
                    ${task.voiceNum ? `<br><span style="font-size: 10px; color: var(--accent);">#${task.voiceNum}</span>` : ''}
                </td>
                <td>
                    <span class="task-status ${task.status}">
                        ${this.getStatusIcon(task.status)}
                        ${this.getStatusText(task.status)}
                    </span>
                </td>
                <td style="font-size: 11px; color: var(--text-dim);">
                    ${task.duration || '-'}
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        ${task.resultUrl ? `
                            <button class="tool-btn" style="padding: 4px 8px;" onclick="proTool.downloadTask('${task.id}')">
                                <i class="bi bi-download"></i>
                            </button>
                        ` : ''}
                        <button class="tool-btn tool-btn-danger" style="padding: 4px 8px;" onclick="proTool.removeTask('${task.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        this.updateProgress();
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
        
        document.getElementById('progressText').textContent = 
            `Done: ${done} | Processing: ${processing} | Total: ${total}`;
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
        if (this.isProcessing) return;
        
        const pendingTasks = this.tasks.filter(t => t.status === 'pending');
        if (pendingTasks.length === 0) {
            this.showNotification('Không có tác vụ nào để xử lý!', 'warning');
            return;
        }
        
        const selectedVoiceId = document.getElementById('selectedVoiceId')?.value;
        if (!selectedVoiceId && pendingTasks.some(t => !t.voiceId)) {
            this.showNotification('Vui lòng chọn Voice ID!', 'warning');
            return;
        }
        
        this.isProcessing = true;
        document.getElementById('btnStart').disabled = true;
        document.getElementById('btnStop').disabled = false;
        document.getElementById('statusText').textContent = 'Đang xử lý...';
        
        const optSilentChar = document.getElementById('optSilentChar')?.checked;
        const optRemoveSpecial = document.getElementById('optRemoveSpecial')?.checked;
        const threadCount = parseInt(document.getElementById('threadCount')?.value) || 3;
        
        // Process tasks with thread pool
        const processQueue = [...pendingTasks];
        const activeThreads = [];
        
        const processTask = async (task) => {
            task.status = 'processing';
            this.updateTaskDisplay();
            
            try {
                // Apply text transformations
                let content = task.content;
                
                // Remove special characters if enabled
                if (optRemoveSpecial) {
                    content = this.removeSpecialCharacters(content);
                }
                
                // Apply silent character if enabled
                if (optSilentChar) {
                    content = this.applySilentCharacter(content);
                }
                
                // Make API call
                const result = await this.createTTSTask(content, task.voiceId || selectedVoiceId);
                
                if (result.success) {
                    task.taskId = result.taskId;
                    task.status = 'processing';
                    
                    // Poll for completion
                    await this.pollTaskStatus(task);
                } else {
                    task.status = 'failed';
                    task.error = result.error || 'Unknown error';
                }
            } catch (error) {
                console.error('Task error:', error);
                task.status = 'failed';
                task.error = error.message;
            }
            
            this.updateTaskDisplay();
        };
        
        // Process with limited concurrency
        while (processQueue.length > 0 && this.isProcessing) {
            while (activeThreads.length < threadCount && processQueue.length > 0) {
                const task = processQueue.shift();
                const thread = processTask(task).then(() => {
                    const idx = activeThreads.indexOf(thread);
                    if (idx > -1) activeThreads.splice(idx, 1);
                });
                activeThreads.push(thread);
            }
            
            await Promise.race(activeThreads.length > 0 ? activeThreads : [Promise.resolve()]);
            await new Promise(r => setTimeout(r, 100));
        }
        
        // Wait for all remaining threads
        await Promise.all(activeThreads);
        
        this.finishProcessing();
    }
    
    async createTTSTask(content, voiceId) {
        try {
            const optAutoSRT = document.getElementById('optAutoSRT')?.checked;
            
            const response = await window.electronAPI.apiRequest(
                'https://kingcongstudio.com/ajaxs/tts3.php',
                {
                    action: 'create',
                    provider: this.provider,
                    model: this.model,
                    voice_id: voiceId,
                    text: content,
                    speed: 1,
                    auto_srt: optAutoSRT ? '1' : '0'
                }
            );
            
            if (response.success && response.task_id) {
                return { success: true, taskId: response.task_id };
            } else {
                return { success: false, error: response.message || 'Failed to create task' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async pollTaskStatus(task, maxAttempts = 60) {
        for (let i = 0; i < maxAttempts; i++) {
            if (!this.isProcessing) break;
            
            try {
                const response = await window.electronAPI.apiRequest(
                    'https://kingcongstudio.com/ajaxs/tts3.php',
                    {
                        action: 'status',
                        task_id: task.taskId
                    }
                );
                
                if (response.status === 'completed' || response.status === 'done') {
                    task.status = 'done';
                    task.resultUrl = response.result_url || response.url;
                    task.duration = response.duration || '-';
                    return;
                } else if (response.status === 'failed' || response.status === 'error') {
                    task.status = 'failed';
                    task.error = response.message || 'Task failed';
                    return;
                }
                
                // Still processing, wait
                await new Promise(r => setTimeout(r, 2000));
            } catch (error) {
                console.error('Poll error:', error);
            }
        }
        
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
            const id = parseInt(inputs[0].value) || (index + 1);
            const voiceId = inputs[1].value.trim();
            const name = inputs[2].value.trim();
            
            if (voiceId) {
                this.voiceLibrary.push({ id, voiceId, name });
            }
        });
        
        localStorage.setItem('voiceLibrary', JSON.stringify(this.voiceLibrary));
        this.showNotification('Đã lưu thư viện!', 'success');
        this.closeVoiceLibrary();
    }
    
    renderVoiceLibraryTable() {
        const tbody = document.getElementById('voiceLibraryBody');
        if (!tbody) return;
        
        if (this.voiceLibrary.length === 0) {
            tbody.innerHTML = `
                <tr data-id="1">
                    <td><input type="text" value="1" readonly style="width: 40px; text-align: center;"></td>
                    <td><input type="text" placeholder="Nhập Voice ID..." class="voice-id-input"></td>
                    <td><input type="text" placeholder="Tên giọng..."></td>
                    <td>
                        <button class="tool-btn tool-btn-danger" style="padding: 4px 8px;" onclick="removeVoiceRow(this)">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.voiceLibrary.map((voice, index) => `
            <tr data-id="${voice.id}">
                <td><input type="text" value="${voice.id}" readonly style="width: 40px; text-align: center;"></td>
                <td><input type="text" value="${voice.voiceId}" placeholder="Nhập Voice ID..." class="voice-id-input"></td>
                <td><input type="text" value="${voice.name || ''}" placeholder="Tên giọng..."></td>
                <td>
                    <button class="tool-btn tool-btn-danger" style="padding: 4px 8px;" onclick="removeVoiceRow(this)">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
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
        const delayMs = parseFloat(delay) * 1000;
        
        this.showNotification('Đang nối file...', 'info');
        
        try {
            // For Electron, we need to use IPC to call a backend function
            // that uses ffmpeg or pydub to join audio files
            const result = await window.electronAPI.apiRequest(
                'join-audio',
                {
                    files: doneTasks.map(t => ({
                        url: t.resultUrl,
                        path: t.filePath
                    })),
                    delay: delayMs,
                    outputName: `joined_${Date.now()}.mp3`
                }
            );
            
            if (result.success) {
                this.showNotification('Đã nối file thành công!', 'success');
            } else {
                this.showNotification('Lỗi: ' + (result.error || 'Unknown'), 'error');
            }
        } catch (error) {
            console.error('Join error:', error);
            this.showNotification('Lỗi khi nối file: ' + error.message, 'error');
        }
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
            <table class="voice-library-table">
                <thead>
                    <tr>
                        <th>Task ID</th>
                        <th>Nội dung</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => `
                        <tr>
                            <td style="font-size: 11px;">${task.id || task.task_id}</td>
                            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                                ${this.escapeHtml((task.text || task.input_text || '').substring(0, 100))}
                            </td>
                            <td>
                                <span class="task-status ${task.status?.toLowerCase()}">
                                    ${this.getStatusText(task.status?.toLowerCase())}
                                </span>
                            </td>
                            <td style="font-size: 11px;">${task.created_at || task.date || '-'}</td>
                            <td>
                                ${task.result_url ? `
                                    <button class="tool-btn" style="padding: 4px 8px;" onclick="proTool.downloadFromUrl('${task.result_url}')">
                                        <i class="bi bi-download"></i>
                                    </button>
                                ` : '-'}
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
    newRow.setAttribute('data-id', nextId);
    newRow.innerHTML = `
        <td><input type="text" value="${nextId}" readonly style="width: 40px; text-align: center;"></td>
        <td><input type="text" placeholder="Nhập Voice ID..." class="voice-id-input"></td>
        <td><input type="text" placeholder="Tên giọng..."></td>
        <td>
            <button class="tool-btn tool-btn-danger" style="padding: 4px 8px;" onclick="removeVoiceRow(this)">
                <i class="bi bi-trash"></i>
            </button>
        </td>
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
            tr.querySelector('input').value = idx + 1;
            tr.setAttribute('data-id', idx + 1);
        });
    }
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.task-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
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

function openBackup() {
    proTool.openBackup();
}

function closeBackup() {
    proTool.closeBackup();
}

function openOutputFolder() {
    proTool.openOutputFolder();
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
