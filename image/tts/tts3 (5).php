<?php
// pages/AI/tts3.php
$page_title = 'Text to Speech - Studio';
require_once '../../config/header.php';
require_once '../../config/api_config.php'; 
require_once '../../config/sidebar.php';
require_once '../../config/genai_backup.php';

// ========== KHỞI TẠO GENAI BACKUP ==========
$genai = new GenAIBackup($mysqli);

// ========== ĐỊNH NGHĨA ĐA NGÔN NGỮ ==========
$translations = [
    'vi' => [
        // Page & Sections
        'page_title' => 'Văn bản thành giọng nói',
        'settings' => 'Cài đặt',
        'history' => 'Lịch sử',
        'refresh' => 'Làm mới',
        'details' => 'Chi tiết',
        
        // Voice Selection
        'choose_voice' => 'Chọn giọng nói',
        'select_voice' => 'Chọn giọng nói...',
        'default' => 'Mặc định',
        'cloned' => 'Giọng nhân bản',
        'library' => 'Thư viện giọng nói',
        'favorites' => 'Yêu thích',
        'search_voice' => 'Tìm kiếm giọng đọc...',
        
        // Language & Model
        'select_language' => 'Chọn ngôn ngữ',
        'auto_detect' => 'Tự xác định',
        'select_model' => 'Chọn mô hình ngôn ngữ',
        
        // Audio Controls
        'speed' => 'Tốc độ',
        'pitch' => 'Cao độ',
        'volume' => 'Âm lượng',
        'stability' => 'Độ ổn định',
        'similarity' => 'Độ tương đồng',
        'style_exaggeration' => 'Phóng đại phong cách',
        'speaker_boost' => 'Tăng cường giọng nói',
        
        // Actions
        'reset' => 'Đặt lại',
        'generate_voice' => 'Tạo Giọng Nói',
        'upload' => 'Tải lên',
        'upload_file' => 'Tải lên tệp (.txt .zip)',
        'upload_folder' => 'Tải lên thư mục',
        'use' => 'Dùng',
        'play' => 'Nghe thử',
        'copy_id' => 'Copy ID',
        
        // Costs & Credits
        'estimated_cost' => 'Tín dụng đã tính',
        'current_credits' => 'Số dư hiện tại',
        'credits' => 'credits',
        'credit_used' => 'Tín dụng sử dụng',
        'processing_fee' => 'Bao gồm phí xử lý',
        'srt_fee' => 'Định dạng SRT đắt hơn',
        'clone_fee' => 'Giọng Clone',
        'subtitle' => 'Phụ đề',
        'fee' => 'phí',
        
        // Input Area
        'enter_text' => 'Nhập văn bản của bạn tại đây.',
        'no_char_limit' => 'Không giới hạn ký tự văn bản.',
        'tip_vietnamese' => 'Tiếng Việt nên sử dụng',
        'tip_break' => 'để nghỉ 0.5 giây',
        'tip_drag_drop' => 'Kéo thả tệp',
        'tip_here' => 'vào đây',
        
        // Filters
        'all' => 'Tất cả',
        'language' => 'Ngôn ngữ',
        'gender' => 'Giới tính',
        'age' => 'Độ tuổi',
        'style' => 'Phong cách',
        'accent' => 'Giọng',
        'male' => 'Nam',
        'female' => 'Nữ',
        'young' => 'Trẻ',
        'middle_aged' => 'Trung niên',
        'old' => 'Lớn tuổi',
        
        // Status
        'loading' => 'Đang tải',
        'processing' => 'Đang xử lý',
        'done' => 'Xong',
        'completed' => 'Hoàn thành',
        'failed' => 'Thất bại',
        'queued' => 'Hàng đợi',
        'waiting' => 'Đang chờ',
        
        // Messages
        'no_voices' => 'Không tìm thấy giọng nói',
        'no_results' => 'Không tìm thấy kết quả phù hợp',
        'clear_filters' => 'Xóa bộ lọc',
        'loading_voices' => 'Đang tải danh sách giọng...',
        'please_wait' => 'Vui lòng đợi trong giây lát',
        
        // Sort
        'sort_by' => 'Sắp xếp theo',
        'most_used' => 'Dùng nhiều nhất',
        'newest' => 'Mới nhất',
        'trending' => 'Xu hướng',
        'chars_generated' => 'Ký tự được tạo',
    ],
    
    'en' => [
        // Page & Sections
        'page_title' => 'Text to Speech',
        'settings' => 'Settings',
        'history' => 'History',
        'refresh' => 'Refresh',
        'details' => 'Details',
        
        // Voice Selection
        'choose_voice' => 'Choose Voice',
        'select_voice' => 'Select voice...',
        'default' => 'Default',
        'cloned' => 'Cloned Voice',
        'library' => 'Voice Library',
        'favorites' => 'Favorites',
        'search_voice' => 'Search voices...',
        
        // Language & Model
        'select_language' => 'Select Language',
        'auto_detect' => 'Auto Detect',
        'select_model' => 'Select Language Model',
        
        // Audio Controls
        'speed' => 'Speed',
        'pitch' => 'Pitch',
        'volume' => 'Volume',
        'stability' => 'Stability',
        'similarity' => 'Similarity',
        'style_exaggeration' => 'Style Exaggeration',
        'speaker_boost' => 'Speaker Boost',
        
        // Actions
        'reset' => 'Reset',
        'generate_voice' => 'Generate Voice',
        'upload' => 'Upload',
        'upload_file' => 'Upload file (.txt .zip)',
        'upload_folder' => 'Upload folder',
        'use' => 'Use',
        'play' => 'Preview',
        'copy_id' => 'Copy ID',
        
        // Costs & Credits
        'estimated_cost' => 'Estimated Cost',
        'current_credits' => 'Current Balance',
        'credits' => 'credits',
        'credit_used' => 'Credits Used',
        'processing_fee' => 'Including processing fee',
        'srt_fee' => 'SRT format is more expensive',
        'clone_fee' => 'Clone Voice',
        'subtitle' => 'Subtitle',
        'fee' => 'fee',
        
        // Input Area
        'enter_text' => 'Enter your text here.',
        'no_char_limit' => 'No character limit.',
        'tip_vietnamese' => 'For Vietnamese, use',
        'tip_break' => 'to pause 0.5s',
        'tip_drag_drop' => 'Drag and drop',
        'tip_here' => 'here',
        
        // Filters
        'all' => 'All',
        'language' => 'Language',
        'gender' => 'Gender',
        'age' => 'Age',
        'style' => 'Style',
        'accent' => 'Accent',
        'male' => 'Male',
        'female' => 'Female',
        'young' => 'Young',
        'middle_aged' => 'Middle Aged',
        'old' => 'Old',
        
        // Status
        'loading' => 'Loading',
        'processing' => 'Processing',
        'done' => 'Done',
        'completed' => 'Completed',
        'failed' => 'Failed',
        'queued' => 'Queued',
        'waiting' => 'Waiting',
        
        // Messages
        'no_voices' => 'No voices found',
        'no_results' => 'No results found',
        'clear_filters' => 'Clear filters',
        'loading_voices' => 'Loading voice list...',
        'please_wait' => 'Please wait a moment',
        
        // Sort
        'sort_by' => 'Sort by',
        'most_used' => 'Most Used',
        'newest' => 'Newest',
        'trending' => 'Trending',
        'chars_generated' => 'Characters Generated',
    ]
];

$t = $translations[$lang];
// ========== CHECK MAINTENANCE MODE (SERVER 3 - KINGCONG) ==========
$elevenlabs_down = false;
$minimax_down = false;

