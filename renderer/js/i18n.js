// =================== INTERNATIONALIZATION (i18n) ===================
// Language system for KingCong TTS Tool

const i18n = {
    currentLang: localStorage.getItem('app_language') || 'vi',

    translations: {
        vi: {
            // Common
            dashboard: 'Trang chủ',
            text_to_speech: 'Chuyển đổi văn bản thành giọng nói',
            voice_cloning: 'Giọng nhân bản',
            pro_tool: 'Công cụ nâng cao',
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
            db_tagline: 'Đây là những gì đang xảy ra với các dự án lồng tiếng của bạn hôm nay.',
            db_tbl_id: 'ID Tác vụ',
            db_tbl_preview: 'Xem trước',
            db_tbl_voice: 'Giọng đọc',
            db_tbl_status: 'Trạng thái',
            db_tbl_cost: 'Chi phí',
            db_tbl_date: 'Ngày tạo',
            db_tbl_loading: 'Đang tải tác vụ...',

            // TTS Page
            tts_title: 'Chuyển đổi văn bản thành giọng nói',
            tts_enter_text: 'Nhập văn bản của bạn tại đây.',
            tts_no_limit: 'Không giới hạn ký tự văn bản.',
            tts_select_voice: 'Chọn giọng nói...',
            tts_generate: 'Tạo Giọng Nói',
            tts_settings: 'Cài đặt',
            tts_history: 'Lịch sử',
            tts_loading: 'Đang tải...',
            tts_wait_moment: 'Vui lòng đợi trong giây lát',
            tts_processing: 'Đang xử lý...',
            tts_tip_minimax: 'Tiếng Việt nên sử dụng <b>Minimax</b>',
            tts_tip_break: '💡 <code class="es-code">&lt;break time="0.5s" /&gt;</code> để nghỉ 0.5 giây',
            tts_tip_drag: '📁 Kéo thả tệp <b>.txt, .srt</b> vào đây',
            tts_upload: 'Tải lên',
            tts_upload_file: 'Tải lên tệp (.txt .srt .zip)',
            tts_upload_folder: 'Tải lên thư mục',
            tts_clear: 'Xóa',
            tts_clear_title: 'Xóa toàn bộ văn bản',
            tts_fee_info: 'Bao gồm phí xử lý',
            tts_fee_processing: '• Bao gồm phí xử lý: <span style="color: #fff; font-weight: 600;">x1.12</span>',
            tts_fee_srt: '• Định dạng SRT đắt hơn: <span style="color: #fff; font-weight: 600;">x1.2</span>',
            tts_provider_eleven_desc: 'Giọng đọc tự nhiên và nhiều người dùng hơn.',
            tts_provider_minimax_desc: 'Nói tốt tiếng Việt. Có thể sử dụng giọng nhân bản.',
            tts_refresh: 'Làm mới',
            tts_details: 'Chi tiết',
            tts_select_model: 'Chọn mô hình ngôn ngữ',
            tts_speed: 'Tốc độ',
            tts_pitch: 'Cao độ',
            tts_volume: 'Âm lượng',
            tts_stability: 'Độ ổn định',
            tts_similarity: 'Độ tương đồng',
            tts_style_exaggeration: 'Phóng đại phong cách',
            tts_voice_boost: 'Tăng cường giọng nói',
            tts_subtitles: 'Phụ đề',
            tts_subtitle_fee: '+15% phí',
            tts_reset: 'Đặt lại',
            tts_model_info: 'Thông tin Mô hình',
            tts_history_loading: 'Đang tải...',
            tts_history_end: 'Đã hiển thị toàn bộ lịch sử',
            tts_vmodal_default: 'Mặc định',
            tts_vmodal_cloned: 'Giọng nhân bản',
            tts_vmodal_library: 'Thư viện giọng nói',
            tts_vmodal_favorites: 'Yêu thích',
            tts_vmodal_search: 'Tìm kiếm giọng đọc...',
            tts_vmodal_sort_most_used: 'Dùng nhiều nhất',
            tts_vmodal_sort_trending: 'Xu hướng',
            tts_vmodal_sort_newest: 'Mới nhất',
            tts_vmodal_sort_chars: 'Ký tự được tạo',
            tts_vmodal_filter_lang: 'Ngôn ngữ',
            tts_vmodal_filter_gender: 'Giới tính',
            tts_vmodal_filter_age: 'Độ tuổi',
            tts_vmodal_all: 'Tất cả',
            tts_vmodal_male: 'Nam',
            tts_vmodal_female: 'Nữ',
            tts_vmodal_young: 'Trẻ',
            tts_vmodal_middle_aged: 'Trung niên',
            tts_vmodal_old: 'Lớn tuổi',
            tts_vmodal_loading: 'Đang tải danh sách giọng...',
            tts_del_task_title: 'Xóa tác vụ',
            tts_del_task_warn: 'Bạn có chắc chắn muốn xóa tác vụ này? Hành động này không thể hoàn tác.',
            tts_del_task_note: 'Nếu tác vụ bị treo quá 24h sẽ được hoàn tín dụng.',
            tts_del_task_cancel: 'Hủy',
            tts_del_task_confirm: 'Xóa',
            tts_history_modal_title: 'Lịch sử',
            tts_history_modal_refresh: 'Làm mới',
            tts_history_modal_delete: 'Xóa',
            tts_history_modal_download_audio: 'Tải xuống Audio',
            tts_history_modal_download_srt: 'Tải xuống SRT',
            tts_history_modal_loading: 'Đang tải dữ liệu...',
            tts_drop_overlay_title: 'Thả tệp vào đây',
            tts_drop_overlay_desc: 'Hỗ trợ .txt, .srt, .zip',

            // Pro Tool
            pt_title: 'Công cụ nâng cao',
            pt_ready: 'Sẵn sàng',
            pt_tasks: 'tác vụ',
            
            // JS specific
            js_select_voice: 'Chọn giọng nói...',
            js_processing: 'Đang xử lý',
            js_done: 'Hoàn thành',
            js_failed: 'Thất bại',
            js_timeout: 'Timeout',
            js_queued: 'Hàng đợi',
            js_no_voices_found: 'Không tìm thấy giọng nói',
            js_clear_filters: 'Xóa bộ lọc',
            js_searching: 'Đang tìm kiếm...',
            js_not_found: 'Không tìm thấy',
            js_delete_confirm: 'Bạn có chắc chắn muốn xóa?',
            js_delete_success: 'Đã xóa thành công',
            js_select_voice_first: 'Vui lòng chọn giọng nói trước!',
            js_enter_text: 'Vui lòng nhập văn bản!',
            js_copied: 'Đã copy!',
            js_added_to_favorites: 'Đã thêm vào yêu thích',
            js_removed_from_favorites: 'Đã xóa khỏi yêu thích',
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
            db_tagline: 'Here\'s what\'s happening with your voice projects today.',
            db_tbl_id: 'Task ID',
            db_tbl_preview: 'Text Preview',
            db_tbl_voice: 'Voice',
            db_tbl_status: 'Status',
            db_tbl_cost: 'Cost',
            db_tbl_date: 'Date',
            db_tbl_loading: 'Loading tasks...',

            // TTS Page
            tts_title: 'Text to Speech',
            tts_enter_text: 'Enter your text here.',
            tts_no_limit: 'No character limit.',
            tts_select_voice: 'Select voice...',
            tts_generate: 'Generate Voice',
            tts_settings: 'Settings',
            tts_history: 'History',
            tts_loading: 'Loading...',
            tts_wait_moment: 'Please wait a moment',
            tts_processing: 'Processing...',
            tts_tip_minimax: 'For Vietnamese, it\'s recommended to use <b>Minimax</b>',
            tts_tip_break: '💡 Use <code class="es-code">&lt;break time="0.5s" /&gt;</code> for a 0.5s pause',
            tts_tip_drag: '📁 Drag & drop <b>.txt, .srt</b> files here',
            tts_upload: 'Upload',
            tts_upload_file: 'Upload file (.txt .srt .zip)',
            tts_upload_folder: 'Upload folder',
            tts_clear: 'Clear',
            tts_clear_title: 'Clear all text',
            tts_fee_info: 'Includes processing fees',
            tts_fee_processing: '• Includes processing fee: <span style="color: #fff; font-weight: 600;">x1.12</span>',
            tts_fee_srt: '• SRT format is more expensive: <span style="color: #fff; font-weight: 600;">x1.2</span>',
            tts_provider_eleven_desc: 'Natural voices and a larger user base.',
            tts_provider_minimax_desc: 'Speaks Vietnamese well. Can use cloned voices.',
            tts_refresh: 'Refresh',
            tts_details: 'Details',
            tts_select_model: 'Select language model',
            tts_speed: 'Speed',
            tts_pitch: 'Pitch',
            tts_volume: 'Volume',
            tts_stability: 'Stability',
            tts_similarity: 'Similarity Boost',
            tts_style_exaggeration: 'Style Exaggeration',
            tts_voice_boost: 'Speaker Boost',
            tts_subtitles: 'Subtitles',
            tts_subtitle_fee: '+15% fee',
            tts_reset: 'Reset',
            tts_model_info: 'Model Information',
            tts_history_loading: 'Loading...',
            tts_history_end: 'All history has been displayed',
            tts_vmodal_default: 'Default',
            tts_vmodal_cloned: 'Cloned Voices',
            tts_vmodal_library: 'Voice Library',
            tts_vmodal_favorites: 'Favorites',
            tts_vmodal_search: 'Search for a voice...',
            tts_vmodal_sort_most_used: 'Most Used',
            tts_vmodal_sort_trending: 'Trending',
            tts_vmodal_sort_newest: 'Newest',
            tts_vmodal_sort_chars: 'Characters Generated',
            tts_vmodal_filter_lang: 'Language',
            tts_vmodal_filter_gender: 'Gender',
            tts_vmodal_filter_age: 'Age',
            tts_vmodal_all: 'All',
            tts_vmodal_male: 'Male',
            tts_vmodal_female: 'Female',
            tts_vmodal_young: 'Young',
            tts_vmodal_middle_aged: 'Middle-aged',
            tts_vmodal_old: 'Old',
            tts_vmodal_loading: 'Loading voice list...',
            tts_del_task_title: 'Delete Task',
            tts_del_task_warn: 'Are you sure you want to delete this task? This action cannot be undone.',
            tts_del_task_note: 'If the task is stuck for more than 24 hours, credits will be refunded.',
            tts_del_task_cancel: 'Cancel',
            tts_del_task_confirm: 'Delete',
            tts_history_modal_title: 'History',
            tts_history_modal_refresh: 'Refresh',
            tts_history_modal_delete: 'Delete',
            tts_history_modal_download_audio: 'Download Audio',
            tts_history_modal_download_srt: 'Download SRT',
            tts_history_modal_loading: 'Loading data...',
            tts_drop_overlay_title: 'Drop file here',
            tts_drop_overlay_desc: 'Supports .txt, .srt, .zip',

            // Pro Tool
            pt_title: 'Pro Tool',
            pt_ready: 'Ready',
            pt_tasks: 'tasks',
            
            // JS specific
            js_select_voice: 'Select voice...',
            js_processing: 'Processing',
            js_done: 'Done',
            js_failed: 'Failed',
            js_timeout: 'Timeout',
            js_queued: 'Queued',
            js_no_voices_found: 'No voices found',
            js_clear_filters: 'Clear filters',
            js_searching: 'Searching...',
            js_not_found: 'Not found',
            js_delete_confirm: 'Are you sure you want to delete?',
            js_delete_success: 'Successfully deleted',
            js_select_voice_first: 'Please select a voice first!',
            js_enter_text: 'Please enter text!',
            js_copied: 'Copied!',
            js_added_to_favorites: 'Added to favorites',
            js_removed_from_favorites: 'Removed from favorites',
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
