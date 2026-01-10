// renderer/js/dashboard.js

class Dashboard {
    constructor() {
        this.session = null;
        this.stats = {
            totalTasks: 0,
            credits: 0,
            pending: 0,
            successRate: 0
        };
        this.api = window.apiHandler; // Use centralized API handler
        this.init();
    }

    async init() {
        console.log('🎯 Dashboard initializing...');
        
        // Initialize API handler first
        await this.api.init();
        
        // Setup loader callback
        this.api.setLoaderCallback((show) => {
            this.showLoading(show);
        });

        // Load session
        await this.loadSession();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load data
        await this.loadDashboardData();
        
        // Auto refresh every 30s
        setInterval(() => this.refreshStats(), 30000);
    }

    async loadSession() {
        try {
            // Try window.__SESSION__ first
            if (window.__SESSION__) {
                this.session = window.__SESSION__;
                console.log('✅ Session loaded from window');
            } else {
                // Fallback to electron API
                this.session = await window.electronAPI.getSession();
                console.log('✅ Session loaded from API');
            }
            
            if (!this.session) {
                console.error('❌ No session found');
                this.showError('Session not found. Please login again.');
                setTimeout(() => {
                    window.electronAPI.logout();
                }, 2000);
                return;
            }
            
            // 🔥 Cập nhật thông tin user (Gọi API lấy tên thật ở đây)
            await this.updateUserInfo();
            
        } catch (error) {
            console.error('❌ Load session error:', error);
            this.showError('Failed to load session');
        }
    }

async updateUserInfo() {
    let displayName = this.session.display_name || this.session.username || 'User';
    let avatarUrl = this.session.avatar_url || null;
    const email = this.session.email || 'No email';
    const credits = this.session.credits3 || 0;
    const username = this.session.username;

    console.log('📋 Session hiện tại:', {
        username,
        display_name: displayName,
        avatar_url: avatarUrl,
        email,
        credits
    });

    // ============================================================
    // 🔥 NẾU TÊN VẪN LÀ GG_... HOẶC CHƯA CÓ AVATAR THÌ GỌI LẠI SERVER
    // ============================================================
    if (username && (displayName.startsWith('gg_') || displayName === username || !avatarUrl)) {
        try {
            console.log('🔄 Đang gọi server lấy tên + avatar:', username);
            
            const formData = new FormData();
            formData.append('username', username);

            const res = await fetch('https://kingcongstudio.com/ajaxs/get_user_info_tool.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await res.json();
            console.log('✅ Server response:', data);
            
            // Cập nhật tên
            if (data && data.name && data.name !== 'Unknown User' && data.name !== username) {
                console.log('✅ Đã lấy được tên thật:', data.name);
                displayName = data.name;
                this.session.display_name = data.name;
            }

            // 🔥 CẬP NHẬT AVATAR
            if (data && data.avatar) {
                console.log('✅ Đã lấy được avatar:', data.avatar);
                avatarUrl = data.avatar;
                this.session.avatar_url = data.avatar;
            }

        } catch (err) {
            console.error('❌ Không lấy được dữ liệu từ server:', err);
        }
    }
    // ============================================================

    console.log('✅ Tên cuối cùng:', displayName);
    console.log('✅ Avatar cuối cùng:', avatarUrl);

    // 1. Sidebar - User name
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = displayName;
    
        // 2. 🔥 AVATAR - Xử lý đẹp hơn
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
        console.log('🖼️ Đang xử lý avatar element...');
        
        if (avatarUrl && avatarUrl.trim() !== '' && avatarUrl !== 'null') {
            console.log('✅ Hiển thị ảnh:', avatarUrl);
            
            // Xóa nội dung cũ
            avatarEl.innerHTML = '';
            avatarEl.className = 'w-full h-full flex items-center justify-center';
            
            // Tạo thẻ img
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = displayName;
            img.className = 'w-full h-full object-cover rounded-full';
            
            // Xử lý khi ảnh load thành công
            img.onload = function() {
                console.log('✅ Avatar đã load thành công!');
            };
            
            // Xử lý khi ảnh lỗi
            img.onerror = function() {
                console.error('❌ Không load được ảnh:', avatarUrl);
                avatarEl.innerHTML = '';
                avatarEl.textContent = displayName.charAt(0).toUpperCase();
                avatarEl.className = 'w-full h-full flex items-center justify-center text-lg font-bold error';
            };
            
            avatarEl.appendChild(img);
            
        } else {
            console.log('⚠️ Không có avatar, hiển thị chữ cái');
            avatarEl.innerHTML = '';
            const firstChar = displayName.charAt(0).toUpperCase();
            avatarEl.textContent = firstChar;
            avatarEl.className = 'w-full h-full flex items-center justify-center text-lg font-bold';
        }
    } else {
        console.error('❌ Không tìm thấy element #user-avatar');
    }

    // 3. Welcome Message
    const welcomeEl = document.getElementById('welcome-name');
    if (welcomeEl) welcomeEl.textContent = displayName;

    // 4. Header - Email & Credits
    const headerEmail = document.getElementById('header-email');
    if (headerEmail) headerEmail.textContent = email;
    
    const headerCredits = document.getElementById('header-credits');
    const statCredits = document.getElementById('stat-credits');
    
    if (headerCredits) headerCredits.textContent = credits.toLocaleString();
    if (statCredits) statCredits.textContent = credits.toLocaleString();
}

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                
                if (page === 'tts') {
                    this.navigateToTTS();
                } else if (page === 'history') {
                    this.loadHistoryPage();
                } else if (page === 'dashboard') {
                    this.loadDashboardData();
                }
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => {
                    l.classList.remove('active', 'bg-primary/10', 'text-primary', 'border', 'border-primary/20');
                    l.classList.add('text-text-secondary');
                });
                link.classList.add('active', 'bg-primary/10', 'text-primary', 'border', 'border-primary/20');
                link.classList.remove('text-text-secondary');
            });
        });
        
        // Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                await window.electronAPI.logout();
            }
        });
        
        // Create Task
        document.getElementById('create-task-btn').addEventListener('click', () => {
            this.navigateToTTS();
        });
        
        // View All History
        document.getElementById('view-all-btn').addEventListener('click', () => {
            this.loadHistoryPage();
        });
    }

    async loadDashboardData() {
        try {
            this.showLoading(true);
            
            const response = await this.api.getHistory(1, 10);
            
            if (response.status === 'success') {
                const data = response.data || [];
                const total = response.total || 0;
                
                this.calculateStats(data, total);
                this.updateStatsUI();
                this.renderRecentTasks(data);
                
                this.showLoading(false);
                
                // Show dashboard
                const dashboard = document.getElementById('main-dashboard');
                if (dashboard) {
                    dashboard.classList.remove('hidden');
                    dashboard.classList.add('fade-in', 'flex');
                }
                
            } else {
                throw new Error(response.message || 'Failed to load data');
            }
            
        } catch (error) {
            console.error('❌ Load dashboard error:', error);
            this.showError('Failed to load dashboard data: ' + error.message);
            this.showLoading(false);
        }
    }

    calculateStats(recentData, totalTasks) {
        this.stats.totalTasks = totalTasks;
        this.stats.credits = this.session.credits3 || 0;
        
        // Count pending
        this.stats.pending = recentData.filter(task => 
            task.status === 'pending' || task.status === 'processing'
        ).length;
        
        // Calculate success rate
        const completed = recentData.filter(task => task.status === 'done').length;
        const failed = recentData.filter(task => task.status === 'failed').length;
        const total = completed + failed;
        
        if (total > 0) {
            this.stats.successRate = ((completed / total) * 100).toFixed(1);
        } else {
            this.stats.successRate = '0.0';
        }
    }

    updateStatsUI() {
        this.animateNumber('stat-total-tasks', this.stats.totalTasks);
        this.animateNumber('stat-pending', this.stats.pending);
        document.getElementById('stat-success-rate').textContent = this.stats.successRate + '%';
    }

    animateNumber(elementId, targetValue, duration = 1000) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = parseInt(element.textContent) || 0;
        const increment = (targetValue - startValue) / (duration / 16);
        let currentValue = startValue;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if ((increment > 0 && currentValue >= targetValue) || 
                (increment < 0 && currentValue <= targetValue)) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentValue).toLocaleString();
        }, 16);
    }

    renderRecentTasks(tasks) {
        const tbody = document.getElementById('recent-tasks-body');
        if (!tbody) return;

        if (tasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-text-secondary">
                        No tasks found. Create your first task!
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = tasks.map(task => {
            const statusColors = {
                'done': 'text-green-400 bg-green-400',
                'failed': 'text-red-400 bg-red-400',
                'pending': 'text-yellow-400 bg-yellow-400',
                'processing': 'text-blue-400 bg-blue-400'
            };
            
            const statusColor = statusColors[task.status] || 'text-gray-400 bg-gray-400';
            const statusText = task.status.charAt(0).toUpperCase() + task.status.slice(1);
            
            let preview = task.text_preview || task.text_input || '';
            if (preview.length > 50) {
                preview = preview.substring(0, 50) + '...';
            }
            
            return `
                <tr class="hover:bg-background-dark/30 transition-colors fade-in">
                    <td class="px-6 py-4 font-mono text-xs text-primary">${this.truncateId(task.task_id)}</td>
                    <td class="px-6 py-4 text-text-secondary max-w-xs truncate">${this.escapeHtml(preview)}</td>
                    <td class="px-6 py-4 text-text-secondary">${this.escapeHtml(task.voice_name || 'Unknown')}</td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center gap-1.5 ${statusColor.split(' ')[0]} text-xs font-medium">
                            <span class="w-1.5 h-1.5 rounded-full ${statusColor.split(' ')[1]} ${task.status === 'processing' ? 'animate-pulse' : ''}"></span>
                            ${statusText}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-text-secondary">${task.credit_cost || 0} cr</td>
                    <td class="px-6 py-4 text-right text-text-secondary text-xs">${task.created_at_display || 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }

    truncateId(id) {
        if (!id) return 'N/A';
        if (id.length <= 12) return id;
        return id.substring(0, 8) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async refreshStats() {
        console.log('🔄 Refreshing stats...');
        try {
            const session = await window.electronAPI.getSession();
            if (session) {
                this.session.credits3 = session.credits3;
                this.api.updateSession(session);
                
                const headerCredits = document.getElementById('header-credits');
                const statCredits = document.getElementById('stat-credits');
                if(headerCredits) headerCredits.textContent = session.credits3.toLocaleString();
                if(statCredits) statCredits.textContent = session.credits3.toLocaleString();
            }
            
            const response = await this.api.getHistory(1, 10);
            if (response.status === 'success') {
                const data = response.data || [];
                const total = response.total || 0;
                this.calculateStats(data, total);
                this.updateStatsUI();
                this.renderRecentTasks(data);
            }
        } catch (error) {
            console.error('❌ Refresh error:', error);
        }
    }

    loadHistoryPage() {
        this.showNotification('History page coming soon!', 'info');
    }

    async navigateToTTS() {
        try {
            await window.electronAPI.loadTTSPage();
        } catch (error) {
            console.error('❌ Navigation error:', error);
            this.showError('Failed to load TTS page');
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading-state');
        const dashboard = document.getElementById('main-dashboard');
        
        if (!loading || !dashboard) return;

        if (show) {
            loading.classList.remove('hidden');
            dashboard.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showError(message) {
        const content = document.getElementById('dashboard-content');
        if(content) {
            content.innerHTML = `
                <div class="flex items-center justify-center h-full">
                    <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md">
                        <div class="flex items-center gap-3 mb-3">
                            <span class="material-symbols-outlined text-red-400">error</span>
                            <h3 class="text-lg font-bold text-red-400">Error</h3>
                        </div>
                        <p class="text-text-secondary">${message}</p>
                    </div>
                </div>
            `;
        }
    }

    showNotification(message, type = 'success') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500'
        };
        
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Dashboard();
    });
} else {
    new Dashboard();
}