if (isset($mysqli)) {
    $stmt_check = $mysqli->prepare("
        SELECT service_path, is_active 
        FROM maintenance_mode 
        WHERE service_path IN (
            '/ai/kingcong/text_to_speech?provider=elevenlabs',
            '/ai/kingcong/text_to_speech?provider=minimax'
        )
    ");
    
    if ($stmt_check) {
        $stmt_check->execute();
        $res = $stmt_check->get_result();
        
        while ($row = $res->fetch_assoc()) {
            if ($row['is_active'] == 1) {
                if ($row['service_path'] === '/ai/kingcong/text_to_speech?provider=elevenlabs') $elevenlabs_down = true;
                if ($row['service_path'] === '/ai/kingcong/text_to_speech?provider=minimax') $minimax_down = true; 
            }
        }
        $stmt_check->close();
    }
}

// 1. Logic chuyển hướng: Nếu cả 2 cùng sập -> Ra trang bảo trì
if ($elevenlabs_down && $minimax_down) {
    header("Location: /pages/maintenance.php?path=" . urlencode('/ai/kingcong/text_to_speech'));
    exit(); 
}

// ========== GET USER INFO ==========
$current_credits = 0;
$user_id_real = null;

if (isset($_SESSION['Users'])) {
    $user_identity = $_SESSION['Users'];
    
    if (isset($mysqli)) {
        $stmt = $mysqli->prepare("
            SELECT id, credits3
            FROM Users 
            WHERE taikhoan = ? OR google_id = ?
        ");
        $stmt->bind_param("ss", $user_identity, $user_identity);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        
        if ($res) {
            $user_id_real = $res['id'];
            $current_credits = intval($res['credits3']); // ← LẤY credits3
        }
        $stmt->close();
    }
}
// ========== CHECK BACKUP ELIGIBILITY ==========
$backup_eligible = true;
$backup_message = '';

if ($elevenlabs_down && $user_id_real) {
    $eligibility = $genai->canUseBackup($user_id_real, $current_credits);
    
    if (!$eligibility['allowed']) {
        $backup_eligible = false;
        $backup_message = $eligibility['message'];
    }
}
?>
<link rel="stylesheet" href="/pages/AI/css/tts.css?v=<?php echo time(); ?>">

<style>/* Nút xóa trong Modal Chi tiết */
.dh-delete-btn {
    background: transparent;
    border: 1px solid #333;
    color: #888;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
}

.dh-delete-btn:hover {
    border-color: #ef4444;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.dh-delete-btn:active {
    transform: scale(0.95);
}</style>

<div class="tts-container" style="position: relative;">
    
    <!-- ========== PAGE LOADER ========== -->
    <div id="pageLoader" style="
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(11, 11, 11, 0.95);
        backdrop-filter: blur(8px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 50;
        border-radius: 16px;
    ">
        <div style="text-align: center;">
            <div class="spinner-border" style="width: 50px; height: 50px; color: #667eea;"></div>
            <div style="color: #fff; font-size: 16px; font-weight: 600; margin-top: 20px;"><?php echo $t['loading']; ?>...</div>
            <div style="color: #888; font-size: 13px; margin-top: 8px;"><?php echo $t['please_wait']; ?></div>
        </div>
    </div>

    <!-- ========== INPUT AREA ========== -->
    <div class="input-area" id="dropZone">
        <div id="inputLoader" class="loading-overlay">
            <div style="text-align:center; color:#fff;">
                <span class="spinner-border spinner-border-sm"></span>
                <div style="margin-top:10px; font-size:14px;"><?php echo $t['processing']; ?>...</div>
            </div>
        </div>
        
        <div class="textarea-wrapper">
            <div class="textarea-inner">
                <textarea id="txtInput" class="tts-textarea" placeholder=""></textarea>
                
                <div id="emptyState" class="empty-state">
                    <div class="es-title"><?php echo $t['enter_text']; ?></div>
                    <div class="es-subtitle"><?php echo $t['no_char_limit']; ?></div>
                    
                    <div class="es-tips" id="emptyTips">
                        <div class="es-tip">
                            <i class="bi bi-flag-fill" style="color: var(--error);"></i>
                            <span><?php echo $t['tip_vietnamese']; ?> <b>Minimax</b></span>
                        </div>
                        <div class="es-tip">
                            <i class="bi bi-lightbulb-fill" style="color: var(--warning);"></i>
                            <span>💡 <code class="es-code">&lt;break time="0.5s" /&gt;</code> <?php echo $t['tip_break']; ?></span>
                        </div>
                        <div class="es-tip">
                            <i class="bi bi-folder-fill" style="color: #3b82f6;"></i>
                            <span>📁 <?php echo $t['tip_drag_drop']; ?> <b>.txt, .srt</b> <?php echo $t['tip_here']; ?></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="input-footer">
           <div style="display: flex; align-items: center; gap: 12px;">
    <!-- Dropdown Upload -->
    <div style="position: relative;">
    <button class="upload-btn" onclick="toggleUploadDropdown()" id="uploadDropdownBtn">
        <i class="bi bi-upload"></i>
        <?php echo $t['upload']; ?>
        <i class="bi bi-chevron-up" id="uploadChevron" style="font-size: 10px; margin-left: 4px;"></i>
    </button>
    
    <style>
        .upload-option {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            cursor: pointer;
        }
        .upload-option span {
            white-space: nowrap; 
            margin-left: 8px;
        }
    </style>
<style>
/* 🔥 DROPDOWN DOWNLOAD - TRẮNG ĐEN */
.dh-download-wrapper {
    position: relative;
    display: inline-block;
}

.dh-download-btn {
    background: transparent;
    border: 1px solid #333;
    color: #888;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
}

.dh-download-btn:hover {
    border-color: #666;
    color: #fff;
    background: #222;
}

.dh-download-btn:active {
    transform: scale(0.95);
}

/* Menu Dropdown */
.dh-download-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
    min-width: 240px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 1000;
}

.dh-download-header {
    padding: 10px 12px;
    background: #0a0a0a;
    color: #666;
    font-size: 11px;
    font-weight: 500;
    border-bottom: 1px solid #222;
}

/* Item bình thường */
.dh-download-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    color: #999;
    text-decoration: none;
    transition: all 0.2s;
    font-size: 13px;
    border-bottom: 1px solid #222;
    cursor: pointer;
}

.dh-download-item:last-child {
    border-bottom: none;
}

.dh-download-item:hover {
    background: #222;
    color: #fff;
}

.dh-download-item i {
    font-size: 16px;
    color: #ccc;
}

.dh-download-item:hover i {
    color: #fff;
}

/* 🔥 Item DISABLED (không có link) */
.dh-download-disabled {
    color: #444 !important;
    cursor: not-allowed !important;
    pointer-events: none;
    opacity: 0.4;
}

.dh-download-disabled i {
    color: #444 !important;
}

.dh-download-disabled:hover {
    background: transparent !important;
    color: #444 !important;
}
    /* Style cho nút trên Header Modal */
    .dh-header-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #888;
        width: 32px;
        height: 32px;
        border-radius: 8px; /* Bo góc nhẹ */
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
    }

    .dh-header-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.3);
    }

    .dh-header-btn:active {
        transform: scale(0.95);
    }

    /* Animation xoay tròn khi bấm refresh */
    .spin-anim {
        animation: spin 1s infinite linear;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>
<style>/* 🔥 LOADING - ĐƠN GIẢN TRẮNG ĐEN */
.dh-loading-container {
    padding: 80px 20px;
    text-align: center;
}

.dh-loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e0e0e0;
    border-top-color: #333;
    border-radius: 50%;
    margin: 0 auto 16px;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.dh-loading-text {
    font-size: 14px;
    color: #666;
    font-weight: 400;
}

/* LOADING CHO SCROLL */
.dh-loading-more {
    text-align: center;
    padding: 30px 20px;
}

.dh-loading-more-spinner {
    width: 28px;
    height: 28px;
    border: 2px solid #e0e0e0;
    border-top-color: #333;
    border-radius: 50%;
    margin: 0 auto 10px;
    animation: spin 0.8s linear infinite;
}

.dh-loading-more-text {
    font-size: 13px;
    color: #999;
}
/* 🔥 NÚT REFRESH CÓ TEXT */
.dh-refresh-with-text {
    width: auto !important; /* Bỏ width cố định 32px */
    padding: 0 12px;
    gap: 6px;
    display: flex;
    align-items: center;
}

.dh-refresh-with-text span {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
}
/* ========================================
   🗑️ NÚT XÓA VĂN BẢN
   ======================================== */
#btnClearText:hover {
    border-color: #ef4444 !important;
    color: #ef4444 !important;
    background: rgba(239, 68, 68, 0.05) !important;
}

#btnClearText:active {
    transform: scale(0.95);
}

/* Disable state */
#btnClearText:disabled {
    opacity: 0.3 !important;
    cursor: not-allowed !important;
    pointer-events: none !important;
}
</style>
    <div id="uploadDropdown" style="
        position: absolute;
        bottom: 100%;
        left: 0;
        margin-bottom: 6px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        overflow: hidden;
        display: none;
        z-index: 100;
        min-width: 250px; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    ">
        <div class="upload-option" onclick="$('#fileInput').click(); $('#uploadDropdown').hide(); updateChevron();">
            <i class="bi bi-file-earmark-text"></i>
            <span><?php echo $t['upload_file']; ?></span>
        </div>
        <div class="upload-option" onclick="$('#folderInput').click(); $('#uploadDropdown').hide(); updateChevron();">
            <i class="bi bi-folder2-open"></i>
            <span><?php echo $t['upload_folder']; ?></span>
        </div>
    </div>
</div>
    
<!-- ========== 🔥 NÚT XÓA VĂN BẢN (MỚI THÊM) ========== -->
    <button id="btnClearText" onclick="clearTextInput()" 
            class="upload-btn"
            style="
                background: transparent; 
                border: 1px solid #444; 
                color: #888; 
                padding: 8px 16px; 
                border-radius: 8px; 
                cursor: pointer; 
                font-size: 13px; 
                display: flex; 
                align-items: center; 
                gap: 6px; 
                transition: all 0.2s;
            "
            title="<?php echo $lang === 'vi' ? 'Xóa toàn bộ văn bản' : 'Clear all text'; ?>">
        <i class="bi bi-trash" style="font-size: 14px;"></i>
        <span><?php echo $lang === 'vi' ? 'Xóa' : 'Clear'; ?></span>
    </button>
    
    <input type="file" id="fileInput" accept=".txt,.srt" multiple style="display: none;">
    <input type="file" id="folderInput" webkitdirectory directory multiple style="display: none;">
    
        <!-- ========== 🔥 NÚT CHUẨN HÓA TIẾNG VIỆT (MỚI) ========== -->
    <button id="btnNormalizeVN" onclick="normalizeVietnamese()" 
            class="upload-btn"
            style="
                background: transparent; 
                border: 1px solid #444; 
                color: #888; 
                padding: 8px 16px; 
                border-radius: 8px; 
                cursor: pointer; 
                font-size: 13px; 
                display: flex; 
                align-items: center; 
                gap: 6px; 
                transition: all 0.2s;
            "
            onmouseover="this.style.borderColor='#667eea'; this.style.color='#667eea'"
            onmouseout="this.style.borderColor='#444'; this.style.color='#888'"
            title="<?php echo $lang === 'vi' ? 'Chuyển đổi để AI đọc chuẩn (ai→aai, im→yim)' : 'Normalize Vietnamese pronunciation'; ?>">
        <i class="bi bi-spellcheck" style="font-size: 14px;"></i>
        <span><?php echo $lang === 'vi' ? 'Chuẩn hóa Tiếng Việt' : 'Normalize Vietnamese'; ?></span>
    </button>
    
    <input type="file" id="fileInput" accept=".txt,.srt" multiple style="display: none;">
    <input type="file" id="folderInput" webkitdirectory directory multiple style="display: none;">
    
    <div id="fileNameDisplay"></div>
