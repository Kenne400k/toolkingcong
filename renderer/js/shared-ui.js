// renderer/js/shared-ui.js
// Shared UI functions for loading user session and updating header/sidebar

class SharedUI {
    constructor() {
        this.session = null;
    }

    async init() {
        console.log('🎨 SharedUI initializing...');
        await this.loadSession();
        await this.updateUserInfo();
        this.setupNavigation();
        this.setupLogout();
        this.highlightCurrentPage();
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
                setTimeout(() => {
                    window.electronAPI.logout();
                }, 2000);
                return;
            }
        } catch (error) {
            console.error('❌ Load session error:', error);
        }
    }

    async updateUserInfo() {
        if (!this.session) return;

        let displayName = this.session.display_name || this.session.username || 'User';
        let avatarUrl = this.session.avatar_url || null;
        const email = this.session.email || 'No email';
        const credits = this.session.credits3 || 0;
        const username = this.session.username;

        console.log('📋 Session data:', {
            username,
            display_name: displayName,
            avatar_url: avatarUrl,
            email,
            credits
        });

        // 🔥 NẾU TÊN VẪN LÀ GG_... HOẶC CHƯA CÓ AVATAR THÌ GỌI LẠI SERVER
        if (username && (displayName.startsWith('gg_') || displayName === username || !avatarUrl)) {
            try {
                console.log('🔄 Fetching user info from server:', username);
                
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
                    displayName = data.name;
                    this.session.display_name = data.name;
                }

                // Cập nhật avatar
                if (data && data.avatar) {
                    avatarUrl = data.avatar;
                    this.session.avatar_url = data.avatar;
                }

            } catch (err) {
                console.error('❌ Error fetching user info:', err);
            }
        }

        // Update UI elements
        this.updateUIElements(displayName, avatarUrl, email, credits);
    }

    updateUIElements(displayName, avatarUrl, email, credits) {
        // 1. Sidebar - User name
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = displayName;
        
        // 2. Avatar
        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) {
            if (avatarUrl && avatarUrl.trim() !== '' && avatarUrl !== 'null') {
                avatarEl.innerHTML = '';
                avatarEl.className = 'avatar-inner';
                
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.alt = displayName;
                img.className = 'w-full h-full object-cover rounded-full';
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
                
                img.onerror = () => {
                    avatarEl.innerHTML = '';
                    avatarEl.textContent = displayName.charAt(0).toUpperCase();
                    avatarEl.style.cssText = 'display: flex; align-items: center; justify-content: center; font-weight: bold;';
                };
                
                avatarEl.appendChild(img);
            } else {
                avatarEl.innerHTML = '';
                avatarEl.textContent = displayName.charAt(0).toUpperCase();
                avatarEl.style.cssText = 'display: flex; align-items: center; justify-content: center; font-weight: bold;';
            }
        }

        // 3. Header - Email
        const headerEmail = document.getElementById('header-email');
        if (headerEmail) headerEmail.textContent = email;
        
        // 4. Header - Credits (multiple possible IDs)
        const creditsElements = ['header-credits', 'userCredits', 'userCreditsFooter'];
        creditsElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = credits.toLocaleString();
        });

        // 5. Welcome name (if exists)
        const welcomeEl = document.getElementById('welcome-name');
        if (welcomeEl) welcomeEl.textContent = displayName;

        console.log('✅ UI updated with user info');
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                const page = link.dataset.page;
                const href = link.getAttribute('href');
                
                // If it has href, let it navigate naturally
                if (href && href !== '#') {
                    return;
                }
                
                e.preventDefault();
                
                if (page === 'dashboard') {
                    window.location.href = 'dashboard.html';
                } else if (page === 'tts') {
                    window.location.href = 'tts.html';
                } else if (page === 'history') {
                    // Open detailed history modal if available
                    if (typeof openDetailedHistory === 'function') {
                        openDetailedHistory();
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }
            });
        });
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm('Bạn có chắc muốn đăng xuất?')) {
                    await window.electronAPI.logout();
                }
            });
        }
    }

    highlightCurrentPage() {
        const currentPath = window.location.pathname;
        let currentPage = 'dashboard';
        
        if (currentPath.includes('tts.html')) {
            currentPage = 'tts';
        } else if (currentPath.includes('history.html')) {
            currentPage = 'history';
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active', 'text-primary');
            link.classList.add('text-dim');
            
            if (link.dataset.page === currentPage) {
                link.classList.add('active');
                link.classList.remove('text-dim');
            }
        });
    }

    // Get current credits
    getCredits() {
        return this.session?.credits3 || 0;
    }

    // Update credits after transaction
    updateCredits(newCredits) {
        if (this.session) {
            this.session.credits3 = newCredits;
        }
        
        const creditsElements = ['header-credits', 'userCredits', 'userCreditsFooter'];
        creditsElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = newCredits.toLocaleString();
        });
    }
}

// Create singleton instance
const sharedUI = new SharedUI();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        sharedUI.init();
    });
} else {
    sharedUI.init();
}

// Export globally
window.sharedUI = sharedUI;
