<?php
$page_title = 'Voice Cloning - Studio';
require_once '../../config/header.php';
require_once '../../config/api_config.php'; 
require_once '../../config/sidebar.php';

// Check Key & Get Credits
$has_api_key = false;
$current_credits = 0;

if (isset($_SESSION['Users'])) {
    $user_identity = $_SESSION['Users'];
    if (isset($mysqli)) {
        $stmt = $mysqli->prepare("SELECT apikey, credits FROM Users WHERE taikhoan = ? OR google_id = ?");
        $stmt->bind_param("ss", $user_identity, $user_identity);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        
        if ($res) {
            if (!empty($res['apikey'])) $has_api_key = true;
            $current_credits = $res['credits'];
        }
        $stmt->close();
    }
}
?>
<style>/* ========================================
   DELETE MODAL
   ======================================== */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    animation: fadeIn 0.2s;
}

.modal-content {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 32px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    animation: slideUp 0.3s;
}

.modal-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #333;
}

.modal-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #fff;
}

.modal-body {
    margin-bottom: 24px;
    color: #ccc;
    line-height: 1.6;
}

.modal-body p {
    margin: 0 0 8px 0;
    font-size: 15px;
}

.modal-body strong {
    color: #ef4444;
    font-weight: 600;
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.btn-cancel,
.btn-confirm-delete {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-cancel {
    background: transparent;
    border: 1px solid #444;
    color: #aaa;
}

.btn-cancel:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: #666;
    color: #fff;
}

.btn-confirm-delete {
    background: #ef4444;
    color: #fff;
}

.btn-confirm-delete:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-confirm-delete:active {
    transform: translateY(0);
}

/* Animations */
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}</style>
<link rel="stylesheet" href="/pages/AI/css/voice_cloning.css?v=<?php echo time(); ?>">
<div class="clone-container">
    
    <div class="form-panel">
        <div class="form-content-inner">
            <div class="info-banner">
                <strong>Nhân bản bất cứ giọng nói nào mà bạn muốn, không còn nỗi lo không tìm thấy giọng phù hợp. (sử dụng Minimax)</strong>
            </div>

            <form id="cloneForm" onsubmit="return false;">
                
                <div class="form-group">
                    <label>Tên Giọng Nói <span>*</span></label>
                    <input type="text" id="cloneName" class="form-input" placeholder="VD: Giọng đọc tin tức" maxlength="50" required>
                </div>

                <div class="form-group">
                    <label>Tải Lên File Âm Thanh <span>*</span></label>
                    <input type="file" id="fileInput" accept="audio/mpeg, .mp3" style="display: none;" onchange="handleFileSelect(this)">
                    
                    <div class="upload-box" id="uploadBox" 
                         onclick="$('#fileInput').click()"
                         ondragover="handleDragOver(event)"
                         ondragleave="handleDragLeave(event)"
                         ondrop="handleDrop(event)">
                        <div class="upload-icon"><i class="bi bi-cloud-arrow-up"></i></div>
                        <div class="upload-text">Kéo thả file hoặc nhấp để chọn</div>
                        <div class="upload-hint">Thời lượng 10s - 2 phút, tối đa 20MB</div>
                        <div class="upload-hint">Hiện chỉ hỗ trợ: .mp3</div>
                        <div class="upload-hint">Nếu tệp của bạn khác, vui lòng chuyển đổi thủ công.</div>
                    </div>

                    <div class="file-preview-card" id="fileInfo" style="display: none;">
                        <div class="file-details-row">
                            <div class="file-icon-wrapper"><i class="bi bi-music-note-beamed"></i></div>
                            <div class="file-meta-info">
                                <div class="file-name" id="fileName">filename.mp3</div>
                                <div class="file-size" id="fileSize">0.00 MB</div>
                            </div>
                            <button type="button" class="btn-remove-file" onclick="removeFile()" title="Xóa file"><i class="bi bi-trash"></i></button>
                        </div>
                        <div class="audio-player-wrapper">
                            <audio id="audioPreviewPlayer" controls>Trình duyệt không hỗ trợ phát âm thanh.</audio>
                        </div>
                    </div>
                </div>

                <div class="row-group">
    <div class="form-group">
        <label>Chọn Ngôn Ngữ</label>
        <div class="custom-dropdown" id="langDropdown">
            <div class="dropdown-selected" onclick="toggleDropdown('langOptions', this)">
                <span id="selectedLangText">Tự xác định</span>
                <i class="bi bi-chevron-down"></i>
            </div>
                            <div class="dropdown-options" id="langOptions">
                                <div class="dropdown-search">
                                    <input type="text" placeholder="Tìm kiếm..." onkeyup="filterLang(this)">
                                </div>
                                <div class="dropdown-list-container">
                                    <div class="dropdown-item" data-val="Auto" onclick="selectItem('lang', 'Auto', 'tự xác định', this)">Tự xác định</div>
                <div class="dropdown-item" data-val="English" onclick="selectItem('lang', 'English', '🇺🇸 English', this)">🇺🇸 English</div>
                <div class="dropdown-item selected" data-val="Vietnamese" onclick="selectItem('lang', 'Vietnamese', '🇻🇳 Vietnamese', this)">🇻🇳 Vietnamese</div>
                
                <div class="dropdown-item" data-val="Arabic" onclick="selectItem('lang', 'Arabic', '🇸🇦 Arabic', this)">🇸🇦 Arabic</div>
                <div class="dropdown-item" data-val="Cantonese" onclick="selectItem('lang', 'Cantonese', '🇭🇰 Cantonese', this)">🇭🇰 Cantonese</div>
                <div class="dropdown-item" data-val="Chinese" onclick="selectItem('lang', 'Chinese', '🇨🇳 Chinese (Mandarin)', this)">🇨🇳 Chinese (Mandarin)</div>
                <div class="dropdown-item" data-val="Dutch" onclick="selectItem('lang', 'Dutch', '🇳🇱 Dutch', this)">🇳🇱 Dutch</div>
                <div class="dropdown-item" data-val="French" onclick="selectItem('lang', 'French', '🇫🇷 French', this)">🇫🇷 French</div>
                <div class="dropdown-item" data-val="German" onclick="selectItem('lang', 'German', '🇩🇪 German', this)">🇩🇪 German</div>
                <div class="dropdown-item" data-val="Indonesian" onclick="selectItem('lang', 'Indonesian', '🇮🇩 Indonesian', this)">🇮🇩 Indonesian</div>
                <div class="dropdown-item" data-val="Italian" onclick="selectItem('lang', 'Italian', '🇮🇹 Italian', this)">🇮🇹 Italian</div>
                <div class="dropdown-item" data-val="Japanese" onclick="selectItem('lang', 'Japanese', '🇯🇵 Japanese', this)">🇯🇵 Japanese</div>
                <div class="dropdown-item" data-val="Korean" onclick="selectItem('lang', 'Korean', '🇰🇷 Korean', this)">🇰🇷 Korean</div>
                <div class="dropdown-item" data-val="Portuguese" onclick="selectItem('lang', 'Portuguese', '🇵🇹 Portuguese', this)">🇵🇹 Portuguese</div>
                <div class="dropdown-item" data-val="Russian" onclick="selectItem('lang', 'Russian', '🇷🇺 Russian', this)">🇷🇺 Russian</div>
                <div class="dropdown-item" data-val="Spanish" onclick="selectItem('lang', 'Spanish', '🇪🇸 Spanish', this)">🇪🇸 Spanish</div>
                <div class="dropdown-item" data-val="Turkish" onclick="selectItem('lang', 'Turkish', '🇹🇷 Turkish', this)">🇹🇷 Turkish</div>
                <div class="dropdown-item" data-val="Ukrainian" onclick="selectItem('lang', 'Ukrainian', '🇺🇦 Ukrainian', this)">🇺🇦 Ukrainian</div>
                <div class="dropdown-item" data-val="Thai" onclick="selectItem('lang', 'Thai', '🇹🇭 Thai', this)">🇹🇭 Thai</div>
                <div class="dropdown-item" data-val="Polish" onclick="selectItem('lang', 'Polish', '🇵🇱 Polish', this)">🇵🇱 Polish</div>
                <div class="dropdown-item" data-val="Romanian" onclick="selectItem('lang', 'Romanian', '🇷🇴 Romanian', this)">🇷🇴 Romanian</div>
                <div class="dropdown-item" data-val="Greek" onclick="selectItem('lang', 'Greek', '🇬🇷 Greek', this)">🇬🇷 Greek</div>
                <div class="dropdown-item" data-val="Czech" onclick="selectItem('lang', 'Czech', '🇨🇿 Czech', this)">🇨🇿 Czech</div>
                <div class="dropdown-item" data-val="Finnish" onclick="selectItem('lang', 'Finnish', '🇫🇮 Finnish', this)">🇫🇮 Finnish</div>
                <div class="dropdown-item" data-val="Hindi" onclick="selectItem('lang', 'Hindi', '🇮🇳 Hindi', this)">🇮🇳 Hindi</div>
                <div class="dropdown-item" data-val="Bulgarian" onclick="selectItem('lang', 'Bulgarian', '🇧🇬 Bulgarian', this)">🇧🇬 Bulgarian</div>
                <div class="dropdown-item" data-val="Danish" onclick="selectItem('lang', 'Danish', '🇩🇰 Danish', this)">🇩🇰 Danish</div>
                <div class="dropdown-item" data-val="Hebrew" onclick="selectItem('lang', 'Hebrew', '🇮🇱 Hebrew', this)">🇮🇱 Hebrew</div>
                <div class="dropdown-item" data-val="Malay" onclick="selectItem('lang', 'Malay', '🇲🇾 Malay', this)">🇲🇾 Malay</div>
                <div class="dropdown-item" data-val="Persian" onclick="selectItem('lang', 'Persian', '🇮🇷 Persian', this)">🇮🇷 Persian</div>
                <div class="dropdown-item" data-val="Slovak" onclick="selectItem('lang', 'Slovak', '🇸🇰 Slovak', this)">🇸🇰 Slovak</div>
                <div class="dropdown-item" data-val="Swedish" onclick="selectItem('lang', 'Swedish', '🇸🇪 Swedish', this)">🇸🇪 Swedish</div>
                <div class="dropdown-item" data-val="Croatian" onclick="selectItem('lang', 'Croatian', '🇭🇷 Croatian', this)">🇭🇷 Croatian</div>
                <div class="dropdown-item" data-val="Filipino" onclick="selectItem('lang', 'Filipino', '🇵🇭 Filipino', this)">🇵🇭 Filipino</div>
                <div class="dropdown-item" data-val="Hungarian" onclick="selectItem('lang', 'Hungarian', '🇭🇺 Hungarian', this)">🇭🇺 Hungarian</div>
                <div class="dropdown-item" data-val="Norwegian" onclick="selectItem('lang', 'Norwegian', '🇳🇴 Norwegian', this)">🇳🇴 Norwegian</div>
                <div class="dropdown-item" data-val="Slovenian" onclick="selectItem('lang', 'Slovenian', '🇸🇮 Slovenian', this)">🇸🇮 Slovenian</div>
                <div class="dropdown-item" data-val="Catalan" onclick="selectItem('lang', 'Catalan', '🇪🇸 Catalan', this)">🇪🇸 Catalan</div>
                <div class="dropdown-item" data-val="Nynorsk" onclick="selectItem('lang', 'Nynorsk', '🇳🇴 Nynorsk', this)">🇳🇴 Nynorsk</div>
                <div class="dropdown-item" data-val="Tamil" onclick="selectItem('lang', 'Tamil', '🇱🇰 Tamil', this)">🇱🇰 Tamil</div>
                <div class="dropdown-item" data-val="Afrikaans" onclick="selectItem('lang', 'Afrikaans', '🇿🇦 Afrikaans', this)">🇿🇦 Afrikaans</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Chọn Giới Tính</label>
                        <div class="custom-dropdown" id="genderDropdown">
                            <div class="dropdown-selected" onclick="toggleDropdown('genderOptions', this)">
                                <span id="selectedGenderText"><i class="bi bi-gender-male"></i> Nam</span>
                                <i class="bi bi-chevron-down"></i>
                            </div>
                            <div class="dropdown-options" id="genderOptions">
                                <div class="dropdown-item selected" data-val="male" onclick="selectItem('gender', 'male', '<i class=\'bi bi-gender-male\'></i> Nam', this)"><i class="bi bi-gender-male"></i> Nam</div>
                                <div class="dropdown-item" data-val="female" onclick="selectItem('gender', 'female', '<i class=\'bi bi-gender-female\'></i> Nữ', this)"><i class="bi bi-gender-female"></i> Nữ</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Văn Bản Nghe Trước (Tùy chọn)</label>
                    <div class="textarea-wrapper">
                        <textarea id="previewText" class="form-textarea" 
                            placeholder="Nhập văn bản (Nếu để trống, hệ thống sẽ tự dùng mẫu câu mặc định)..." 
                            maxlength="500" oninput="updateCharCount()"></textarea>
                        <div class="char-count" id="charCount">0 / 500 ký tự</div>
                    </div>
                </div>

                <div class="form-actions-row">
                    <div class="toggle-wrapper">
                        <label class="switch-control">
                            <input type="checkbox" id="removeNoiseToggle" checked>
                            <span class="slider"></span>
                        </label>
                        
                        <div class="label-with-tooltip" onclick="$('#removeNoiseToggle').click()">
                            <span>Loại Bỏ Tiếng Ồn</span>
                            <div class="tooltip-content">
                                Nếu tệp âm thanh của bạn có tiếng ồn nền, việc bật tính năng này có thể giúp âm thanh sạch hơn. Nếu tệp đã sạch, nên tắt để đạt kết quả tốt nhất.
                            </div>
                        </div>
                    </div>

                    <button type="button" id="btnCreate" class="btn-submit-simple" onclick="createClone()">
                        Nhân Bản
                    </button>
                </div>

            </form>
        </div>
    </div>

    <div class="library-area">
        <div class="section-header">
            <div class="section-title">
                <i class="bi bi-collection-play-fill"></i>
                Thư viện giọng nhân bản
                <span class="voice-count"><span id="voiceCount">0</span> giọng</span>
            </div>
            <button class="btn-refresh" onclick="loadClonedVoices()">
                <i class="bi bi-arrow-clockwise"></i> Làm mới
            </button>
        </div>

        <div id="clonedVoiceGrid" class="voice-grid">
            <div class="empty-state">
                <div class="spinner-border text-secondary" style="margin-bottom: 16px;"></div>
                <div class="title">Đang tải danh sách...</div>
            </div>
        </div>
    </div>