</div>


            <div class="stats-display">
    <!-- 🔥 CHARACTER COUNTER - ĐƠN GIẢN TRẮNG ĐEN -->
    <div style="
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #fff;
    " id="charDisplay">
        <i class="bi bi-file-text" style="font-size: 14px; color: #888;"></i>
        <span id="charCount" style="color: #fff;">0</span>
        <span style="font-size: 11px; color: #666;">ký tự</span>
    </div>
    
    <span style="color: #333;">|</span>
    
    <!-- Credits đã tính với Tooltip -->
    <div style="position: relative; display: inline-block;">
        <span style="cursor: help;" id="creditsTrigger">
            <span style="color: #fbbf24; font-weight: 600;" id="estimatedCostDisplay">
                <span id="estimatedCost">0</span>
            </span>
        </span>
        
        <!-- Tooltip -->
        <div id="creditsTooltip" style="
            display: none;
            position: absolute;
            bottom: calc(100% + 10px);
            left: 50%;
            transform: translateX(-50%);
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 6px;
            padding: 10px;
            white-space: nowrap;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            min-width: 200px;
            color: #fff;
        ">
            <div style="font-size: 11px; color: #888; margin-bottom: 4px;"><?php echo $t['processing_fee']; ?></div>
            <div style="font-size: 12px; color: #ccc;">
                • <?php echo $t['processing_fee']; ?>: <span style="color: #fff; font-weight: 600;">x1.12</span>
            </div>
            <div style="font-size: 12px; color: #ccc; margin-top: 2px;" id="srtFeeInfo">
                • <?php echo $t['srt_fee']; ?>: <span style="color: #fff; font-weight: 600;">x1.2</span>
            </div>
        </div>
    </div>
    
    <span style="color: #333;">|</span>
    
    <!-- Credits hiện tại -->
    <span class="credits-display">
        <i class="bi bi-coin"></i>
        <span id="userCredits"><?php echo number_format($current_credits); ?></span>
    </span>
</div>
        </div>
    </div>

    <!-- ========== SIDEBAR PANEL ========== -->
    <div class="sidebar-panel">
        <div class="top-tabs">
    <!-- Tab buttons bên TRÁI -->
    <div style="display: flex; gap: 8px;">
        <button class="tab-btn active" id="btnSettings" onclick="switchTab('settings')">
            <i class="bi bi-sliders"></i>
            <span class="tab-text"><?php echo $t['settings']; ?></span>
        </button>
        <button class="tab-btn" id="btnHistory" onclick="switchTab('history')">
            <i class="bi bi-clock-history"></i>
            <span class="tab-text"><?php echo $t['history']; ?></span>
        </button>
    </div>
    
    <!-- Provider Selector bên PHẢI -->
    <div id="providerWrapper" class="provider-dropdown-wrapper" style="margin: 0;">
        <div class="provider-dropdown-btn" onclick="toggleProviderDropdown()">
            <div class="current-provider">
                <img src="https://help.elevenlabs.io/hc/theming_assets/01HZQ08B6SDY5X53YN9ABG4B99" id="currentProviderLogo" class="provider-logo-btn" alt="">
                <span id="currentProviderName">Elevenlabs</span>
            </div>
            <i class="bi bi-chevron-down" id="providerDropdownIcon"></i>
        </div>
        
        <div class="provider-dropdown-menu" id="providerDropdown">
            <div class="provider-option active" data-provider="elevenlabs" onclick="selectProvider('elevenlabs')">
                <img src="https://help.elevenlabs.io/hc/theming_assets/01HZQ08B6SDY5X53YN9ABG4B99" class="provider-logo" alt="ElevenLabs">
                <div class="provider-info">
                    <div class="provider-name">Elevenlabs</div>
                    <div class="provider-desc"><?php echo $lang === 'vi' ? 'Giọng đọc tự nhiên và nhiều người dùng hơn.' : 'Natural voice with more users.'; ?></div>
                </div>
                <i class="bi bi-check-lg check-icon"></i>
            </div>
            
            <div class="provider-option" data-provider="minimax" onclick="selectProvider('minimax')">
                <img src="https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/minimax-color.png" class="provider-logo" alt="Minimax">
                <div class="provider-info">
                    <div class="provider-name">Minimax</div>
                    <div class="provider-desc"><?php echo $lang === 'vi' ? 'Nói tốt tiếng Việt. Có thể sử dụng giọng nhân bản.' : 'Good Vietnamese. Support voice cloning.'; ?></div>
                </div>
                <i class="bi bi-check-lg check-icon"></i>
            </div>
        </div>
    </div>

    <div id="historyActions" style="display: none; gap: 8px;">
        <button class="tab-btn" onclick="refreshHistory()" style="background: #1a1a1a; border: 1px solid #333; color: #fff;">
            <i class="bi bi-arrow-clockwise"></i>
            <span class="tab-text"><?php echo $t['refresh']; ?></span>
        </button>
        
        <button class="tab-btn" onclick="openDetailedHistory()" style="background: #1a1a1a; border: 1px solid #333; color: #fff;">
    <i class="bi bi-list-columns-reverse"></i>
    <span class="tab-text"><?php echo $t['details']; ?></span>
</button>
    </div>
</div>

       <div id="viewSettings" class="sidebar-content show">
    <div class="setting-group">
        <label><?php echo $t['choose_voice']; ?></label>
        <div id="voiceSelectorBtn" onclick="openVoiceModal()" style="
    display: flex; 
    align-items: center; 
    justify-content: space-between;
    background: #111; 
    border: 1px solid #333; 
    padding: 10px 15px; 
    border-radius: 8px; 
    cursor: pointer;">

    <div id="selectedVoiceName" style="font-weight: 500; color: #fff;"><?php echo $t['select_voice']; ?></div>

    <div id="minimax-badge" style="font-size: 11px; display: none;"></div>

    <i class="bi bi-chevron-right" style="color: #666; margin-left: 10px;"></i>
