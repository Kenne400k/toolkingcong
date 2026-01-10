/**
 * Component Loader - Load header và sidebar components
 * Usage: Thêm script này vào các trang HTML cần dùng header/sidebar
 */

class ComponentLoader {
    constructor() {
        this.basePath = 'config/';
    }

    /**
     * Load HTML component từ file
     * @param {string} componentName - Tên file component (không có .html)
     * @returns {Promise<string>} - HTML content
     */
    async loadComponent(componentName) {
        try {
            const response = await fetch(`${this.basePath}${componentName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load ${componentName}: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            return '';
        }
    }

    /**
     * Inject component vào container
     * @param {string} componentName - Tên component
     * @param {string|Element} container - ID hoặc Element để inject
     * @param {string} position - 'replace', 'prepend', 'append' (default: 'replace')
     */
    async injectComponent(componentName, container, position = 'replace') {
        const html = await this.loadComponent(componentName);
        if (!html) return null;

        const targetElement = typeof container === 'string' 
            ? document.getElementById(container) || document.querySelector(container)
            : container;

        if (!targetElement) {
            console.error(`Container not found: ${container}`);
            return null;
        }

        switch (position) {
            case 'prepend':
                targetElement.insertAdjacentHTML('afterbegin', html);
                break;
            case 'append':
                targetElement.insertAdjacentHTML('beforeend', html);
                break;
            case 'before':
                targetElement.insertAdjacentHTML('beforebegin', html);
                break;
            case 'after':
                targetElement.insertAdjacentHTML('afterend', html);
                break;
            case 'replace':
            default:
                targetElement.innerHTML = html;
                break;
        }

        return targetElement;
    }

    /**
     * Load và inject cả header và sidebar
     * @param {Object} options - { headerContainer, sidebarContainer, activePage }
     */
    async loadLayout(options = {}) {
        const {
            headerContainer = '#header-container',
            sidebarContainer = '#sidebar-container',
            activePage = 'dashboard'
        } = options;

        // Load components song song
        const [headerResult, sidebarResult] = await Promise.all([
            this.injectComponent('header', headerContainer),
            this.injectComponent('sidebar', sidebarContainer)
        ]);

        // Set active page trong sidebar
        this.setActivePage(activePage);

        // Setup logout handler
        this.setupLogoutHandler();

        return { headerResult, sidebarResult };
    }

    /**
     * Set active page trong navigation
     * @param {string} pageName - Tên page (dashboard, tts, history)
     */
    setActivePage(pageName) {
        // Remove active class từ tất cả nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            link.classList.add('text-dim');
        });

        // Add active class cho page hiện tại
        const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            activeLink.classList.remove('text-dim');
        }
    }

    /**
     * Update header info (credits, email)
     * @param {Object} data - { credits, email }
     */
    updateHeaderInfo(data = {}) {
        if (data.credits !== undefined) {
            const creditsEl = document.getElementById('header-credits');
            if (creditsEl) creditsEl.textContent = data.credits;
        }
        if (data.email) {
            const emailEl = document.getElementById('header-email');
            if (emailEl) emailEl.textContent = data.email;
        }
    }

    /**
     * Update user info trong sidebar
     * @param {Object} data - { name, avatar, plan }
     */
    updateUserInfo(data = {}) {
        if (data.name) {
            const nameEl = document.getElementById('user-name');
            if (nameEl) nameEl.textContent = data.name;
            
            // Update avatar letter
            const avatarEl = document.getElementById('user-avatar');
            if (avatarEl && !data.avatar) {
                avatarEl.innerHTML = `<span class="text-sm font-bold text-white">${data.name.charAt(0).toUpperCase()}</span>`;
            }
        }
        if (data.avatar) {
            const avatarEl = document.getElementById('user-avatar');
            if (avatarEl) {
                avatarEl.innerHTML = `<img src="${data.avatar}" alt="Avatar" class="w-full h-full object-cover">`;
            }
        }
    }

    /**
     * Update page title trong header
     * @param {string} title - Tiêu đề trang
     */
    setPageTitle(title) {
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = title;
    }

    /**
     * Setup logout handler
     */
    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                // Dispatch custom event để page có thể handle
                const event = new CustomEvent('app:logout');
                document.dispatchEvent(event);
                
                // Default behavior - có thể override
                if (typeof handleLogout === 'function') {
                    handleLogout();
                }
            });
        }
    }
}

// Export instance
const componentLoader = new ComponentLoader();

// Auto-init khi DOM ready (nếu có data attributes)
document.addEventListener('DOMContentLoaded', () => {
    const autoInit = document.querySelector('[data-auto-load-layout]');
    if (autoInit) {
        const activePage = autoInit.dataset.activePage || 'dashboard';
        componentLoader.loadLayout({ activePage });
    }
});