</div>
<!-- 🔥 DELETE CONFIRMATION MODAL -->
<div id="deleteModal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <i class="bi bi-exclamation-triangle-fill" style="color: #ef4444; font-size: 32px;"></i>
            <h3>Xác nhận xóa giọng</h3>
        </div>
        <div class="modal-body">
            <p>Bạn có chắc chắn muốn xóa giọng "<strong id="voiceNameToDelete"></strong>"?</p>
            <p style="color: #888; font-size: 14px; margin-top: 8px;">
                Hành động này không thể hoàn tác.
            </p>
        </div>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeDeleteModal()">
                <i class="bi bi-x-circle"></i>
                <span>Hủy</span>
            </button>
            <button class="btn-confirm-delete" onclick="confirmDelete()">
                <i class="bi bi-trash"></i>
                <span>Xóa</span>
            </button>
        </div>
    </div>
</div>
<!-- AUDIO PREVIEW -->
<audio id="previewAudio" style="display: none;"></audio>

<!-- LOADING OVERLAY -->
<div id="loadingOverlay" class="loading-overlay">
    <div class="loading-spinner"></div>
    <div class="loading-text">Đang xử lý...</div>
    <div class="loading-hint">AI đang học giọng nói của bạn. Quá trình này có thể mất 1-2 phút.</div>
    <div class="loading-progress">
        <div class="loading-bar" id="loadingBar"></div>
    </div>
</div>

<!-- TOAST -->
<div id="toast" class="toast-notification">
    <i class="bi bi-check-circle toast-icon success"></i>
    <span class="toast-text">Thông báo</span>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    const hasApiKey = <?php echo $has_api_key ? 'true' : 'false'; ?>;
    const currentCredits = <?php echo $current_credits; ?>;
</script>

</script><script src="/pages/AI/js/voice_cloning3.js?v=<?php echo time(); ?>"></script>

<?php require_once '../../config/footer.php'; ?>