</div>
        <input type="hidden" id="voiceIdVal">
    </div>

    <div id="minimax-settings">
                <div class="setting-group">
                    <label><?php echo $t['select_language']; ?></label>
    <div class="lang-selector-wrapper" style="position: relative;">
        <div class="lang-selector-dropdown" onclick="toggleLangDropdown()">
            <span id="selectedLang"><?php echo $t['auto_detect']; ?></span>
            <i class="bi bi-chevron-down" id="langDropdownIcon"></i>
        </div>
                        
                        <div class="lang-dropdown-menu" id="langDropdown">
                            <div class="lang-option active" data-lang="Auto" onclick="selectLanguage('Auto', '<?php echo $t['auto_detect']; ?>')">
                                <?php echo $t['auto_detect']; ?>
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="English" onclick="selectLanguage('English', 'English')">
                                English
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Vietnamese" onclick="selectLanguage('Vietnamese', 'Vietnamese')">
                                Vietnamese
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Arabic" onclick="selectLanguage('Arabic', 'Arabic')">
                                Arabic
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Cantonese" onclick="selectLanguage('Cantonese', 'Cantonese')">
                                Cantonese
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Chinese" onclick="selectLanguage('Chinese', 'Chinese (Mandarin)')">
                                Chinese (Mandarin)
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Dutch" onclick="selectLanguage('Dutch', 'Dutch')">
                                Dutch
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="French" onclick="selectLanguage('French', 'French')">
                                French
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="German" onclick="selectLanguage('German', 'German')">
                                German
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Indonesian" onclick="selectLanguage('Indonesian', 'Indonesian')">
                                Indonesian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Italian" onclick="selectLanguage('Italian', 'Italian')">
                                Italian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Japanese" onclick="selectLanguage('Japanese', 'Japanese')">
                                Japanese
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Korean" onclick="selectLanguage('Korean', 'Korean')">
                                Korean
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Portuguese" onclick="selectLanguage('Portuguese', 'Portuguese')">
                                Portuguese
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Russian" onclick="selectLanguage('Russian', 'Russian')">
                                Russian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Spanish" onclick="selectLanguage('Spanish', 'Spanish')">
                                Spanish
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Turkish" onclick="selectLanguage('Turkish', 'Turkish')">
                                Turkish
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Ukrainian" onclick="selectLanguage('Ukrainian', 'Ukrainian')">
                                Ukrainian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Thai" onclick="selectLanguage('Thai', 'Thai')">
                                Thai
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Polish" onclick="selectLanguage('Polish', 'Polish')">
                                Polish
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Romanian" onclick="selectLanguage('Romanian', 'Romanian')">
                                Romanian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Greek" onclick="selectLanguage('Greek', 'Greek')">
                                Greek
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Czech" onclick="selectLanguage('Czech', 'Czech')">
                                Czech
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Finnish" onclick="selectLanguage('Finnish', 'Finnish')">
                                Finnish
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Hindi" onclick="selectLanguage('Hindi', 'Hindi')">
                                Hindi
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Bulgarian" onclick="selectLanguage('Bulgarian', 'Bulgarian')">
                                Bulgarian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Danish" onclick="selectLanguage('Danish', 'Danish')">
                                Danish
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Hebrew" onclick="selectLanguage('Hebrew', 'Hebrew')">
                                Hebrew
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Malay" onclick="selectLanguage('Malay', 'Malay')">
                                Malay
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Persian" onclick="selectLanguage('Persian', 'Persian')">
                                Persian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Slovak" onclick="selectLanguage('Slovak', 'Slovak')">
                                Slovak
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Swedish" onclick="selectLanguage('Swedish', 'Swedish')">
                                Swedish
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Croatian" onclick="selectLanguage('Croatian', 'Croatian')">
                                Croatian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Filipino" onclick="selectLanguage('Filipino', 'Filipino')">
                                Filipino
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Hungarian" onclick="selectLanguage('Hungarian', 'Hungarian')">
                                Hungarian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Norwegian" onclick="selectLanguage('Norwegian', 'Norwegian')">
                                Norwegian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Slovenian" onclick="selectLanguage('Slovenian', 'Slovenian')">
                                Slovenian
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Catalan" onclick="selectLanguage('Catalan', 'Catalan')">
                                Catalan
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Nynorsk" onclick="selectLanguage('Nynorsk', 'Nynorsk')">
                                Nynorsk
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Tamil" onclick="selectLanguage('Tamil', 'Tamil')">
                                Tamil
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                            <div class="lang-option" data-lang="Afrikaans" onclick="selectLanguage('Afrikaans', 'Afrikaans')">
                                Afrikaans
                                <i class="bi bi-check-lg check-icon"></i>
                            </div>
                        </div>
                    </div>
                </div>

        <div class="setting-group">
            <label><?php echo $t['select_model']; ?></label>
            <div style="position: relative;">
                <div class="custom-select" id="minimaxModelBtn" onclick="toggleMinimaxModelDropdown()" style="cursor: pointer;">
                    <span id="selectedMinimaxModel">Speech HD 2.6</span>
                    <i class="bi bi-chevron-down" id="minimaxModelIcon" style="margin-left: auto;"></i>
                </div>
                <div class="provider-dropdown-menu" id="minimaxModelDropdown" style="max-height: 250px; overflow-y: auto;"></div>
            </div>
        </div>
        
        <div class="slider-container">
    <div class="slider-header"><span><?php echo $t['speed']; ?>: <span id="speedVal">1.00</span></span></div>
    <input type="range" id="speed" min="0.5" max="2.0" step="0.01" value="1.0">
</div>
        
        <div class="slider-container">
            <div class="slider-header"><span><?php echo $t['pitch']; ?>: <span id="pitchVal">0</span></span></div>
            <input type="range" id="pitch" min="-12" max="12" step="1" value="0">
        </div>
        
        <div class="slider-container">
    <div class="slider-header"><span><?php echo $t['volume']; ?>: <span id="volVal">1.00</span></span></div>
    <input type="range" id="vol" min="0.01" max="10.0" step="0.01" value="1.0">
</div>
        </div>

    <div id="elevenlabs-settings" class="hidden">
        <div class="setting-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <label><?php echo $t['select_model']; ?></label>
            </div>
            <div class="custom-select" id="elevenModelBtn" onclick="showModelDetails()" style="cursor: pointer;">
                <span id="selectedModelName"><?php echo $t['loading']; ?>...</span>
                <i class="bi bi-chevron-right" style="margin-left: auto; font-size: 14px;"></i>
            </div>
        </div>
        
        <div class="slider-container" id="slider-speed">
    <div class="slider-header"><span><?php echo $t['speed']; ?>: <span id="elevenSpeedVal">1.00</span></span></div>
    <input type="range" id="elevenSpeed" min="0.7" max="1.2" step="0.01" value="1.0">
</div>
        
        <div class="slider-container" id="slider-stability">
            <div class="slider-header"><span><?php echo $t['stability']; ?>: <span id="stabilityVal">50%</span></span></div>
            <input type="range" id="stability" min="0" max="100" step="1" value="50">
        </div>
        
        <div class="slider-container" id="slider-similarity">
            <div class="slider-header"><span><?php echo $t['similarity']; ?>: <span id="similarityVal">75%</span></span></div>
            <input type="range" id="similarity" min="0" max="100" step="1" value="75">
        </div>
        
        <div class="slider-container" id="slider-style">
            <div class="slider-header"><span><?php echo $t['style_exaggeration']; ?>: <span id="styleVal">0%</span></span></div>
            <input type="range" id="style" min="0" max="100" step="1" value="0">
        </div>
        
        <div class="toggle-row" id="toggle-boost">
            <div><?php echo $t['speaker_boost']; ?></div>
            <label class="toggle-switch">
                <input type="checkbox" id="boostCheck" checked>
                <span class="toggle-slider"></span>
            </label>
        </div>
        </div>
    
<!-- ========== UI CHO ELEVENLABS ========== -->
<div id="elevenlabs-cost-ui" style="display: none;">
    <div class="toggle-row" style="display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1px solid #222; margin-top: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <label class="toggle-switch" style="margin: 0;">
                <input type="checkbox" id="subtitleCheck" onchange="updateEstimatedCost()">
                <span class="toggle-slider"></span>
            </label>
            <div style="line-height: 1.2;">
                <div style="font-size: 13px; color: #eee; font-weight: 500;"><?php echo $t['subtitle']; ?></div>
                <div class="badge-cost" id="elevenlabs-badge" style="margin: 0; display: inline-block;">+15% <?php echo $t['fee']; ?></div>
            </div>
        </div>
        <button class="reset-btn" onclick="resetCurrentSettings()" style="width: auto; margin: 0; padding: 8px 14px; background: #1a1a1a; border-color: #333;">
            <i class="bi bi-arrow-counterclockwise"></i> <?php echo $t['reset']; ?>
        </button>
    </div>
</div>

<!-- ========== UI CHO MINIMAX ========== -->
<div id="minimax-cost-ui" style="display: none;">
    <div class="toggle-row" style="display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1px solid #222; margin-top: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <label class="toggle-switch" style="margin: 0;">
                <input type="checkbox" id="minimaxSubtitleCheck" onchange="updateEstimatedCost()">
                <span class="toggle-slider"></span>
            </label>
            <div style="line-height: 1.2;">
                <div style="font-size: 13px; color: #eee; font-weight: 500;"><?php echo $t['subtitle']; ?></div>
                <div class="badge-cost" style="margin: 0; display: inline-block;">+15% <?php echo $t['fee']; ?></div>
            </div>
        </div>
        <button class="reset-btn" onclick="resetCurrentSettings()" style="width: auto; margin: 0; padding: 8px 14px; background: #1a1a1a; border-color: #333;">
            <i class="bi bi-arrow-counterclockwise"></i> <?php echo $t['reset']; ?>
        </button>
    </div>
</div>

<!-- 🔥🔥🔥 BUTTON TẠO GIỌNG NÓI Ở ĐÂY 🔥🔥🔥 -->
<button id="btnProcess" class="btn-generate" onclick="startTTS()">
    <i class="bi bi-magic"></i>
    <span><?php echo $t['generate_voice']; ?></span>
</button>
</div>

        <!-- Model Details Sidebar (ElevenLabs) -->
        <div id="modelSidebar" class="model-details-sidebar">
            <div class="md-header">
                <span class="md-title"><?php echo $lang === 'vi' ? 'Thông tin Mô hình' : 'Model Information'; ?></span>
                <i class="bi bi-x-lg md-close" onclick="hideModelDetails()"></i>
            </div>
            <div class="md-content" id="mdContent"></div>
        </div>

        <!-- History Tab -->
        <div id="viewHistory" class="sidebar-content">
            <div id="historyListContainer"></div>
            <div id="loadingMore" class="loading-more">
                <div class="spinner"></div> <?php echo $t['loading']; ?>...
            </div>
            <div id="noMoreData" class="no-more-data">
                <i class="bi bi-check-circle"></i> <?php echo $lang === 'vi' ? 'Đã hiển thị toàn bộ lịch sử' : 'All history displayed'; ?>
            </div>
        </div>
    </div>
</div>

<audio id="globalAudio" style="display:none;"></audio>
<audio id="previewAudio" style="display:none;"></audio>

