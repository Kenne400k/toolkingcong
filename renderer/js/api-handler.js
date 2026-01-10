// renderer/js/api-handler.js
// Centralized API handler - All API calls go through here

class APIHandler {
    constructor() {
        this.session = null;
        this.requestQueue = [];
        this.isProcessing = false;
    }

    /**
     * Initialize handler with session
     */
    async init() {
        try {
            this.session = window.__SESSION__ || await window.electronAPI.getSession();
            if (!this.session) {
                throw new Error('No session found');
            }
            console.log('✅ API Handler initialized');
            return true;
        } catch (error) {
            console.error('❌ API Handler init failed:', error);
            return false;
        }
    }

    /**
     * Make API request through Electron IPC
     * @param {string} action - API action name
     * @param {object} data - Request data
     * @param {object} options - Additional options
     * @returns {Promise<object>} API response
     */
    async request(action, data = {}, options = {}) {
        const {
            timeout = 30000,
            retries = 1,
            showLoading = false
        } = options;

        console.log(`🔄 API Request: ${action}`, data);

        try {
            // Show loading if needed
            if (showLoading && typeof this.showLoader === 'function') {
                this.showLoader(true);
            }

            // Make request through Electron IPC
            const response = await this.makeRequest(action, data, timeout, retries);

            // Hide loading
            if (showLoading && typeof this.showLoader === 'function') {
                this.showLoader(false);
            }

            // Validate response
            if (!response) {
                throw new Error('Empty response from API');
            }

            if (response.status === 'error') {
                throw new Error(response.message || 'API error');
            }

            console.log(`✅ API Success: ${action}`, response);
            return response;

        } catch (error) {
            console.error(`❌ API Error: ${action}`, error);
            
            // Hide loading
            if (showLoading && typeof this.showLoader === 'function') {
                this.showLoader(false);
            }

            throw error;
        }
    }

    /**
     * Internal method to make request with retry logic
     */
    async makeRequest(action, data, timeout, retries) {
        let lastError;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`🔄 Retry ${attempt}/${retries} for ${action}`);
                    await this.delay(1000 * attempt); // Exponential backoff
                }

                const response = await Promise.race([
                    window.electronAPI.apiRequest(action, data),
                    this.timeoutPromise(timeout)
                ]);

                return response;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Attempt ${attempt + 1} failed:`, error.message);
            }
        }

        throw lastError;
    }

    /**
     * Timeout promise helper
     */
    timeoutPromise(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
        });
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =================== SPECIFIC API METHODS ===================

    /**
     * Create TTS speech task
     */
    async createSpeech(params) {
        const requiredFields = ['provider', 'text', 'voice_id', 'model_id'];
        
        // Validate required fields
        for (const field of requiredFields) {
            if (!params[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        return await this.request('create_speech', params, {
            timeout: 60000, // 60s for speech generation
            retries: 0, // No retry for create
            showLoading: true
        });
    }

    /**
     * Check task status
     */
    async checkStatus(taskId) {
        if (!taskId) {
            throw new Error('Task ID is required');
        }

        return await this.request('check_status', {
            task_id: taskId
        }, {
            timeout: 10000,
            retries: 2
        });
    }

    /**
     * Get history with pagination
     */
    async getHistory(page = 1, limit = 20) {
        return await this.request('get_history_detailed_v2', {
            page: page,
            limit: limit
        }, {
            timeout: 15000,
            retries: 2,
            showLoading: true
        });
    }

    /**
     * Delete task
     */
    async deleteTask(taskId) {
        if (!taskId) {
            throw new Error('Task ID is required');
        }

        return await this.request('delete_task_v2', {
            task_id: taskId
        }, {
            timeout: 10000,
            retries: 1
        });
    }

    /**
     * Delete task with refund
     */
    async deleteTaskWithRefund(taskId, currentProgress, originalCost) {
        if (!taskId) {
            throw new Error('Task ID is required');
        }

        return await this.request('delete_task_with_refund', {
            task_id: taskId,
            current_progress: currentProgress || 0,
            original_cost: originalCost || 0
        }, {
            timeout: 10000,
            retries: 1
        });
    }

    /**
     * Get system stats (admin only)
     */
    async getSystemStats() {
        return await this.request('get_system_stats', {}, {
            timeout: 10000,
            retries: 1
        });
    }

    /**
     * Get resources (voices, models) from server
     * @returns {Promise<object>} { status, data: { elevenlabs: {...}, minimax: {...} } }
     */
    async getResources() {
        try {
            console.log('🔄 Loading resources (voices, models)...');
            const response = await window.electronAPI.getResources();
            
            if (response.status === 'success') {
                console.log('✅ Resources loaded successfully');
                return response;
            } else {
                throw new Error(response.message || 'Failed to load resources');
            }
        } catch (error) {
            console.error('❌ Get resources error:', error);
            throw error;
        }
    }

    // =================== BATCH OPERATIONS ===================

    /**
     * Check multiple tasks status at once
     */
    async checkMultipleStatus(taskIds) {
        const results = await Promise.allSettled(
            taskIds.map(id => this.checkStatus(id))
        );

        return results.map((result, index) => ({
            task_id: taskIds[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason : null
        }));
    }

    /**
     * Delete multiple tasks
     */
    async deleteMulitpleTasks(taskIds) {
        const results = await Promise.allSettled(
            taskIds.map(id => this.deleteTask(id))
        );

        return {
            total: taskIds.length,
            success: results.filter(r => r.status === 'fulfilled').length,
            failed: results.filter(r => r.status === 'rejected').length,
            results: results
        };
    }

    // =================== UTILITIES ===================

    /**
     * Update session (e.g., after credit change)
     */
    updateSession(newSession) {
        this.session = { ...this.session, ...newSession };
        window.__SESSION__ = this.session;
    }

    /**
     * Get current credits
     */
    getCredits() {
        return this.session?.credits3 || 0;
    }

    /**
     * Set loader callback
     */
    setLoaderCallback(callback) {
        this.showLoader = callback;
    }

    /**
     * Validate session
     */
    hasValidSession() {
        return !!(this.session && this.session.user_id);
    }

    /**
     * Clear session
     */
    clearSession() {
        this.session = null;
        window.__SESSION__ = null;
    }
}

// Create singleton instance
const apiHandler = new APIHandler();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiHandler;
}

// Also expose globally for easy access in browser console (for debugging)
window.apiHandler = apiHandler;