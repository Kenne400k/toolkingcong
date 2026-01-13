// =================== INTERNATIONALIZATION (i18n) ===================
// Language system for KingCong TTS Tool

const i18n = {
    currentLang: localStorage.getItem('app_language') || 'vi',

    translations: {
        vi: {
            // Common
            dashboard: 'Dashboard',
            text_to_speech: 'Text to Speech',
            voice_cloning: 'Voice Cloning',
            pro_tool: 'Pro Tool',
            logout: 'Đăng xuất',
            credits: 'Credits',

            // Voice Cloning Page
            vc_banner: 'Nhân bản bất cứ giọng nói nào mà bạn muốn, không còn nỗi lo không tìm thấy giọng phù hợp. (sử dụng Minimax)',
            vc_voice_name: 'Tên Giọng Nói <span>*</span>',
            vc_voice_name_placeholder: 'VD: Giọng đọc tin tức',
            vc_upload_audio: 'Tải Lên File Âm Thanh <span>*</span>',
            vc_drag_drop: 'Kéo thả file hoặc nhấn để chọn',
            vc_duration_hint: 'Thời lượng 10s - 2 phút, tối đa 20MB',
            vc_format_hint: 'Hiện chỉ hỗ trợ: .mp3',
            vc_remove_file: 'Xóa file',
            vc_select_language: 'Chọn Ngôn Ngữ',
            vc_auto_detect: 'Tự xác định',
            vc_search: 'Tìm kiếm...',
            vc_select_gender: 'Chọn Giới Tính',
            vc_male: 'Nam',
            vc_female: 'Nữ',
            vc_preview_text: 'Văn Bản Nghe Trước (Tùy chọn)',
            vc_preview_placeholder: 'Nhập văn bản (Nếu để trống, hệ thống sẽ tự dùng mẫu câu mặc định)...',
            vc_chars: 'ký tự',
            vc_remove_noise: 'Loại Bỏ Tiếng Ồn',
            vc_clone_btn: 'Nhân Bản',
            vc_library_title: 'Thư viện giọng nhân bản',
            vc_voices: 'giọng',
            vc_refresh: 'Làm mới',
            vc_loading: 'Đang tải danh sách...',
            vc_confirm_delete: 'Xác nhận xóa giọng',
            vc_confirm_delete_msg: 'Bạn có chắc chắn muốn xóa giọng',
            vc_cannot_undo: 'Hành động này không thể hoàn tác.',
            vc_cancel: 'Hủy',
            vc_delete: 'Xóa',
            vc_processing: 'Đang xử lý...',
            vc_processing_hint: 'AI đang học giọng nói của bạn. Quá trình này có thể mất 1-2 phút.',
            vc_notification: 'Thông báo',
            vc_use_voice: 'Sử dụng',
            vc_play: 'Phát',
            vc_stop: 'Dừng',
            vc_no_voices: 'Chưa có giọng nào',
            vc_no_voices_hint: 'Tạo giọng nhân bản đầu tiên của bạn',

            // Dashboard
            db_welcome: 'Chào mừng trở lại,',
            db_overview: 'Tổng quan',
            db_total_tasks: 'Tổng số tác vụ',
            db_credits_remaining: 'Credits còn lại',
            db_pending_tasks: 'Tác vụ đang chờ',
            db_success_rate: 'Tỷ lệ thành công',
            db_recent_tasks: 'Tác vụ gần đây',
            db_view_all: 'Xem tất cả',
            db_new_task: 'Tác vụ mới',
            db_loading: 'Đang tải dashboard...',

            // TTS Page
            tts_title: 'Text to Speech',
            tts_enter_text: 'Nhập văn bản của bạn tại đây.',
            tts_no_limit: 'Không giới hạn ký tự văn bản.',
            tts_select_voice: 'Chọn giọng nói...',
            tts_generate: 'Tạo Giọng Nói',
            tts_settings: 'Cài đặt',
            tts_history: 'Lịch sử',

            // Pro Tool
            pt_title: 'Pro Tool',
            pt_ready: 'Sẵn sàng',
            pt_tasks: 'tác vụ',
        },

        en: {
            // Common
            dashboard: 'Dashboard',
            text_to_speech: 'Text to Speech',
            voice_cloning: 'Voice Cloning',
            pro_tool: 'Pro Tool',
            logout: 'Logout',
            credits: 'Credits',

            // Voice Cloning Page
            vc_banner: 'Clone any voice you want, no more worrying about not finding the right voice. (using Minimax)',
            vc_voice_name: 'Voice Name <span>*</span>',
            vc_voice_name_placeholder: 'E.g.: News reader voice',
            vc_upload_audio: 'Upload Audio File <span>*</span>',
            vc_drag_drop: 'Drag & drop file or click to select',
            vc_duration_hint: 'Duration 10s - 2 minutes, max 20MB',
            vc_format_hint: 'Currently supports: .mp3',
            vc_remove_file: 'Remove file',
            vc_select_language: 'Select Language',
            vc_auto_detect: 'Auto detect',
            vc_search: 'Search...',
            vc_select_gender: 'Select Gender',
            vc_male: 'Male',
            vc_female: 'Female',
            vc_preview_text: 'Preview Text (Optional)',
            vc_preview_placeholder: 'Enter text (If empty, system will use default sample)...',
            vc_chars: 'characters',
            vc_remove_noise: 'Remove Noise',
            vc_clone_btn: 'Clone Voice',
            vc_library_title: 'Cloned Voice Library',
            vc_voices: 'voices',
            vc_refresh: 'Refresh',
            vc_loading: 'Loading list...',
            vc_confirm_delete: 'Confirm Delete Voice',
            vc_confirm_delete_msg: 'Are you sure you want to delete voice',
            vc_cannot_undo: 'This action cannot be undone.',
            vc_cancel: 'Cancel',
            vc_delete: 'Delete',
            vc_processing: 'Processing...',
            vc_processing_hint: 'AI is learning your voice. This process may take 1-2 minutes.',
            vc_notification: 'Notification',
            vc_use_voice: 'Use',
            vc_play: 'Play',
            vc_stop: 'Stop',
            vc_no_voices: 'No voices yet',
            vc_no_voices_hint: 'Create your first cloned voice',

            // Dashboard
            db_welcome: 'Welcome back,',
            db_overview: 'Overview',
            db_total_tasks: 'Total Tasks',
            db_credits_remaining: 'Credits Remaining',
            db_pending_tasks: 'Pending Tasks',
            db_success_rate: 'Success Rate',
            db_recent_tasks: 'Recent Tasks',
            db_view_all: 'View All',
            db_new_task: 'New Task',
            db_loading: 'Loading dashboard...',

            // TTS Page
            tts_title: 'Text to Speech',
            tts_enter_text: 'Enter your text here.',
            tts_no_limit: 'No character limit.',
            tts_select_voice: 'Select voice...',
            tts_generate: 'Generate Voice',
            tts_settings: 'Settings',
            tts_history: 'History',

            // Pro Tool
            pt_title: 'Pro Tool',
            pt_ready: 'Ready',
            pt_tasks: 'tasks',
        }
    },

    // Get translation
    t(key) {
        return this.translations[this.currentLang][key] || this.translations['vi'][key] || key;
    },

    // Set language
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('app_language', lang);
            this.applyTranslations();
            return true;
        }
        return false;
    },

    // Toggle language
    toggleLanguage() {
        const newLang = this.currentLang === 'vi' ? 'en' : 'vi';
        this.setLanguage(newLang);
        return newLang;
    },

    // Apply translations to all elements with data-i18n attribute
    applyTranslations() {
        // Text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[this.currentLang][key]) {
                el.innerHTML = this.translations[this.currentLang][key];
            }
        });

        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (this.translations[this.currentLang][key]) {
                el.placeholder = this.translations[this.currentLang][key];
            }
        });

        // Titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (this.translations[this.currentLang][key]) {
                el.title = this.translations[this.currentLang][key];
            }
        });

        // Update language switcher button
        const langBtn = document.getElementById('langSwitchBtn');
        if (langBtn) {
            langBtn.textContent = this.currentLang.toUpperCase();
        }
    },

    // Initialize
    init() {
        // Apply saved language
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        }

        // Apply translations on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.applyTranslations();
                this.updateLangButton();
            });
        } else {
            this.applyTranslations();
            this.updateLangButton();
        }
    },

    // Update language button text
    updateLangButton() {
        const langBtn = document.getElementById('langSwitchBtn');
        if (langBtn) {
            langBtn.textContent = this.currentLang.toUpperCase();
            langBtn.title = this.currentLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt';
        }
    }
};

// Auto initialize
i18n.init();

// Global function for language toggle
function toggleAppLanguage() {
    const newLang = i18n.toggleLanguage();
    i18n.updateLangButton();
    console.log('Language changed to:', newLang);
}