<!-- Voice Modal -->
<div id="voiceModal" class="voice-modal">
    <div class="voice-modal-content">
        <!-- Header -->
        <div class="vm-header">
            <div class="vm-tabs">
                <div class="vm-tab" data-tab="default" onclick="switchVoiceTab('default')">
                    <?php echo $t['default']; ?>
                </div>
                <div class="vm-tab" data-tab="cloned" id="tabCloned" onclick="switchVoiceTab('cloned')" style="display: none;">
                    <i class="bi bi-mic-fill"></i>
                    <?php echo $t['cloned']; ?>
                </div>
                <div class="vm-tab active" data-tab="library" onclick="switchVoiceTab('library')">
                    <i class="bi bi-collection"></i>
                    <?php echo $t['library']; ?>
                </div>
                <div class="vm-tab" data-tab="favorites" onclick="switchVoiceTab('favorites')">
                    <i class="bi bi-heart-fill"></i>
                    <?php echo $t['favorites']; ?>
                </div>
                
            </div>
            <i class="bi bi-x-lg vm-close" onclick="closeVoiceModal()"></i>
        </div>
        
        <div class="vm-search-bar" style="display: flex; gap: 12px; align-items: center;">
    
    <!-- Search Input -->
    <div class="vm-search-wrapper" style="flex: 1;">
        <i class="bi bi-search"></i>
        <input type="text" class="vm-search-input" placeholder="<?php echo $t['search_voice']; ?>" id="voiceSearch" onkeyup="filterVoices()">
    </div>
    
    <!-- Sort Dropdown -->
    <div class="custom-dropdown" id="sortDropdown" style="display: none; position: relative; min-width: 170px;">
        <button class="dropdown-btn" onclick="toggleSortDropdown(event)" style="height: 42px; background: #1a1a1a; border: 1px solid #333; color: #fff; display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 12px; border-radius: 8px; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="bi bi-sort-down" style="color: #888;"></i> 
                <span id="currentSortLabel" style="font-size: 13px; font-weight: 500;"><?php echo $t['most_used']; ?></span>
            </div>
            <i class="bi bi-chevron-down dropdown-arrow" id="sortArrow" style="font-size: 10px; color: #666;"></i>
        </button>
        
        <!-- Menu Dropdown (BỎ STYLE INLINE) -->
        <div class="dropdown-menu" id="sortMenu" style="display: none;">
    <div class="dropdown-item" onclick="applySort(event, 'trending', '<?php echo $t['trending']; ?>')">
        <?php echo $t['trending']; ?>
    </div>
    <div class="dropdown-item active" onclick="applySort(event, 'newest', '<?php echo $t['newest']; ?>')">
        <?php echo $t['newest']; ?>
    </div>
    <div class="dropdown-item" onclick="applySort(event, 'most_used', '<?php echo $t['most_used']; ?>')">
        <?php echo $t['most_used']; ?>
    </div>
    <div class="dropdown-item" onclick="applySort(event, 'chars', '<?php echo $t['chars_generated']; ?>')">
        <?php echo $t['chars_generated']; ?>
    </div>
</div>
    </div>
    
</div>

 <!-- Filters -->
<div class="vm-filters-bar">
    
    <!-- ========== FILTER 1: NGÔN NGỮ ========== -->
    <div class="filter-group custom-dropdown filter-dropdown-enhanced">
        <label class="filter-label"><?php echo $t['language']; ?></label>
        <input type="hidden" id="filterLang" value=""> 
        
        <div class="filter-btn-wrapper">
            <button class="dropdown-btn btn-Lang" onclick="toggleDropdown(event, '#menuLang')" style="width: 160px; justify-content: space-between;">
                <span id="labelLang"><?php echo $t['all']; ?></span>
                <i class="bi bi-chevron-down dropdown-arrow"></i>
            </button>
        </div>

        <div class="filter-dropdown-menu" id="menuLang" style="width: 200px;">
            <div class="dropdown-item" onclick="selectFilter('Lang', '', '<?php echo $t['all']; ?>')"><?php echo $t['all']; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'en', '🇺🇸 English')">🇺🇸 English</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'vi', '🇻🇳 Vietnamese')">🇻🇳 Vietnamese</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'fr', '🇫🇷 French')">🇫🇷 French</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'de', '🇩🇪 German')">🇩🇪 German</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'es', '🇪🇸 Spanish')">🇪🇸 Spanish</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'it', '🇮🇹 Italian')">🇮🇹 Italian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'pt', '🇵🇹 Portuguese')">🇵🇹 Portuguese</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'ru', '🇷🇺 Russian')">🇷🇺 Russian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'ja', '🇯🇵 Japanese')">🇯🇵 Japanese</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'ko', '🇰🇷 Korean')">🇰🇷 Korean</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'zh', '🇨🇳 Chinese')">🇨🇳 Chinese</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'ar', '🇸🇦 Arabic')">🇸🇦 Arabic</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'hi', '🇮🇳 Hindi')">🇮🇳 Hindi</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'th', '🇹🇭 Thai')">🇹🇭 Thai</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'id', '🇮🇩 Indonesian')">🇮🇩 Indonesian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'nl', '🇳🇱 Dutch')">🇳🇱 Dutch</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'pl', '🇵🇱 Polish')">🇵🇱 Polish</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'tr', '🇹🇷 Turkish')">🇹🇷 Turkish</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'uk', '🇺🇦 Ukrainian')">🇺🇦 Ukrainian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'sv', '🇸🇪 Swedish')">🇸🇪 Swedish</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'da', '🇩🇰 Danish')">🇩🇰 Danish</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'fi', '🇫🇮 Finnish')">🇫🇮 Finnish</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'no', '🇳🇴 Norwegian')">🇳🇴 Norwegian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'el', '🇬🇷 Greek')">🇬🇷 Greek</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'cs', '🇨🇿 Czech')">🇨🇿 Czech</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'ro', '🇷🇴 Romanian')">🇷🇴 Romanian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'hu', '🇭🇺 Hungarian')">🇭🇺 Hungarian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'sk', '🇸🇰 Slovak')">🇸🇰 Slovak</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'bg', '🇧🇬 Bulgarian')">🇧🇬 Bulgarian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'hr', '🇭🇷 Croatian')">🇭🇷 Croatian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'sl', '🇸🇮 Slovenian')">🇸🇮 Slovenian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'he', '🇮🇱 Hebrew')">🇮🇱 Hebrew</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'fa', '🇮🇷 Persian')">🇮🇷 Persian</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'ms', '🇲🇾 Malay')">🇲🇾 Malay</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'ta', '🇮🇳 Tamil')">🇮🇳 Tamil</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'fil', '🇵🇭 Filipino')">🇵🇭 Filipino</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'af', '🇿🇦 Afrikaans')">🇿🇦 Afrikaans</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'ca', '🏴 Catalan')">🏴 Catalan</div>
            <div class="dropdown-item" onclick="selectFilter('Lang', 'yue', '🇭🇰 Cantonese')">🇭🇰 Cantonese</div>
        </div>
    </div>

    <!-- ========== FILTER 2: GIỚI TÍNH ========== -->
    <div class="filter-group custom-dropdown filter-dropdown-enhanced">
        <label class="filter-label"><?php echo $t['gender']; ?></label>
        <input type="hidden" id="filterGender" value="">
        
        <div class="filter-btn-wrapper">
            <button class="dropdown-btn btn-Gender" onclick="toggleDropdown(event, '#menuGender')" style="width: 120px; justify-content: space-between;">
                <span id="labelGender"><?php echo $t['all']; ?></span>
                <i class="bi bi-chevron-down dropdown-arrow"></i>
            </button>
        </div>

        <div class="filter-dropdown-menu" id="menuGender" style="width: 120px;">
            <div class="dropdown-item" onclick="selectFilter('Gender', '', '<?php echo $t['all']; ?>')"><?php echo $t['all']; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Gender', 'male', '<?php echo $t['male']; ?>')"><?php echo $t['male']; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Gender', 'female', '<?php echo $t['female']; ?>')"><?php echo $t['female']; ?></div>
        </div>
    </div>

    <!-- ========== FILTER 3: ĐỘ TUỔI ========== -->
    <div class="filter-group custom-dropdown filter-dropdown-enhanced">
        <label class="filter-label"><?php echo $t['age']; ?></label>
        <input type="hidden" id="filterAge" value="">
        
        <div class="filter-btn-wrapper">
            <button class="dropdown-btn btn-Age" onclick="toggleDropdown(event, '#menuAge')" style="width: 130px; justify-content: space-between;">
                <span id="labelAge"><?php echo $t['all']; ?></span>
                <i class="bi bi-chevron-down dropdown-arrow"></i>
            </button>
        </div>

        <div class="filter-dropdown-menu" id="menuAge" style="width: 130px;">
            <div class="dropdown-item" onclick="selectFilter('Age', '', '<?php echo $t['all']; ?>')"><?php echo $t['all']; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Age', 'young', '<?php echo $t['young']; ?>')"><?php echo $t['young']; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Age', 'middle_aged', '<?php echo $t['middle_aged']; ?>')"><?php echo $t['middle_aged']; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Age', 'old', '<?php echo $t['old']; ?>')"><?php echo $t['old']; ?></div>
        </div>
    </div>

    <!-- ========== FILTER 4: PHONG CÁCH ========== -->
    <div class="filter-group custom-dropdown filter-dropdown-enhanced">
        <label class="filter-label"><?php echo $t['style']; ?></label>
        <input type="hidden" id="filterCategory" value="">
        
        <div class="filter-btn-wrapper">
            <button class="dropdown-btn btn-Category" onclick="toggleDropdown(event, '#menuCategory')" style="width: 140px; justify-content: space-between;">
                <span id="labelCategory"><?php echo $t['all']; ?></span>
                <i class="bi bi-chevron-down dropdown-arrow"></i>
            </button>
        </div>

        <div class="filter-dropdown-menu" id="menuCategory" style="width: 160px;">
            <div class="dropdown-item" onclick="selectFilter('Category', '', '<?php echo $t['all']; ?>')"><?php echo $t['all']; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'narrative', '<?php echo $lang === 'vi' ? 'Kể chuyện' : 'Narrative'; ?>')"><?php echo $lang === 'vi' ? 'Kể chuyện' : 'Narrative'; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'conversational', '<?php echo $lang === 'vi' ? 'Hội thoại' : 'Conversational'; ?>')"><?php echo $lang === 'vi' ? 'Hội thoại' : 'Conversational'; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'news', '<?php echo $lang === 'vi' ? 'Tin tức' : 'News'; ?>')"><?php echo $lang === 'vi' ? 'Tin tức' : 'News'; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'asmr', 'ASMR')">ASMR</div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'audiobook', '<?php echo $lang === 'vi' ? 'Sách nói' : 'Audiobook'; ?>')"><?php echo $lang === 'vi' ? 'Sách nói' : 'Audiobook'; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'informative_educational', '<?php echo $lang === 'vi' ? 'Giáo dục' : 'Educational'; ?>')"><?php echo $lang === 'vi' ? 'Giáo dục' : 'Educational'; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'characters_animation', '<?php echo $lang === 'vi' ? 'Nhân vật' : 'Characters'; ?>')"><?php echo $lang === 'vi' ? 'Nhân vật' : 'Characters'; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'social_media', '<?php echo $lang === 'vi' ? 'Mạng xã hội' : 'Social Media'; ?>')"><?php echo $lang === 'vi' ? 'Mạng xã hội' : 'Social Media'; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'entertainment', '<?php echo $lang === 'vi' ? 'Giải trí' : 'Entertainment'; ?>')"><?php echo $lang === 'vi' ? 'Giải trí' : 'Entertainment'; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'advertising', '<?php echo $lang === 'vi' ? 'Quảng cáo' : 'Advertising'; ?>')"><?php echo $lang === 'vi' ? 'Quảng cáo' : 'Advertising'; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Category', 'meditation', '<?php echo $lang === 'vi' ? 'Thiền định' : 'Meditation'; ?>')"><?php echo $lang === 'vi' ? 'Thiền định' : 'Meditation'; ?></div>
        </div>
    </div>

    <!-- ========== FILTER 5: GIỌNG ========== -->
    <div class="filter-group custom-dropdown filter-dropdown-enhanced">
        <label class="filter-label"><?php echo $t['accent']; ?></label>
        <input type="hidden" id="filterAccent" value="">
        
        <div class="filter-btn-wrapper">
            <button class="dropdown-btn btn-Accent" onclick="toggleDropdown(event, '#menuAccent')" style="width: 140px; justify-content: space-between;">
                <span id="labelAccent"><?php echo $t['all']; ?></span>
                <i class="bi bi-chevron-down dropdown-arrow"></i>
            </button>
        </div>

        <div class="filter-dropdown-menu" id="menuAccent" style="width: 140px;">
            <div class="dropdown-item" onclick="selectFilter('Accent', '', '<?php echo $t['all']; ?>')"><?php echo $t['all']; ?></div>
            <div class="dropdown-item" onclick="selectFilter('Accent', 'american', 'American')">American</div>
            <div class="dropdown-item" onclick="selectFilter('Accent', 'british', 'British')">British</div>
            <div class="dropdown-item" onclick="selectFilter('Accent', 'australian', 'Australian')">Australian</div>
            <div class="dropdown-item" onclick="selectFilter('Accent', 'irish', 'Irish')">Irish</div>
            <div class="dropdown-item" onclick="selectFilter('Accent', 'indian', 'Indian')">Indian</div>
            <div class="dropdown-item" onclick="selectFilter('Accent', 'african', 'African')">African</div>
        </div>
    </div>

    <!-- ========== NÚT RESET ========== -->
    <button class="filter-reset-btn" onclick="resetFilters()" title="<?php echo $t['reset']; ?>" style="margin-left: auto;">
        <i class="bi bi-x-lg"></i>
    </button>
</div>


        <!-- Voice Grid -->
        <div class="vm-grid" id="voiceGrid">
            <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px;">
                <div class="spinner-border" style="width: 40px; height: 40px; color: #667eea;"></div>
                <p style="color:#888; margin-top:20px; font-size:14px;"><?php echo $t['loading_voices']; ?></p>
            </div>
        </div>
    </div>
</div>

<!-- Clone Modal -->
<div id="cloneModal" class="custom-modal-key" style="z-index: 2500;">
    <div class="modal-box-key" style="text-align: left; max-width: 520px;">
        <h3 style="margin-bottom: 20px; text-align: center; font-size: 20px;">
            <i class="bi bi-mic-fill"></i> Nhân bản giọng nói
        </h3>
        <div class="setting-group">
            <label>Tên giọng</label>
            <input type="text" id="cloneName" class="custom-select" placeholder="Ví dụ: Giọng của tôi" style="cursor: text;">
        </div>
        <div class="setting-group">
            <label>Giới tính</label>
            <select id="cloneGender" class="custom-select">
                <option value="male">Nam (Male)</option>
                <option value="female">Nữ (Female)</option>
            </select>
        </div>
        <div class="setting-group">
            <label>File mẫu (MP3, < 5 phút, < 20MB)</label>
            <input type="file" id="cloneFile" accept=".mp3" class="custom-select" style="cursor: pointer;">
            <small style="color: #666; font-size: 11px; display: block; margin-top: 8px;">
                * Nên dùng file thu âm rõ ràng, không tạp âm
            </small>
        </div>
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button onclick="$('#cloneModal').fadeOut()" class="btn-close-modal" style="flex: 1;">
                Hủy
            </button>
            <button onclick="submitCloneVoice()" id="btnSubmitClone" class="btn-generate" style="flex: 1; margin-top: 0;">
                <i class="bi bi-mic"></i>
                <span>Bắt đầu Clone</span>
            </button>
        </div>
    </div>
</div>

<!-- Bulk Upload Modal - NEW BLACK & WHITE THEME -->
<div id="bulkUploadModal" class="bulk-modal-overlay">
    <div class="bulk-modal-content">
        <!-- Header -->
        <div class="bulk-modal-header">
            <h3>
                <i class="bi bi-folder2-open"></i>
                <?php echo $lang === 'vi' ? 'Nhập hàng loạt' : 'Bulk Upload'; ?>
            </h3>
            <button class="bulk-modal-close" onclick="closeBulkModal()">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        
        <!-- Notice -->
        <div class="bulk-notice">
            <i class="bi bi-info-circle"></i>
            <span>
                <strong><?php echo $lang === 'vi' ? 'Lưu ý:' : 'Note:'; ?></strong> 
                <?php echo $lang === 'vi' 
                    ? 'Vui lòng chọn giọng nói trước khi tải file lên.' 
                    : 'Please select a voice before uploading files.'; ?>
            </span>
        </div>
        
        <!-- Scrollable Body -->
        <div class="bulk-modal-body" id="bulkModalScrollArea">
            <!-- Drop Zone -->
            <div class="bulk-drop-zone" id="bulkDropZone">
                <i class="bi bi-cloud-upload"></i>
                <h4><?php echo $lang === 'vi' ? 'Kéo thả file hoặc click để chọn' : 'Drag & drop or click to select'; ?></h4>
                <p><?php echo $lang === 'vi' 
                    ? 'Hỗ trợ: .txt, .srt, .zip (tối đa 20 file, mỗi file < 5MB)' 
                    : 'Supports: .txt, .srt, .zip (max 20 files, each < 5MB)'; ?></p>
                <input type="file" id="bulkFileInput" multiple accept=".txt,.srt,.zip" style="display: none;">
            </div>

            <!-- File List -->
            <div class="bulk-file-list" id="bulkFileList">
                <div class="bulk-file-list-header">
                    <h5><?php echo $lang === 'vi' ? 'Danh sách file' : 'File List'; ?> (<span id="fileCount">0</span>)</h5>
                    <button class="bulk-btn-clear" onclick="clearAllFiles()">
                        <i class="bi bi-trash"></i>
                        <?php echo $lang === 'vi' ? 'Xóa tất cả' : 'Clear All'; ?>
                    </button>
                </div>
                
                <div class="bulk-file-list-items" id="fileListContainer"></div>
            </div>

            <!-- Summary -->
            <div class="bulk-summary" id="bulkSummary">
                <div class="bulk-summary-row">
                    <span class="bulk-summary-label"><?php echo $lang === 'vi' ? 'Tổng ký tự:' : 'Total chars:'; ?></span>
                    <span class="bulk-summary-value" id="totalChars">0</span>
                </div>
                <div class="bulk-summary-row">
                    <span class="bulk-summary-label"><?php echo $lang === 'vi' ? 'Chi phí xử lý:' : 'Processing cost:'; ?></span>
                    <span class="bulk-summary-value small" id="baseCost">0 credits</span>
                </div>
                <div class="bulk-summary-divider"></div>
                <div class="bulk-summary-total">
                    <span class="bulk-summary-label"><?php echo $lang === 'vi' ? 'Tổng chi phí:' : 'Total cost:'; ?></span>
                    <span class="bulk-summary-value" id="bulkEstimatedCost">0 credits</span>
                </div>
                <div class="bulk-summary-balance">
                    <span class="bulk-summary-label"><?php echo $lang === 'vi' ? 'Số dư hiện tại:' : 'Current balance:'; ?></span>
                    <span class="bulk-summary-value" id="currentBalance">0 credits</span>
                </div>
                
                <!-- Settings Info -->
                <div class="bulk-settings-info">
                    <div>
                        <i class="bi bi-info-circle"></i>
                        Model: <span id="summaryModel">-</span>
                    </div>
                    <div id="summaryBoost">
                        <i class="bi bi-megaphone"></i>
                        <?php echo $lang === 'vi' ? 'Tăng cường giọng: ' : 'Speaker Boost: '; ?>
                        <span><?php echo $lang === 'vi' ? 'Có' : 'Yes'; ?></span>
                    </div>
                    <div id="summaryTranscript">
                        <i class="bi bi-file-earmark-text"></i>
                        <?php echo $lang === 'vi' ? 'Xuất phụ đề: ' : 'Export subtitle: '; ?>
                        <span><?php echo $lang === 'vi' ? 'Có' : 'Yes'; ?></span>
                    </div>
                </div>
            </div>

            <!-- Process Button -->
            <button class="bulk-btn-process" id="btnBulkProcess" onclick="processBulkFiles()">
                <i class="bi bi-magic"></i>
                <span><?php echo $lang === 'vi' ? 'Xử lý tất cả' : 'Process All'; ?></span>
            </button>
        </div>
    </div>
</div>
<!-- Global Drop Overlay -->
<div id="globalDropOverlay" style="
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    pointer-events: none;
">
    <div style="text-align: center; pointer-events: auto;">
        <i class="bi bi-cloud-upload" style="font-size: 80px; color: #667eea; display: block; margin-bottom: 20px;"></i>
        <h2 style="font-size: 32px; font-weight: 700; margin-bottom: 12px;">Thả tệp vào đây</h2>
        <p style="font-size: 16px; color: #888;">Hỗ trợ .txt, .srt, .zip</p>
    </div>
</div>
<div id="deleteModal" class="custom-modal-overlay" style="display: none;">
    <div class="delete-modal-box">
        <div class="dm-header">
            <h3>Xóa tác vụ</h3>
            <i class="bi bi-x-lg" onclick="closeDeleteModal()"></i>
        </div>
        
        <p class="dm-warning">
            Bạn có chắc chắn muốn xóa tác vụ này? Hành động này không thể hoàn tác.
        </p>
        
        <p class="dm-note" id="dmNote">
            Nếu tác vụ bị treo quá 24h sẽ được hoàn tín dụng.
        </p>

        <div class="dm-preview" id="dmTextPreview">
            Nội dung text sẽ hiện ở đây...
        </div>

        <div class="dm-footer">
            <button class="btn-cancel" onclick="closeDeleteModal()">Hủy</button>
            <button class="btn-confirm-delete" id="btnConfirmDelete">
                <i class="bi bi-trash"></i> Xóa
            </button>
        </div>
    </div>
</div>
<div id="detailedHistoryModal" class="dh-modal-overlay" style="display: none;">
    <div class="dh-modal-content">
        
        <div class="dh-header">
    <h3>Lịch sử</h3>
    
    <div style="display: flex; align-items: center; gap: 8px;">
        <button class="dh-header-btn dh-refresh-with-text" onclick="refreshDetailedHistory()" title="Làm mới dữ liệu">
            <i class="bi bi-arrow-clockwise" id="dhRefreshIcon"></i>
            <span><?php echo $lang === 'vi' ? 'Làm mới' : 'Refresh'; ?></span>
        </button>

        <button class="dh-header-btn" onclick="closeDetailedHistory()" title="Đóng">
            <i class="bi bi-x-lg"></i>
        </button>
    </div>
</div>

        <div class="dh-toolbar">
            <div class="dh-checkbox-wrapper">
                <input type="checkbox" id="dhSelectAll" onchange="toggleAllDetailed(this)">
            </div>
            
            <div class="dh-actions-group">
                <button class="dh-btn-action" id="btnBulkDelete" onclick="bulkDelete()" disabled>
                    Xóa (<span>0</span>)
                </button>
                <button class="dh-btn-action" id="btnBulkDownloadAudio" onclick="bulkDownload('audio')" disabled>
                    Tải xuống (<span>0</span>) Audio
                </button>
                <button class="dh-btn-action" id="btnBulkDownloadSrt" onclick="bulkDownload('srt')" disabled>
                    Tải xuống (<span>0</span>) SRT
                </button>
                <button class="dh-btn-action" id="btnBulkDownloadJson" onclick="bulkDownload('json')" disabled>
                    Tải xuống (<span>0</span>) JSON
                </button>
            </div>
        </div>

        <div class="dh-list-body" id="detailedHistoryList">
            <div style="text-align:center; padding: 50px; color: #666;">
                <div class="spinner-border text-primary" role="status"></div>
                <div style="margin-top:10px">Đang tải dữ liệu...</div>
            </div>
        </div>
    </div>
</div>
<div id="srtSettingsModal" class="srt-modal-overlay" style="display: none;">
    <div class="srt-modal-box">
        <div class="srt-modal-header">
            <h3>Cài đặt Subtitle</h3>
            <button class="srt-close-btn" onclick="closeSrtModal()">&times;</button>
        </div>
        
        <div class="srt-modal-body">
            <input type="hidden" id="srtCurrentTaskId" value="">

            <div class="srt-form-group">
                <label>Số ký tự tối đa trên dòng:</label>
                <input type="number" id="srtMaxChars" value="42" min="1">
            </div>

            <div class="srt-form-group">
                <label>Số dòng tối đa trên câu:</label>
                <input type="number" id="srtMaxLines" value="2" min="1">
            </div>

            <div class="srt-form-group">
                <label>Số giây tối đa trên câu:</label>
                <input type="number" id="srtMaxDuration" value="7" min="1">
            </div>
        </div>

        <div class="srt-modal-footer">
            <button class="srt-btn-reset" onclick="resetSrtSettings()">
                <i class="bi bi-arrow-counterclockwise"></i> Đặt lại giá trị
            </button>
            <div style="display: flex; gap: 10px;">
                <button class="srt-btn-close" onclick="closeSrtModal()">Đóng</button>
                <button class="srt-btn-export" onclick="submitSrtExport()">Xuất</button>
            </div>
        </div>
    </div>
</div>
<!-- ========== POPUP XÓA VĂN BẢN ========== -->
<div id="clearTextModal" class="custom-modal-overlay" style="display: none;">
    <div class="delete-modal-box">
        <div class="dm-header">
            <h3>
                <i class="bi bi-exclamation-triangle" style="color: #fbbf24; margin-right: 8px;"></i>
                <?php echo $lang === 'vi' ? 'Xóa văn bản' : 'Clear Text'; ?>
            </h3>
            <i class="bi bi-x-lg" onclick="closeClearTextModal()" style="cursor: pointer;"></i>
        </div>
        
        <p class="dm-warning">
            <?php echo $lang === 'vi' 
                ? 'Bạn có chắc chắn muốn xóa toàn bộ văn bản? Hành động này không thể hoàn tác.' 
                : 'Are you sure you want to clear all text? This action cannot be undone.'; ?>
        </p>
        
        <div class="dm-preview" id="clearTextPreview" style="
            max-height: 150px;
            overflow-y: auto;
            background: #0a0a0a;
            border: 1px solid #222;
            border-radius: 8px;
            padding: 12px;
            font-size: 13px;
            line-height: 1.6;
            color: #aaa;
            font-family: 'Courier New', monospace;
        ">
            <!-- Nội dung text preview sẽ hiển thị ở đây -->
        </div>

        <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
            padding: 12px;
            background: rgba(251, 191, 36, 0.1);
            border: 1px solid rgba(251, 191, 36, 0.3);
            border-radius: 8px;
        ">
            <i class="bi bi-info-circle" style="color: #fbbf24; font-size: 18px;"></i>
            <span style="font-size: 12px; color: #ddd;">
                <?php echo $lang === 'vi' 
                    ? 'Văn bản đã tải lên và các cài đặt SRT cũng sẽ bị xóa.' 
                    : 'Uploaded files and SRT settings will also be cleared.'; ?>
            </span>
        </div>

        <div class="dm-footer" style="margin-top: 20px;">
            <button class="btn-cancel" onclick="closeClearTextModal()">
                <?php echo $lang === 'vi' ? 'Hủy' : 'Cancel'; ?>
            </button>
            <button class="btn-confirm-delete" id="btnConfirmClear" onclick="confirmClearText()">
                <i class="bi bi-trash"></i> 
                <?php echo $lang === 'vi' ? 'Xóa' : 'Clear'; ?>
            </button>
        </div>
    </div>
</div>
<!-- ========== POPUP REMAKE TASK - WITH SUBTITLE TOGGLE ========== -->
<div id="remakeTaskModal" class="custom-modal-overlay" style="display: none;">
    <div class="remake-modal-box">
        <!-- HEADER -->
        <div class="remake-header">
            <h3>
                <i class="bi bi-arrow-repeat"></i>
                <?php echo $lang === 'vi' ? 'Tạo lại tác vụ' : 'Remake Task'; ?>
            </h3>
            <button class="remake-close-btn" onclick="closeRemakeModal()">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        
        <!-- WARNING -->
        <p class="remake-warning">
            <?php echo $lang === 'vi'
                ? 'Tác vụ này sẽ được tạo lại ngay lập tức với nội dung và cài đặt cũ.'
                : 'This task will be remade immediately with the same content and settings.'; ?>
        </p>
        
        <!-- PREVIEW -->
        <div class="remake-preview" id="remakeTextPreview"></div>
        
        <!-- SETTINGS -->
        <div class="remake-settings">
            <div class="remake-settings-header">
                <i class="bi bi-gear"></i>
                <?php echo $lang === 'vi' ? 'Cài đặt' : 'Settings'; ?>
            </div>
            <div id="remakeSettingsInfo" class="remake-settings-content"></div>
        </div>
        
        <!-- 🔥 SUBTITLE TOGGLE (FIXED: +15%) -->
<div class="remake-subtitle-toggle">
    <div style="display: flex; align-items: center; gap: 10px;">
        <label class="toggle-switch" style="margin: 0;">
            <input type="checkbox" id="remakeSubtitleCheck" onchange="updateRemakeCost()">
            <span class="toggle-slider"></span>
        </label>
        <span style="font-size: 14px; color: #ccc;">
            <i class="bi bi-file-earmark-text"></i>
            <?php echo $lang === 'vi' ? 'Tạo phụ đề' : 'Generate Subtitle'; ?>
        </span>
    </div>
    <span id="remakeSubtitleBadge" style="
        display: none;
        font-size: 11px;
        color: #fbbf24;
        font-weight: 600;
        background: rgba(251, 191, 36, 0.1);
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid rgba(251, 191, 36, 0.3);
    ">
        +15%
    </span>
</div>
        
        <!-- COST -->
        <div class="remake-cost">
            <span>
                <i class="bi bi-coin"></i>
                <?php echo $lang === 'vi' ? 'Chi phí:' : 'Cost:'; ?>
            </span>
            <span id="remakeCostDisplay">0 credits</span>
        </div>
        
        <!-- ACTIONS -->
        <div class="remake-actions">
            <button class="remake-btn-cancel" onclick="closeRemakeModal()">
                <?php echo $lang === 'vi' ? 'Hủy' : 'Cancel'; ?>
            </button>
            <button class="remake-btn-confirm" id="btnConfirmRemake" onclick="confirmRemakeTask()">
                <i class="bi bi-magic"></i>
                <span><?php echo $lang === 'vi' ? 'Tạo lại ngay' : 'Remake Now'; ?></span>
            </button>
        </div>
    </div>
</div>
<!-- Popup xác nhận upload folder -->
<div id="folderConfirmPopup" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(12px); z-index: 999999; align-items: center; justify-content: center;">
    <div style="background: #111; border: 1px solid #333; border-radius: 16px; padding: 32px; max-width: 450px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.9); text-align: center;">
        <div style="width: 60px; height: 60px; margin: 0 auto 20px; background: #222; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #444;">
            <i class="bi bi-folder-fill" style="font-size: 28px; color: #fff;"></i>
        </div>
        
        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #fff;">Bạn muốn tải <span id="folderFileCount">10</span> tệp lên trang web này?</h3>
        
        <p style="color: #999; font-size: 14px; margin-bottom: 28px; line-height: 1.6;">
            Thao tác này sẽ tải tất cả các tệp từ "Import Folder" lên. Chỉ thực hiện thao tác này nếu bạn tin tưởng trang web.
        </p>
        
        <div id="folderFileList" style="max-height: 180px; overflow-y: auto; margin-bottom: 24px; text-align: left; background: #0a0a0a; border: 1px solid #222; border-radius: 8px; padding: 12px;">
            <!-- Danh sách file sẽ được render ở đây -->
        </div>
        
        <div style="display: flex; gap: 12px;">
            <button id="folderCancelBtn" style="flex: 1; padding: 12px 20px; border-radius: 10px; border: 1px solid #444; background: transparent; color: #ccc; font-weight: 600; cursor: pointer; font-size: 14px; transition: 0.2s;">
                Huỷ
            </button>
            <button id="folderUploadBtn" style="flex: 1; padding: 12px 20px; border-radius: 10px; border: none; background: #fff; color: #000; font-weight: 700; cursor: pointer; font-size: 14px; transition: 0.2s;">
                Tải lên
            </button>
        </div>
    </div>
</div>

<style>
#folderCancelBtn:hover {
    background: #222;
    border-color: #666;
    color: #fff;
}

#folderUploadBtn:hover {
    background: #e5e5e5;
}

#folderUploadBtn:active {
    transform: scale(0.98);
}

#folderCancelBtn:active {
    transform: scale(0.98);
}

#folderFileList::-webkit-scrollbar {
    width: 6px;
}

#folderFileList::-webkit-scrollbar-track {
    background: #0a0a0a;
}

#folderFileList::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
}

#folderFileList::-webkit-scrollbar-thumb:hover {
    background: #444;
}
</style>
<!-- Bulk Confirm Popup -->
<div id="bulkConfirmPopup" class="bulk-confirm-overlay">
    <div class="bulk-confirm-box">
        <!-- Icon -->
        <div class="bulk-confirm-icon">
            <i class="bi bi-lightning-charge-fill"></i>
        </div>
        
        <!-- Title -->
        <h3 class="bulk-confirm-title">
            <?php echo $lang === 'vi' ? 'Xác nhận xử lý hàng loạt' : 'Confirm Bulk Processing'; ?>
        </h3>
        
        <!-- Message -->
        <p class="bulk-confirm-message">
            <?php echo $lang === 'vi' 
                ? 'Bạn đang chuẩn bị xử lý hàng loạt. Vui lòng kiểm tra thông tin trước khi tiếp tục.' 
                : 'You are about to process multiple files. Please review the information before proceeding.'; ?>
        </p>
        
        <!-- Stats -->
        <div class="bulk-confirm-stats">
            <div class="bulk-confirm-stat-row">
                <span class="bulk-confirm-stat-label">
                    <i class="bi bi-file-earmark-text"></i>
                    <?php echo $lang === 'vi' ? 'Số lượng file:' : 'Total files:'; ?>
                </span>
                <span class="bulk-confirm-stat-value" id="bcFileCount">0</span>
            </div>
            
            <div class="bulk-confirm-stat-row">
                <span class="bulk-confirm-stat-label">
                    <i class="bi bi-fonts"></i>
                    <?php echo $lang === 'vi' ? 'Tổng ký tự:' : 'Total characters:'; ?>
                </span>
                <span class="bulk-confirm-stat-value" id="bcCharCount">0</span>
            </div>
            
            <div class="bulk-confirm-stat-row">
                <span class="bulk-confirm-stat-label">
                    <i class="bi bi-coin"></i>
                    <?php echo $lang === 'vi' ? 'Chi phí:' : 'Cost:'; ?>
                </span>
                <span class="bulk-confirm-stat-value highlight" id="bcCost">0 credits</span>
            </div>
            
            <div class="bulk-confirm-stat-row">
                <span class="bulk-confirm-stat-label">
                    <i class="bi bi-wallet2"></i>
                    <?php echo $lang === 'vi' ? 'Số dư sau:' : 'Balance after:'; ?>
                </span>
                <span class="bulk-confirm-stat-value balance" id="bcBalanceAfter">0 credits</span>
            </div>
        </div>
        
        <!-- Warning -->
        <div class="bulk-confirm-warning" id="bcWarning" style="display: none;">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <div class="bulk-confirm-warning-text">
                <strong><?php echo $lang === 'vi' ? 'Cảnh báo:' : 'Warning:'; ?></strong>
                <span id="bcWarningText"></span>
            </div>
        </div>
        
        <!-- Actions -->
        <div class="bulk-confirm-actions">
            <button class="bulk-confirm-btn bulk-confirm-btn-cancel" onclick="closeBulkConfirmPopup()">
                <i class="bi bi-x-lg"></i>
                <?php echo $lang === 'vi' ? 'Hủy bỏ' : 'Cancel'; ?>
            </button>
            <button class="bulk-confirm-btn bulk-confirm-btn-confirm" id="btnBulkConfirm" onclick="confirmBulkProcess()">
                <i class="bi bi-magic"></i>
                <span id="bcConfirmText"><?php echo $lang === 'vi' ? 'Xử lý ngay' : 'Process Now'; ?></span>
            </button>
        </div>
    </div>
</div>
<script>
    window.isElevenLabsDown = <?php echo $elevenlabs_down ? 'true' : 'false'; ?>;
    window.isMinimaxDown = <?php echo $minimax_down ? 'true' : 'false'; ?>;
    window.isBackupEligible = <?php echo $backup_eligible ? 'true' : 'false'; ?>;
    window.jsLang = <?php echo json_encode($t); ?>;
</script>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="/pages/AI/tts3.js?v=<?php echo time(); ?>"></script>

<?php require_once '../../config/footer.php'; ?>