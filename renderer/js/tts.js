// pages/AI/tts3.js - Modified for Electron
// ========== ELECTRON API WRAPPER ==========
const API_BASE_URL = 'https://kingcongstudio.com/ajaxs';

// Helper function to make API calls via Electron IPC
async function electronApiCall(endpoint, data = {}) {
    try {
        const result = await window.electronAPI.apiRequest(`${API_BASE_URL}/${endpoint}`, data);
        return result;
    } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
    }
}

// ========== JQUERY AJAX INTERCEPTOR ==========
// Override jQuery $.ajax to route through Electron IPC
(function () {
    const originalAjax = $.ajax;

    $.ajax = function (options) {
        // Check if this is a call to our backend
        if (options.url && (
            options.url.includes('tts3.php') ||
            options.url.includes('get_voices.php') ||
            options.url.includes('voice_cloning3.php') ||
            options.url.includes('get_resources3.php')
        )) {
            // Extract endpoint name
            let endpoint = 'tts3.php';
            if (options.url.includes('get_voices.php')) endpoint = 'get_voices.php';
            else if (options.url.includes('voice_cloning3.php')) endpoint = 'voice_cloning3.php';
            else if (options.url.includes('get_resources3.php')) endpoint = 'get_resources3.php';

            const fullUrl = `${API_BASE_URL}/${endpoint}`;

            console.log('📡 [Electron IPC] Intercepting AJAX:', endpoint, options.data);

            // Return a jQuery Deferred object to maintain compatibility
            const deferred = $.Deferred();

            window.electronAPI.apiRequest(fullUrl, options.data || {})
                .then(result => {
                    console.log('✅ [Electron IPC] Response:', result);
                    if (options.success) options.success(result);
                    deferred.resolve(result);
                })
                .catch(error => {
                    console.error('❌ [Electron IPC] Error:', error);
                    if (options.error) options.error(null, 'error', error.message || error);
                    deferred.reject(null, 'error', error.message || error);
                })
                .finally(() => {
                    if (options.complete) options.complete();
                });

            // Return object with jQuery methods for chaining
            return {
                done: (fn) => { deferred.done(fn); return this; },
                fail: (fn) => { deferred.fail(fn); return this; },
                always: (fn) => { deferred.always(fn); return this; },
                then: deferred.then.bind(deferred),
                promise: () => deferred.promise()
            };
        }

        // For other URLs, use original jQuery ajax
        return originalAjax.apply(this, arguments);
    };

    // Also override $.get and $.post
    const originalGet = $.get;
    const originalPost = $.post;

    $.get = function (url, data, success, dataType) {
        if (typeof data === 'function') {
            dataType = success;
            success = data;
            data = undefined;
        }
        return $.ajax({
            url: url,
            data: data,
            success: success,
            dataType: dataType,
            method: 'GET'
        });
    };

    $.post = function (url, data, success, dataType) {
        if (typeof data === 'function') {
            dataType = success;
            success = data;
            data = undefined;
        }
        return $.ajax({
            url: url,
            data: data,
            success: success,
            dataType: dataType,
            method: 'POST'
        });
    };
})();

// ========== GLOBAL VARIABLES ==========
let currentProvider = 'elevenlabs';
let loadedVoices = { elevenlabs: [], minimax: [] };
let loadedModels = { elevenlabs: [], minimax: [] };
let allVoicesForFilter = [];
let isFilteringFavorites = false;
let favoriteVoices = JSON.parse(localStorage.getItem('favVoices')) || [];


// History & Audio
let currentOffset = 0;
let isLoadingHistory = false;
let hasMoreHistory = true;
let mainAudio = document.getElementById('globalAudio');
let previewAudio = document.getElementById('previewAudio');
let currentPlayingTaskId = null;
let currentPreviewUrl = null;
let selectedLanguage = 'Auto';
let selectedMinimaxModel = 'speech-2.6-hd';
let pendingDeleteId = null;
let pendingDeleteType = ''; // 'refund' hoặc 'history'
let pendingDeleteCost = 0;
let historyDataMap = {};
let detailedHistoryData = [];
let detailedProcessingTasks = [];
let detailedHistoryPerPage = 20;
let sharedVoicesRendered = 0;
let sharedVoicesRenderBatch = 50;
let isRenderingVoices = false;
let voiceGridScrollHandler = null;

// Thêm vào đầu file tts.js
let detailedHistoryPage = 1;
let detailedHistoryLoading = false;
let detailedHistoryHasMore = true;
let detailedHistoryAllData = [];
// Lưu tất cả data đã load
let pendingUploadFiles = null;
// ========== LANGUAGE SUPPORT ==========
// The jsTranslations object is now created dynamically in tts.html
// after i18n.js has loaded, using i18n.t() to populate window.jsLang.
// This ensures all strings are sourced from the central translation file.


// ========== HELPER: PARSE CUSTOM DATE FORMAT ==========
function parseCustomDateTime(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }

    // ✅ FORMAT 1: DD/MM/YYYY HH:mm (ElevenLabs/AI33)
    let regex1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    let match1 = dateStr.match(regex1);

    if (match1) {
        let [_, day, month, year, hour, minute, second] = match1;

        let date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second || 0)
        );

        if (!isNaN(date.getTime())) {
            return date.getTime();
        }
    }

    // ✅ FORMAT 2: YYYY-MM-DD HH:mm:ss (GenAI/MySQL)
    let regex2 = /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    let match2 = dateStr.match(regex2);

    if (match2) {
        let [_, year, month, day, hour, minute, second] = match2;

        let date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second || 0)
        );

        if (!isNaN(date.getTime())) {
            return date.getTime();
        }
    }

    // ✅ FALLBACK: Try ISO format (YYYY-MM-DDTHH:mm:ss)
    try {
        let isoStr = dateStr.replace(' ', 'T');
        let timestamp = new Date(isoStr).getTime();

        if (!isNaN(timestamp)) {
            return timestamp;
        }
    } catch (e) {
        // Ignore
    }

    console.warn('⚠️ Invalid date format:', dateStr);
    return null;
}
function openDetailedHistory() {
    $('#detailedHistoryModal').fadeIn(200);
    loadDetailedHistoryData();
}

function closeDetailedHistory() {
    $('#detailedHistoryModal').fadeOut(200);
}
function loadDetailedHistoryData(page = 1, append = false) {
    let $listContainer = $('#detailedHistoryList');

    // Nếu đang loading hoặc hết data → return
    if (detailedHistoryLoading || (!detailedHistoryHasMore && page > 1)) {
        return;
    }

    detailedHistoryLoading = true;

    // ═══════════════════════════════════════════════════════════
    // 🔥 SHOW LOADING UI (TRONG CONTAINER, KHÔNG OVERLAY)
    // ═══════════════════════════════════════════════════════════
    if (!append) {
        // Load lần đầu → Hiện spinner trong bảng
        $listContainer.html(`
            <div class="dh-loading-container">
                <div class="dh-loading-spinner"></div>
                <div class="dh-loading-text">Đang tải dữ liệu...</div>
            </div>
        `);
    } else {
        // Load thêm → Append spinner nhỏ ở cuối
        $listContainer.append(`
            <div class="dh-loading-more" id="loadMoreSpinner">
                <div class="dh-loading-more-spinner"></div>
                <div class="dh-loading-more-text">Đang tải thêm...</div>
            </div>
        `);
    }

    // ═══════════════════════════════════════════════════════════
    // 🔥 GỌI BACKEND
    // ═══════════════════════════════════════════════════════════
    $.ajax({
        url: '../../ajaxs/tts3.php',
        method: 'POST',
        data: {
            action: 'get_history_detailed_v2',
            limit: 20,
            page: page
        },
        dataType: 'json',
        timeout: 10000,

        success: function (res) {
            console.log('📥 Backend response:', res);

            // 🔥 XÓA LOADING UI (FADE OUT MƯỢT)
            $('.dh-loading-container').fadeOut(200, function () { $(this).remove(); });
            $('#loadMoreSpinner').fadeOut(200, function () { $(this).remove(); });

            if (res.status === 'success' && res.data) {
                console.log('📋 Total items:', res.data.length);

                // Lưu vào biến toàn cục
                if (append) {
                    detailedHistoryAllData = detailedHistoryAllData.concat(res.data);
                } else {
                    detailedHistoryAllData = res.data;
                }

                detailedHistoryData = detailedHistoryAllData;

                // Render list
                if (append) {
                    renderDetailedListAppend(res.data);
                } else {
                    renderDetailedList(detailedHistoryAllData);
                }

                // Cập nhật trạng thái
                detailedHistoryHasMore = res.has_more;
                detailedHistoryPage = page;

                // Render pagination (nếu cần)
                if (res.total_pages > 1 && !append) {
                    renderDetailedPagination(page, res.total_pages, res.total);
                }

                // 🔥 NẾU KHÔNG CÓ DỮ LIỆU
                if (res.data.length === 0 && !append) {
                    $listContainer.html(`
                        <div style="padding:80px 20px; text-align:center; color:#888;">
                            <i class="bi bi-inbox" style="font-size:64px; opacity:0.5; margin-bottom:16px; display:block;"></i>
                            <div style="font-size:16px; font-weight:500; margin-bottom:8px;">Chưa có lịch sử nào</div>
                            <div style="font-size:13px; color:#aaa;">Các tác vụ TTS của bạn sẽ hiển thị ở đây</div>
                        </div>
                    `);
                }

            } else {
                console.error('❌ Backend error:', res);
                $listContainer.html(`
                    <div style="padding:60px 20px; text-align:center; color:#dc3545;">
                        <i class="fas fa-exclamation-circle" style="font-size:48px; margin-bottom:16px;"></i>
                        <div style="font-size:16px; font-weight:500; margin-bottom:8px;">Lỗi tải dữ liệu</div>
                        <div style="font-size:13px; color:#888;">${res.message || 'Không thể kết nối đến server'}</div>
                    </div>
                `);
            }

            detailedHistoryLoading = false;
        },

        error: function (xhr, status, error) {
            console.error('❌ AJAX error:', xhr.responseText);

            // 🔥 XÓA LOADING UI
            $('.dh-loading-container').fadeOut(200, function () { $(this).remove(); });
            $('#loadMoreSpinner').fadeOut(200, function () { $(this).remove(); });

            let errorMsg = 'Không thể kết nối đến server';
            try {
                let errJson = JSON.parse(xhr.responseText);
                if (errJson.message) {
                    errorMsg = errJson.message;
                }
            } catch (e) { }

            if (!append) {
                $listContainer.html(`
                    <div style="padding:60px 20px; text-align:center; color:#dc3545;">
                        <i class="fas fa-exclamation-triangle" style="font-size:48px; margin-bottom:16px;"></i>
                        <div style="font-size:16px; font-weight:500; margin-bottom:8px;">${errorMsg}</div>
                        <button onclick="loadDetailedHistoryData(${page})" 
                                class="btn btn-sm btn-outline-secondary" 
                                style="margin-top:16px;">
                            <i class="fas fa-redo"></i> Thử lại
                        </button>
                    </div>
                `);
            }

            detailedHistoryLoading = false;
        }
    });
}
// ========================================
// 🔥 AUTO-DELETE STUCK TASKS (0% > 2h5m)
// ========================================
function checkStuckTasks() {
    console.log('🔍 Checking for stuck tasks...');

    const NOW = Date.now();
    const TIMEOUT_MS = (2 * 60 + 5) * 60 * 1000; // 2 giờ 5 phút

    // Duyệt qua tất cả task đang processing
    $('.history-card.processing').each(function () {
        let $card = $(this);
        let taskId = $card.attr('id').replace('card-', '');
        let startTime = parseInt($card.attr('data-start-time'));
        let currentProgress = parseInt($(`#progress-${taskId}`).attr('data-progress') || 0);

        if (isNaN(startTime)) return;

        let elapsedMs = NOW - startTime;

        // Kiểm tra: Đang treo ở 0% quá 2h5m
        if (currentProgress === 0 && elapsedMs > TIMEOUT_MS) {
            console.warn(`⚠️ Task ${taskId} stuck at 0% for ${Math.round(elapsedMs / 60000)} minutes`);

            // Gọi hàm xóa & hoàn tiền
            autoDeleteStuckTask(taskId);
        }
    });

    // Kiểm tra cả modal chi tiết nếu đang mở
    if ($('#detailedHistoryModal').is(':visible')) {
        $('#detailedHistoryList .dh-row').each(function () {
            let $row = $(this);
            let taskId = $row.attr('id').replace('row-', '');
            let startTime = parseInt($row.attr('data-start-time'));
            let currentProgress = parseInt($(`#dh-time-elapsed-${taskId}`).attr('data-progress') || 0);

            if (isNaN(startTime)) return;

            let elapsedMs = NOW - startTime;

            if (currentProgress === 0 && elapsedMs > TIMEOUT_MS) {
                console.warn(`⚠️ Task ${taskId} stuck in modal`);
                autoDeleteStuckTask(taskId);
            }
        });
    }
}

// ========================================
// 🔥 AUTO-DELETE & REFUND STUCK TASK
// ========================================
function autoDeleteStuckTask(taskId) {
    console.log('🗑️ Auto-deleting stuck task:', taskId);

    // Lấy thông tin task
    let taskData = historyDataMap[taskId];
    let originalCost = taskData ? taskData.credit_cost : 0;

    // Disable nút xóa để tránh click trùng
    $(`#btn-delete-${taskId}, .dh-delete-btn[onclick*="${taskId}"]`)
        .prop('disabled', true);

    $.ajax({
        url: '../../ajaxs/tts3.php',
        method: 'POST',
        data: {
            action: 'delete_task_with_refund',
            task_id: taskId,
            current_progress: 0,
            original_cost: originalCost,
            auto_cleanup: true // 🔥 Flag đặc biệt
        },
        dataType: 'json',
        timeout: 10000,

        success: function (res) {
            console.log('✅ Auto-delete response:', res);

            if (res.status === 'success') {
                let refundAmount = res.refund_credits || originalCost;

                // Cập nhật số dư
                let currentBalance = parseInt($('#userCredits').text().replace(/[^0-9]/g, ''));
                let newBalance = currentBalance + refundAmount;
                $('#userCredits').text(newBalance.toLocaleString());

                // Xóa khỏi UI
                $(`#card-${taskId}`).fadeOut(300, function () { $(this).remove(); });
                $(`#row-${taskId}`).fadeOut(300, function () { $(this).remove(); });

                // Hiện popup thông báo
                showAutoDeletePopup(taskId, refundAmount);

            } else {
                console.error('❌ Auto-delete failed:', res.message);
            }
        },

        error: function (xhr, status, error) {
            console.error('❌ Auto-delete error:', error);
        }
    });
}

// ========================================
// 🎨 POPUP THÔNG BÁO TỰ ĐỘNG XÓA
// ========================================
function showAutoDeletePopup(taskId, refundAmount) {
    // Xóa popup cũ
    $('#autoDeletePopup').remove();

    let html = `
    <div id="autoDeletePopup" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999999;
        animation: fadeIn 0.3s;
    ">
        <div style="
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 20px;
            padding: 40px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            text-align: center;
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        ">
            <!-- Icon -->
            <div style="
                width: 80px;
                height: 80px;
                background: rgba(251, 191, 36, 0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
            ">
                <i class="bi bi-clock-history" style="font-size: 40px; color: #fbbf24;"></i>
            </div>
            
            <!-- Title -->
            <h3 style="
                margin: 0 0 12px 0;
                font-size: 22px;
                font-weight: 700;
                color: #fff;
            ">Tác vụ đã bị xóa tự động</h3>
            
            <!-- Message -->
            <p style="
                color: #aaa;
                font-size: 15px;
                line-height: 1.6;
                margin-bottom: 24px;
            ">
                Task <code style="
                    background: #222;
                    padding: 2px 8px;
                    border-radius: 4px;
                    color: #667eea;
                    font-size: 13px;
                ">${taskId.substring(0, 12)}...</code> đã treo ở 0% quá 2 giờ 5 phút và được hệ thống tự động xóa.
            </p>
            
            <!-- Refund Info -->
            <div style="
                background: rgba(74, 222, 128, 0.1);
                border: 1px solid rgba(74, 222, 128, 0.2);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 24px;
            ">
                <div style="color: #4ade80; font-size: 14px; margin-bottom: 6px;">
                    <i class="bi bi-check-circle-fill"></i> Đã hoàn tiền
                </div>
                <div style="color: #fff; font-size: 24px; font-weight: 700;">
                    +${refundAmount.toLocaleString()} credits
                </div>
            </div>
            
            <!-- Button -->
            <button onclick="closeAutoDeletePopup()" style="
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #fff 0%, #e5e5e5 100%);
                color: #000;
                border: none;
                border-radius: 12px;
                font-weight: 700;
                font-size: 15px;
                cursor: pointer;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" 
               onmouseout="this.style.transform='scale(1)'">
                Đã hiểu
            </button>
        </div>
    </div>
    
    <style>
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(30px);
            }
            to { 
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
    `;

    $('body').append(html);
}

function closeAutoDeletePopup() {
    $('#autoDeletePopup').fadeOut(200, function () {
        $(this).remove();
    });
}

// 🔥 HÀM MAP STATUS (giữ nguyên)
function mapApiStatus(apiStatus) {
    const statusMap = {
        'doing': 'pending',
        'done': 'done',
        'error': 'failed',
        'queued': 'queued',
        'pending': 'pending'
    };

    return statusMap[apiStatus] || 'pending';
}
// Biến toàn cục để lưu trữ các task ID cần được theo dõi (polling)
//let detailedProcessingTasks = [];
function renderDetailedPagination(currentPage, totalPages, totalItems) {
    let $pagination = $('#detailedHistoryPagination');

    if (!$pagination.length) {
        // Tạo container nếu chưa có
        $('#detailedHistoryModal .modal-body').append('<div id="detailedHistoryPagination" class="mt-3"></div>');
        $pagination = $('#detailedHistoryPagination');
    }

    let html = '<nav><ul class="pagination justify-content-center">';

    // Previous button
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">Trước</a>
    </li>`;

    // Page numbers (show max 5 pages)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>`;
    }

    // Next button
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">Sau</a>
    </li>`;

    html += `</ul></nav>`;
    html += `<div class="text-center text-muted small">Tổng ${totalItems} tasks</div>`;

    $pagination.html(html);

    // Event handler
    $pagination.find('.page-link').on('click', function (e) {
        e.preventDefault();
        let page = parseInt($(this).data('page'));
        if (page >= 1 && page <= totalPages) {
            loadDetailedHistoryData(page);
        }
    });
}
// ══════════════════════════════════════════════════════════════════════
// 🔥 HÀM RENDER THÊM VÀO CUỐI (KHÔNG XÓA LIST CŨ) - NO SRT BUTTON
// ══════════════════════════════════════════════════════════════════════
function renderDetailedListAppend(newData) {
    let $listContainer = $('#detailedHistoryList');

    if (!newData || newData.length === 0) {
        console.log('⚠️ No new data to append');
        return;
    }

    console.log(`🎨 Appending ${newData.length} tasks`);

    newData.forEach((item, index) => {
        // ═══════════════════════════════════════════════════════════
        // ✅ KIỂM TRA TRÙNG LẶP & DỮ LIỆU HỢP LỆ
        // ═══════════════════════════════════════════════════════════
        if (!item.id || !item.task_id) {
            console.warn('⏩ Skip invalid item:', item);
            return;
        }

        if ($(`#row-${item.task_id}`).length > 0) {
            console.log(`⏩ Skip duplicate: ${item.task_id}`);
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // 🔥 CHUẨN BỊ DỮ LIỆU
        // ═══════════════════════════════════════════════════════════
        let statusBadge = '';
        let contentArea = '';
        let creditLabel = 'Tín dụng sử dụng';

        // Parse timestamp
        let createdTimeMs = parseCustomDateTime(item.created_at);
        if (!createdTimeMs || isNaN(createdTimeMs)) {
            createdTimeMs = Date.now();
        }

        // Provider logo
        let providerLogo = (typeof getProviderLogo === 'function') ? getProviderLogo(item.provider) : '';

        // 🔥 HIỂN THỊ TEXT (Có thể rỗng)
        let displayText = item.text_input && item.text_input.trim()
            ? item.text_input
            : '(Không có nội dung)';

        let safeText = displayText
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/(\r\n|\n|\r)/g, ' ')
            .substring(0, 500);

        // ═══════════════════════════════════════════════════════════
        // 🔥 NÚT XÓA (Dùng chung)
        // ═══════════════════════════════════════════════════════════
        let deleteBtnHtml = `
            <button class="dh-delete-btn" 
                onclick="deleteDetailedTask('${item.task_id}', '${safeText}', '${item.status}', ${item.credit_cost || 0})" 
                title="Xóa task">
                <i class="bi bi-trash"></i>
            </button>`;

        // ───────────────────────────────────────────────────────
        // ✅ TRẠNG THÁI: DONE
        // ───────────────────────────────────────────────────────
        if (item.status === 'done') {
            statusBadge = `<span class="dh-status-badge dh-badge-done">Xong</span>`;
            creditLabel = 'Tín dụng sử dụng';

            // 🔥 [SỬA] LẤY DURATION TỪ NHIỀU NGUỒN
            let duration = item.duration || (item.metadata ? item.metadata.duration : null);
            let durationText = duration ? formatTime(duration) : "--:--";

            // 🔥 DROPDOWN DOWNLOAD
            let downloadDropdownHtml = `
        <div class="dh-download-wrapper" style="position: relative;">
            <button class="dh-download-btn" onclick="toggleDownloadMenu(event, '${item.task_id}')" title="Tải xuống">
                <i class="bi bi-download"></i>
            </button>
            
            <div class="dh-download-menu" id="download-menu-${item.task_id}" style="display: none;">
                <div class="dh-download-header">Tải xuống (hết hạn sau 72 giờ)</div>
                
                <!-- Audio -->
                ${item.audio_url ? `
                <a href="${item.audio_url}" download class="dh-download-item">
                    <i class="bi bi-music-note-beamed"></i>
                    <span>Audio</span>
                </a>` : `
                <div class="dh-download-item dh-download-disabled">
                    <i class="bi bi-music-note-beamed"></i>
                    <span>Audio</span>
                </div>`}
                
                <!-- SRT -->
                ${item.srt_url ? `
                <a href="${item.srt_url}" download class="dh-download-item">
                    <i class="bi bi-file-earmark-text"></i>
                    <span>Phụ đề (SRT)</span>
                </a>` : `
                <div class="dh-download-item dh-download-disabled">
                    <i class="bi bi-file-earmark-text"></i>
                    <span>Phụ đề (SRT)</span>
                </div>`}
                
                <!-- JSON -->
                ${item.json_url ? `
                <a href="${item.json_url}" download class="dh-download-item">
                    <i class="bi bi-file-earmark-code"></i>
                    <span>Phụ đề (JSON)</span>
                </a>` : `
                <div class="dh-download-item dh-download-disabled">
                    <i class="bi bi-file-earmark-code"></i>
                    <span>Phụ đề (JSON)</span>
                </div>`}
            </div>
        </div>
    `;

            // 🔥 [THÊM NÚT REMAKE]
            let remakeBtn = `
        <button class="dh-remake-btn" onclick="openRemakeModal('${item.task_id}')" title="Tạo lại">
            <i class="bi bi-arrow-repeat"></i>
        </button>
    `;

            // Gom nhóm: [Remake] + [Dropdown] + [Delete]
            let actionGroup = `
        <div style="display: flex; align-items: center; gap: 5px; margin-left: auto;">
            ${remakeBtn}
            ${downloadDropdownHtml}
            ${deleteBtnHtml}
        </div>
    `;

            contentArea = `
        <div class="dh-player" id="dh-player-${item.task_id}">
            <button class="dh-play-btn" id="dh-play-btn-${item.task_id}" 
                    onclick="playAudio('${item.task_id}', '${item.audio_url}')"
                    ${!item.audio_url ? 'disabled' : ''}>
                <i class="bi bi-play-fill"></i>
            </button>
            <div class="dh-progress-track" onclick="seekAudio(event, '${item.task_id}', true)"> 
                <div class="dh-progress-bar" id="dh-progress-${item.task_id}" style="width: 0%"></div>
            </div>
            <div class="dh-timer" id="dh-timer-${item.task_id}" 
                 data-audio-url="${item.audio_url || ''}" 
                 data-duration="${duration || ''}">0:00 / ${durationText}</div>
            ${actionGroup} 
        </div>
    `;

            // 🔥 [THÊM MỚI] TỰ ĐỘNG LOAD DURATION NẾU CHƯA CÓ
            if (!duration && item.audio_url) {
                setTimeout(() => {
                    loadAudioDuration(item.task_id, item.audio_url);
                }, 100);
            }
        } else if (item.status === 'failed') {
            // ───────────────────────────────────────────────────────
            // ❌ TRẠNG THÁI: FAILED
            // ───────────────────────────────────────────────────────
            statusBadge = `<span class="dh-status-badge dh-badge-error">Lỗi</span>`;
            creditLabel = 'Đã hoàn trả';

            let errorMsg = item.error_message || 'Lỗi không xác định';

            contentArea = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div class="dh-status-text dh-text-error">
                        <i class="bi bi-exclamation-circle"></i> ${errorMsg}
                    </div>
                    ${deleteBtnHtml}
                </div>`;

        } else if (['queued', 'pending', 'processing', 'doing'].includes(item.status)) {
            // ───────────────────────────────────────────────────────
            // ⏳ TRẠNG THÁI: PROCESSING
            // ───────────────────────────────────────────────────────

            let currentProgress = parseInt(item.progress) || 0;

            // Add to polling list
            if (!detailedProcessingTasks.some(t => t.taskId === item.task_id)) {
                detailedProcessingTasks.push({
                    taskId: item.task_id,
                    historyId: item.id,
                    startTime: createdTimeMs,
                    status: item.status
                });
            }

            statusBadge = `<span class="dh-status-badge dh-badge-processing">Đang xử lý</span>`;
            creditLabel = 'Tín dụng đóng băng';

            // Text ban đầu
            let initialText = '';
            if (item.status === 'queued') {
                initialText = item.queue_position
                    ? `Hàng đợi #${item.queue_position}`
                    : `Hàng đợi`;
            } else {
                initialText = `Xử lý ${currentProgress}%`;
            }

            contentArea = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div class="dh-status-text dh-text-processing">
                        <div class="spinner-border spinner-border-sm" style="width:1rem; height:1rem;"></div>
                        <span id="dh-time-elapsed-${item.task_id}" 
                              data-progress="${currentProgress}" 
                              data-genai="${item.is_genai_backup}">
                              ${initialText}
                        </span>
                    </div>
                    ${deleteBtnHtml}
                </div>
            `;
        }

        // ═══════════════════════════════════════════════════════════
        // 🔥 FORMAT NGÀY GIỜ HIỂN THỊ
        // ═══════════════════════════════════════════════════════════
        let timeDisplay = item.created_at;
        if (item.created_at && (item.created_at.includes('T') || item.created_at.includes('-'))) {
            let d = new Date(item.created_at);
            if (!isNaN(d.getTime())) {
                let hours = String(d.getHours()).padStart(2, '0');
                let minutes = String(d.getMinutes()).padStart(2, '0');
                let day = d.getDate();
                let month = d.getMonth() + 1;
                timeDisplay = `${hours}:${minutes} ${day}/${month}`;
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 🔥 TEXT PREVIEW CLASS (Màu xám nếu không có text)
        // ═══════════════════════════════════════════════════════════
        let textClass = item.text_input && item.text_input.trim()
            ? 'dh-text-preview'
            : 'dh-text-preview dh-text-empty';

        // ═══════════════════════════════════════════════════════════
        // 🔥 RENDER HTML ROW
        // ═══════════════════════════════════════════════════════════
        let html = `
        <div class="dh-row" id="row-${item.task_id}" 
             data-start-time="${createdTimeMs}" 
             data-history-id="${item.id}"
             data-provider="${item.provider}">
            <div class="dh-checkbox-wrapper">
                <input type="checkbox" class="dh-item-checkbox" value="${item.task_id}" 
                    data-audio="${item.audio_url || ''}" 
                    data-srt="${item.srt_url || ''}" 
                    data-json="${item.json_url || ''}" 
                    onchange="updateBulkActions()">
            </div>
            
            <div class="dh-info">
                <div class="dh-time">
                    ${timeDisplay} 
                    ${providerLogo ? `<img src="${providerLogo}" class="dh-provider-icon" alt="${item.provider}">` : ''}
                </div>
                <div class="${textClass}" title="${safeText}">
                    ${displayText}
                </div>
            </div>

            ${statusBadge}

            <div class="dh-content-area">
                ${contentArea}
            </div>

            <div class="dh-credits">
                <span class="dh-credits-val">${item.credit_cost || 0}</span>
                <span class="dh-credits-label">${creditLabel}</span>
            </div>
        </div>
        `;

        // ═══════════════════════════════════════════════════════════
        // 🔥 APPEND VÀO CONTAINER VỚI FADE ANIMATION
        // ═══════════════════════════════════════════════════════════
        let $row = $(html).hide();
        $listContainer.append($row);
        $row.fadeIn(300);
    });

    // ═══════════════════════════════════════════════════════════
    // 🔥 START POLLING CHO CÁC TASK MỚI
    // ═══════════════════════════════════════════════════════════
    newData.forEach(task => {
        if (['queued', 'pending', 'processing', 'doing'].includes(task.status)) {
            let createdTimeMs = parseCustomDateTime(task.created_at);
            if (typeof startDetailedPolling === 'function') {
                startDetailedPolling(task.task_id, task.id, createdTimeMs);
            }
        }
    });

    console.log(`✅ Appended ${newData.length} tasks successfully`);
}
function renderDetailedList(data) {
    let html = '';
    detailedProcessingTasks = []; // Reset danh sách task đang xử lý

    // 🔥 Dừng tất cả interval đang chạy trước khi render mới
    for (const taskId in detailedIntervals) {
        clearInterval(detailedIntervals[taskId]);
    }
    detailedIntervals = {}; // Reset object

    if (!data || data.length === 0) {
        $('#detailedHistoryList').html('<div style="padding:20px; text-align:center; color:#666;">Chưa có dữ liệu</div>');
        return;
    }

    console.log('🎨 Rendering', data.length, 'tasks');

    data.forEach((item, index) => {
        // ═══════════════════════════════════════════════════════════
        // ✅ KIỂM TRA TRÙNG LẶP & DỮ LIỆU HỢP LỆ
        // ═══════════════════════════════════════════════════════════
        if (!item.id) return; // Skip invalid
        if (!item.task_id) return; // Skip invalid

        // 🔥 THÊM: Tạo id từ task_id nếu thiếu
        if (!item.id) {
            item.id = item.task_id;
        }

        let statusBadge = '';
        let contentArea = '';
        let creditLabel = 'Tín dụng sử dụng';

        // 🔥 PARSE TIMESTAMP
        let createdTimeMs = parseCustomDateTime(item.created_at);
        if (!createdTimeMs || isNaN(createdTimeMs)) {
            createdTimeMs = Date.now();
        }

        // Icon Provider
        let providerLogo = (typeof getProviderLogo === 'function') ? getProviderLogo(item.provider) : '';

        // Xử lý text an toàn
        // 🔥 FALLBACK NHIỀU FIELD
        let rawText = item.text_input || item.text || item.content || item.input_text || '';

        // Xử lý text an toàn
        let safeText = rawText
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/(\r\n|\n|\r)/g, ' ')
            .substring(0, 500); // Cắt tối đa 500 ký tự để tránh quá dài

        // Text hiển thị
        let displayText = rawText.trim() || '(Không có nội dung)';

        // ═══════════════════════════════════════════════════════════
        // 🔥 NÚT XÓA (Dùng chung cho mọi trạng thái)
        // ═══════════════════════════════════════════════════════════
        let deleteBtnHtml = `
            <button class="dh-delete-btn" 
                onclick="deleteDetailedTask('${item.task_id}', '${safeText}', '${item.status}', ${item.credit_cost || 0})" 
                title="Xóa task">
                <i class="bi bi-trash"></i>
            </button>`;

        // ───────────────────────────────────────────────────────
        // ✅ TRẠNG THÁI: DONE
        // ───────────────────────────────────────────────────────
        if (item.status === 'done') {
            statusBadge = `<span class="dh-status-badge dh-badge-done">Xong</span>`;
            creditLabel = 'Tín dụng sử dụng';

            // 🔥 [SỬA] LẤY DURATION TỪ NHIỀU NGUỒN
            let duration = item.duration || (item.metadata ? item.metadata.duration : null);
            let durationText = duration ? formatTime(duration) : "--:--";

            // 🔥 DROPDOWN DOWNLOAD
            let downloadDropdownHtml = `
        <div class="dh-download-wrapper" style="position: relative;">
            <button class="dh-download-btn" onclick="toggleDownloadMenu(event, '${item.task_id}')" title="Tải xuống">
                <i class="bi bi-download"></i>
            </button>
            
            <div class="dh-download-menu" id="download-menu-${item.task_id}" style="display: none;">
                <div class="dh-download-header">Tải xuống (hết hạn sau 72 giờ)</div>
                
                <!-- Audio -->
                ${item.audio_url ? `
                <a href="${item.audio_url}" download class="dh-download-item">
                    <i class="bi bi-music-note-beamed"></i>
                    <span>Audio</span>
                </a>` : `
                <div class="dh-download-item dh-download-disabled">
                    <i class="bi bi-music-note-beamed"></i>
                    <span>Audio</span>
                </div>`}
                
                <!-- SRT -->
                ${item.srt_url ? `
                <a href="${item.srt_url}" download class="dh-download-item">
                    <i class="bi bi-file-earmark-text"></i>
                    <span>Phụ đề (SRT)</span>
                </a>` : `
                <div class="dh-download-item dh-download-disabled">
                    <i class="bi bi-file-earmark-text"></i>
                    <span>Phụ đề (SRT)</span>
                </div>`}
                
                <!-- JSON -->
                ${item.json_url ? `
                <a href="${item.json_url}" download class="dh-download-item">
                    <i class="bi bi-file-earmark-code"></i>
                    <span>Phụ đề (JSON)</span>
                </a>` : `
                <div class="dh-download-item dh-download-disabled">
                    <i class="bi bi-file-earmark-code"></i>
                    <span>Phụ đề (JSON)</span>
                </div>`}
            </div>
        </div>
    `;

            // 🔥 [THÊM NÚT REMAKE]
            let remakeBtn = `
        <button class="dh-remake-btn" onclick="openRemakeModal('${item.task_id}')" title="Tạo lại">
            <i class="bi bi-arrow-repeat"></i>
        </button>
    `;

            // Gom nhóm: [Remake] + [Dropdown] + [Delete]
            let actionGroup = `
        <div style="display: flex; align-items: center; gap: 5px; margin-left: auto;">
            ${remakeBtn}
            ${downloadDropdownHtml}
            ${deleteBtnHtml}
        </div>
    `;

            contentArea = `
        <div class="dh-player" id="dh-player-${item.task_id}">
            <button class="dh-play-btn" id="dh-play-btn-${item.task_id}" 
                    onclick="playAudio('${item.task_id}', '${item.audio_url}')"
                    ${!item.audio_url ? 'disabled' : ''}>
                <i class="bi bi-play-fill"></i>
            </button>
            <div class="dh-progress-track" onclick="seekAudio(event, '${item.task_id}', true)"> 
                <div class="dh-progress-bar" id="dh-progress-${item.task_id}" style="width: 0%"></div>
            </div>
            <div class="dh-timer" id="dh-timer-${item.task_id}" 
                 data-audio-url="${item.audio_url || ''}" 
                 data-duration="${duration || ''}">0:00 / ${durationText}</div>
            ${actionGroup} 
        </div>
    `;

            // 🔥 [THÊM MỚI] TỰ ĐỘNG LOAD DURATION NẾU CHƯA CÓ
            if (!duration && item.audio_url) {
                setTimeout(() => {
                    loadAudioDuration(item.task_id, item.audio_url);
                }, 100);
            }
        } else if (item.status === 'failed') {
            // ───────────────────────────────────────────────────────
            // ❌ TRẠNG THÁI: FAILED
            // ───────────────────────────────────────────────────────
            statusBadge = `<span class="dh-status-badge dh-badge-error">Lỗi</span>`;
            creditLabel = 'Đã hoàn trả';

            let errorMsg = item.error_message || 'Lỗi không xác định';

            contentArea = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div class="dh-status-text dh-text-error">
                        <i class="bi bi-exclamation-circle"></i> ${errorMsg}
                    </div>
                    ${deleteBtnHtml}
                </div>`;

        } else if (['queued', 'pending', 'processing', 'doing'].includes(item.status)) {
            // ───────────────────────────────────────────────────────
            // ⏳ TRẠNG THÁI: PROCESSING
            // ───────────────────────────────────────────────────────

            let currentProgress = parseInt(item.progress) || 0;

            // Add to polling list
            detailedProcessingTasks.push({
                taskId: item.task_id,
                historyId: item.id,
                startTime: createdTimeMs,
                status: item.status
            });

            statusBadge = `<span class="dh-status-badge dh-badge-processing">Đang xử lý</span>`;
            creditLabel = 'Tín dụng đóng băng';

            // Text ban đầu
            let initialText = '';
            if (item.status === 'queued') {
                initialText = item.queue_position
                    ? `Hàng đợi #${item.queue_position}`
                    : `Hàng đợi`;
            } else {
                initialText = `Xử lý ${currentProgress}%`;
            }

            contentArea = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div class="dh-status-text dh-text-processing">
                        <div class="spinner-border spinner-border-sm" style="width:1rem; height:1rem;"></div>
                        <span id="dh-time-elapsed-${item.task_id}" 
                              data-progress="${currentProgress}" 
                              data-genai="${item.is_genai_backup}">
                              ${initialText}
                        </span>
                    </div>
                    ${deleteBtnHtml}
                </div>
            `;
        }

        // ═══════════════════════════════════════════════════════════
        // 🔥 FORMAT NGÀY GIỜ HIỂN THỊ
        // ═══════════════════════════════════════════════════════════
        let timeDisplay = item.created_at;
        if (item.created_at && (item.created_at.includes('T') || item.created_at.includes('-'))) {
            let d = new Date(item.created_at);
            if (!isNaN(d.getTime())) {
                let hours = String(d.getHours()).padStart(2, '0');
                let minutes = String(d.getMinutes()).padStart(2, '0');
                let day = d.getDate();
                let month = d.getMonth() + 1;
                timeDisplay = `${hours}:${minutes} ${day}/${month}`;
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 🔥 RENDER HTML ROW
        // ═══════════════════════════════════════════════════════════
        html += `
        <div class="dh-row" id="row-${item.task_id}" 
             data-start-time="${createdTimeMs}" 
             data-history-id="${item.id}"
             data-provider="${item.provider}">
            <div class="dh-checkbox-wrapper">
                <input type="checkbox" class="dh-item-checkbox" value="${item.task_id}" 
                    data-audio="${item.audio_url || ''}" 
                    data-srt="${item.srt_url || ''}" 
                    data-json="${item.json_url || ''}" 
                    onchange="updateBulkActions()">
            </div>
            
            <div class="dh-info">
                <div class="dh-time">
                    ${timeDisplay} 
                    ${providerLogo ? `<img src="${providerLogo}" class="dh-provider-icon" alt="${item.provider}">` : ''}
                </div>
                <div class="dh-text-preview" title="${safeText}">
                    ${item.text_input || 'N/A'}
                </div>
            </div>

            ${statusBadge}

            <div class="dh-content-area">
                ${contentArea}
            </div>

            <div class="dh-credits">
                <span class="dh-credits-val">${item.credit_cost || 0}</span>
                <span class="dh-credits-label">${creditLabel}</span>
            </div>
        </div>
        `;
    });

    $('#detailedHistoryList').html(html);

    // ═══════════════════════════════════════════════════════════
    // 🔥 START POLLING CHO CÁC TASK ĐANG XỬ LÝ
    // ═══════════════════════════════════════════════════════════
    detailedProcessingTasks.forEach(task => {
        if (typeof startDetailedPolling === 'function') {
            startDetailedPolling(task.taskId, task.historyId, task.startTime);
        }
    });
}
// ========================================
// 🔥 TỰ ĐỘNG LOAD DURATION TỪ AUDIO
// ========================================
function loadAudioDuration(taskId, audioUrl) {
    if (!audioUrl) return;

    let tempAudio = new Audio(audioUrl);

    tempAudio.addEventListener('loadedmetadata', function () {
        let duration = tempAudio.duration;

        if (duration && !isNaN(duration)) {
            let durationText = formatTime(duration);

            // Cập nhật Modal chi tiết
            let $timer = $(`#dh-timer-${taskId}`);
            if ($timer.length) {
                let currentText = $timer.text();
                // Thay thế --:-- bằng duration thật
                $timer.text(currentText.replace('--:--', durationText));
                $timer.attr('data-duration', duration);
            }

            // Cập nhật Sidebar (nếu có)
            $(`#time-total-${taskId}`).text(durationText);

            // Lưu vào map
            if (historyDataMap[taskId]) {
                historyDataMap[taskId].duration = duration;
            }
        }
    });

    tempAudio.addEventListener('error', function () {
        console.warn('⚠️ Cannot load audio duration for:', taskId);
    });
}
// ========================================
// 🔤 CHUẨN HÓA TIẾNG VIỆT (Để AI đọc chuẩn)
// ========================================
function normalizeVietnamese() {
    let text = $('#txtInput').val();

    if (!text || text.trim() === '') {
        showToast('⚠️ Vui lòng nhập văn bản trước!');
        return;
    }

    // Dictionary: Cách viết thường -> Cách viết để AI đọc chuẩn
    const vnPronunciationMap = {
        'ai': 'aai',
        'im': 'yim'
    };

    let result = text;

    // Duyệt qua từng cặp trong dictionary
    Object.keys(vnPronunciationMap).forEach(key => {
        // Tạo regex để thay thế (match whole word)
        let regex = new RegExp('\\b' + key + '\\b', 'gi');

        result = result.replace(regex, function (match) {
            let replacement = vnPronunciationMap[key.toLowerCase()];

            // Giữ nguyên chữ hoa/thường
            if (match === match.toUpperCase()) {
                return replacement.toUpperCase();
            }
            if (match[0] === match[0].toUpperCase()) {
                return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            }
            return replacement;
        });
    });

    // Cập nhật lại textarea
    $('#txtInput').val(result);
    localStorage.setItem('tts_input_draft', result);
    togglePlaceholder();
    updateEstimatedCost();

    showToast('✅ Đã chuẩn hóa để AI đọc chuẩn!');
}
// ========================================
// 🔥 TOGGLE DOWNLOAD DROPDOWN
// ========================================
function toggleDownloadMenu(event, taskId) {
    event.stopPropagation();

    const menuId = `#download-menu-${taskId}`;
    const $menu = $(menuId);

    // Đóng tất cả menu khác
    $('.dh-download-menu').not($menu).hide();

    // Toggle menu hiện tại
    $menu.toggle();
}

// Đóng dropdown khi click ra ngoài
$(document).on('click', function (e) {
    if (!$(e.target).closest('.dh-download-wrapper').length) {
        $('.dh-download-menu').hide();
    }
});
function requestCreateSrt(taskId, btnElement) {
    let originalContent = btnElement.innerHTML;
    $(btnElement).html('<div class="spinner-border spinner-border-sm" role="status"></div>');
    $(btnElement).prop('disabled', true);

    $.ajax({
        url: '/ajaxs/tts3.php', // Đảm bảo đường dẫn đúng
        method: 'POST',
        dataType: 'json',
        data: {
            action: 'export_custom_srt',
            task_id: taskId
        },
        success: function (response) {
            if (response.status === 'success' && response.download_url) {
                // Đổi nút ngay lập tức trên giao diện
                let downloadBtnHtml = `
                    <a href="${response.download_url}" download="${response.filename || 'subtitle.srt'}"
                        class="dh-delete-btn" 
                        title="Tải xuống SRT"
                        style="color: #667eea; border-color: #667eea; display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">
                        <i class="bi bi-file-earmark-arrow-down-fill"></i>
                    </a>
                `;
                $(btnElement).replaceWith(downloadBtnHtml);
                if (typeof toastr !== 'undefined') toastr.success('Đã tạo file SRT thành công!');
            } else {
                let msg = response.message || 'Không thể tạo SRT lúc này.';
                if (typeof toastr !== 'undefined') toastr.warning(msg);
                $(btnElement).html(originalContent);
                $(btnElement).prop('disabled', false);
            }
        },
        error: function (xhr, status, error) {
            console.error("Lỗi:", error);
            $(btnElement).html(originalContent);
            $(btnElement).prop('disabled', false);
            if (typeof toastr !== 'undefined') toastr.error('Lỗi kết nối server');
        }
    });
}
function deleteDetailedTask(taskId, textPreview, status, creditCost) {
    console.log(`🗑️ Delete from detailed modal: ${taskId}`);

    // 🔥 SỬ DỤNG openDeleteModal GIỐNG NHƯ BÊN NGOÀI
    // Xác định loại xóa: 'history' (đã xong/lỗi) hoặc 'refund' (đang chạy)
    let deleteType = (status === 'done' || status === 'failed') ? 'history' : 'refund';

    // Gọi hàm mở popup (đã có sẵn trong code)
    openDeleteModal(taskId, textPreview, deleteType, creditCost);
}
// 1. Mở Modal
function openSrtModal(taskId) {
    $('#srtCurrentTaskId').val(taskId); // Lưu ID task đang chọn
    $('#srtSettingsModal').fadeIn(200);
}

// 2. Đóng Modal
function closeSrtModal() {
    $('#srtSettingsModal').fadeOut(200);
}

// 3. Reset về mặc định
function resetSrtSettings() {
    $('#srtMaxChars').val(42);
    $('#srtMaxLines').val(2);
    $('#srtMaxDuration').val(7);
}

function submitSrtExport() {
    // 1. Lấy dữ liệu từ Modal
    const taskId = $('#srtCurrentTaskId').val();
    const maxChars = $('#srtMaxChars').val();
    const maxLines = $('#srtMaxLines').val();
    const maxDuration = $('#srtMaxDuration').val();

    console.log('📤 [FE] Gửi yêu cầu SRT:', { taskId, maxChars, maxLines, maxDuration });

    if (!taskId) {
        alert("Lỗi: Không tìm thấy Task ID!");
        return;
    }

    // 2. Hiệu ứng Loading trên nút trong Modal
    const $btn = $('.srt-btn-export');
    const oldText = $btn.text();
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Đang xử lý...');

    // 3. Gửi Ajax
    $.ajax({
        url: '../../ajaxs/tts3.php',
        method: 'POST',
        dataType: 'json',
        data: {
            action: 'export_custom_srt',
            task_id: taskId,
            max_chars: maxChars,
            max_lines: maxLines,
            max_duration: maxDuration
        },
        success: function (res) {
            // Trả lại trạng thái nút
            $btn.prop('disabled', false).text(oldText);
            console.log('📥 [FE] Nhận phản hồi:', res);

            // 🔥 [FIX] Kiểm tra cả trạng thái VÀ nội dung thông báo lỗi
            // Nếu server báo "Task is not completed", ta coi như nó đang xử lý để hiện Popup chờ
            let isProcessing = (res.status === 'processing' || res.task_status === 'processing' ||
                res.task_status === 'pending' || res.task_status === 'queued');

            // 👇 THÊM DÒNG NÀY: Bắt lỗi "Task is not completed" và coi là đang xử lý
            if (res.message && res.message.includes('Task is not completed')) {
                isProcessing = true;
            }

            // 🔥 [MỚI] HIỂN THỊ POPUP NẾU ĐANG XỬ LÝ
            if (isProcessing) {
                // Đóng Modal Settings
                closeSrtModal();

                // Hiển thị Popup thông báo đẹp
                showSrtProcessingPopup(taskId);
                return;
            }
            if (res.status === 'success') {
                // A. Đóng Modal
                closeSrtModal();

                // B. Tự động tải xuống file
                const a = document.createElement('a');
                a.style.display = 'none';
                document.body.appendChild(a);

                if (res.download_url) {
                    a.href = res.download_url;
                } else if (res.file_content_base64) {
                    try {
                        const byteCharacters = atob(res.file_content_base64);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: "text/srt" });
                        a.href = URL.createObjectURL(blob);
                    } catch (e) {
                        alert("Lỗi tạo file tải xuống!");
                        return;
                    }
                }

                a.download = res.filename || `subtitle_${taskId}.srt`;
                a.click();

                setTimeout(() => {
                    document.body.removeChild(a);
                    if (a.href.startsWith('blob:')) URL.revokeObjectURL(a.href);
                }, 100);

                // C. Cập nhật giao diện
                let newDownloadBtn = `
                    <a href="${res.download_url}" download="${res.filename || 'subtitle.srt'}"
                        class="dh-delete-btn" 
                        title="Tải xuống SRT"
                        style="color: #667eea; border-color: #667eea; display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">
                        <i class="bi bi-file-earmark-arrow-down-fill"></i>
                    </a>
                `;

                let $triggerBtn = $(`#btn-srt-req-${taskId}`);
                if ($triggerBtn.length === 0) {
                    $triggerBtn = $(`#btn-srt-trigger-${taskId}`);
                }
                if ($triggerBtn.length === 0) {
                    $triggerBtn = $(`button[onclick*="openSrtModal('${taskId}')"]`);
                }

                if ($triggerBtn.length > 0) {
                    $triggerBtn.replaceWith(newDownloadBtn);
                }

                // D. Thông báo thành công
                if (typeof showToast === 'function') {
                    showToast('✅ Tạo & Tải phụ đề thành công!');
                } else if (typeof toastr !== 'undefined') {
                    toastr.success('Đã tạo file SRT thành công!');
                }

            } else {
                alert('⚠️ ' + (res.message || 'Lỗi không xác định từ server'));
            }
        },
        error: function (xhr, status, error) {
            $btn.prop('disabled', false).text(oldText);
            console.error("❌ AJAX Error Raw:", xhr.responseText);

            let errorMsg = 'Lỗi kết nối server';
            try {
                let errJson = JSON.parse(xhr.responseText);
                if (errJson.message) errorMsg = errJson.message;
            } catch (e) { }

            alert(`❌ ${errorMsg} (${xhr.status})`);
        }
    });
}
// 🔥 HÀM HIỂN THỊ POPUP XÁC NHẬN (PHIÊN BẢN FIX LỖI CLICK)
function showBulkDeleteConfirm(count, onConfirmCallback) {
    // 1. Xóa popup cũ nếu bị kẹt
    $('#bulkDeletePopup').remove();

    console.log("🟢 Đang mở popup xóa cho " + count + " items..."); // Debug log

    // 2. HTML Popup (Chỉ chứa giao diện, KHÔNG chứa thẻ <script>)
    let html = `
    <div id="bulkDeletePopup" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.6); /* Đậm hơn chút để che nền */
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 2147483647; /* Z-index cao nhất có thể */
        opacity: 0; animation: bdFadeIn 0.2s forwards;
    ">
        <div class="bd-popup-content" style="
            background: #111; border: 1px solid #333;
            border-radius: 20px; padding: 32px; width: 90%; max-width: 400px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8); text-align: center;
            transform: scale(0.95); opacity: 0;
            animation: bdSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards;
        ">
            <div style="width: 50px; height: 50px; margin: 0 auto 20px; background: #222; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-trash3-fill" style="font-size: 22px; color: #fff;"></i>
            </div>

            <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #fff;">Xác nhận xóa?</h3>
            <p style="color: #999; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
                Bạn có chắc chắn muốn xóa vĩnh viễn <b style="color:#fff">${count}</b> task này?<br>Hành động này không thể hoàn tác.
            </p>

            <div style="display: flex; gap: 10px;">
                <button id="bdCancelBtn" style="flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #333; background: transparent; color: #ccc; font-weight: 500; cursor: pointer;">Hủy bỏ</button>
                <button id="bdConfirmBtn" style="flex: 1; padding: 12px; border-radius: 10px; border: none; background: #fff; color: #000; font-weight: 700; cursor: pointer;">Xóa ngay</button>
            </div>
        </div>
        <style>
            @keyframes bdFadeIn { to { opacity: 1; } }
            @keyframes bdSlideUp { to { opacity: 1; transform: scale(1); } }
        </style>
    </div>`;

    // 3. Chèn vào body
    $('body').append(html);

    // 4. 🔥 GẮN SỰ KIỆN CLICK BẰNG JQUERY (CHẮC CHẮN CHẠY)

    // Nút Hủy
    $('#bdCancelBtn').on('click', function () {
        $('#bulkDeletePopup').fadeOut(200, function () { $(this).remove(); });
    });

    // Nút Xác nhận
    $('#bdConfirmBtn').on('click', function () {
        // Hiệu ứng loading nút
        $(this).prop('disabled', true).css('opacity', '0.7').text('Đang xóa...');
        $('#bdCancelBtn').prop('disabled', true);

        // Gọi callback xóa
        if (typeof onConfirmCallback === 'function') {
            onConfirmCallback();
        }
    });
}
function showSrtProcessingPopup(taskId) {
    // Xóa popup cũ nếu có
    $('#srtProcessingPopup').remove();

    let html = `
    <div id="srtProcessingPopup" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        opacity: 0;
        animation: overlayFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    ">
        <div class="srt-popup-content" style="
            background: #050505;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            transform: scale(0.95) translateY(10px);
            opacity: 0;
            animation: modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
        ">
            <div style="
                width: 50px;
                height: 50px;
                margin: 0 auto 24px;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border: 2px solid rgba(255,255,255,0.1);
                    border-top: 2px solid #fff;
                    border-radius: 50%;
                    animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                "></div>
            </div>

            <h3 style="
                margin: 0 0 8px 0;
                font-size: 20px;
                font-weight: 600;
                color: #fff;
                letter-spacing: -0.5px;
            ">Đang khởi tạo SRT</h3>
            
            <p style="
                color: #888;
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 30px;
                font-weight: 400;
            ">
                Hệ thống đang xử lý yêu cầu.<br>
                Vui lòng đợi khoảng <b>30s - 1 phút</b>.
            </p>

            <div style="
                width: 100%;
                height: 2px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                overflow: hidden;
                margin-bottom: 30px;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 0%;
                    background: #fff;
                    box-shadow: 0 0 10px rgba(255,255,255,0.5);
                    border-radius: 2px;
                    animation: smoothProgress 60s linear forwards;
                "></div>
            </div>

            <button onclick="closeSrtPopup()" class="srt-close-btn" style="
                width: 100%;
                padding: 12px;
                background: #fff;
                color: #000;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
            ">
                Đã hiểu
            </button>
        </div>
    </div>
    
    <style>
    /* Animation Overlay */
    @keyframes overlayFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    /* Animation Modal: Slide lên nhẹ nhàng + Scale */
    @keyframes modalSlideUp {
        from { 
            opacity: 0; 
            transform: scale(0.95) translateY(15px); 
        }
        to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
        }
    }

    /* Animation Loading Spinner */
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Animation Progress Bar */
    @keyframes smoothProgress {
        0% { width: 0%; }
        20% { width: 40%; } /* Chạy nhanh lúc đầu tạo cảm giác mượt */
        100% { width: 95%; }
    }

    /* Hiệu ứng Hover Nút */
    .srt-close-btn:hover {
        opacity: 0.9;
        transform: scale(0.98);
    }
    .srt-close-btn:active {
        transform: scale(0.95);
    }
    </style>
    
    <script>
    function closeSrtPopup() {
        const popup = document.getElementById('srtProcessingPopup');
        const content = popup.querySelector('.srt-popup-content');
        
        // Hiệu ứng đóng ngược lại
        content.style.transition = 'all 0.3s cubic-bezier(0.32, 0, 0.67, 0)';
        content.style.opacity = '0';
        content.style.transform = 'scale(0.95) translateY(10px)';
        
        popup.style.transition = 'opacity 0.3s ease';
        popup.style.opacity = '0';
        
        setTimeout(() => {
            popup.remove();
        }, 300);
    }
    <\/script>
    `;

    $('body').append(html);

    // Auto close sau 60 giây
    setTimeout(() => {
        if ($('#srtProcessingPopup').length > 0) {
            closeSrtPopup(); // Gọi hàm đóng có animation
        }
    }, 60000);
}
// Biến để lưu trữ interval của Stopwatch trong Modal Chi tiết
let detailedIntervals = {};

function startDetailedPolling(taskId, historyId, startTime) {
    // Dừng interval cũ nếu có
    if (detailedIntervals[taskId]) {
        clearInterval(detailedIntervals[taskId]);
        delete detailedIntervals[taskId];
    }

    if (!taskId) return;

    let validStartTime = parseInt(startTime);
    if (isNaN(validStartTime)) validStartTime = Date.now();

    let $elapsedSpan = $(`#dh-time-elapsed-${taskId}`);
    let $row = $(`#row-${taskId}`);

    if ($row.length === 0 || $elapsedSpan.length === 0) return;

    let attempts = 0;
    const maxAttempts = 120;
    let lastPollTime = 0;

    // 🔥 HÀM GỌI API REALTIME
    const checkApiNow = () => {
        $.ajax({
            url: '../../ajaxs/tts3.php',
            method: 'POST',
            data: {
                action: 'check_status',
                task_id: taskId
            },
            dataType: 'json',
            timeout: 5000,

            success: function (res) {
                if ($(`#row-${taskId}`).length === 0) return;

                let progress = parseInt(res.progress) || 0;
                let status = res.task_status || res.status;

                console.log(`📊 Polling ${taskId}: status=${status}, progress=${progress}%`);

                // 🔥 [1] CẬP NHẬT MODAL
                $elapsedSpan
                    .attr('data-progress', progress)
                    .text(`Xử lý ${progress}%`);

                $(`#dh-progress-${taskId}`).css('width', progress + '%');

                // 🔥 [2] CẬP NHẬT SIDEBAR (Nếu có card)
                let $sidebarCard = $(`#card-${taskId}`);
                if ($sidebarCard.length > 0 && $sidebarCard.hasClass('processing')) {
                    $(`#time-elapsed-${taskId}`).text(progress + '%');
                    $(`#progress-${taskId}`)
                        .css('width', progress + '%')
                        .attr('data-progress', progress);
                }

                // Xử lý trạng thái
                if (status === 'done') {
                    clearInterval(detailedIntervals[taskId]);
                    delete detailedIntervals[taskId];

                    syncDetailedHistoryCard(
                        taskId,
                        'done',
                        res.audio_url,
                        res.srt_url,
                        res.json_url,
                        res.metadata?.duration
                    );

                    // 🔥 Cập nhật Sidebar
                    if ($sidebarCard.length > 0) {
                        updateCardToDone(taskId, res.audio_url, res.srt_url, res.json_url);
                    }

                } else if (status === 'failed') {
                    clearInterval(detailedIntervals[taskId]);
                    delete detailedIntervals[taskId];

                    syncDetailedHistoryCard(taskId, 'failed', null, null, null, null);

                    // 🔥 Cập nhật Sidebar
                    if ($sidebarCard.length > 0) {
                        updateCardToFailed(taskId);
                    }
                }
            },

            error: function (xhr) {
                console.warn('⚠️ Polling error:', xhr.status);
            }
        });
    };

    // Gọi API ngay lần đầu
    checkApiNow();

    // Interval chạy mỗi 3 giây
    let stopwatchInterval = setInterval(() => {
        if (!$('#detailedHistoryModal').is(':visible') || $(`#row-${taskId}`).length === 0) {
            clearInterval(stopwatchInterval);
            delete detailedIntervals[taskId];
            return;
        }

        let elapsedSeconds = Math.floor((Date.now() - validStartTime) / 1000);
        let shouldPoll = (elapsedSeconds > 0 && elapsedSeconds % 3 === 0 && elapsedSeconds !== lastPollTime);

        if (shouldPoll && attempts < maxAttempts) {
            attempts++;
            lastPollTime = elapsedSeconds;
            checkApiNow();
        }

        if (attempts >= maxAttempts) {
            clearInterval(stopwatchInterval);
            delete detailedIntervals[taskId];
            $elapsedSpan.html(`⏰ Timeout`);
            $row.find('.dh-badge-processing')
                .removeClass('dh-badge-processing')
                .addClass('dh-badge-error')
                .text('Timeout');
        }
    }, 3000);

    detailedIntervals[taskId] = stopwatchInterval;
}
function refreshDetailedHistory() {
    console.log("🔄 Refreshing detailed history...");

    const $btn = $('.dh-header-btn[onclick="refreshDetailedHistory()"]');
    const $icon = $('#dhRefreshIcon');

    $btn.prop('disabled', true);
    $icon.addClass('spin-anim');

    // 🔥 RESET STATE
    detailedHistoryPage = 1;
    detailedHistoryAllData = [];
    detailedHistoryHasMore = true;

    // Load lại từ đầu
    loadDetailedHistoryData(1, false);

    setTimeout(() => {
        $icon.removeClass('spin-anim');
        $btn.prop('disabled', false);
    }, 800);
}
// 4. Logic Checkbox "Chọn tất cả" & Cập nhật nút
function toggleAllDetailed(source) {
    $('.dh-item-checkbox').prop('checked', source.checked);
    updateBulkActions();
}
function updateBulkActions() {
    let checkedBoxes = $('.dh-item-checkbox:checked');
    let count = checkedBoxes.length;
    let totalAudio = 0, totalSrt = 0, totalJson = 0;

    // Đếm số lượng file
    checkedBoxes.each(function () {
        if ($(this).data('audio')) totalAudio++;
        if ($(this).data('srt')) totalSrt++;
        if ($(this).data('json')) totalJson++;
    });

    // --- SỬA LẠI ĐOẠN NÀY ---
    // Không ẩn header nữa, chỉ enable/disable nút thôi

    // Cập nhật số trên nút Xóa & Trạng thái Enable/Disable
    $('#btnBulkDelete span').text(count);
    $('#btnBulkDelete').prop('disabled', count === 0);

    // Cập nhật nút Audio
    $('#btnBulkDownloadAudio span').text(totalAudio);
    $('#btnBulkDownloadAudio').prop('disabled', totalAudio === 0);

    // Cập nhật nút SRT
    $('#btnBulkDownloadSrt span').text(totalSrt);
    $('#btnBulkDownloadSrt').prop('disabled', totalSrt === 0);

    // Cập nhật nút JSON
    $('#btnBulkDownloadJson span').text(totalJson);
    $('#btnBulkDownloadJson').prop('disabled', totalJson === 0);

    // Xử lý checkbox chọn tất cả (nếu không còn item nào được chọn thì bỏ tick Select All)
    if (count === 0) {
        $('#dhSelectAll').prop('checked', false);
    }
}
// ========================================
// ⚡ BULK DELETE (XÓA NHIỀU) - TỐI ƯU
// ========================================
async function bulkDelete() {
    console.log("🖱️ Bulk delete clicked"); // Debug log

    // 1. Kiểm tra checkbox
    let checkedBoxes = $('.dh-item-checkbox:checked');
    if (checkedBoxes.length === 0) {
        if (typeof showToast === 'function') showToast('⚠️ Chưa chọn task nào!');
        else alert('Chưa chọn task nào!');
        return;
    }

    // 2. Gọi Popup
    showBulkDeleteConfirm(checkedBoxes.length, async function () {
        // --- LOGIC XÓA (Chạy khi user bấm "Xóa ngay") ---

        // Disable nút gốc
        $('#btnBulkDelete').prop('disabled', true);

        let elements = checkedBoxes.toArray();
        for (const checkbox of elements) {
            let taskId = $(checkbox).val();
            deleteHistoryTask(taskId); // Gọi hàm xóa đơn lẻ
            await new Promise(r => setTimeout(r, 50)); // Delay tạo hiệu ứng
        }

        // Đóng popup và dọn dẹp sau 500ms
        setTimeout(() => {
            $('#bulkDeletePopup').fadeOut(200, function () { $(this).remove(); });
            $('#dhSelectAll').prop('checked', false);
            updateBulkActions();
            if (typeof showToast === 'function') showToast(`✅ Đã xóa xong!`);

            // Mở lại nút gốc
            $('#btnBulkDelete').prop('disabled', false);
        }, 500);
    });
}

// 6. Hàm thực thi Bulk Download
// Thêm hàm này vào file JS của bạn
async function bulkDownload(type) {
    let checkedBoxes = $('.dh-item-checkbox:checked');
    if (checkedBoxes.length === 0) {
        alert("Chưa chọn file nào!");
        return;
    }

    // 1. UI Loading
    let btnId = '#btnBulkDownload' + type.charAt(0).toUpperCase() + type.slice(1);
    let $btn = $(btnId);
    let oldHtml = $btn.html();
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Đang nén...');

    try {
        let zip = new JSZip();
        let promises = [];
        let count = 0;

        checkedBoxes.each(function () {
            let $box = $(this);
            let taskId = $box.val();

            // 🔥 [MỚI] KIỂM TRA TRẠNG THÁI TASK
            // Tìm dòng (row) chứa checkbox này để xem trạng thái
            let $row = $box.closest('.dh-row');
            let isDone = $row.find('.dh-badge-done').length > 0; // Chỉ lấy dòng có badge "Xong"

            // Nếu chưa xong -> Bỏ qua ngay lập tức, không gọi link
            if (!isDone) {
                console.log(`⏩ Bỏ qua task chưa xong: ${taskId}`);
                return; // Continue vòng lặp
            }

            let url = $box.data(type);
            let ext = (type === 'audio') ? 'mp3' : type;
            let fileName = `file_${taskId}.${ext}`;

            if (url && url.length > 10) {
                let p = fetch(url)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        return response.blob();
                    })
                    .then(blob => {
                        zip.file(fileName, blob);
                        count++;
                    })
                    .catch(err => {
                        console.warn(`⚠️ Link hỏng (${taskId}):`, url);
                    });

                promises.push(p);
            }
        });

        // 2. Đợi tất cả
        await Promise.all(promises);

        if (count === 0) {
            alert("Không có file nào sẵn sàng để tải (Các task có thể đang chạy hoặc lỗi).");
            $btn.prop('disabled', false).html(oldHtml);
            return;
        }

        // 3. Nén và Tải
        $btn.html('<span class="spinner-border spinner-border-sm"></span> Đang lưu...');
        let content = await zip.generateAsync({ type: "blob" });

        let a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = `download_${type}_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (typeof showToast === 'function') showToast(`✅ Đã tải ${count} file thành công!`);

    } catch (e) {
        console.error("Lỗi zip:", e);
        alert("Có lỗi xảy ra.");
    } finally {
        $btn.prop('disabled', false).html(oldHtml);
    }
}
function openDeleteModal(taskId, textPreview, deleteType, cost = 0) {
    pendingDeleteId = taskId;
    pendingDeleteType = deleteType;
    pendingDeleteCost = cost;

    // Cập nhật nội dung Modal
    $('#dmTextPreview').text(textPreview || 'Không có nội dung preview');

    // Nếu là xóa lịch sử (đã xong/lỗi) thì ẩn dòng thông báo hoàn tiền màu tím
    if (deleteType === 'history') {
        $('#dmNote').hide();
    } else {
        $('#dmNote').show();
    }

    // Hiện Modal
    $('#deleteModal').css('display', 'flex').hide().fadeIn(200).addClass('show');
}

function closeDeleteModal() {
    $('#deleteModal').removeClass('show').fadeOut(200);
    pendingDeleteId = null;
}
// ========================================
// 🔥 XÓA TASK ĐANG CHẠY (CÓ HOÀN TIỀN NẾU 0%)
// ========================================
function deleteTaskWithRefund(taskId, originalCost) {
    console.log('💰 deleteTaskWithRefund() called:', { taskId, originalCost });

    // 1. LẤY PROGRESS HIỆN TẠI
    let currentProgress = 0;

    // Thử lấy từ Sidebar trước
    let $sidebarProgress = $(`#progress-${taskId}`);
    if ($sidebarProgress.length) {
        currentProgress = parseInt($sidebarProgress.attr('data-progress') || 0);
    }

    // Nếu không có trong Sidebar, lấy từ Modal Chi Tiết
    if (currentProgress === 0) {
        let $modalProgress = $(`#dh-time-elapsed-${taskId}`);
        if ($modalProgress.length) {
            currentProgress = parseInt($modalProgress.attr('data-progress') || 0);
        }
    }

    console.log('📊 Current Progress:', currentProgress + '%');

    // 2. DISABLE NÚT XÓA (Loading state)
    $(`#btn-delete-${taskId}, .dh-delete-btn[onclick*="${taskId}"]`)
        .prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm"></span>');

    // 3. GỬI REQUEST
    $.ajax({
        url: '../../ajaxs/tts3.php',
        method: 'POST',
        data: {
            action: 'delete_task_with_refund',
            task_id: taskId,
            current_progress: currentProgress,
            original_cost: originalCost
        },
        dataType: 'json',
        timeout: 10000,

        success: function (res) {
            console.log('✅ DELETE WITH REFUND RESPONSE:', res);

            if (res.status === 'success') {
                let refundAmount = res.refund_credits || 0;

                // 🔥 CẬP NHẬT SỐ DƯ CREDITS
                if (refundAmount > 0) {
                    let currentBalance = parseInt($('#userCredits').text().replace(/[^0-9]/g, ''));
                    let newBalance = currentBalance + refundAmount;
                    $('#userCredits').text(newBalance.toLocaleString());

                    showToast(`✅ Đã xóa task và hoàn ${refundAmount.toLocaleString()} credits`);
                } else {
                    showToast('✅ Đã xóa task (Không hoàn tiền do đã xử lý)');
                }

                // 🔥 XÓA KHỎI SIDEBAR
                $(`#card-${taskId}`).fadeOut(300, function () {
                    $(this).remove();
                });

                // 🔥 XÓA KHỎI MODAL CHI TIẾT
                $(`#row-${taskId}`).fadeOut(300, function () {
                    $(this).remove();

                    // Cập nhật bulk actions nếu có
                    if (typeof updateBulkActions === 'function') {
                        updateBulkActions();
                    }
                });

                // 🔥 REFRESH HISTORY
                if (typeof silentRefreshHistory === 'function') {
                    setTimeout(() => silentRefreshHistory(), 500);
                }

            } else {
                alert('❌ Lỗi: ' + (res.message || 'Không thể xóa task'));

                // Re-enable nút
                $(`#btn-delete-${taskId}, .dh-delete-btn[onclick*="${taskId}"]`)
                    .prop('disabled', false)
                    .html('<i class="bi bi-trash"></i>');
            }
        },

        error: function (xhr, status, error) {
            console.error('❌ DELETE WITH REFUND ERROR:', {
                status: xhr.status,
                responseText: xhr.responseText,
                error: error
            });

            let errorMsg = 'Lỗi kết nối';

            try {
                let errJson = JSON.parse(xhr.responseText);
                if (errJson.message) {
                    errorMsg = errJson.message;
                }
            } catch (e) {
                errorMsg = xhr.responseText || 'Lỗi không xác định';
            }

            if (xhr.status === 429) {
                errorMsg = 'Quá nhiều request, vui lòng đợi';
            } else if (xhr.status === 403) {
                errorMsg = 'Không có quyền xóa task này';
            } else if (xhr.status === 404) {
                errorMsg = 'Task không tồn tại';
            } else if (xhr.status === 500) {
                errorMsg = 'Lỗi server';
            }

            alert('❌ ' + errorMsg);

            // Re-enable nút
            $(`#btn-delete-${taskId}, .dh-delete-btn[onclick*="${taskId}"]`)
                .prop('disabled', false)
                .html('<i class="bi bi-trash"></i>');
        }
    });
}
$(document).on('click', '#btnConfirmDelete', function () {
    // 1. Kiểm tra ID toàn cục
    if (!pendingDeleteId) {
        alert("Lỗi: Không tìm thấy ID tác vụ để xóa!");
        return;
    }

    // 🔥 [QUAN TRỌNG] Lưu ID vào biến tạm trước khi đóng Modal
    let idToDelete = pendingDeleteId;
    let typeToDelete = pendingDeleteType;
    let costToDelete = pendingDeleteCost;

    console.log("🟠 Confirmed Delete for ID:", idToDelete);

    // 2. Đóng Modal
    closeDeleteModal();

    // 🔥 3. THỰC HIỆN XÓA (LOGIC CHÍNH)
    if (typeToDelete === 'refund') {
        // XÓA TASK ĐANG CHẠY (Có hoàn tiền nếu 0%)
        deleteTaskWithRefund(idToDelete, costToDelete);
    } else {
        // XÓA LỊCH SỬ ĐÃ HOÀN THÀNH (Không hoàn tiền)
        deleteHistoryTask(idToDelete);
    }
});
$(document).ready(function () {
    console.log('🚀 TTS3.js initialized');

    // ================================================================
    // 🔴 LOGIC BẢO TRÌ SERVER 3 (KINGCONG) - NO BACKUP
    // ================================================================

    // 1. Lấy trạng thái từ biến toàn cục (window) để chắc chắn tìm thấy
    // 🔥 SỬA: Thêm "window.is..." để khớp với PHP
    let _11labsDown = (typeof window.isElevenLabsDown !== 'undefined' && window.isElevenLabsDown === true);
    let _minimaxDown = (typeof window.isMinimaxDown !== 'undefined' && window.isMinimaxDown === true);

    console.log('🔧 Maintenance Status (Server 3):', {
        '11Labs': _11labsDown,
        'Minimax': _minimaxDown
    });

    // 2. NẾU CẢ 2 NHÀ CUNG CẤP ĐỀU SẬP -> BẢO TRÌ TOÀN TRANG
    if (_11labsDown && _minimaxDown) {
        console.error('❌ ALL MAIN PROVIDERS DOWN (Server 3).');

        $('body').empty().css({
            'background': '#050505',
            'display': 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'height': '100vh',
            'margin': '0',
            'font-family': 'sans-serif',
            'color': '#fff'
        }).html(`
            <div style="text-align: center; max-width: 500px; padding: 40px; border: 1px solid #333; border-radius: 20px; background: #111;">
                <i class="bi bi-cone-striped" style="font-size: 60px; color: #f59e0b; display: block; margin-bottom: 20px;"></i>
                <h1 style="font-size: 24px; margin-bottom: 10px; font-weight: 700;">Server KingCong Đang Bảo Trì</h1>
                <p style="color: #888; font-size: 14px; margin-bottom: 30px;">
                    Cả ElevenLabs và Minimax đang được nâng cấp.<br>Vui lòng quay lại sau hoặc sử dụng Server khác.
                </p>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <a href="/" style="padding: 10px 20px; background: #333; color: #fff; text-decoration: none; border-radius: 8px;">Trang Chủ</a>
                    <a href="/ai/tts" style="padding: 10px 20px; background: #667eea; color: #fff; text-decoration: none; border-radius: 8px;">Sang Server 1</a>
                </div>
            </div>
        `);
        return; // 🛑 DỪNG CODE KHÔNG CHO LOAD TIẾP
    }

    // 3. NẾU CHỈ 11LABS SẬP -> ÉP SANG MINIMAX
    if (_11labsDown && !_minimaxDown) {
        console.log('⚠️ ElevenLabs bảo trì -> Chuyển sang Minimax');
        currentProvider = 'minimax';

        setTimeout(() => {
            selectProvider('minimax');

            // Disable nút 11Labs
            let $btn = $('.provider-option[data-provider="elevenlabs"]');
            $btn.css({ 'opacity': '0.5', 'pointer-events': 'none', 'cursor': 'not-allowed' });
            $btn.find('.provider-desc').html('<span style="color:#ef4444; font-weight:bold">🔴 Đang bảo trì</span>');

            showToast('⚠️ ElevenLabs bảo trì. Đã chuyển sang Minimax.');
        }, 300);
    }

    // 4. NẾU CHỈ MINIMAX SẬP -> ÉP SANG 11LABS
    else if (_minimaxDown && !_11labsDown) {
        console.log('⚠️ Minimax bảo trì -> Chuyển sang ElevenLabs');
        currentProvider = 'elevenlabs';

        setTimeout(() => {
            selectProvider('elevenlabs');

            // Disable nút Minimax
            let $btn = $('.provider-option[data-provider="minimax"]');
            $btn.css({ 'opacity': '0.5', 'pointer-events': 'none', 'cursor': 'not-allowed' });
            $btn.find('.provider-desc').html('<span style="color:#ef4444; font-weight:bold">🔴 Đang bảo trì</span>');

            showToast('⚠️ Minimax bảo trì. Đã chuyển sang ElevenLabs.');
        }, 300);
    }
    // Khai báo biến timer ở ngoài để kiểm soát
    let typingTimer;
    const doneTypingInterval = 1000;

    // Tự động tính tiền ngay khi gõ hoặc PASTE văn bản
    $('#txtInput').on('input propertychange paste', function () {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(function () {
            updateEstimatedCost();
        }, doneTypingInterval);
    });
    // ================================================================
    // 1. SỰ KIỆN GIAO DIỆN CƠ BẢN
    // ================================================================

    // Tự động tính tiền ngay khi gõ hoặc PASTE văn bản
    $('#txtInput').on('input propertychange paste', function () {
        // Dùng setTimeout nhỏ để chờ text paste vào xong hẳn mới tính
        setTimeout(function () {
            updateEstimatedCost();
        }, 50);
    });

    // Tính tiền lại khi đổi Tab giọng (Default <-> Cloned)
    // Lưu lại tab vào localStorage để khi F5 không bị mất
    $('.voice-tab-btn').on('click', function () {
        // Cập nhật biến trạng thái
        window.currentVoiceTab = $(this).data('type');

        // 🔥 LƯU VÀO BỘ NHỚ
        localStorage.setItem('tts_last_tab', window.currentVoiceTab);

        console.log("Đã đổi tab sang: " + window.currentVoiceTab);
        updateEstimatedCost();
    });

    // 5. Credits tooltip (Hover)
    $('#creditsTrigger').hover(
        function () { $('#creditsTooltip').stop(true, true).fadeIn(200); },
        function () { $('#creditsTooltip').stop(true, true).fadeOut(200); }
    );

    // Close dropdowns khi click ra ngoài
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.provider-dropdown-wrapper').length) {
            $('#providerDropdown').removeClass('show');
            $('#providerDropdownIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');
        }
        if (!$(e.target).closest('.lang-selector-wrapper').length &&
            !$(e.target).closest('[onclick*="toggleLangDropdown"]').length) {
            $('#langDropdown').removeClass('show');
            $('#langDropdownIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');
        }
        if (!$(e.target).closest('#minimaxModelBtn').length &&
            !$(e.target).closest('#minimaxModelDropdown').length) {
            $('#minimaxModelDropdown').removeClass('show');
            $('#minimaxModelIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');
        }
    });

    // ================================================================
    // 2. KHÔI PHỤC TRẠNG THÁI (RESTORE STATE) - QUAN TRỌNG
    // ================================================================

    // A. Khôi phục nội dung văn bản
    let savedText = localStorage.getItem('tts_input_draft');
    if (savedText) {
        $('#txtInput').val(savedText);
    }

    // B. Khôi phục tên file (nếu có)
    let savedFileName = localStorage.getItem('tts_filename');
    if (savedFileName) {
        $('#fileNameDisplay').text(`📂 ${savedFileName}`).show();
    }

    // C. Khôi phục cờ SRT (để tính tiền đúng)
    let savedIsSrt = localStorage.getItem('tts_is_srt');
    if (savedIsSrt === 'true') {
        window.isSrtFile = true;
        $('#srtFeeInfo').show();
    } else {
        window.isSrtFile = false;
        $('#srtFeeInfo').hide();
    }

    // 🔥 D. KHÔI PHỤC TAB GIỌNG NÓI (FIX LỖI GIÁ TIỀN)
    let savedTab = localStorage.getItem('tts_last_tab');
    if (savedTab) {
        window.currentVoiceTab = savedTab;
        console.log("♻️ Đã khôi phục Tab cũ:", savedTab);

        // (Tùy chọn) Cập nhật UI Active cho Tab nếu cần
        $('.voice-tab-btn').removeClass('active');
        $(`.voice-tab-btn[data-type="${savedTab}"]`).addClass('active');
    }

    // E. Tính toán lại chi phí ngay lập tức sau khi restore xong
    setTimeout(() => {
        togglePlaceholder();
        // Gọi updateEstimatedCost() thay vì calculateCost() để đảm bảo logic hiển thị UI chuẩn
        updateEstimatedCost();
    }, 100);

    // ================================================================
    // 3. LOGIC BẢO TRÌ & BACKUP (MAINTENANCE)
    // ================================================================

    // Lấy biến từ PHP truyền xuống
    let isElevenLabsDown = (typeof elevenlabsDown !== 'undefined' && elevenlabsDown);
    let isMinimaxDown = (typeof minimaxDown !== 'undefined' && minimaxDown);
    let isBackupEligible = (typeof backupEligible !== 'undefined' && backupEligible);
    let isGenaiBackupDown = (typeof genaiBackupDown !== 'undefined' && genaiBackupDown);

    // 🔥 [FIX MỚI] CASE 1: CẢ 2 ĐỀU DOWN -> CHUYỂN HƯỚNG NGAY
    if (isElevenLabsDown && isMinimaxDown && isGenaiBackupDown) {
        console.error('❌ ALL SYSTEMS DOWN. Redirecting...');

        $('body').empty().css('background', '#000').html(`
            <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff;">
                <h1>🚧 Hệ thống đang bảo trì</h1>
                <p>Đang chuyển hướng...</p>
            </div>
        `);

        setTimeout(() => {
            window.location.href = '/pages/maintenance.php?path=' + encodeURIComponent('/ai/tts');
        }, 500);
        return; // ⛔ Dừng code tại đây, KHÔNG chạy loadResources()
    }

    // ✅ CASE 2: CHỈ ELEVENLABS DOWN
    if (isElevenLabsDown && !isMinimaxDown) {
        console.log('🔍 [DEBUG] ElevenLabs bảo trì.');

        // Kiểm tra Backup có dùng được không (Eligible + Server Backup còn sống)
        if (isBackupEligible && !isGenaiBackupDown) {
            console.log('✅ User được dùng Backup. Giữ nguyên ElevenLabs.');
            setTimeout(() => {
                $('.provider-option[data-provider="elevenlabs"] .provider-desc')
                    .html('Đang dùng <strong style="color: #667eea;">Backup (Miễn phí)</strong>');
                showToast('ℹ️ ElevenLabs đang dùng Backup (miễn phí)', 'info');
            }, 300);
        } else {
            console.log('⚠️ Chuyển sang Minimax...');
            currentProvider = 'minimax';
            setTimeout(() => {
                selectProvider('minimax');
                disableProviderOption('elevenlabs');

                if (isGenaiBackupDown) {
                    showToast('⚠️ ElevenLabs và hệ thống Backup đều đang bảo trì.');
                } else {
                    showToast('⚠️ ElevenLabs đang bảo trì. Đã chuyển sang Minimax.');
                }
            }, 500);
        }
    }

    // ✅ CASE 3: CHỈ MINIMAX DOWN
    else if (isMinimaxDown && !isElevenLabsDown) {
        console.log('⚠️ Minimax down, staying on ElevenLabs');
        currentProvider = 'elevenlabs';
        setTimeout(() => {
            selectProvider('elevenlabs');
            disableProviderOption('minimax');
            showToast('⚠️ Minimax đang bảo trì.');
        }, 500);
    }

    // ================================================================
    // 4. KHỞI TẠO HỆ THỐNG (CHỈ CHẠY NẾU KHÔNG BỊ RETURN)
    // ================================================================

    $('#pageLoader').css('display', 'flex');

    updateEmptyStateTips('elevenlabs');
    $('#elevenlabs-settings').removeClass('hidden');
    $('#minimax-settings').addClass('hidden');
    // Cập nhật giao diện nếu đang chạy Backup
    if (isElevenLabsDown && isBackupEligible && !isGenaiBackupDown) {
        $('.provider-option[data-provider="elevenlabs"] .provider-desc').css('color', '#888').text('Đang sử dụng Backup (Miễn phí).');

        // Cập nhật nút chọn hiện tại
        if (currentProvider === 'elevenlabs') {
            $('#currentProviderName').html('ElevenLabs <span style="color:#4ade80; font-size:11px;">(Backup)</span>');
        }

    }
    // 🔥 BACKUP: Bắt mọi thay đổi trong textarea
    $('#txtInput').on('input change paste', function () {
        updateEstimatedCost();
        togglePlaceholder();
    });

    // 🔥 Bắt cả khi setValue bằng jQuery
    const originalVal = $.fn.val;
    $.fn.val = function (value) {
        const result = originalVal.apply(this, arguments);

        if (this.is('#txtInput') && arguments.length > 0) {
            setTimeout(() => {
                updateEstimatedCost();
                togglePlaceholder();
            }, 100);
        }

        return result;
    };
    setInterval(function () {
        // Lấy giờ hiện tại
        let time = new Date().toLocaleTimeString();
        console.log(`%c[${time}] ⏱️ Timer 30s kích hoạt...`, "color: #fbbf24; font-weight: bold;");

        // 🔥 [THÊM MỚI] Kiểm tra Modal chi tiết có đang mở không
        let isModalOpen = $('#detailedHistoryModal').is(':visible');
        let isTabOpen = $('#viewHistory').hasClass('show');
        let isNotLoading = !isLoadingHistory;

        // CHỈ refresh khi:
        // 1. Tab History đang mở
        // 2. KHÔNG đang load
        // 3. Modal chi tiết ĐANG ĐÓNG (quan trọng!)
        if (isTabOpen && isNotLoading && !isModalOpen) {
            console.log(`   ✅ Điều kiện thỏa mãn. Đang gọi hàm silentRefreshHistory()...`);
            silentRefreshHistory();
        } else {
            let reason = '';
            if (!isTabOpen) reason = 'Tab Lịch sử đang đóng';
            else if (isNotLoading) reason = 'Đang tải dữ liệu khác';
            else if (isModalOpen) reason = 'Modal chi tiết đang mở'; // ← LÝ DO MỚI

            console.log(`   ⏸️ Bỏ qua. Lý do: ${reason}`);
        }
    }, 30000); // 30 giây
    setTimeout(() => {
        if (typeof currentProvider !== 'undefined') {
            if (currentProvider === 'minimax') {
                $('#btnNormalizeVN').fadeIn(200);
            } else {
                $('#btnNormalizeVN').fadeOut(200);
            }
        }
    }, 500);
    // ✅ THÊM DÒNG NÀY VÀO CUỐI $(document).ready()
    setInterval(checkStuckTasks, 10 * 60 * 1000); // Check mỗi 10 phút

    // Check ngay lần đầu sau 30 giây
    setTimeout(checkStuckTasks, 30000);
    // Load dữ liệu
    loadResources();
    loadHistory();
    setupInfiniteScroll();
    setupAudioEvents();
    setupEventListeners();
    setupBulkDropZone();
});
// 🔥 THÊM VÀO CUỐI $(document).ready()
function setupDetailedInfiniteScroll() {
    const $modal = $('#detailedHistoryModal');
    const $listBody = $('.dh-list-body');

    $listBody.off('scroll').on('scroll', function () {
        // Chỉ chạy khi modal đang mở
        if (!$modal.is(':visible')) return;

        const scrollTop = $listBody.scrollTop();
        const scrollHeight = $listBody[0].scrollHeight;
        const clientHeight = $listBody.height();

        // Khi scroll gần đến cuối (còn 100px)
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            // Load thêm nếu còn data
            if (detailedHistoryHasMore && !detailedHistoryLoading) {
                console.log('🔽 Scrolled to bottom, loading more...');
                loadDetailedHistoryData(detailedHistoryPage + 1, true); // append = true
            }
        }
    });
}

// Gọi khi mở modal
function openDetailedHistory() {
    // Reset state
    detailedHistoryPage = 1;
    detailedHistoryAllData = [];
    detailedHistoryHasMore = true;
    detailedHistoryLoading = false;

    $('#detailedHistoryModal').fadeIn(200);

    // Setup scroll listener
    setupDetailedInfiniteScroll();

    // Load trang đầu tiên
    loadDetailedHistoryData(1, false);
}
// ========================================
// 🤫 LÀM MỚI LỊCH SỬ ÂM THẦM (ĐÃ BỎ LOADING)
// ========================================
function silentRefreshHistory() {
    // 1. Reset các biến đếm phân trang về ban đầu
    currentOffset = 0;
    hasMoreHistory = true;
    isLoadingHistory = false; // Mở khóa để đảm bảo loadHistory chạy được

    // 2. Xóa sạch danh sách hiện tại & Ẩn thông báo "Hết dữ liệu"
    // (Bắt buộc phải xóa để không bị trùng lặp task cũ và mới)
    $('#historyListContainer').empty();
    $('#noMoreData').hide();

    // 3. [ĐÃ BỎ THEO YÊU CẦU] - Không hiện loading spinner nữa

    // 4. Gọi lại hàm loadHistory để tải trang 1
    loadHistory();
}
function updateEmptyStateTips(provider) {
    if (provider === 'minimax') {
        $('#emptyTips').html(`
            <div class="es-tip">
                <i class="bi bi-lightbulb-fill" style="color: var(--warning);"></i>
                <span>💡 Chèn <b>&lt;#0.5#&gt;</b> để ngừng 0.5 giây.</span>
            </div>
            <div class="es-tip">
                <i class="bi bi-folder-fill" style="color: #3b82f6;"></i>
                <span>📁 Kéo thả tệp <b>.txt</b> vào đây.</span>
            </div>
        `);
    } else {
        $('#emptyTips').html(`
            <div class="es-tip">
                <i class="bi bi-flag-fill" style="color: var(--error);"></i>
                <span>Tiếng Việt nên sử dụng <b>Minimax</b></span>
            </div>
            <div class="es-tip">
                <i class="bi bi-lightbulb-fill" style="color: var(--warning);"></i>
                <span>Chèn <code class="es-code">&lt;break time="0.5s" /&gt;</code> để nghỉ 0.5 giây</span>
            </div>
            <div class="es-tip">
                <i class="bi bi-folder-fill" style="color: #3b82f6;"></i>
                <span>Kéo thả tệp <b>.txt</b> vào đây</span>
            </div>
        `);
    }
}
// ========== SETUP EVENT LISTENERS ==========
function setupEventListeners() {
    // 1. Text input events (Đã gộp: Lưu bộ nhớ + Hiện/Ẩn Placeholder + Tính tiền)
    $('#txtInput').on('input', function () {
        let content = $(this).val();

        // Luôn cập nhật nội dung text vào bộ nhớ
        localStorage.setItem('tts_input_draft', content);

        // 🔥 [MỚI] NẾU XÓA SẠCH CHỮ -> XÓA LUÔN FILE
        if (content.trim() === '') {
            localStorage.removeItem('tts_filename');
            localStorage.removeItem('tts_is_srt');
            window.isSrtFile = false;
            $('#fileNameDisplay').hide().text('');
            $('#srtFeeInfo').hide();
        }

        togglePlaceholder();
        updateEstimatedCost(); // ✅ SỬA: Đổi từ calculateCost() sang updateEstimatedCost()
    });

    // 🔥 [THÊM MỚI] 2. Checkbox phụ đề events
    $('#subtitleCheck, #minimaxSubtitleCheck').on('change', function () {
        console.log('✅ Subtitle checkbox changed:', $(this).prop('checked'));
        updateEstimatedCost(); // ← Tính lại giá ngay
    });

    // 3. Các thanh trượt (Sliders) - GIỮ NGUYÊN
    $('#vol').on('input', function () {
        $('#volVal').text(parseFloat(this.value).toFixed(2));
        updateSliderFill(this);
    });

    $('#speed').on('input', function () {
        $('#speedVal').text(parseFloat(this.value).toFixed(2));
        updateSliderFill(this);
    });

    $('#pitch').on('input', function () {
        $('#pitchVal').text(this.value);
        updateSliderFill(this);
    });

    // 🔥 Logic hiển thị chữ cho Stability v3
    $('#stability').on('input', function () {
        let val = parseInt(this.value);

        // Kiểm tra step=50 để biết là model V3
        let isV3 = $(this).attr('step') === '50';

        if (isV3) {
            let text = "Natural";
            let color = "#5bc0de"; // Blue for Natural

            if (val === 0) {
                text = "Creative";
                color = "#f0ad4e"; // Orange for Creative
            } else if (val === 100) {
                text = "Robust";
                color = "#5cb85c"; // Green for Robust
            }

            // Hiển thị chữ với màu sắc tương ứng
            $('#stabilityVal').html(`<span style="color: ${color}; font-weight: bold;">${text}</span>`);
        } else {
            // Model thường hiển thị %
            $('#stabilityVal').text(this.value + '%');
        }
        updateSliderFill(this);
    });

    $('#similarity').on('input', function () {
        $('#similarityVal').text(this.value + '%');
        updateSliderFill(this);
    });

    $('#style').on('input', function () {
        $('#styleVal').text(this.value + '%');
        updateSliderFill(this);
    });

    $('#elevenSpeed').on('input', function () {
        let val = parseFloat(this.value);
        $('#elevenSpeedVal').text(val.toFixed(2));
        updateSliderFill(this);

        if (val > 1.5) {
            $(this).closest('.slider-container').addClass('warning');
        } else {
            $(this).closest('.slider-container').removeClass('warning');
        }
    });

    // 3. Khởi tạo màu thanh trượt khi load
    setTimeout(() => {
        $('input[type=range]').each(function () {
            updateSliderFill(this);
        });
    }, 100);

    // 4. Khởi tạo Drag & Drop
    setupDragDrop();
}

// Hàm update fill
function updateSliderFill(slider) {
    let value = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--value', value + '%');
}

// ========== PROVIDER DROPDOWN ==========
function toggleProviderDropdown() {
    $('#providerDropdown').toggleClass('show');
    $('#providerDropdownIcon').toggleClass('bi-chevron-up bi-chevron-down');
}

// ========== SELECT PROVIDER (GỘP LOGIC TỐI ƯU) ==========
function selectProvider(provider) {
    // 🔴 CHẶN BẢO TRÌ (SERVER 3)
    if (provider === 'elevenlabs' && window.isElevenLabsDown === true) {
        showToast('❌ ElevenLabs (KingCong) đang bảo trì!');
        return;
    }
    if (provider === 'minimax' && window.isMinimaxDown === true) {
        showToast('❌ Minimax (KingCong) đang bảo trì!');
        return;
    }
    // 🔥 LOG DEBUG (Có thể bật/tắt dễ dàng)
    const DEBUG = false; // Đổi true để bật log chi tiết

    if (DEBUG) {
        console.log(`%c🖱️ CLICK: Yêu cầu chuyển sang ${provider.toUpperCase()}`, "color: #00ffff; font-weight: bold; font-size: 14px;");
        console.log("📊 Trạng thái biến toàn cục:", {
            "currentProvider": typeof currentProvider !== 'undefined' ? currentProvider : 'undefined',
            "elevenlabsDown": typeof elevenlabsDown !== 'undefined' ? elevenlabsDown : 'undefined',
            "backupEligible": typeof backupEligible !== 'undefined' ? backupEligible : 'undefined',
            "minimaxDown": typeof minimaxDown !== 'undefined' ? minimaxDown : 'undefined'
        });
    } else {
        console.log(`🖱️ CLICK: Yêu cầu chuyển sang ${provider.toUpperCase()}`);
    }

    // ============================================================
    // 🔍 PHẦN KIỂM TRA BẢO TRÌ
    // ============================================================

    // 1. Kiểm tra ElevenLabs
    if (provider === 'elevenlabs') {
        if (typeof elevenlabsDown !== 'undefined' && elevenlabsDown) {
            if (DEBUG) console.log('🔍 [LOGIC] ElevenLabs đang bảo trì. Kiểm tra Backup...');

            // Kiểm tra Backup có khả dụng không
            let isBackupAvailable = (typeof backupEligible !== 'undefined' && backupEligible &&
                typeof genaiBackupDown !== 'undefined' && !genaiBackupDown);

            if (!isBackupAvailable) {
                if (DEBUG) console.warn('⛔ [BLOCKED] Không được phép dùng Backup.');
                showToast('❌ ElevenLabs đang bảo trì và không có Backup!');
                return;
            }
            if (DEBUG) console.log('✅ [ALLOWED] Được phép dùng Backup.');
        }
    }

    // 2. Kiểm tra Minimax
    if (provider === 'minimax') {
        if (typeof minimaxDown !== 'undefined' && minimaxDown) {
            if (DEBUG) console.warn('⛔ [BLOCKED] Minimax đang bảo trì.');
            showToast('❌ Minimax đang bảo trì!');
            return;
        }
    }

    // ============================================================
    // 🚀 THỰC HIỆN CHUYỂN ĐỔI GIAO DIỆN
    // ============================================================

    currentProvider = provider;
    if (DEBUG) console.log(`✅ Đã gán currentProvider = ${currentProvider}`);

    // Update UI Active State
    $('.provider-option').removeClass('active');
    $(`.provider-option[data-provider="${provider}"]`).addClass('active');

    // Xử lý ẩn hiện Settings
    if (provider === 'minimax') {
        if (DEBUG) console.log('🛠️ [DEBUG] Render giao diện: MINIMAX');

        $('#currentProviderName').text('Minimax');
        $('#currentProviderLogo').attr('src', 'https://ai33.pro/minimax.png?v=3');

        $('#elevenlabs-settings').addClass('hidden');
        $('#minimax-settings').removeClass('hidden');

        updateEmptyStateTips('minimax');

        // Logic Tabs trong Modal
        if ($('#voiceModal').is(':visible')) {
            $('.vm-tab[data-tab="library"]').hide();
            $('.vm-tab[data-tab="cloned"]').show();
            if (currentVoiceTab === 'library') switchVoiceTab('default');
        }
    } else {
        if (DEBUG) console.log('🛠️ [DEBUG] Render giao diện: ELEVENLABS');

        $('#currentProviderName').text('Elevenlabs');
        $('#currentProviderLogo').attr('src', 'https://ai33.pro/11max.png?v=3');

        $('#elevenlabs-settings').removeClass('hidden');
        $('#minimax-settings').addClass('hidden');

        updateEmptyStateTips('elevenlabs');

        // Logic Tabs trong Modal
        if ($('#voiceModal').is(':visible')) {
            $('.vm-tab[data-tab="library"]').show();
            $('.vm-tab[data-tab="cloned"]').hide();
            if (currentVoiceTab === 'cloned') switchVoiceTab('default');
        }
    }

    // Reset các lựa chọn cũ
    $('#selectedVoiceName').text("Chọn giọng nói...");
    $('#voiceIdVal').val("");

    // Đóng dropdown menu
    $('#providerDropdown').removeClass('show');
    $('#providerDropdownIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');

    hideModelDetails();
    renderMinimaxModels();

    // 🔥 TÍNH TOÁN LẠI GIÁ TIỀN
    if (DEBUG) console.log('💰 [DEBUG] Gọi updateEstimatedCost()...');
    updateEstimatedCost();

    // Force update lần 2 để fix lỗi render CSS (nếu có)
    setTimeout(() => {
        updateEstimatedCost();
    }, 100);
    if (provider === 'minimax') {
        $('#btnNormalizeVN').fadeIn(200); // Hiện nút
    } else {
        $('#btnNormalizeVN').fadeOut(200); // Ẩn nút
    }
}
// ========== LANGUAGE DROPDOWN ==========
// ========== LANGUAGE DROPDOWN ==========
function toggleLangDropdown() {
    $('#langDropdown').toggleClass('show');
    $('#langDropdownIcon').toggleClass('bi-chevron-up bi-chevron-down');
}

function selectLanguage(langCode, displayName) {
    selectedLanguage = langCode;
    $('#selectedLang').text(displayName);

    $('.lang-option').removeClass('active');
    $(`.lang-option[data-lang="${langCode}"]`).addClass('active');

    $('#langDropdown').removeClass('show');
    $('#langDropdownIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');
}

// Đóng dropdown khi click ngoài
$(document).on('click', function (e) {
    if (!$(e.target).closest('.provider-dropdown-wrapper').length) {
        $('#providerDropdown').removeClass('show');
        $('#providerDropdownIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');
    }
    if (!$(e.target).closest('.lang-selector-wrapper').length) {
        $('#langDropdown').removeClass('show');
        $('#langDropdownIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');
    }
});

function hidePageLoader() {
    $('#pageLoader').fadeOut(300, function () {
        $('#btnProcess').prop('disabled', false);
    });
}

// ========== LOAD RESOURCES ==========
async function loadResources() {
    console.log('🚀 loadResources() called');

    try {
        // Use Electron IPC to get resources
        const res = await window.electronAPI.getResources();
        console.log('✅ API Response received:', res);

        if (res.status === 'success') {
            try {
                // 1. Kiểm tra an toàn trước khi map dữ liệu Voices
                let elVoices = (res.data && res.data.elevenlabs && res.data.elevenlabs.voices) ? res.data.elevenlabs.voices : [];
                let mmVoices = (res.data && res.data.minimax && res.data.minimax.voices) ? res.data.minimax.voices : [];

                loadedVoices.elevenlabs = enhanceVoiceData(elVoices, 'elevenlabs');
                let systemMinimaxVoices = enhanceVoiceData(mmVoices, 'minimax');

                // 2. Kiểm tra an toàn Models
                let elModels = (res.data && res.data.elevenlabs && res.data.elevenlabs.models) ? res.data.elevenlabs.models : [];
                let mmModels = (res.data && res.data.minimax && res.data.minimax.models) ? res.data.minimax.models : [];

                loadedModels = {
                    elevenlabs: elModels,
                    minimax: mmModels
                };

                // 3. Xử lý logic GenAI Backup (Nếu không có models nào)
                if (loadedModels.elevenlabs.length === 0) {
                    loadedModels.elevenlabs.push({
                        id: 'genai_backup',
                        name: 'GenAI Backup Mode',
                        description: 'Chế độ dự phòng',
                        cost_factor: 1
                    });
                }

                // 4. Load Models & Voices
                loadClonedVoicesAndMerge(systemMinimaxVoices);
                renderMinimaxModels();
                renderElevenLabsModels();

            } catch (e) {
                console.error("❌ Error inside loadResources processing:", e);
            }
        }
    } catch (error) {
        console.error("❌ API loadResources Failed:", error);
        // Fallback: Tạo model giả nếu API chết hẳn
        loadedModels.elevenlabs = [{ id: 'backup', name: 'Backup Mode' }];
        renderElevenLabsModels();
    } finally {
        // 🔥 QUAN TRỌNG NHẤT: Luôn luôn tắt loading dù thành công hay thất bại
        console.log('🏁 loadResources finished. Hiding Loader.');
        hidePageLoader();
    }
}
async function loadClonedVoicesAndMerge(systemVoices) {
    try {
        const res = await window.electronAPI.apiRequest(`${API_BASE_URL}/voice_cloning3.php`, { action: 'list_clones' });
        let clonedVoices = [];

        if (res.status === 'success' && res.voices && res.voices.length > 0) {
            // 🔥 [FIX] LỌC CHỈ LẤY AI33, BỎ AI84
            let ai33Clones = res.voices.filter(v => v.server === 'ai33');

            console.log(`🔍 Cloned voices filter: ${res.voices.length} total → ${ai33Clones.length} AI33 only`);

            // Map dữ liệu từ DB sang cấu trúc chung của Frontend
            clonedVoices = ai33Clones.map(v => ({
                id: v.voice_id,
                name: v.voice_name + ' (Clone)',
                avatar: v.cover_url,
                tags: ['Clone', v.language || 'VN'],
                gender: v.gender || 'Unknown',
                preview_url: v.sample_audio,
                source: 'cloned',
                server_type: 'ai33' // ✅ Đảm bảo luôn là AI33
            }));
        }

        // Gộp giọng Clone vào danh sách Minimax
        loadedVoices.minimax = [...clonedVoices, ...systemVoices];

        console.log(`✅ Loaded ${clonedVoices.length} cloned voices (AI33 only).`);

        // Nếu đang ở tab clone thì render lại ngay lập tức
        if (currentVoiceTab === 'cloned') {
            renderClonedVoices();
        }
    } catch (error) {
        console.error('❌ Lỗi tải danh sách giọng clone:', error);
        loadedVoices.minimax = systemVoices;
    }
}
function enhanceVoiceData(voices, provider) {
    if (!voices) return [];
    return voices.map(v => {
        let tags = [];
        let gender = 'Male';
        let nameLower = (v.name || '').toLowerCase();

        if (nameLower.includes('girl') || nameLower.includes('woman') ||
            nameLower.includes('lady') || nameLower.includes('female') ||
            nameLower.includes('mrs') || (v.tags && v.tags.includes('Female'))) {
            gender = 'Female';
        }

        if (provider === 'minimax') {
            tags = v.tags || [];
            gender = v.gender || gender;
        } else {
            tags.push('English');
            if (v.tags && Array.isArray(v.tags)) {
                tags = tags.concat(v.tags.slice(0, 2));
            }
        }

        tags.push(gender);

        // 🔥 XỬ LÝ AVATAR ĐẦY ĐỦ CHO MINIMAX
        let avatar;

        if (provider === 'minimax') {
            // 1. Ưu tiên avatar từ API
            if (v.avatar) {
                avatar = v.avatar;
            }
            // 2. Fallback: cover_url (từ cloned voices)
            else if (v.cover_url) {
                avatar = v.cover_url;
            }
            // 3. Fallback: image_url (nếu có)
            else if (v.image_url) {
                avatar = v.image_url;
            }
            // 4. Fallback cuối: Generate avatar
            else {
                avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(v.name)}&background=random&size=128&color=fff&bold=true`;
            }
        } else {
            // ElevenLabs
            avatar = v.avatar || v.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.name)}&background=random&size=128&color=fff&bold=true`;
        }

        return {
            id: v.id,
            name: v.name,
            avatar: avatar,
            tags: tags,
            gender: gender,
            preview_url: v.preview_url || v.sample_audio,
            source: v.source || 'default',
            description: v.description || '',
            server_type: v.server_type || 'ai33' // 🔥 THÊM DÒNG NÀY: Mặc định ai33 nếu thiếu
        };
    });
}


// ========== RENDER MINIMAX MODELS AS DROPDOWN ==========
function renderMinimaxModels() {
    if (currentProvider !== 'minimax') return;

    let models = loadedModels.minimax || [];

    // 🔥 FIX: Kiểm tra rỗng
    if (models.length === 0) {
        $('#minimaxModelDropdown').html('<div style="padding:10px; color:#888;">Không có model khả dụng</div>');
        $('#selectedMinimaxModel').text('Default');
        return;
    }

    let html = '';

    models.forEach((m, index) => {
        let badge = '';
        if (m.cost_factor < 1) {
            badge = `<span style="color: #fbbf24; font-size: 11px; margin-left: 6px;">${Math.round((1 - m.cost_factor) * 100)}% rẻ hơn</span>`;
        } else if (m.cost_factor > 1) {
            badge = `<span style="color: #4ade80; font-size: 11px; margin-left: 6px;">Chất lượng cao</span>`;
        }

        let isActive = (index === 0) ? 'active' : '';
        if (index === 0) {
            selectedMinimaxModel = m.id;
            $('#selectedMinimaxModel').text(m.name);
        }

        html += `
        <div class="lang-option ${isActive}" data-model="${m.id}" onclick="selectMinimaxModelFromDropdown('${m.id}', '${m.name}')">
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #fff; margin-bottom: 3px;">
                    ${m.name}${badge}
                </div>
                <div style="font-size: 11px; color: #777;">${m.description || 'Xử lý văn bản tự nhiên'}</div>
            </div>
            <i class="bi bi-check-lg check-icon"></i>
        </div>`;
    });

    $('#minimaxModelDropdown').html(html);
}

// Toggle Minimax Model Dropdown
function toggleMinimaxModelDropdown() {
    $('#minimaxModelDropdown').toggleClass('show');
    $('#minimaxModelIcon').toggleClass('bi-chevron-up bi-chevron-down');
}

// Select Minimax Model
function selectMinimaxModelFromDropdown(modelId, modelName) {
    selectedMinimaxModel = modelId;
    $('#selectedMinimaxModel').text(modelName);

    $('.lang-option[data-model]').removeClass('active');
    $(`.lang-option[data-model="${modelId}"]`).addClass('active');

    $('#minimaxModelDropdown').removeClass('show');
    $('#minimaxModelIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');

    // 🔥 SỬA: Gọi updateEstimatedCost() thay vì calculateCost()
    updateEstimatedCost();
}

// Thêm vào document click handler
$(document).on('click', function (e) {
    if (!$(e.target).closest('.provider-dropdown-wrapper').length) {
        $('#providerDropdown').removeClass('show');
        $('#providerDropdownIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');
    }
    if (!$(e.target).closest('.lang-selector-wrapper').length) {
        $('#langDropdown').removeClass('show');
        $('#langDropdownIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');
    }
    // THÊM CHO MINIMAX MODEL
    if (!$(e.target).closest('#minimaxModelBtn').length && !$(e.target).closest('#minimaxModelDropdown').length) {
        $('#minimaxModelDropdown').removeClass('show');
        $('#minimaxModelIcon').removeClass('bi-chevron-up').addClass('bi-chevron-down');
    }
});

function selectMinimaxModel(modelId, elem) {
    selectedMinimaxModel = modelId;
    $('.model-selector-item').removeClass('active');
    $(elem).addClass('active');
}

// ========== RENDER ELEVENLABS MODELS ==========
function renderElevenLabsModels() {
    if (currentProvider !== 'elevenlabs') return;

    console.log('🎯 renderElevenLabsModels()');

    let models = loadedModels.elevenlabs || [];

    // Nếu không có model nào -> Dừng
    if (models.length === 0) {
        $('#selectedModelName').text('GenAI Backup');
        $('#elevenlabs-settings').hide();
        return;
    }

    // Tìm model mặc định
    let targetId = 'eleven_multilingual_v2';
    let defaultModel = models.find(m => m.id === targetId) || models[0];

    if (defaultModel) {
        // 🔥 [FIX V3] THÊM full_data NẾU THIẾU
        if (!defaultModel.full_data) {
            console.warn('⚠️ Model missing full_data, creating fallback for:', defaultModel.id);
            defaultModel.full_data = {
                can_use_style: defaultModel.id !== 'eleven_v3',
                can_use_speaker_boost: true
            };
        }

        // 🔥 THÊM GHI CHÚ "Not used for Vietnamese" CHO V2
        let displayName = defaultModel.name;

        if (defaultModel.id === 'eleven_multilingual_v2') {
            displayName += ' (Không dùng cho Tiếng Việt)';
        }

        $('#selectedModelName').text(displayName);

        // 🔥 CẬP NHẬT UI (Gọi với fallback data đã fix)
        updateElevenLabsUI(defaultModel.id);
    }
}

// ========== UPDATE ELEVENLABS UI BASED ON MODEL ==========
function updateElevenLabsUI(modelId) {
    console.log('🔧 updateElevenLabsUI called for:', modelId);

    let model = loadedModels.elevenlabs.find(m => m.id === modelId);

    // 🔥 [FIX V3] FALLBACK NẾU KHÔNG TÌM THẤY MODEL
    if (!model) {
        console.warn('⚠️ Model not found:', modelId, '- Using defaults');
        model = {
            id: modelId,
            full_data: {
                can_use_style: modelId !== 'eleven_v3',
                can_use_speaker_boost: true
            }
        };
    }

    // 🔥 [FIX V3] FALLBACK NẾU THIẾU full_data
    if (!model.full_data) {
        console.warn('⚠️ Model missing full_data:', modelId, '- Creating fallback');
        model.full_data = {
            can_use_style: modelId !== 'eleven_v3',
            can_use_speaker_boost: true
        };
    }

    // Lấy thông tin từ full_data (đã có fallback)
    let canUseStyle = model.full_data.can_use_style === true;
    let canUseSpeakerBoost = model.full_data.can_use_speaker_boost === true;

    // ========== LOGIC ẨN/HIỆN CONTROLS ==========

    // 1. Speed -> 🔥 ẨN HOÀN TOÀN VỚI V3
    if (modelId === 'eleven_v3') {
        $('#slider-speed').hide();
        console.log('  → Speed: HIDDEN (V3)');
    } else {
        $('#slider-speed').show();
        console.log('  → Speed: VISIBLE');
    }

    // 2. Stability -> LUÔN HIỆN
    $('#slider-stability').show();
    console.log('  → Stability: VISIBLE');

    // 3. Similarity -> Ẩn với V3
    if (modelId === 'eleven_v3') {
        $('#slider-similarity').hide();
        console.log('  → Similarity: HIDDEN (V3)');
    } else {
        $('#slider-similarity').show();
        console.log('  → Similarity: VISIBLE');
    }

    // 4. Style -> Ẩn với V3 hoặc model không hỗ trợ
    if (modelId === 'eleven_v3' || !canUseStyle) {
        $('#slider-style').hide();
        console.log('  → Style: HIDDEN');
    } else {
        $('#slider-style').show();
        console.log('  → Style: VISIBLE');
    }

    // 5. Speaker Boost
    if (canUseSpeakerBoost) {
        $('#toggle-boost').show();
        console.log('  → Boost: VISIBLE');
    } else {
        $('#toggle-boost').hide();
        console.log('  → Boost: HIDDEN');
    }

    // ========== CẤU HÌNH STABILITY SLIDER ==========

    if (modelId === 'eleven_v3') {
        console.log('🎯 Configuring V3 3-tier stability...');

        // 1. Set step = 50 (chỉ 3 nấc: 0, 50, 100)
        $('#stability').attr({
            'step': '50',
            'min': '0',
            'max': '100'
        });

        // 2. Set giá trị mặc định là 50 (Natural)
        $('#stability').val(50);

        // 3. Thêm labels nếu chưa có
        if ($('#stability-labels').length === 0) {
            $('#stability').after(`
                <div id="stability-labels" style="display:flex; justify-content:space-between; font-size:12px; color:#888; margin-top:6px; font-weight:600;">
                    <span style="color:#f0ad4e;">Creative</span>
                    <span style="color:#5bc0de;">Natural</span>
                    <span style="color:#5cb85c;">Robust</span>
                </div>
            `);
        }
        $('#stability-labels').show();

        // 4. Cập nhật header để hiển thị text thay vì %
        $('#slider-stability .slider-header').html('<span>Stability: <span id="stabilityVal" style="color: #5bc0de; font-weight: bold;">Natural</span></span>');

        // 5. Trigger input để cập nhật chữ và màu sắc
        $('#stability').trigger('input');

    } else {
        // Revert về giao diện cũ (hiện %) cho các model khác
        // Trả lại step = 1 để kéo mượt %
        $('#stability').attr({
            'step': '1',
            'min': '0',
            'max': '100'
        });

        // Cập nhật lại text %
        let currentVal = $('#stability').val();
        $('#slider-stability .slider-header').html('<span>Độ ổn định: <span id="stabilityVal" style="color: #ffffff;">' + currentVal + '%</span></span>');

        // Ẩn nhãn 3 nấc
        $('#stability-labels').hide();

        // Trigger input để cập nhật fill
        $('#stability').trigger('input');
    }
}

// Tiếp tục ở phần 3...
// ========== MODEL DETAILS (ElevenLabs) ==========
const elevenLabsModelsData = {
    'eleven_v3': {
        name: 'Eleven v3 (Alpha)',
        badge: 'Mới nhất',
        badgeType: 'new',
        description: 'Mô hình biểu đạt tốt nhất. Hỗ trợ hơn 70 ngôn ngữ. Cần nhiều kỹ thuật prompt engineering hơn so với các mô hình trước đây. Hiện đang ở giai đoạn alpha và độ ổn định sẽ được cải thiện theo thời gian.',
        languages: 'English, Afrikaans, Arabic, Armenian, Assamese, Azerbaijani, Belarusian, Bengali, Bosnian, Bulgarian, Catalan, Cebuano, Chichewa, Croatian, Czech, Danish, Dutch, Estonian, Filipino, Finnish, French, Galician, Georgian, German, Greek, Gujarati, Hausa, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Irish, Italian, Japanese, Javanese, Kannada, Kazakh, Kirghiz, Korean, Latvian, Lingala, Lithuanian, Luxembourgish, Macedonian, Malay, Malayalam, Mandarin Chinese, Marathi, Nepali, Norwegian, Pashto, Persian, Polish, Portuguese, Punjabi, Romanian, Russian, Serbian, Sindhi, Slovak, Slovenian, Somali, Spanish, Swahili, Swedish, Tamil, Telugu, Thai, Turkish, Ukrainian, Urdu, Vietnamese, Welsh',
        cost: 1
    },
    'eleven_multilingual_v2': {
        name: 'Eleven Multilingual v2 (Not used for Vietnamese)',
        badge: 'Chất lượng cao',
        badgeType: 'quality',
        description: 'Chế độ giống người thật và giàu cảm xúc nhất, hỗ trợ 29 ngôn ngữ. Phù hợp cho lồng tiếng, sách nói.',
        languages: 'English, Japanese, Chinese, German, Hindi, French, Korean, Portuguese, Italian, Spanish, Indonesian, Dutch, Turkish, Filipino, Polish, Swedish, Bulgarian, Romanian, Arabic, Czech, Greek, Finnish, Croatian, Malay, Slovak, Danish, Tamil, Ukrainian, Russian',
        cost: 1
    },
    'eleven_turbo_v2_5': {
        name: 'Eleven Turbo v2.5',
        badge: '50% rẻ hơn',
        badgeType: 'discount',
        description: 'Mô hình chất lượng cao, độ trễ thấp, hỗ trợ 32 ngôn ngữ. Phù hợp cho ứng dụng cần tốc độ.',
        languages: 'English, Japanese, Chinese, German, Hindi, French, Korean, Portuguese, Italian, Spanish, Russian, Indonesian, Dutch, Turkish, Filipino, Polish, Swedish, Bulgarian, Romanian, Arabic, Czech, Greek, Finnish, Croatian, Malay, Slovak, Danish, Tamil, Ukrainian, Vietnamese, Norwegian, Hungarian',
        cost: 0.5
    },
    'eleven_turbo_v2': {
        name: 'Eleven Turbo v2',
        badge: '50% rẻ hơn',
        badgeType: 'discount',
        description: 'Mô hình tiếng Anh với độ trễ thấp. Phù hợp cho các ứng dụng developer.',
        languages: 'English',
        cost: 0.5
    },
    'eleven_flash_v2_5': {
        name: 'Eleven Flash v2.5',
        badge: '50% rẻ hơn',
        badgeType: 'discount',
        description: 'Mô hình độ trễ siêu thấp, hỗ trợ 32 ngôn ngữ. Lý tưởng cho chatbot và hội thoại.',
        languages: 'English, Japanese, Chinese, German, Hindi, French, Korean, Portuguese, Italian, Spanish, Russian, Indonesian, Dutch, Turkish, Filipino, Polish, Swedish, Bulgarian, Romanian, Arabic, Czech, Greek, Finnish, Croatian, Malay, Slovak, Danish, Tamil, Ukrainian, Hungarian, Norwegian, Vietnamese',
        cost: 0.5
    },
    'eleven_flash_v2': {
        name: 'Eleven Flash v2',
        badge: '50% rẻ hơn',
        badgeType: 'discount',
        description: 'Mô hình tiếng Anh với độ trễ siêu thấp. Lý tưởng cho hội thoại.',
        languages: 'English',
        cost: 0.5
    },
    'eleven_monolingual_v1': {
        name: 'Eleven Monolingual v1',
        badge: 'Cơ bản',
        badgeType: 'basic',
        description: 'Mô hình tiếng Anh cơ bản với chi phí thấp.',
        languages: 'English',
        cost: 0.3
    }
};

function showModelDetails() {
    let provider = currentProvider;

    if (provider !== 'elevenlabs') return;

    let models = loadedModels.elevenlabs || [];

    // Lấy model hiện tại đang chọn
    let currentModelName = $('#selectedModelName').text();
    let currentModel = models.find(m => currentModelName.includes(m.name));
    let currentModelId = currentModel ? currentModel.id : models[0]?.id;

    let html = '';

    models.forEach(m => {
        let modelData = elevenLabsModelsData[m.id] || {
            name: m.name,
            badge: m.cost_factor < 1 ? 'Tiết kiệm' : 'Standard',
            badgeType: m.cost_factor < 1 ? 'discount' : 'quality',
            description: m.description || 'Mô hình text-to-speech chất lượng.',
            languages: 'English',
            cost: m.cost_factor || 1
        };

        let badgeClass = modelData.badgeType === 'discount' ? 'mo-badge discount' :
            modelData.badgeType === 'new' ? 'mo-badge new' : 'mo-badge';

        let selected = (currentModelId === m.id) ? 'selected' : '';

        let langCount = modelData.languages.split(',').length;

        html += `
        <div class="model-option ${selected}" onclick="selectModelFromSidebar('${m.id}', '${m.name}')">
            <div class="mo-header">
                <div>
                    <div class="mo-name">
                        ${modelData.name}
                        <span class="${badgeClass}" style="color: #000000;">${modelData.badge}</span>
                    </div>
                </div>
            </div>
            <div class="mo-desc">${modelData.description}</div>
            <div class="mo-languages" id="lang-${m.id}">
                <strong>Ngôn ngữ:</strong> ${modelData.languages}
            </div>
            ${langCount > 10 ? `
                <span class="mo-lang-toggle" onclick="event.stopPropagation(); toggleLanguages('${m.id}')">
                    <i class="bi bi-chevron-down"></i> Xem thêm
                </span>
            ` : ''}
        </div>`;
    });

    $('#mdContent').html(html);
    $('#modelSidebar').addClass('active');
}

// Select từ sidebar
function selectModelFromSidebar(modelId, modelName) {
    let model = loadedModels.elevenlabs.find(m => m.id === modelId);
    let badge = '';

    if (model) {
        if (model.cost_factor < 1) {
            badge = ` (${Math.round((1 - model.cost_factor) * 100)}% rẻ hơn)`;
        } else if (model.cost_factor > 1) {
            badge = ' (Đắt hơn)';
        }
    }

    $('#selectedModelName').text(modelName + badge);

    $('.model-option').removeClass('selected');
    $(event.currentTarget).addClass('selected');

    // 🔥 CẬP NHẬT UI
    updateElevenLabsUI(modelId);
    calculateCost();

    setTimeout(() => {
        hideModelDetails();
    }, 300);
}

function hideModelDetails() {
    $('#modelSidebar').removeClass('active');
}

function updateModelInfo() {
    if ($('#modelSidebar').hasClass('active')) {
        showModelDetails();
    }
}

function toggleLanguages(modelId) {
    let langDiv = $(`#lang-${modelId}`);
    let toggle = langDiv.next('.mo-lang-toggle');

    if (langDiv.hasClass('expanded')) {
        langDiv.removeClass('expanded');
        toggle.html('<i class="bi bi-chevron-down"></i> Xem thêm');
    } else {
        langDiv.addClass('expanded');
        toggle.html('<i class="bi bi-chevron-up"></i> Thu gọn');
    }
}

function selectModel(modelId) {
    $('#modelSelect').val(modelId);
    $('.model-option').removeClass('selected');
    $(event.currentTarget).addClass('selected');

    setTimeout(() => {
        hideModelDetails();
    }, 300);
}

// ========== VOICE MODAL - NEW FUNCTIONS ==========
let currentVoiceTab = 'library';
let sharedVoices = [];
let sharedVoicesLoaded = false;
let sharedVoicesLoading = false;

let clonedVoices = [];

function openVoiceModal() {
    $('#voiceModal').css('display', 'flex').hide().fadeIn(200);

    // 🔥 CẬP NHẬT TABS DỰA VÀO PROVIDER
    if (currentProvider === 'minimax') {
        // Minimax: Mặc định, Giọng nhân bản, Yêu thích
        $('.vm-tab[data-tab="library"]').hide();
        $('.vm-tab[data-tab="cloned"]').show();

        // Default tab cho Minimax
        switchVoiceTab('default');
    } else {
        // ElevenLabs: Mặc định, Thư viện, Yêu thích
        $('.vm-tab[data-tab="library"]').show();
        $('.vm-tab[data-tab="cloned"]').hide();

        // Default tab cho ElevenLabs
        switchVoiceTab('default');
    }
}
// ========================================
// ⚡ LOAD SHARED VOICES (OPTIMIZED)
// ========================================
function loadSharedVoices() {
    console.log('🔄 loadSharedVoices() called');

    if (sharedVoicesLoaded && sharedVoices.length > 0) {
        renderVoiceGridProgressive(sharedVoices);
        return;
    }

    if (sharedVoicesLoading) {
        showVoiceLoadingSpinner();
        return;
    }

    console.log('🌐 Fetching from NEW endpoint...');
    showVoiceLoadingSpinner();
    sharedVoicesLoading = true;

    $.ajax({
        url: '../../ajaxs/get_voices.php?v=' + Date.now(), // ✅ FILE MỚI
        method: 'GET',
        dataType: 'json',
        timeout: 60000,
        cache: false,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
        },

        success: function (res) {
            console.log('📦 NEW Response:', res);
            console.log('📊 Count:', res.count);
            console.log('🔥 Cached?', res.cache_info?.cached);

            if (res.status === 'success' && res.data && res.data.length > 0) {
                sharedVoices = enhanceSharedVoiceDataOptimized(res.data);
                sharedVoicesLoaded = true;

                console.log(`✅ SUCCESS: ${res.count} voices loaded!`);
                renderVoiceGridProgressive(sharedVoices);
            } else {
                console.error('❌ Invalid response');
                showVoiceErrorState('Lỗi dữ liệu');
            }
            sharedVoicesLoading = false;
        },

        error: function (xhr, status, error) {
            console.error('❌ AJAX Error:', { status, error });
            console.error('Response:', xhr.responseText);
            showVoiceErrorState('Lỗi kết nối', error);
            sharedVoicesLoading = false;
        }
    });
}
function renderVoiceGridProgressive(voices) {
    console.log(`🎨 Progressive render: ${voices.length} voices total`);

    // Reset state
    sharedVoicesRendered = 0;
    isRenderingVoices = false;
    $('#voiceGrid').empty();

    // Remove old scroll handler
    if (voiceGridScrollHandler) {
        $('.vm-grid').off('scroll', voiceGridScrollHandler);
        voiceGridScrollHandler = null;
    }

    // ✅ RENDER BATCH ĐẦU TIÊN NGAY LẬP TỨC
    renderVoiceBatch(voices, 0);

    // ✅ SETUP SCROLL LISTENER
    voiceGridScrollHandler = function () {
        const $grid = $('.vm-grid');
        const scrollTop = $grid.scrollTop();
        const scrollHeight = $grid[0].scrollHeight;
        const clientHeight = $grid.height();

        // Khi scroll gần đến cuối (còn 500px)
        if (scrollTop + clientHeight >= scrollHeight - 500 && !isRenderingVoices) {
            renderNextBatch(voices);
        }
    };

    $('.vm-grid').on('scroll', voiceGridScrollHandler);

    console.log(`✅ First ${sharedVoicesRenderBatch} voices rendered, ${voices.length - sharedVoicesRenderBatch} remaining`);
}

// ========================================
// RENDER SINGLE BATCH
// ========================================
function renderVoiceBatch(voices, startIndex) {
    const endIndex = Math.min(startIndex + sharedVoicesRenderBatch, voices.length);

    console.log(`🎨 Rendering batch: ${startIndex} → ${endIndex}`);

    // Trong hàm renderVoiceBatch
    for (let i = startIndex; i < endIndex; i++) {
        const voice = voices[i];
        let voiceCardHtml = '';

        // 🔥 LOGIC CHỌN CARD DỰA TRÊN PROVIDER
        if (currentProvider === 'minimax') {
            voiceCardHtml = createMinimaxVoiceCardHTML(voice); // Hàm mới
        } else {
            voiceCardHtml = createVoiceCardHTML(voice); // Hàm cũ cho ElevenLabs
        }

        $('#voiceGrid').append(voiceCardHtml);
    }

    sharedVoicesRendered = endIndex;
}
// ========================================
// RENDER NEXT BATCH (LAZY LOAD)
// ========================================
function renderNextBatch(voices) {
    if (sharedVoicesRendered >= voices.length) {
        console.log('🏁 All voices rendered');
        return;
    }

    if (isRenderingVoices) return;

    isRenderingVoices = true;
    console.log(`⏳ Loading more... (${sharedVoicesRendered}/${voices.length})`);

    // ✅ setTimeout để không block UI
    setTimeout(() => {
        renderVoiceBatch(voices, sharedVoicesRendered);
        isRenderingVoices = false;

        const percent = Math.round((sharedVoicesRendered / voices.length) * 100);
        console.log(`✅ Progress: ${sharedVoicesRendered}/${voices.length} (${percent}%)`);
    }, 50);
}

// ========================================
// ⚡ CREATE VOICE CARD HTML
// ========================================
// Tìm function createVoiceCardHTML(voice) và thay thế nội dung bên trong:

// 1. Bảng đối chiếu Mã ngôn ngữ -> Cờ (Dựa trên select option bạn gửi)
const FLAG_MAP = {
    'en': '🇺🇸', 'vi': '🇻🇳', 'fr': '🇫🇷', 'de': '🇩🇪', 'es': '🇪🇸',
    'it': '🇮🇹', 'pt': '🇵🇹', 'ru': '🇷🇺', 'ja': '🇯🇵', 'ko': '🇰🇷',
    'zh': '🇨🇳', 'ar': '🇸🇦', 'hi': '🇮🇳', 'th': '🇹🇭', 'id': '🇮🇩',
    'nl': '🇳🇱', 'pl': '🇵🇱', 'tr': '🇹🇷', 'uk': '🇺🇦', 'sv': '🇸🇪',
    'da': '🇩🇰', 'fi': '🇫🇮', 'no': '🇳🇴', 'el': '🇬🇷', 'cs': '🇨🇿',
    'ro': '🇷🇴', 'hu': '🇭🇺', 'sk': '🇸🇰', 'bg': '🇧🇬', 'hr': '🇭🇷',
    'sl': '🇸🇮', 'he': '🇮🇱', 'fa': '🇮🇷', 'ms': '🇲🇾', 'ta': '🇮🇳',
    'fil': '🇵🇭', 'af': '🇿🇦', 'ca': '🏴', 'yue': '🇭🇰'
};

// 2. Hàm format số liệu (ví dụ: 1200 -> 1.2k)
function formatMetric(num) {
    if (!num) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'b';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

// 3. Hàm tạo HTML thẻ Card
// 3. Hàm tạo HTML thẻ Card (ĐÃ FIX LỖI COPY ID UNDEFINED)
function createVoiceCardHTML(voice) {
    // 🔥 FIX: Lấy ID an toàn (chấp nhận cả id và voice_id)
    let vId = voice.id || voice.voice_id;

    let isFav = favoriteVoices.includes(vId);
    let heartClass = isFav ? "bi-heart-fill" : "bi-heart";
    let heartStyle = isFav ? "color: #ef4444;" : "";

    // Xử lý tên và mô tả an toàn
    let rawName = voice.name || "Unknown";
    let safeName = rawName.replace(/'/g, "\\'");
    let desc = voice.description || "Giọng đọc AI chất lượng cao.";

    // --- XỬ LÝ TAGS & METRICS ---
    let tagsHtml = "";

    // A. Tags phân loại (Accent, Gender...) - Lấy tối đa 2 cái đầu
    if (voice.tags && voice.tags.length > 0) {
        tagsHtml += voice.tags
            .slice(0, 2)
            .map((t) => `<span class="vc-tag-pill">${t}</span>`)
            .join("");
    }

    // B. Metrics (Số lượt dùng & Clone)
    let usageCount = voice.usage_1y || 0; // Số lượt dùng 1 năm qua
    let clonedCount = voice.cloned || 0; // Số lượt nhân bản

    // Icon người dùng (users)
    if (clonedCount > 0) {
        tagsHtml += `<span class="vc-tag-pill"><i class="bi bi-people-fill vc-tag-icon"></i> ${formatMetric(clonedCount)}</span>`;
    }
    // Icon tia sét (usage)
    if (usageCount > 0) {
        tagsHtml += `<span class="vc-tag-pill"><i class="bi bi-lightning-charge-fill vc-tag-icon"></i> ${formatMetric(usageCount)}</span>`;
    }

    // --- XỬ LÝ CỜ ---
    // Lấy mã ngôn ngữ (ví dụ: "en", "vi-VN" -> lấy "vi")
    let langCode = (voice.language || "en").split("-")[0].toLowerCase();
    let flagIcon = FLAG_MAP[langCode] || "🌐"; // Mặc định là quả cầu nếu ko tìm thấy

    // Preview URL (nếu có)
    let previewUrl = (voice.preview_url || "").replace(/'/g, "\\'");

    // 🔥 FIX TOÀN BỘ voice.id THÀNH vId Ở DƯỚI ĐÂY
    return `
    <div class="voice-card" data-voice-id="${vId}">
        <div>
            <div class="vc-header">
                <div class="vc-name">
                    ${safeName} 
                    <i class="bi bi-check-circle-fill vc-verified-icon" title="Verified"></i>
                </div>
                <div class="vc-desc" title="${desc}">${desc}</div>
            </div>

            <div class="vc-tags-list">
                ${tagsHtml}
            </div>
        </div>

        <div class="vc-footer">
            <div class="vc-flags" title="Ngôn ngữ: ${langCode.toUpperCase()}">
                ${flagIcon}
            </div>

            <div class="vc-actions">
                <button class="vc-icon-btn" onclick="event.stopPropagation(); toggleFavorite(event, '${vId}')" title="Yêu thích">
                    <i class="bi ${heartClass}" style="${heartStyle}"></i>
                </button>
                
                <button class="vc-icon-btn" onclick="event.stopPropagation(); copyId('${vId}')" title="Copy ID">
                    <i class="bi bi-copy"></i>
                </button>

                ${previewUrl
            ? `
                <button class="vc-icon-btn" onclick="event.stopPropagation(); togglePreview('${previewUrl}', '${vId}')" title="Nghe thử">
                    <i class="bi bi-play-circle" style="font-size:20px;"></i>
                </button>
                `
            : ""
        }

                <button class="vc-use-btn" onclick="event.stopPropagation(); chooseVoice('${vId}', '${safeName}')">
                    Dùng
                </button>
            </div>
        </div>
    </div>`;
}
// --- HÀM TẠO CARD RIÊNG CHO MINIMAX (GIỐNG ẢNH) ---
function createMinimaxVoiceCardHTML(voice) {
    let isFav = favoriteVoices.includes(voice.id);
    let heartClass = isFav ? 'bi-heart-fill active' : 'bi-heart';

    // Xử lý tên an toàn
    let rawName = voice.name || 'Unknown';
    let safeName = rawName.replace(/'/g, "\\'");

    // Xử lý Avatar (Fallback nếu lỗi)
    let avatar = voice.avatar;
    if (!avatar) {
        avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(rawName)}&background=random&color=fff&size=64&rounded=true`;
    }

    // Xử lý Tags (Ưu tiên: Language -> Gender -> Tags khác)
    let displayTags = [];

    // 1. Language
    let lang = voice.language || 'English';
    if (lang === 'vi-VN') lang = 'Vietnamese'; // Ví dụ mapping
    displayTags.push(lang);

    // 2. Gender
    if (voice.gender) {
        displayTags.push(voice.gender.charAt(0).toUpperCase() + voice.gender.slice(1));
    }

    // 3. Các tag khác (bỏ qua gender nếu trùng)
    if (voice.tags && Array.isArray(voice.tags)) {
        let otherTags = voice.tags.filter(t =>
            t.toLowerCase() !== (voice.gender || '').toLowerCase()
        );
        displayTags = displayTags.concat(otherTags);
    }

    // Tạo HTML cho tags (Lấy max 5 tags)
    let tagsHtml = displayTags.slice(0, 5).map(t =>
        `<span class="minimax-tag">${t}</span>`
    ).join('');

    // Preview URL
    let previewUrl = (voice.preview_url || '').replace(/'/g, "\\'");

    // --- RENDER HTML MINIMAX ---
    return `
    <div class="voice-card minimax-card-layout" data-voice-id="${voice.id}">
        
        <div class="vc-name" title="${safeName}">${safeName}</div>

        <div class="minimax-tags">
            ${tagsHtml}
        </div>

        <div class="minimax-footer">
            <img src="${avatar}" class="minimax-avatar" 
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(rawName)}&background=333&color=fff'" 
                 alt="${safeName}">

            <div class="minimax-actions">
                <button class="minimax-icon-btn" onclick="event.stopPropagation(); toggleFavorite(event, '${voice.id}')" title="Yêu thích">
                    <i class="bi ${heartClass}"></i>
                </button>
                
                <button class="minimax-icon-btn" onclick="event.stopPropagation(); copyId('${voice.id}')" title="Copy ID">
                    <i class="bi bi-copy"></i>
                </button>

                ${previewUrl ? `
                <button class="minimax-icon-btn" onclick="event.stopPropagation(); togglePreview('${previewUrl}', '${voice.id}')" title="Nghe thử">
                    <i class="bi bi-play-circle" style="font-size: 20px;"></i>
                </button>
                ` : ''}

                <button class="minimax-use-btn" onclick="event.stopPropagation(); chooseVoice('${voice.id}', '${safeName}')">
                    Dùng
                </button>
            </div>
        </div>
    </div>`;
}
// ========================================
// ⚡ ENHANCE SHARED VOICE DATA (OPTIMIZED)
// ========================================
function enhanceSharedVoiceDataOptimized(voices) {
    if (!voices || !Array.isArray(voices)) {
        console.warn('Invalid voices data');
        return [];
    }

    return voices.map(v => ({
        // Core fields
        id: v.voice_id || v.id,
        name: v.name || 'Unknown',
        avatar: v.image_url || null,
        preview_url: v.preview_url || null,

        // Description (đã truncated ở BE)
        description: v.description || '',

        // Labels
        gender: v.gender || 'unknown',
        age: v.age || 'unknown',
        accent: v.accent || 'neutral',
        language: v.language || 'en',
        use_case: v.use_case || 'conversational',
        category: v.category || 'shared',
        featured: v.featured || false,

        // ✅ STATS (đã rút gọn tên từ BE)
        usage_1y: v.usage_1y || 0,
        cloned: v.cloned || 0,

        // Tags (build từ labels)
        tags: buildTags(v),

        source: v.source || 'elevenlabs_official'
    }));
}

// Helper: Build tags từ voice data
function buildTags(v) {
    let tags = ['Shared'];

    if (v.gender && v.gender !== 'unknown') {
        tags.push(v.gender.charAt(0).toUpperCase() + v.gender.slice(1));
    }

    if (v.age && v.age !== 'unknown') {
        tags.push(v.age.charAt(0).toUpperCase() + v.age.slice(1));
    }

    if (v.accent && v.accent !== 'neutral') {
        tags.push(v.accent.charAt(0).toUpperCase() + v.accent.slice(1));
    }

    if (v.featured) {
        tags.push('Featured');
    }

    return tags.filter(Boolean);
}

// Enhance Shared Voice Data
function enhanceSharedVoiceData(voices) {
    if (!voices || !Array.isArray(voices)) {
        console.warn('Invalid voices data');
        return [];
    }

    return voices.map(v => ({
        id: v.voice_id || v.id,
        name: v.name || 'Unknown',
        avatar: v.image_url || v.avatar || null,
        preview_url: v.preview_url || v.sample_audio || null,
        description: v.description || '',
        gender: v.gender || 'unknown',
        age: v.age || 'unknown',
        accent: v.accent || 'neutral',
        language: v.language || 'en',
        locale: v.locale || null,
        use_case: v.use_case || 'conversational',
        category: v.category || 'shared',
        featured: v.featured || false,
        can_be_finetuned: v.can_be_finetuned || false,
        live_moderation_enabled: v.live_moderation_enabled || false,
        tags: ['Shared', v.gender ? v.gender.charAt(0).toUpperCase() + v.gender.slice(1) : ''].filter(Boolean)
    }));
}
function renderVoiceGrid(voices) {
    // 1. Xử lý trường hợp không có dữ liệu (Empty State)
    if (!voices || voices.length === 0) {
        $('#voiceGrid').html(`
            <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px;">
                <i class="bi bi-inbox" style="font-size:48px; color:#555; display:block; margin-bottom:15px;"></i>
                <p style="color:#888; font-size:14px;">Không tìm thấy giọng nói</p>
                <button onclick="resetFilters()" style="
                    margin-top:15px;
                    background: transparent;
                    border: 1px solid #444;
                    color: #888;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: 0.2s;
                " onmouseover="this.style.borderColor='#666'; this.style.color='#ccc'" 
                  onmouseout="this.style.borderColor='#444'; this.style.color='#888'">
                    <i class="bi bi-arrow-counterclockwise"></i> Đặt lại bộ lọc
                </button>
            </div>
        `);
        return;
    }

    let html = '';

    // 2. Duyệt qua danh sách giọng và render
    voices.forEach(v => {
        // 🔥 LOGIC QUAN TRỌNG: Phân loại Card dựa trên Provider
        if (currentProvider === 'minimax') {
            // Sử dụng hàm tạo card mới (Avatar ở dưới, Tag viên thuốc) cho Minimax
            html += createMinimaxVoiceCardHTML(v);
        } else {
            // Sử dụng hàm tạo card cũ (Avatar ở trên, có Description) cho ElevenLabs
            html += createVoiceCardHTML(v);
        }
    });

    // 3. Đẩy HTML vào Grid
    $('#voiceGrid').html(html);
}


function toggleFavorite(event, voiceId) {
    event.stopPropagation();

    let index = favoriteVoices.indexOf(voiceId);
    let heartIcon = $(event.target);

    if (index > -1) {
        // Đã có → Xóa
        favoriteVoices.splice(index, 1);
        heartIcon.removeClass('bi-heart-fill active').addClass('bi-heart');
        showToast('💔 Đã xóa khỏi yêu thích');
    } else {
        // Chưa có → Thêm
        favoriteVoices.push(voiceId);
        heartIcon.removeClass('bi-heart').addClass('bi-heart-fill active');
        showToast('❤️ Đã thêm vào yêu thích');
    }

    // Lưu localStorage
    localStorage.setItem('favVoices', JSON.stringify(favoriteVoices));
}
// ========================================
// ⚡ SWITCH VOICE TAB (OPTIMIZED)
// ========================================
function switchVoiceTab(tab) {
    console.log('🔄 Switching Voice Tab to:', tab);
    currentVoiceTab = tab;

    // 1. Cập nhật giao diện Tab (Active state)
    $('.vm-tab').removeClass('active');
    $(`.vm-tab[data-tab="${tab}"]`).addClass('active');

    // 2. Reset ô tìm kiếm
    $('#voiceSearch').val('');

    // ============================================================
    // 🔥 3. XỬ LÝ HIỂN THỊ CÔNG CỤ (SORT & FILTERS)
    // ============================================================

    if (tab === 'library' && currentProvider === 'elevenlabs') {
        // A. Hiện nút Sort
        $('#sortDropdown').fadeIn(200);

        // 🔥 [FIX] SET MẶC ĐỊNH LÀ "MỚI NHẤT" (KHÔNG PHẢI DÙNG NHIỀU NHẤT)
        $('#currentSortLabel').text(jsLang.newest || 'Newest');

        // Highlight nút "Mới nhất"
        $('#sortMenu .dropdown-item').removeClass('active').css({
            'background': 'transparent',
            'color': '#ccc',
            'font-weight': 'normal'
        });

        $('#sortMenu .dropdown-item[onclick*="newest"]').addClass('active').css({
            'background': '#222',
            'color': '#fff',
            'font-weight': '600'
        });

        // B. Hiện bộ lọc
        if ($('.vm-filters-bar').hasClass('hide-filters')) {
            $('.vm-filters-bar').removeClass('hide-filters');
            $('.filter-group, .filter-reset-btn').fadeIn(200);
        }
    } else {
        $('#sortDropdown').hide();

        if (!$('.vm-filters-bar').hasClass('hide-filters')) {
            $('.filter-group, .filter-reset-btn').fadeOut(200, function () {
                $('.vm-filters-bar').addClass('hide-filters');
            });
        }
    }

    // 4. Dọn dẹp
    $('.vm-grid').off('scroll');
    $('#voiceGrid').empty();

    // ============================================================
    // 🚀 5. RENDER DỮ LIỆU
    // ============================================================

    if (tab === 'default') {
        let sourceList = [];

        if (currentProvider === 'minimax') {
            sourceList = (loadedVoices.minimax || []).filter(v => v.source === 'system');
        } else {
            sourceList = loadedVoices.elevenlabs || [];
        }

        if (sourceList.length === 0) {
            showVoiceErrorState('Không tìm thấy giọng mặc định.');
        } else {
            renderVoiceGridProgressive(sourceList);
        }
    }

    else if (tab === 'library') {
        if (!sharedVoicesLoaded && !sharedVoicesLoading) {
            loadSharedVoices();
        } else if (sharedVoicesLoading) {
            showVoiceLoadingSpinner();
        } else if (sharedVoicesLoaded && sharedVoices.length > 0) {
            // 🔥 [FIX] KHÔNG SORT - GIỮ NGUYÊN THỨ TỰ TỪ API (= MỚI NHẤT)
            // API đã trả về theo thứ tự newest rồi
            renderVoiceGridProgressive(sharedVoices);
        } else {
            showVoiceErrorState('Thư viện trống hoặc lỗi tải dữ liệu.');
        }
    }

    else if (tab === 'favorites') {
        let allVoices = [...(loadedVoices[currentProvider] || [])];

        if (currentProvider === 'elevenlabs' && sharedVoices.length > 0) {
            const existingIds = new Set(allVoices.map(v => v.id));
            sharedVoices.forEach(sv => {
                if (!existingIds.has(sv.id)) allVoices.push(sv);
            });
        }

        let favs = allVoices.filter(v => favoriteVoices.includes(v.id));

        if (favs.length === 0) {
            $('#voiceGrid').html(`
                <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px;">
                    <i class="bi bi-heart" style="font-size:48px; color:#333; display:block; margin-bottom:15px;"></i>
                    <p style="color:#888; font-size:14px;">Chưa có giọng yêu thích</p>
                </div>
             `);
        } else {
            renderVoiceGrid(favs);
        }
    }

    else if (tab === 'cloned') {
        renderClonedVoices();
    }
}

// ========================================
// ⚡ FIX DROPDOWN: CANH TRÁI CHO CHUẨN
// ========================================
function toggleDropdown(e, menuId) {
    if (e) { e.preventDefault(); e.stopPropagation(); }

    const $menu = $(menuId);
    const $btn = $(e.currentTarget);

    if ($menu.length === 0) return;

    // Đóng tất cả dropdown khác
    $('.universal-dropdown-menu').not($menu).hide();
    $('.dropdown-arrow').not($btn.find('.dropdown-arrow')).removeClass('bi-chevron-up').addClass('bi-chevron-down');

    // Toggle hiện/ẩn
    if ($menu.is(':visible')) {
        $menu.hide();
        $btn.find('.dropdown-arrow').removeClass('bi-chevron-up').addClass('bi-chevron-down');
        return;
    }

    // Thêm class để dễ đóng hàng loạt
    $menu.addClass('universal-dropdown-menu');

    // Đưa menu ra ngoài body để tránh bị overflow: hidden
    if ($menu.parent()[0] !== document.body) {
        $menu.detach().appendTo('body');
    }

    // 🔥 FIX: LẤY VỊ TRÍ NÚT
    const rect = $btn[0].getBoundingClientRect();
    const menuWidth = 200;

    // ✅ MẶC ĐỊNH: CANH TRÁI (rect.left)
    let leftPos = rect.left;

    // ✅ NẾU TRÀN RA NGOÀI MÀN HÌNH BÊN PHẢI → CANH PHẢI
    const rightEdge = leftPos + menuWidth;
    const screenWidth = window.innerWidth;

    if (rightEdge > screenWidth) {
        // Canh phải nút
        leftPos = rect.right - menuWidth;
    }

    // ✅ NẾU VẪN TRÀN TRÁI (trường hợp màn hình quá nhỏ)
    if (leftPos < 0) {
        leftPos = 10; // Cách lề trái 10px
    }

    // Áp dụng CSS
    $menu.css({
        'display': 'block',
        'position': 'fixed',
        'top': (rect.bottom + 5) + 'px',
        'left': leftPos + 'px',
        'width': menuWidth + 'px',
        'min-width': '160px',
        'z-index': '999999'
    });

    // Xoay mũi tên
    $btn.find('.dropdown-arrow').removeClass('bi-chevron-down').addClass('bi-chevron-up');
}
function selectFilter(type, value, label, displayLabel) {
    console.log(`✅ Filter Selected: ${type} = ${value}`);

    // 1. Cập nhật giá trị vào Input ẩn
    $(`#filter${type}`).val(value);

    // 2. Cập nhật text hiển thị trên nút
    $(`#label${type}`).text(displayLabel || label);

    // 3. Highlight item được chọn trong menu
    $(`#menu${type} .dropdown-item`).css({
        'background': 'transparent',
        'color': '#ccc',
        'font-weight': 'normal'
    });
    $(event.target).css({
        'background': '#222',
        'color': '#fff',
        'font-weight': '600'
    });

    // 4. ✅ THÊM/XÓA CLASS has-value DỰA VÀO GIÁ TRỊ
    const $filterGroup = $(`.btn-${type}`).closest('.filter-dropdown-enhanced');

    if (value && value !== '') {
        $filterGroup.addClass('has-value'); // ✅ Hiện gradient
    } else {
        $filterGroup.removeClass('has-value'); // ❌ Ẩn gradient
    }

    // 5. Đóng menu
    $(`#menu${type}`).hide();
    $(`.btn-${type} .dropdown-arrow`).removeClass('bi-chevron-up').addClass('bi-chevron-down');

    // 6. Gọi hàm lọc
    filterVoices();
}
let toggleCount = 0;

function toggleSortDropdown(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    const $menu = $('#sortMenu');
    const $btn = $(e.currentTarget);

    console.log('🔍 Toggle Sort:', $menu.length);

    if ($menu.length === 0) {
        console.error('❌ #sortMenu not found!');
        return;
    }

    // Đóng các dropdown khác
    $('.dropdown-menu').not($menu).hide();
    $('.dropdown-arrow').removeClass('bi-chevron-up').addClass('bi-chevron-down');

    // Toggle hiện/ẩn
    if ($menu.is(':visible') && $menu.css('visibility') === 'visible') {
        console.log('→ Closing');
        $menu.css({
            'visibility': 'hidden',
            'opacity': '0'
        });
        setTimeout(() => $menu.hide(), 300);
        $('#sortArrow').removeClass('bi-chevron-up').addClass('bi-chevron-down');
        return;
    }

    console.log('→ Opening');

    // Đưa menu ra ngoài body
    if ($menu.parent()[0] !== document.body) {
        $menu.detach().appendTo('body');
    }

    // Tính vị trí
    const rect = $btn[0].getBoundingClientRect();
    const menuWidth = 200;
    let leftPos = rect.left;

    if (leftPos + menuWidth > window.innerWidth - 20) {
        leftPos = rect.right - menuWidth;
    }
    if (leftPos < 10) leftPos = 10;

    console.log('📍 Position:', { left: leftPos, top: rect.bottom + 5 });

    // 🔥 FIX: GHI ĐÈ CẢ VISIBILITY VÀ OPACITY
    $menu.attr('style', `
        display: block !important;
        position: fixed !important;
        top: ${rect.bottom + 5}px !important;
        left: ${leftPos}px !important;
        width: ${menuWidth}px !important;
        z-index: 2147483647 !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        transition: none !important;
    `);

    // Xoay mũi tên
    $('#sortArrow').removeClass('bi-chevron-down').addClass('bi-chevron-up');

    // Đóng khi click ngoài
    setTimeout(() => {
        $(document).one('click', function (evt) {
            if (!$(evt.target).closest('#sortDropdown, #sortMenu').length) {
                $menu.css({
                    'visibility': 'hidden',
                    'opacity': '0'
                });
                setTimeout(() => $menu.hide(), 300);
                $('#sortArrow').removeClass('bi-chevron-up').addClass('bi-chevron-down');
            }
        });
    }, 100);
}

// Đóng dropdown khi click ra ngoài
$(document).on('click', function (e) {
    if (!$(e.target).closest('#sortDropdown').length) {
        $('#sortMenu').hide();
        $('#sortArrow').removeClass('bi-chevron-up').addClass('bi-chevron-down');
    }
});

function applySort(event, type, label) {
    console.log("✅ Selected sort:", type);

    // 1. Cập nhật text
    $('#currentSortLabel').text(label);

    // 2. 🔥 [FIX] RESET TẤT CẢ ITEM (BỎ event.target VÌ NÓ BỊ UNDEFINED)
    $('#sortMenu .dropdown-item').css({
        'background': 'transparent',
        'color': '#ccc',
        'font-weight': 'normal'
    }).removeClass('active');

    // 3. 🔥 [FIX] HIGHLIGHT ĐÚNG ITEM (DÙNG SELECTOR THAY VÌ event.target)
    $(`#sortMenu .dropdown-item[onclick*="${type}"]`).css({
        'background': '#222',
        'color': '#fff',
        'font-weight': '600'
    }).addClass('active');

    // 4. Đóng menu
    $('#sortMenu').fadeOut(100);
    $('.dropdown-arrow').removeClass('bi-chevron-up').addClass('bi-chevron-down');

    // --- LOGIC SẮP XẾP ---
    let sourceList = [];

    if (currentVoiceTab === 'library') {
        sourceList = [...sharedVoices];
    } else if (currentVoiceTab === 'default') {
        sourceList = (currentProvider === 'minimax')
            ? [...(loadedVoices.minimax || [])].filter(v => v.source === 'system')
            : [...(loadedVoices.elevenlabs || [])];
    } else {
        return;
    }

    // Sắp xếp
    if (type === 'most_used') {
        sourceList.sort((a, b) => (b.cloned || 0) - (a.cloned || 0));
    } else if (type === 'chars') {
        sourceList.sort((a, b) => (b.usage_1y || 0) - (a.usage_1y || 0));
    } else if (type === 'trending') {
        sourceList.sort((a, b) => ((b.cloned || 0) + (b.usage_1y / 10000)) - ((a.cloned || 0) + (a.usage_1y / 10000)));
    } else if (type === 'newest') {
        // 🔥 [FIX] KHÔNG REVERSE - GIỮ NGUYÊN THỨ TỰ TỪ API
        // sourceList.reverse(); // ← XÓA DÒNG NÀY
    }

    renderVoiceGridProgressive(sourceList);
}

// ========================================
// ⚡ HELPER: SHOW LOADING SPINNER
// ========================================
function showVoiceLoadingSpinner() {
    $('#voiceGrid').html(`
        <div style="color:#888; text-align:center; padding:60px 20px; grid-column: 1 / -1;">
            <div class="spinner-border" style="width:40px; height:40px; color:#667eea;"></div>
            <p style="margin-top:15px; font-size:14px;">Đang tải thư viện giọng nói...</p>
            <p style="font-size:12px; color:#666; margin-top:8px;">Vui lòng đợi trong giây lát</p>
        </div>
    `);
}

// ========================================
// ⚡ HELPER: SHOW ERROR STATE
// ========================================
function showVoiceErrorState(message, details = '') {
    $('#voiceGrid').html(`
        <div style="color:#ef4444; text-align:center; padding:60px 20px; grid-column: 1 / -1;">
            <i class="bi bi-exclamation-triangle" style="font-size:48px; display:block; margin-bottom:16px; color:#f59e0b;"></i>
            <p style="font-size:14px; margin-bottom:8px; font-weight:600;">${message}</p>
            ${details ? `<p style="font-size:12px; color:#888; margin-bottom:16px;">${details}</p>` : ''}
            <button onclick="reloadSharedVoices()" class="btn-generate" style="margin:0; padding:8px 16px; font-size:13px;">
                <i class="bi bi-arrow-clockwise"></i> Thử lại
            </button>
        </div>
    `);
}

// ========================================
// ⚡ HELPER: RELOAD SHARED VOICES
// ========================================
function reloadSharedVoices() {
    console.log('🔄 Manual reload triggered');
    sharedVoicesLoaded = false;
    sharedVoicesLoading = false;
    sharedVoices = [];
    sharedVoicesRendered = 0;
    loadSharedVoices();
}

// ========================================
// ⚡ HELPER: WAIT FOR LOAD COMPLETE
// ========================================
function waitForSharedVoicesLoad() {
    let pollAttempts = 0;
    const maxAttempts = 300; // 60 giây (300 × 200ms)

    let checkInterval = setInterval(() => {
        pollAttempts++;

        if (sharedVoicesLoaded && sharedVoices.length > 0) {
            clearInterval(checkInterval);
            console.log('✅ Shared voices loaded via polling');
            renderVoiceGridProgressive(sharedVoices);
        } else if (pollAttempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.warn('⚠️ Polling timeout');
            showVoiceErrorState('Timeout', 'Vui lòng thử lại');
        }
    }, 200);
}
function renderClonedVoices() {
    $('#voiceGrid').empty();

    // 1. LUÔN HIỂN THỊ CARD "TẠO MỚI" ĐẦU TIÊN
    // Đã sửa onclick từ openCloneModal() thành chuyển hướng link
    let addCloneCardHtml = `
    <div class="voice-card add-clone-card" onclick="window.location.href='/ai/kingcong/voice_cloning'" style="border: 2px dashed #444; background: rgba(255,255,255,0.02); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px;">
        <div style="width: 50px; height: 50px; background: #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <i class="bi bi-plus-lg" style="font-size: 24px; color: #fff;"></i>
        </div>
        <div class="add-text" style="color: #ccc; font-weight: 500;">Nhân bản giọng mới</div>
    </div>`;

    $('#voiceGrid').append(addCloneCardHtml);

    // ... (Phần code call API phía dưới giữ nguyên không đổi)
    console.log('🔍 Loading cloned voices from database...');

    $.ajax({
        // ... code cũ của bạn ...
        url: '../../ajaxs/voice_cloning3.php',
        method: 'POST',
        data: { action: 'list_clones' },
        dataType: 'json',
        timeout: 10000,

        success: function (res) {
            if (res.status === 'success' && res.voices && res.voices.length > 0) {
                console.log(`✅ Found ${res.voices.length} cloned voices from DB`);

                let clonedVoices = res.voices.map(v => ({
                    id: v.voice_id,
                    name: v.voice_name,
                    avatar: v.cover_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.voice_name)}&background=333&color=fff`,
                    tags: ['Clone', v.language || 'VN', v.gender || 'Unknown'],
                    gender: v.gender || 'Unknown',
                    preview_url: v.sample_audio || '',
                    source: 'cloned',
                    server_type: v.server || 'unknown'
                }));

                clonedVoices.forEach(v => {
                    // (Code render card giữ nguyên)
                    let safeName = v.name.replace(/'/g, "\\'");
                    let previewUrl = (v.preview_url || '').replace(/'/g, "\\'");

                    let cardHtml = `
                    <div class="voice-card minimax-card-layout" data-voice-id="${v.id}">
                        <div class="vc-name" title="${safeName}" style="font-weight: bold; margin-bottom: 5px;">${v.name}</div>
                        <div class="minimax-tags" style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px;">
                            ${v.tags.map(t => `<span class="minimax-tag" style="background: #333; padding: 2px 8px; border-radius: 10px; font-size: 10px; color: #aaa;">${t}</span>`).join('')}
                        </div>
                        <div class="minimax-footer" style="display: flex; align-items: center; justify-content: space-between; margin-top: auto;">
                            <img src="${v.avatar}" class="minimax-avatar" 
                                 style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #444;"
                                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(v.name)}&background=333&color=fff'" 
                                 alt="${safeName}">
                            <div class="minimax-actions" style="display: flex; gap: 8px;">
                                ${previewUrl ? `
                                <button class="minimax-icon-btn" onclick="event.stopPropagation(); togglePreview('${previewUrl}', '${v.id}')" title="Nghe mẫu" style="background: #222; border: 1px solid #444; width: 32px; height: 32px; border-radius: 50%; color: #fff; cursor: pointer;">
                                    <i class="bi bi-play-fill"></i>
                                </button>
                                ` : ''}
                                <button class="minimax-icon-btn" onclick="event.stopPropagation(); deleteClone('${v.id}')" title="Xóa giọng" style="background: #222; border: 1px solid #444; width: 32px; height: 32px; border-radius: 50%; color: #ef4444; cursor: pointer;">
                                    <i class="bi bi-trash"></i>
                                </button>
                                <button class="minimax-use-btn" onclick="event.stopPropagation(); chooseVoice('${v.id}', '${safeName}')" style="background: #fff; color: #000; border: none; padding: 0 15px; height: 32px; border-radius: 16px; font-weight: 600; cursor: pointer;">
                                    Dùng
                                </button>
                            </div>
                        </div>
                    </div>`;
                    $('#voiceGrid').append(cardHtml);
                });

            } else {
                // Không có voice clone nào
                $('#voiceGrid').append(`
                    <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px; color:#666;">
                        <i class="bi bi-mic-mute" style="font-size:48px; opacity:0.5; margin-bottom:16px; display:block;"></i>
                        <p style="font-size:14px; margin-bottom:8px;">Chưa có giọng nhân bản nào</p>
                        <p style="font-size:12px; color:#888;">Nhấn vào card "Tạo mới" để bắt đầu</p>
                    </div>
                `);
            }
        },
        error: function (xhr, status, error) {
            console.error('❌ Load cloned voices failed:', error);
            // (Code xử lý lỗi giữ nguyên)
            $('#voiceGrid').append(`
                <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px; color:#ef4444;">
                    <i class="bi bi-exclamation-triangle" style="font-size:48px; margin-bottom:16px; display:block;"></i>
                    <p style="font-size:14px;">Lỗi tải danh sách giọng clone</p>
                    <button onclick="renderClonedVoices()" class="btn btn-sm btn-outline-secondary" style="margin-top:16px;">
                        <i class="bi bi-arrow-clockwise"></i> Thử lại
                    </button>
                </div>
            `);
        }
    });
}
// ========================================
// 🛑 POPUP LIMIT REQUEST (RATE LIMIT) - BLACK & WHITE THEME
// ========================================
function showRateLimitPopup(message) {
    // Xóa popup cũ nếu có
    $('#rateLimitPopup').remove();

    let html = `
    <div id="rateLimitPopup" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999999; opacity: 0; animation: rlFadeIn 0.3s forwards;
    ">
        <div style="
            background: #000000; 
            border: 1px solid #333; 
            border-radius: 16px;
            padding: 32px; max-width: 420px; width: 90%;
            text-align: center; 
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
            transform: scale(0.9); animation: rlScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        ">
            <div style="
                width: 70px; height: 70px; 
                background: rgba(255, 255, 255, 0.1);
                border-radius: 50%; display: flex; align-items: center; justify-content: center;
                margin: 0 auto 20px auto;
            ">
                <i class="bi bi-hourglass-split" style="font-size: 36px; color: #ffffff;"></i>
            </div>

            <h3 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-bottom: 10px;">Thao tác quá nhanh!</h3>
            
            <p style="color: #cccccc; font-size: 14px; line-height: 1.6; margin-bottom: 25px;">${message}</p>

            <button onclick="$('#rateLimitPopup').fadeOut(200, function(){ $(this).remove(); })" style="
                background: #ffffff; color: #000000; border: none;
                padding: 12px 30px; border-radius: 8px; font-weight: 700; font-size: 14px;
                cursor: pointer; width: 100%; transition: transform 0.2s, opacity 0.2s;
            " onmouseover="this.style.opacity='0.9'; this.style.transform='scale(1.02)'" 
              onmouseout="this.style.opacity='1'; this.style.transform='scale(1)'">
                Đã hiểu, tôi sẽ đợi
            </button>
        </div>
    </div>
    <style>
        @keyframes rlFadeIn { to { opacity: 1; } }
        @keyframes rlScaleUp { to { transform: scale(1); } }
    </style>
    `;

    $('body').append(html);
}
// 3. Hàm Xóa Clone (Thêm vào JS để nút xóa hoạt động)
function deleteClone(voiceId) {
    if (!confirm('Bạn có chắc chắn muốn xóa giọng này không?')) return;

    $.post('../../ajaxs/voice_cloning3.php', {
        action: 'delete_clone',
        voice_id: voiceId
    }, function (res) {
        if (res.status === 'success') {
            alert('Đã xóa thành công!');
            // Reload lại list
            loadClonedVoicesAndMerge([]);
        } else {
            alert('Lỗi: ' + res.message);
        }
    }, 'json');
}
// 🔥 MỞ CLONE MODAL
function openCloneModal() {
    closeVoiceModal();
    $('#cloneModal').fadeIn();
}

// ==========================================
// 🎯 CORE: FILTER VOICES (LOCAL + SERVER FALLBACK)
// ==========================================

// Biến hỗ trợ debounce (chờ người dùng gõ xong mới tìm)
let searchTimeout = null;

function filterVoices() {
    if (isSearchingServer) {
        console.log('⏸️ filterVoices blocked - Server search in progress');
        return;
    }
    // 🛑 1. LẤY GIÁ TRỊ TỪ BỘ LỌC (Input ẩn & Search box)
    let searchRaw = $('#voiceSearch').val().trim();
    let search = searchRaw.toLowerCase();

    let lang = $('#filterLang').val();
    let gender = $('#filterGender').val();
    let age = $('#filterAge').val();
    let category = $('#filterCategory').val();
    let accent = $('#filterAccent').val();

    // 🛑 2. XÁC ĐỊNH NGUỒN DỮ LIỆU
    let sourceList = [];
    if (currentVoiceTab === 'default') {
        if (currentProvider === 'minimax') {
            sourceList = (loadedVoices.minimax || []).filter(v => v.source === 'system');
        } else {
            sourceList = loadedVoices.elevenlabs || [];
        }
    } else if (currentVoiceTab === 'library') {
        sourceList = sharedVoices;
    } else if (currentVoiceTab === 'favorites') {
        // Logic lấy fav list (như cũ)
        let all = [...(loadedVoices[currentProvider] || [])];
        if (currentProvider === 'elevenlabs' && sharedVoices.length > 0) {
            const existingIds = new Set(all.map(v => v.id));
            sharedVoices.forEach(sv => { if (!existingIds.has(sv.id)) all.push(sv); });
        }
        sourceList = all.filter(v => favoriteVoices.includes(v.id));
    } else if (currentVoiceTab === 'cloned') {
        sourceList = (loadedVoices.minimax || []).filter(v => v.source === 'cloned');
    }

    // 🛑 3. LỌC DỮ LIỆU (TỐC ĐỘ CAO)
    // Javascript lọc mảng 10k phần tử cực nhanh, không gây lag ở đây
    let filtered = sourceList.filter(v => {
        // A. Lọc từ khóa
        let matchSearch = true;
        if (search) {
            let name = (v.name || '').toLowerCase();
            let id = String(v.id || '').toLowerCase();
            // Chỉ tìm theo tên và ID cho nhanh, bỏ description nếu muốn siêu tốc
            matchSearch = name.includes(search) || id.includes(search);
        }

        // B. Lọc theo Dropdown (Nếu value rỗng = lấy hết)
        let matchLang = !lang || (v.language || '').toLowerCase().includes(lang.toLowerCase());
        let matchGender = !gender || (v.gender || '').toLowerCase() === gender.toLowerCase();

        // Với mảng tags
        let matchAge = !age || (v.tags || []).some(t => t.toLowerCase().includes(age));
        let matchCategory = !category || (v.tags || []).some(t => t.toLowerCase().includes(category));
        let matchAccent = !accent || (v.tags || []).some(t => t.toLowerCase().includes(accent));

        return matchSearch && matchLang && matchGender && matchAge && matchCategory && matchAccent;
    });

    // 🛑 4. RENDER KẾT QUẢ (QUAN TRỌNG NHẤT: DÙNG PROGRESSIVE)

    // Xóa sự kiện cuộn cũ để tránh xung đột
    $('.vm-grid').off('scroll');
    $('#voiceGrid').empty();

    if (filtered.length > 0) {
        // 🔥 CHÌA KHÓA CHỐNG LAG LÀ ĐÂY:
        // Thay vì renderVoiceGrid(filtered) -> gọi renderVoiceGridProgressive(filtered)
        renderVoiceGridProgressive(filtered);

        // Cập nhật UI highlight bộ lọc
        updateFilterIndicators();
    }
    else {
        // Xử lý khi không tìm thấy kết quả
        if (currentProvider === 'elevenlabs' && searchRaw.length >= 15 && !searchRaw.includes(' ')) {
            // Logic tìm ID trên server (Debounce 1s)
            clearTimeout(searchTimeout);

            // Hiển thị loading tạm
            $('#voiceGrid').html(`
                <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px;">
                    <div class="spinner-border" style="width:30px; height:30px; color:#667eea;"></div>
                    <p style="color:#888; margin-top:15px; font-size:14px;">Đang tìm ID trên server...</p>
                </div>
            `);

            searchTimeout = setTimeout(() => {
                if (typeof searchVoiceOnServer === 'function') {
                    searchVoiceOnServer(searchRaw);
                }
            }, 1000);
        } else {
            // Không tìm thấy
            $('#voiceGrid').html(`
                <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px;">
                    <i class="bi bi-search" style="font-size:48px; color:#333; display:block; margin-bottom:15px;"></i>
                    <p style="color:#888; font-size:14px;">Không tìm thấy kết quả phù hợp</p>
                    <button onclick="resetFilters()" class="filter-reset-btn" style="margin: 15px auto; width: auto; padding: 8px 16px;">
                        Xóa bộ lọc
                    </button>
                </div>
            `);
        }
    }
}

// Sort Voices
function sortVoices() {
    let sortBy = $('#voiceSort').val();
    let sourceList = currentVoiceTab === 'default' ? loadedVoices[currentProvider] : sharedVoices;

    let sorted = [...sourceList];

    if (sortBy === 'newest') {
        // Mặc định
    } else if (sortBy === 'popular') {
        sorted.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    } else if (sortBy === 'name') {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    renderVoiceGrid(sorted);
}

// Reset Filters
function resetFilters() {
    // Reset giá trị input ẩn
    $('#filterLang, #filterGender, #filterAge, #filterCategory, #filterAccent, #voiceSearch').val('');

    // Reset text trên nút về "Tất cả"
    $('#labelLang, #labelGender, #labelAge, #labelCategory, #labelAccent').text('Tất cả');

    // ✅ XÓA CLASS has-value (Ẩn gradient)
    $('.filter-dropdown-enhanced').removeClass('has-value');

    // Xóa active class trong menu
    $('.dropdown-item').css({
        'background': 'transparent',
        'color': '#ccc',
        'font-weight': 'normal'
    });

    // Re-render
    switchVoiceTab(currentVoiceTab);
}

function closeVoiceModal(callback) {
    $('#voiceModal').fadeOut(200, function () {
        // Modal đã đóng hoàn toàn
        if (typeof callback === 'function') {
            callback();
        }
    });
    stopPreview();
}


function togglePreview(url, id) {
    if (!url) {
        showToast('⚠️ Không có audio preview');
        return;
    }

    // Reset tất cả icons
    $('.vc-actions .bi-pause-circle').removeClass('bi-pause-circle').addClass('bi-play-circle');

    if (currentPreviewUrl === url && !previewAudio.paused) {
        // Đang play → pause
        previewAudio.pause();
        currentPreviewUrl = null;
    } else {
        // Play mới
        previewAudio.src = url;
        previewAudio.play().catch(e => {
            console.error('Play error:', e);
            showToast('⚠️ Không thể phát audio');
        });
        currentPreviewUrl = url;

        // Đổi icon thành pause
        $(`.voice-card[data-voice-id="${id}"] .bi-play-circle`).removeClass('bi-play-circle').addClass('bi-pause-circle');
    }
}

function stopPreview() {
    previewAudio.pause();
    previewAudio.currentTime = 0;
    currentPreviewUrl = null;
    $('.vc-actions .bi-pause-circle').removeClass('bi-pause-circle').addClass('bi-play-circle');
}

previewAudio.onended = function () {
    $('.vc-actions .bi-pause-circle').removeClass('bi-pause-circle').addClass('bi-play-circle');
    currentPreviewUrl = null;
};

function chooseVoice(id, name) {
    $('#voiceIdVal').val(id);
    $('#selectedVoiceName').text(name);

    showToast(`✅ Đã chọn: ${name}`);
    updateEstimatedCost();

    // 🔥 KIỂM TRA FILE ĐANG CHỜ
    if (pendingUploadFiles && pendingUploadFiles.length > 0) {
        console.log('🔄 Processing pending files:', pendingUploadFiles.length);

        // Đóng Voice Modal trước
        closeVoiceModal();

        // Delay để modal đóng hẳn
        setTimeout(() => {
            // Lọc file hợp lệ
            let validFiles = pendingUploadFiles.filter(f => {
                let name = f.name.toLowerCase();
                return (name.endsWith('.txt') || name.endsWith('.zip')) && f.size < 5 * 1024 * 1024;
            });

            if (validFiles.length > 0) {
                processUploadFiles(validFiles);
            }

            pendingUploadFiles = null; // Reset
        }, 400);

        return; // ⚠️ Dừng tại đây
    }

    // Trường hợp bình thường (không có file chờ)
    closeVoiceModal();
}

function copyId(id) {
    navigator.clipboard.writeText(id).then(() => {
        let toast = $('<div>').css({
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#22c55e',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: 9999
        }).text('✓ ID đã được copy!');

        $('body').append(toast);
        setTimeout(() => toast.fadeOut(() => toast.remove()), 2000);
    });
}

// ========== TEXT INPUT ==========
function calculateCost() {
    // 1. Lấy nội dung và đếm ký tự
    let text = $('#txtInput').val() || ''; // Thêm || '' để tránh lỗi nếu null
    let charCount = text.length;

    // 2. Lấy Cost Factor từ Model đang chọn
    let cost_factor = 1.0;

    if (currentProvider === 'minimax') {
        let model = loadedModels.minimax.find(m => m.id === selectedMinimaxModel);
        if (model) {
            cost_factor = model.cost_factor || 1.0;
        }
    } else {
        // ElevenLabs
        let currentModelName = $('#selectedModelName').text();
        let model = loadedModels.elevenlabs.find(m => currentModelName.includes(m.name));
        if (model) {
            cost_factor = model.cost_factor || 1.0;
        }
    }

    // --- BẮT ĐẦU DEBUG TÍNH TIỀN ---
    let base_rate = 1.12;

    // Check trạng thái
    let isSrtUpload = (window.isSrtFile === true);
    let isSubtitleChecked = $('#subtitleCheck').is(':checked');
    let applySrtFee = isSrtUpload || isSubtitleChecked;
    let estimated_cost;

    // Tính toán
    if (applySrtFee) {
        // Có phí SRT
        estimated_cost = charCount * base_rate * cost_factor * 1.2;
        $('#srtFeeInfo').show();
    } else {
        // Không phí SRT
        estimated_cost = charCount * base_rate * cost_factor;
        $('#srtFeeInfo').hide();
    }

    // Làm tròn
    let total_cost = 0;
    if (charCount > 0) {
        if (cost_factor < 1.0) {
            total_cost = Math.ceil(estimated_cost);
        } else {
            total_cost = Math.floor(estimated_cost);
        }
        total_cost = Math.max(1, total_cost);
    }


    // Hiển thị ra màn hình
    $('#estimatedCost').text(total_cost.toLocaleString());

    let currentCredits = parseInt($('#userCredits').text().replace(/,/g, '') || '0');
    if (currentCredits < total_cost && charCount > 0) {
        $('#estimatedCost').css('color', '#ef4444');
    } else {
        $('#estimatedCost').css('color', '#fbbf24');
    }
}

// Gọi calculateCost khi thay đổi text
$('#txtInput').on('input', calculateCost);

function togglePlaceholder() {
    let text = $('#txtInput').val();

    if (text.length > 0) {
        $('#emptyState').css('opacity', '0');
        $('#btnClearText').prop('disabled', false); // ✅ Bật nút xóa
    } else {
        $('#emptyState').css('opacity', '1');
        $('#btnClearText').prop('disabled', true); // ✅ Tắt nút xóa
    }

    updateEstimatedCost();
}

function setupDragDrop() {
    const dropZone = document.getElementById('dropZone');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
}

function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    handleFiles(files);
}

// Tìm function handleFiles(files) và thay thế TOÀN BỘ bằng đoạn này:
function handleFiles(files) {
    // Chuyển đổi danh sách file thành Array chuẩn
    let fileArray = Array.from(files);
    handleGlobalDrop(fileArray);
}
function handleFileSelect(input) {
    if (input.files && input.files.length > 0) {
        handleFiles(input.files);
    }
}

// ========== RESET FUNCTIONS ==========
function resetMinimaxSettings() {
    $('#speed').val(1.0);
    $('#speedVal').text('1.00');
    updateSliderFill(document.getElementById('speed')); // THÊM

    $('#vol').val(1.0);
    $('#volVal').text('1.00');
    updateSliderFill(document.getElementById('vol')); // THÊM

    $('#pitch').val(0);
    $('#pitchVal').text('0');
    updateSliderFill(document.getElementById('pitch')); // THÊM

    selectLanguage('Auto', 'Tự xác định');
}

function resetElevenLabsSettings() {
    // 1. Speed - ALWAYS RESET
    $('#elevenSpeed').val(1.0);
    $('#elevenSpeedVal').text('1.00');
    $('#elevenSpeed').closest('.slider-container').removeClass('warning');
    updateSliderFill(document.getElementById('elevenSpeed'));

    // 2. Stability - ALWAYS RESET
    $('#stability').val(50);

    // 🔥 QUAN TRỌNG: Trigger sự kiện input để code tự động nhận diện:
    // - Nếu là V3 (step=50) -> Nó tự đổi thành chữ "Natural" màu trắng.
    // - Nếu là Model thường (step=1) -> Nó tự đổi thành "50%" màu vàng.
    $('#stability').trigger('input');

    updateSliderFill(document.getElementById('stability'));

    // 3. Similarity - Chỉ reset nếu đang hiện
    if ($('#slider-similarity').is(':visible')) {
        $('#similarity').val(75);
        $('#similarityVal').text('75%');
        updateSliderFill(document.getElementById('similarity'));
    }

    // 4. Style - Chỉ reset nếu đang hiện
    if ($('#slider-style').is(':visible')) {
        $('#style').val(0);
        $('#styleVal').text('0%');
        updateSliderFill(document.getElementById('style'));
    }

    // 5. Boost - Chỉ reset nếu đang hiện
    if ($('#toggle-boost').is(':visible')) {
        $('#boostCheck').prop('checked', true);
    }
}

// ========== TAB SWITCHING WITH SMOOTH ANIMATION ==========
function switchTab(tabName) {
    console.log('🔄 SWITCHING TAB TO:', tabName);

    const currentTab = $('.tab-btn.active').attr('id') === 'btnSettings' ? 'settings' : 'history';

    // Nếu bấm lại tab đang active thì thôi
    if (currentTab === tabName) return;

    // 1. Cập nhật nút active ngay lập tức
    $('.tab-btn').removeClass('active');
    if (tabName === 'settings') {
        $('#btnSettings').addClass('active');
    } else {
        $('#btnHistory').addClass('active');
    }

    // 2. Xử lý Animation chuyển đổi
    const $currentContent = $('.sidebar-content.show');
    const $nextContent = tabName === 'settings' ? $('#viewSettings') : $('#viewHistory');

    // Xác định hướng animation
    // Settings -> History: Slide Left (Nội dung mới từ phải qua)
    // History -> Settings: Slide Right (Nội dung mới từ trái qua)
    const animationClass = tabName === 'settings' ? 'animate-slide-in-left' : 'animate-slide-in-right';

    // Fade out nội dung cũ
    $currentContent.addClass('animate-fade-out');

    setTimeout(() => {
        $currentContent.removeClass('show animate-fade-out');

        // Hiện nội dung mới và chạy animation
        $nextContent.addClass('show ' + animationClass);

        // Xóa class animation sau khi chạy xong để sạch sẽ
        setTimeout(() => {
            $nextContent.removeClass(animationClass);
        }, 400); // Khớp với thời gian animation trong CSS

    }, 200); // Thời gian fade out

    // 3. Logic ẩn/hiện Header (Provider/History Actions)
    // Phần này giữ nguyên logic cũ của bạn
    if (tabName === 'settings') {
        $('#providerWrapper').fadeIn(300);
        $('#historyActions').fadeOut(300);
    } else {
        $('#providerWrapper').fadeOut(300);
        setTimeout(() => {
            $('#historyActions').css('display', 'flex').hide().fadeIn(300);
        }, 300); // Đợi cái kia ẩn xong mới hiện cái này lên
    }
}
// ========== LÀM MỚI LỊCH SỬ ==========
function refreshHistory() {
    // 1. Reset các biến đếm phân trang về ban đầu
    currentOffset = 0;
    hasMoreHistory = true;
    isLoadingHistory = false; // Mở khóa nếu đang bị kẹt

    // 2. Xóa sạch danh sách hiện tại & Ẩn thông báo "Hết dữ liệu"
    $('#historyListContainer').empty();
    $('#noMoreData').hide();

    // 3. Hiển thị trạng thái đang tải (tùy chọn cho đẹp)
    $('#historyListContainer').html(`
        <div style="text-align:center; padding:40px 0; color:#666;">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <div style="margin-top:10px; font-size:12px;">Đang làm mới...</div>
        </div>
    `);

    // 4. Gọi lại hàm loadHistory để tải trang 1
    loadHistory();
}
function calculateSingleCost(text) {
    // ==========================================
    // 1. KIỂM TRA ĐẦU VÀO
    // ==========================================
    if (!text) return 0;
    let charCount = text.length;

    // ==========================================
    // 2. TÍNH HỆ SỐ MODEL & VOICE
    // ==========================================
    let cost_factor = 1.0;
    let voice_multiplier = 1.0;

    // --- MINIMAX ---
    if (currentProvider === 'minimax') {

        // KIỂM TRA MODEL HD
        let isHDModel = (
            selectedMinimaxModel === 'speech-2.6-hd' ||
            selectedMinimaxModel === 'speech-02-hd'
        );

        if (isHDModel) {
            cost_factor = 1.15;
        } else {
            cost_factor = 1.0;
        }

        // KIỂM TRA VOICE CLONE
        let isClone = false;
        let voiceId = $('#voiceIdVal').val();

        if (typeof currentVoiceTab !== 'undefined' && currentVoiceTab === 'cloned') {
            isClone = true;
        }

        if (!isClone) {
            let voiceName = $('#selectedVoiceName').text().toLowerCase();
            if (voiceName.includes('clone') || voiceName.includes('(clone)')) {
                isClone = true;
            }
        }

        if (!isClone && voiceId && typeof loadedVoices !== 'undefined' && loadedVoices.minimax) {
            let voiceObj = loadedVoices.minimax.find(v => v.id == voiceId);

            if (voiceObj) {
                if (voiceObj.source === 'cloned') {
                    isClone = true;
                }

                if (!isClone && voiceObj.tags && Array.isArray(voiceObj.tags)) {
                    if (voiceObj.tags.includes('Clone') || voiceObj.tags.includes('clone')) {
                        isClone = true;
                    }
                }
            }
        }

        if (isClone) {
            voice_multiplier = 1.3;
        } else {
            voice_multiplier = 1.0;
        }

    }
    // --- ELEVENLABS ---
    else {
        let currentModelName = $('#selectedModelName').text();

        if (currentModelName.includes('v3') || currentModelName.includes('V3')) {
            cost_factor = 1.3;
        } else {
            cost_factor = 1.0;
        }

        voice_multiplier = 1.0;
    }

    // ==========================================
    // 3. KIỂM TRA PHỤ ĐỀ (SRT) - 1.15
    // ==========================================
    let srt_multiplier = 1.0;
    let with_transcript = false;

    if (currentProvider === 'minimax') {
        with_transcript = $('#minimaxSubtitleCheck').is(':checked');
        if (with_transcript) {
            srt_multiplier = 1.15;
        }
    } else {
        with_transcript = $('#subtitleCheck').is(':checked');
        if (with_transcript) {
            srt_multiplier = 1.15;
        }
    }

    if (typeof window.isSrtFile !== 'undefined' && window.isSrtFile === true) {
        with_transcript = true;
        srt_multiplier = 1.15;
    }

    // ==========================================
    // 4. CÔNG THỨC MỚI (BỎ x1.12)
    // ==========================================
    let estimated_cost = charCount * cost_factor * voice_multiplier * srt_multiplier;

    // ==========================================
    // 5. LÀM TRÒN
    // ==========================================
    let total_cost = Math.round(estimated_cost);
    total_cost = Math.max(1, total_cost);

    return total_cost;
}
// ========== TTS GENERATION ==========
function startTTS() {
    let text = $('#txtInput').val();
    let voiceId = $('#voiceIdVal').val();

    if (!voiceId) {
        showToast('⚠️ Vui lòng chọn giọng nói!');
        openVoiceModal();
        return;
    }

    if (!text) {
        showToast('⚠️ Vui lòng nhập nội dung!');
        $('#txtInput').focus();
        return;
    }

    proceedWithTTS();
}

// ✅ HÀM XỬ LÝ TTS CHÍNH (ĐÃ FIX: GỬI KÈM SERVER_TYPE)
function proceedWithTTS() {
    let text = $('#txtInput').val();
    let voiceId = $('#voiceIdVal').val();

    // ============================================================
    // 🔥 [QUAN TRỌNG] TÌM SERVER TYPE CỦA VOICE ĐANG CHỌN
    // ============================================================
    let selectedServerType = '';

    // 1. Tìm trong danh sách Minimax
    if (currentProvider === 'minimax' && loadedVoices.minimax) {
        // Dùng == để so sánh lỏng (string vs number)
        let v = loadedVoices.minimax.find(x => x.id == voiceId);
        if (v && v.server_type) {
            selectedServerType = v.server_type;
            console.log("🎯 Found Server Type (JS):", selectedServerType);
        }
    }
    // 2. Tìm trong danh sách ElevenLabs
    else if (currentProvider === 'elevenlabs' && loadedVoices.elevenlabs) {
        let v = loadedVoices.elevenlabs.find(x => x.id == voiceId);
        if (v && v.server_type) {
            selectedServerType = v.server_type;
        }
    }

    // ============================================================

    // 🔥 CHECK ĐÚNG CHECKBOX THEO PROVIDER
    let with_transcript = (currentProvider === 'minimax'
        ? $('#minimaxSubtitleCheck').is(':checked')
        : $('#subtitleCheck').is(':checked')) || (window.isSrtFile === true);

    let params = {
        action: 'create_speech',
        provider: currentProvider,
        text: text,
        voice_id: voiceId,
        voice_name: $('#selectedVoiceName').text(),
        with_transcript: with_transcript,
        server_type: selectedServerType // 👈 GỬI CÁI NÀY XUỐNG PHP
    };

    // 🔥 QUAN TRỌNG: KIỂM TRA GENAI BACKUP
    if (currentProvider === 'elevenlabs' &&
        typeof elevenlabsDown !== 'undefined' && elevenlabsDown &&
        typeof backupEligible !== 'undefined' && backupEligible) {

        params.use_genai_backup = true;
        console.log('🟢 USING BACKUP MODE');
    }

    if (currentProvider === 'minimax') {
        params.model_id = selectedMinimaxModel || 'speech-01';
        params.vol = $('#vol').val();
        params.speed = $('#speed').val();
        params.pitch = $('#pitch').val();
        params.language_boost = selectedLanguage;
    } else {
        // --- XỬ LÝ MODEL ID AN TOÀN ---
        let currentModelName = $('#selectedModelName').text();
        let modelsList = loadedModels.elevenlabs || [];
        let model = modelsList.find(m => currentModelName.includes(m.name));

        if (model) {
            params.model_id = model.id;
        } else if (modelsList.length > 0) {
            params.model_id = modelsList[0].id;
        } else {
            params.model_id = 'eleven_multilingual_v2'; // Fallback cứng
        }
        // ------------------------------

        params.speed = $('#elevenSpeed').val();
        params.stability = $('#stability').val() / 100;
        params.similarity = $('#similarity').val() / 100;
        params.style = $('#style').val() / 100;
        params.use_boost = $('#boostCheck').is(':checked');
    }

    // 🔥 TẠO TEMP TASK ID ĐỂ HIỂN THỊ TRƯỚC KHI CÓ KẾT QUẢ
    let tempTaskId = 'temp_' + Date.now();
    let estimatedCost = calculateSingleCost(text);

    // 🔥 UI LOADING
    $('#btnProcess').prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> <span>Đang gửi...</span>');
    $('#inputLoader').addClass('show');

    // 🔥 GỬI REQUEST
    $.ajax({
        url: '../../ajaxs/tts3.php',
        method: 'POST',
        data: params,
        dataType: 'json',
        timeout: 20000, // Tăng timeout lên 20s cho chắc
        success: function (res) {
            if (res.status === 'success') {
                // 1. Cập nhật số dư
                let currentBalance = parseInt($('#userCredits').text().replace(/,/g, ''));
                let newBalance = res.new_balance || (currentBalance - res.credit_cost);
                $('#userCredits').text(newBalance.toLocaleString());

                // 2. Xử lý kết quả trả về
                // TH1: Vào hàng đợi (Backup Mode)
                if (res.queue_id && res.history_id) {
                    console.log('🔄 Using Backup - History ID:', res.history_id, '| Queue ID:', res.queue_id);

                    addPendingCard(res.history_id, text.substring(0, 100) + '...', 0, 'elevenlabs', res.character_count);
                    startQueuePolling(res.history_id, res.queue_id);
                    showToast('✅ Đã thêm vào hàng đợi (Miễn phí)');
                }
                // TH2: Xử lý trực tiếp (Direct)
                else if (res.task_id) {
                    console.log('✅ Direct processing - Task ID:', res.task_id);

                    addPendingCard(res.task_id, text.substring(0, 100) + '...', res.credit_cost, currentProvider);
                    startPolling(res.task_id);
                    showToast('✅ Đang xử lý...');
                }

                switchTab('history');
                resetUI();
            } else {
                alert('Lỗi: ' + res.message);
                resetUI();
            }
        },
        error: function (xhr, status, error) {
            // 🔥 [MỚI] BẮT LỖI RATE LIMIT (429)
            if (xhr.status === 429) {
                let msg = 'Vui lòng thử lại sau.';
                try { msg = JSON.parse(xhr.responseText).message; } catch (e) { }

                resetUI(); // Reset nút bấm
                showRateLimitPopup(msg); // Hiện Popup đẹp
                return; // Dừng luôn
            }
            // 🔥 NẾU TIMEOUT: TẠO CARD GIẢ VÀ POLL TÌM TASK
            if (status === 'timeout') {
                console.warn('⏰ Request timeout, creating pending card...');

                // Trừ tiền tạm thời trên giao diện
                let currentBalance = parseInt($('#userCredits').text().replace(/,/g, ''));
                let newBalance = currentBalance - estimatedCost;
                $('#userCredits').text(newBalance.toLocaleString());

                addPendingCard(tempTaskId, text.substring(0, 100) + '...', estimatedCost, currentProvider);

                // Poll để tìm task thật (Hy vọng server vẫn xử lý xong)
                setTimeout(() => {
                    pollForNewTask(tempTaskId, text);
                }, 3000);

                switchTab('history');
                resetUI();
                showToast('⏳ Yêu cầu đang xử lý ngầm, vui lòng chờ...');
            } else {
                let errorMsg = 'Lỗi kết nối';
                try {
                    let errRes = JSON.parse(xhr.responseText);
                    if (errRes.message) errorMsg = errRes.message;
                } catch (e) { }

                alert('❌ ' + errorMsg);
                resetUI();
            }
        }
    });
}
function updateEstimatedCost() {
    let text = $('#txtInput').val() || "";
    let charCount = text.length;

    // CẬP NHẬT SỐ KÝ TỰ Ở HEADER
    $('#charCount').text(charCount.toLocaleString());

    // ĐỔI MÀU THEO NGƯỠNG
    let $charDisplay = $('#charDisplay');
    if (charCount > 50000) {
        $charDisplay.removeClass('warning').addClass('danger');
    } else if (charCount > 10000) {
        $charDisplay.removeClass('danger').addClass('warning');
    } else {
        $charDisplay.removeClass('warning danger');
    }

    // Tính toán chi phí
    let cost = 0;
    if (charCount > 0) {
        cost = calculateSingleCost(text);
    }

    let isGenAIBackup = (typeof elevenlabsDown !== 'undefined' && elevenlabsDown &&
        typeof backupEligible !== 'undefined' && backupEligible);

    if (currentProvider === 'minimax') {
        $('#minimax-cost-ui').attr('style', 'display: block !important');
        $('#elevenlabs-cost-ui').attr('style', 'display: none !important');

        // KIỂM TRA MODEL HD
        let isHDModel = (
            selectedMinimaxModel === 'speech-2.6-hd' ||
            selectedMinimaxModel === 'speech-02-hd'
        );

        // KIỂM TRA VOICE CLONE
        let isClone = false;
        let voiceId = $('#voiceIdVal').val();

        if (typeof currentVoiceTab !== 'undefined' && currentVoiceTab === 'cloned') {
            isClone = true;
        }

        if (!isClone) {
            let voiceName = $('#selectedVoiceName').text().toLowerCase();
            if (voiceName.includes('clone') || voiceName.includes('(clone)')) {
                isClone = true;
            }
        }

        if (!isClone && voiceId && typeof loadedVoices !== 'undefined' && loadedVoices.minimax) {
            let voiceObj = loadedVoices.minimax.find(v => v.id == voiceId);
            if (voiceObj) {
                if (voiceObj.source === 'cloned') isClone = true;
                if (voiceObj.tags && Array.isArray(voiceObj.tags)) {
                    if (voiceObj.tags.includes('Clone') || voiceObj.tags.includes('clone')) {
                        isClone = true;
                    }
                }
            }
        }

        // CẬP NHẬT BADGE
        let badgeHtml = '';

        if (isHDModel && isClone) {
            badgeHtml = '<i class="bi bi-stars" style="margin-right: 4px;"></i>+15% (HD) + 30% (Clone)';
        } else if (isHDModel) {
            badgeHtml = '<i class="bi bi-stars" style="margin-right: 4px;"></i>+15% (Model HD)';
        } else if (isClone) {
            badgeHtml = '<i class="bi bi-exclamation-triangle-fill" style="margin-right: 4px;"></i>+30% (Giọng Clone)';
        }

        if (badgeHtml) {
            $('#minimax-badge')
                .html(badgeHtml)
                .css({
                    'display': 'flex',
                    'align-items': 'center',
                    'color': '#fbbf24',
                    'font-weight': '600',
                    'margin-left': 'auto',
                    'margin-right': '10px'
                })
                .show();
        } else {
            $('#minimax-badge').hide().empty();
        }

        $('#estimatedCostDisplay, #minimaxEstimatedCostDisplay').html(`<span id="estimatedCost">${cost.toLocaleString()}</span> credits`);
    } else {
        $('#elevenlabs-cost-ui').attr('style', 'display: block !important');
        $('#minimax-cost-ui').attr('style', 'display: none !important');
        $('#minimax-badge').hide();

        if (isGenAIBackup) {
            $('#estimatedCostDisplay').html('<span class="badge bg-success">Miễn phí (Backup)</span>');
            $('#subtitleCheck').prop('checked', false).prop('disabled', true);
            $('#elevenlabs-cost-ui .toggle-switch').css({
                'opacity': '0.5',
                'pointer-events': 'none'
            });
            $('#elevenlabs-badge').hide();
        } else {
            $('#estimatedCostDisplay').html(`<span id="estimatedCost">${cost.toLocaleString()}</span> credits`);
            $('#subtitleCheck').prop('disabled', false);
            $('#elevenlabs-cost-ui .toggle-switch').css({
                'opacity': '1',
                'pointer-events': 'auto'
            });
            $('#elevenlabs-badge').show();
        }
    }
    updateCostTooltip();
}

// ============================================
// 🔥 FUNCTION: updateCostTooltip
// ============================================
function updateCostTooltip() {
    let with_transcript = false;

    if (currentProvider === 'minimax') {
        with_transcript = $('#minimaxSubtitleCheck').is(':checked');
    } else {
        with_transcript = $('#subtitleCheck').is(':checked');
    }

    // Hiện/ẩn dòng SRT fee
    if (with_transcript) {
        $('#srtFeeInfo').show();
    } else {
        $('#srtFeeInfo').hide();
    }
}
function updateCreditsTooltip() {
    let hasSubtitle = false;
    let isClone = false;

    // Check phụ đề
    if (currentProvider === 'elevenlabs') {
        hasSubtitle = $('#subtitleCheck').is(':checked');
    } else if (currentProvider === 'minimax') {
        hasSubtitle = $('#minimaxSubtitleCheck').is(':checked');

        // Check Clone
        if (currentVoiceTab === 'cloned') {
            isClone = true;
        }
    }

    // Hiển thị/ẩn thông tin phí SRT
    if (hasSubtitle) {
        $('#srtFeeInfo').show();
    } else {
        $('#srtFeeInfo').hide();
    }

    // 🔥 [MỚI] Thêm thông tin phí Clone (nếu là Minimax Clone)
    let $cloneFeeInfo = $('#cloneFeeInfo');

    if (isClone && currentProvider === 'minimax') {
        if ($cloneFeeInfo.length === 0) {
            // Tạo element nếu chưa có
            $('#creditsTooltip').append(`
                <div style="font-size: 12px; color: #ccc; margin-top: 2px;" id="cloneFeeInfo">
                    • Giọng Clone: <span style="color: #fff; font-weight: 600;">+30%</span>
                </div>
            `);
        } else {
            $cloneFeeInfo.show();
        }
    } else {
        $cloneFeeInfo.hide();
    }
}

// ✅ RESET UI NHANH HƠN
function resetUI() {
    $('#btnProcess').prop('disabled', false).html('<i class="bi bi-magic"></i> <span>Tạo Giọng Nói</span>');
    $('#inputLoader').removeClass('show');
}
// 🔥 HÀM POLL TÌM TASK MỚI (KHI TIMEOUT)
function pollForNewTask(tempTaskId, originalText) {
    let attempts = 0;
    let maxAttempts = 10;

    let interval = setInterval(() => {
        attempts++;

        $.post('../../ajaxs/tts3.php', {
            action: 'find_recent_task',
            text_snippet: originalText.substring(0, 50)
        }, function (res) {
            if (res.status === 'success' && res.task_id) {
                // Tìm thấy task thật
                clearInterval(interval);

                // Cập nhật card
                $(`#card-${tempTaskId}`).attr('id', `card-${res.task_id}`);
                $(`#status-${tempTaskId}`).attr('id', `status-${res.task_id}`);

                // Bắt đầu poll thật
                startPolling(res.task_id);

                console.log('✅ Found real task:', res.task_id);
            }
        }, 'json').fail(function () {
            // Tiếp tục thử
        });

        if (attempts >= maxAttempts) {
            clearInterval(interval);
            // Mark as failed
            updateCardToFailed(tempTaskId);
        }
    }, 3000);
}

// 🔥 TOAST HELPER
function showToast(msg) {
    // Remove existing toast
    $('.custom-toast').remove();

    let toast = $('<div class="custom-toast">').css({
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1a1a1a',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        zIndex: 99999,
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        border: '1px solid #333'
    }).text(msg);

    $('body').append(toast);
    setTimeout(() => toast.fadeOut(300, () => toast.remove()), 2500);
}
// Biến toàn cục để lưu trữ các interval đang chạy (nếu cần)
// let pollingIntervals = {}; 

// 🔥 HÀM POLLING CHO SIDEBAR (ĐÃ BỎ ĐỒNG HỒ)
// 🔥 HÀM POLLING CHO SIDEBAR (ĐÃ ĐỒNG BỘ VỚI MODAL)
function startPolling(taskId) {
    let attempts = 0;
    const maxAttempts = 300;

    let interval = setInterval(() => {
        // Kiểm tra nếu card không còn tồn tại hoặc đã xử lý xong thì dừng
        let $card = $(`#card-${taskId}`);
        if ($card.length === 0 || !$card.hasClass('processing')) {
            clearInterval(interval);
            return;
        }

        attempts++;

        // Kiểm tra Timeout
        if (attempts >= maxAttempts) {
            clearInterval(interval);
            updateCardToFailed(taskId);
            $(`#time-elapsed-${taskId}`).text('Timeout');

            // 🔥 [MỚI] Đồng bộ sang Modal
            let $modalRow = $(`#row-${taskId}`);
            if ($modalRow.length > 0) {
                $modalRow.find('.dh-badge-processing')
                    .removeClass('dh-badge-processing')
                    .addClass('dh-badge-error')
                    .text('Timeout');
                $(`#dh-time-elapsed-${taskId}`).text('Timeout');
            }
            return;
        }

        // 🔥 GỌI API LẤY % REALTIME
        $.ajax({
            url: '../../ajaxs/tts3.php',
            method: 'POST',
            data: { action: 'check_status', task_id: taskId },
            dataType: 'json',
            timeout: 10000,
            success: function (res) {
                // Lấy % từ API
                let percent = parseInt(res.progress) || 0;

                // 🔥 [1] CẬP NHẬT SIDEBAR (Thanh progress + Text %)
                $(`#progress-${taskId}`)
                    .css('width', percent + '%')
                    .attr('data-progress', percent);

                $(`#time-elapsed-${taskId}`).text(percent + '%');

                // 🔥 [2] CẬP NHẬT MODAL CHI TIẾT (Nếu đang mở)
                if ($('#detailedHistoryModal').is(':visible')) {
                    let $modalRow = $(`#row-${taskId}`);
                    if ($modalRow.length > 0) {
                        // Update text trong modal
                        $(`#dh-time-elapsed-${taskId}`)
                            .text(`Xử lý ${percent}%`)
                            .attr('data-progress', percent);

                        // Update progress bar trong modal (nếu có)
                        $(`#dh-progress-${taskId}`).css('width', percent + '%');
                    }
                }

                // TRƯỜNG HỢP: ĐANG CHẠY (tiếp tục poll)
                if (res.status === 'doing' || res.task_status === 'processing' || res.status === 'pending') {
                    // Không làm gì thêm, cứ để interval chạy
                }

                // TRƯỜNG HỢP: ĐANG CHỜ HÀNG ĐỢI
                else if (res.status === 'queued') {
                    let queueText = res.queue_position ? `Hàng đợi #${res.queue_position}` : 'Đang chờ...';
                    $(`#time-elapsed-${taskId}`).text(queueText);

                    // 🔥 Sync modal
                    $(`#dh-time-elapsed-${taskId}`).text(queueText);
                }

                // TRƯỜNG HỢP: HOÀN THÀNH
                else if (res.status === 'done' || res.task_status === 'done') {
                    clearInterval(interval);

                    // Sidebar
                    $(`#progress-${taskId}`).css('width', '100%');
                    $(`#icon-spin-${taskId}`)
                        .removeClass('spinning bi-arrow-repeat')
                        .addClass('bi-check-circle-fill');
                    $(`#time-elapsed-${taskId}`).text('Hoàn thành');
                    $card.removeClass('processing');

                    // Lấy dữ liệu file
                    let audio = res.audio_url || (res.metadata ? res.metadata.audio_url : null);
                    let srt = res.srt_url || (res.metadata ? res.metadata.srt_url : null);
                    let json = res.json_url || (res.metadata ? res.metadata.json_url : null);
                    let duration = res.metadata?.duration || null;

                    setTimeout(() => {
                        $(`#track-${taskId}`).fadeOut();
                        updateCardToDone(taskId, audio, srt, json);
                    }, 500);

                    // 🔥 [MỚI] Đồng bộ sang Modal
                    syncDetailedHistoryCard(taskId, 'done', audio, srt, json, duration);
                }

                // TRƯỜNG HỢP: LỖI
                else if (res.status === 'error' || res.task_status === 'failed') {
                    clearInterval(interval);
                    $(`#track-${taskId}`).hide();
                    $(`#icon-spin-${taskId}`)
                        .removeClass('spinning bi-arrow-repeat')
                        .addClass('bi-exclamation-triangle-fill');
                    $(`#time-elapsed-${taskId}`).text('Thất bại');
                    $card.removeClass('processing');
                    updateCardToFailed(taskId);

                    // 🔥 [MỚI] Đồng bộ sang Modal
                    syncDetailedHistoryCard(taskId, 'failed', null, null, null, null);
                }
            },
            error: function () {
                // Lỗi mạng thì cứ giữ nguyên text cũ
            }
        });
    }, 3000); // Poll mỗi 3 giây
}

// ========== CLONE VOICE ==========
function submitCloneVoice() {
    let name = $('#cloneName').val().trim();
    let fileInput = $('#cloneFile')[0].files[0];
    let gender = $('#cloneGender').val();

    if (!name) {
        alert('Vui lòng nhập tên giọng!');
        return;
    }

    if (!fileInput) {
        alert('Vui lòng chọn file MP3!');
        return;
    }

    if (fileInput.type !== 'audio/mpeg' && !fileInput.name.endsWith('.mp3')) {
        alert('Chỉ hỗ trợ file .mp3');
        return;
    }

    if (fileInput.size > 20 * 1024 * 1024) {
        alert('File quá lớn! Tối đa 20MB');
        return;
    }

    let formData = new FormData();
    formData.append('action', 'create_clone');
    formData.append('voice_name', name);
    formData.append('gender', gender);
    formData.append('file', fileInput);

    $('#btnSubmitClone').prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> <span>Đang upload...</span>');

    $.ajax({
        url: '../../ajaxs/voice_cloning3.php',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        dataType: 'json',
        success: function (res) {
            if (res.status === 'success') {
                alert('✅ Clone thành công! Giọng mới đã được thêm vào thư viện.');
                $('#cloneModal').fadeOut();
                loadResources();

                // Reset form
                $('#cloneName').val('');
                $('#cloneFile').val('');
            } else {
                alert('❌ Lỗi: ' + res.message);
            }
            $('#btnSubmitClone').prop('disabled', false).html('<i class="bi bi-mic"></i> <span>Bắt đầu Clone</span>');
        },
        error: function () {
            alert('❌ Lỗi kết nối server');
            $('#btnSubmitClone').prop('disabled', false).html('<i class="bi bi-mic"></i> <span>Bắt đầu Clone</span>');
        }
    });
}

function loadHistory() {
    if (isLoadingHistory || !hasMoreHistory) return;

    isLoadingHistory = true;
    $('#loadingMore').show();

    // 🔥 DÙNG API MỚI (GIỐNG MODAL CHI TIẾT)
    $.post('../../ajaxs/tts3.php', {
        action: 'get_history_detailed_v2', // ✅ API MỚI
        page: Math.floor(currentOffset / 15) + 1,
        limit: 15
    }, function (res) {
        if (res.status === 'success') {
            // Xóa empty state nếu đang có
            if (currentOffset === 0) {
                $('#historyListContainer').empty();
            }

            // Kiểm tra data rỗng
            if (res.data.length === 0 && currentOffset === 0) {
                $('#historyListContainer').html(`
                    <div style="text-align:center; padding:60px 20px; color:#666;">
                        <i class="bi bi-inbox" style="font-size:48px; display:block; margin-bottom:15px; opacity:0.5;"></i>
                        <p style="font-size:14px;">Chưa có lịch sử nào</p>
                    </div>
                `);
                $('#loadingMore').hide();
                $('#noMoreData').hide();
                hasMoreHistory = false;
                isLoadingHistory = false;
                return;
            }

            // 🔥 RENDER TỪNG TASK
            res.data.forEach(item => {
                // Parse timestamp
                let createdTimeMs = parseCustomDateTime(item.created_at);
                if (!createdTimeMs || isNaN(createdTimeMs)) {
                    createdTimeMs = Date.now();
                }

                // Lưu vào map
                historyDataMap[item.task_id] = item;

                // Text preview
                let textPreview = item.text_input || 'N/A';
                if (textPreview.length > 100) {
                    textPreview = textPreview.substring(0, 100) + '...';
                }

                // Format thời gian hiển thị
                let timeDisplay = item.created_at;
                if (item.created_at && (item.created_at.includes('T') || item.created_at.includes('-'))) {
                    let d = new Date(item.created_at);
                    if (!isNaN(d.getTime())) {
                        let hours = String(d.getHours()).padStart(2, '0');
                        let minutes = String(d.getMinutes()).padStart(2, '0');
                        let day = d.getDate();
                        let month = d.getMonth() + 1;
                        timeDisplay = `${hours}:${minutes} ${day}/${month}`;
                    }
                }

                // 🔥 ADD CARD VỚI TRẠNG THÁI ĐÚNG
                addHistoryCard(
                    item.task_id,
                    textPreview,
                    item.credit_cost,
                    timeDisplay,
                    item.provider,
                    item.status,
                    true, // isLoadHistory
                    createdTimeMs
                );

                // 🔥 XỬ LÝ THEO TRẠNG THÁI
                if (item.status === 'pending' || item.status === 'processing' || item.status === 'doing') {
                    startPolling(item.task_id);
                }
                else if (item.status === 'done') {
                    updateCardToDone(item.task_id, item.audio_url, item.srt_url, item.json_url, item.duration);
                }
                else if (item.status === 'failed') {
                    updateCardToFailed(item.task_id);
                }
            });

            currentOffset += res.data.length;
            hasMoreHistory = res.has_more || false;

            if (!hasMoreHistory) {
                $('#noMoreData').show();
            }
        } else {
            console.error('❌ Load history failed:', res.message);
        }

        $('#loadingMore').hide();
        isLoadingHistory = false;

    }, 'json').fail(function (xhr, status, error) {
        console.error('❌ AJAX Error:', error);
        $('#loadingMore').hide();
        isLoadingHistory = false;
    });
}
function setupInfiniteScroll() {
    $('#viewHistory').on('scroll', function () {
        let scrollTop = $(this).scrollTop();
        let scrollHeight = $(this)[0].scrollHeight;
        let clientHeight = $(this).height();

        if (scrollTop + clientHeight >= scrollHeight - 100) {
            loadHistory();
        }
    });
}

function setupAudioEvents() {
    // 1. Khi đang chạy (Update Progress)
    mainAudio.addEventListener('timeupdate', function () {
        if (currentPlayingTaskId) {
            let currentTime = mainAudio.currentTime;
            let duration = mainAudio.duration;

            if (isNaN(duration)) return;

            let progress = (currentTime / duration) * 100;
            let timeString = formatTime(currentTime); // + ' / ' + formatTime(duration);

            // ✅ Cập nhật Sidebar (Cũ)
            $(`#progress-${currentPlayingTaskId}`).css('width', progress + '%');
            $(`#time-current-${currentPlayingTaskId}`).text(timeString);

            // ✅ Cập nhật Modal Chi tiết (Mới) - Tìm theo ID có tiền tố dh-
            $(`#dh-progress-${currentPlayingTaskId}`).css('width', progress + '%');
            $(`#dh-timer-${currentPlayingTaskId}`).text(timeString + ' / ' + formatTime(duration));
        }
    });

    // 🔥 [THÊM MỚI] 2. Khi load xong metadata (duration)
    mainAudio.addEventListener('loadedmetadata', function () {
        if (currentPlayingTaskId) {
            let duration = mainAudio.duration;
            if (duration && !isNaN(duration)) {
                let durationText = formatTime(duration);

                // Cập nhật Sidebar
                $(`#time-total-${currentPlayingTaskId}`).text(durationText);

                // Cập nhật Modal
                let currentText = $(`#dh-timer-${currentPlayingTaskId}`).text();
                if (currentText.includes('/ --:--')) {
                    $(`#dh-timer-${currentPlayingTaskId}`).text(`0:00 / ${durationText}`);
                }
            }
        }
    });

    // 2. Khi Play (Đổi icon Play -> Pause)
    mainAudio.addEventListener('play', function () {
        if (currentPlayingTaskId) {
            // Đổi icon Sidebar
            $(`#play-btn-${currentPlayingTaskId}`).html('<i class="bi bi-pause-fill"></i>');
            // Đổi icon Modal
            $(`#dh-play-btn-${currentPlayingTaskId}`).html('<i class="bi bi-pause-fill"></i>');
        }
    });

    // 3. Khi Pause hoặc Kết thúc (Đổi icon Pause -> Play)
    ['pause', 'ended'].forEach(event => {
        mainAudio.addEventListener(event, function () {
            if (currentPlayingTaskId) {
                // Reset icon Sidebar
                $(`#play-btn-${currentPlayingTaskId}`).html('<i class="bi bi-play-fill"></i>');
                // Reset icon Modal
                $(`#dh-play-btn-${currentPlayingTaskId}`).html('<i class="bi bi-play-fill"></i>');

                if (event === 'ended') currentPlayingTaskId = null;
            }
        });
    });
}
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    let mins = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}
// ========== DELETE TASK WITH API REFUND ==========
function deleteTask(taskId, originalCost) {
    let currentProgress = parseInt($(`#progress-${taskId}`).attr('data-progress') || 0);
    let cardStatus = $(`#card-${taskId}`).hasClass('processing') ? 'processing' : 'done';

    console.log('🔍 DELETE DEBUG:', {
        'taskId': taskId,
        'originalCost': originalCost,
        'currentProgress': currentProgress,
        'cardStatus': cardStatus
    });

    // Disable buttons
    $(`#btn-delete-${taskId}, .dh-delete-btn[onclick*="${taskId}"]`)
        .prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm"></span>');

    $.ajax({
        url: '../../ajaxs/tts3.php',
        method: 'POST',
        data: {
            action: 'delete_task_with_refund',
            task_id: taskId,
            current_progress: currentProgress,
            original_cost: originalCost
        },
        dataType: 'json',
        success: function (res) {
            console.log('✅ DELETE RESPONSE:', res);

            if (res.status === 'success') {
                let refundAmount = res.refund_credits || 0;

                // Cập nhật credits
                if (refundAmount > 0) {
                    let currentBalance = parseInt($('#userCredits').text().replace(/[^0-9]/g, ''));
                    let newBalance = currentBalance + refundAmount;
                    $('#userCredits').text(newBalance.toLocaleString());

                    showToast(`✅ Đã xóa task và hoàn ${refundAmount} credits`);
                } else {
                    showToast('✅ Đã xóa task');
                }

                // Xóa khỏi Sidebar
                $(`#card-${taskId}`).fadeOut(300, function () {
                    $(this).remove();
                });

                // Xóa khỏi Modal Chi tiết
                $(`#row-${taskId}`).fadeOut(300, function () {
                    $(this).remove();

                    if (typeof updateBulkActions === 'function') {
                        updateBulkActions();
                    }
                });
            } else {
                alert('❌ Lỗi: ' + res.message);
                $(`#btn-delete-${taskId}, .dh-delete-btn[onclick*="${taskId}"]`)
                    .prop('disabled', false)
                    .html('<i class="bi bi-trash"></i>');
            }
        },
        error: function (xhr) {
            console.error('❌ DELETE ERROR:', xhr.responseText);
            alert('❌ Lỗi kết nối server');
            $(`#btn-delete-${taskId}, .dh-delete-btn[onclick*="${taskId}"]`)
                .prop('disabled', false)
                .html('<i class="bi bi-trash"></i>');
        }
    });
}
function addPendingCard(taskId, textPreview, cost, provider, charCount) {
    console.log('🔥 ADD PENDING CARD:', taskId);

    if ($(`#card-${taskId}`).length > 0) return;

    // ✅ TẠO DẤU THỜI GIAN
    let now = new Date();
    let d = String(now.getDate()).padStart(2, '0');
    let m = String(now.getMonth() + 1).padStart(2, '0');
    let y = now.getFullYear();
    let H = String(now.getHours()).padStart(2, '0');
    let i = String(now.getMinutes()).padStart(2, '0');
    let timeString = `${d}/${m}/${y} ${H}:${i}`;
    let startTimeMs = now.getTime(); // <-- Dấu thời gian số (Cần lưu)

    let badgeStyle = "background: #ffffff; color: #000000; border: 1px solid #000000; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;";
    let costBadge = cost ? `<span class="hc-cost" style="${badgeStyle}">${cost}</span>` : '';
    let logoUrl = getProviderLogo(provider);

    let html = `
    <div class="history-card processing" id="card-${taskId}" data-start-time="${startTimeMs}">
        
        <div class="hc-header" style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #222; padding-bottom: 8px;">
            <span class="hc-time" style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #888;">
                <img src="${logoUrl}" class="hc-provider-icon" title="${provider}" style="width: 18px; height: 18px; border-radius: 50%;">
                
                <i class="bi bi-arrow-repeat spinning" id="icon-spin-${taskId}" style="font-size: 14px;"></i>
                
                <span style="font-weight: 500;">${timeString}</span>
            </span>

            <div style="display: flex; gap: 8px; align-items: center;">
                ${costBadge}
                <span class="hc-status status-pending" id="status-${taskId}" style="${badgeStyle}">
                    <span id="time-elapsed-${taskId}">0%</span>
                </span>
                
                <button onclick="openDeleteModal('${taskId}', '${textPreview.replace(/'/g, "\\'")}', 'refund', ${cost})" 
    id="btn-delete-${taskId}"
                    style="
                        background: transparent;
                        border: 1px solid #333;
                        color: #888;
                        padding: 4px 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        transition: all 0.2s;
                    "
                    onmouseover="this.style.borderColor='#ef4444'; this.style.color='#ef4444'"
                    onmouseout="this.style.borderColor='#333'; this.style.color='#888'"
                    title="Xóa task">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>

        <div class="hc-content" style="margin-bottom: 12px; font-size: 14px; line-height: 1.5;">${textPreview}</div>

        <div class="hc-progress-track" id="track-${taskId}">
            <div class="hc-progress-fill" id="progress-${taskId}" data-progress="0"></div>
        </div>

    </div>`;

    $('#historyListContainer').prepend(html);
}

// ✅ CHÚ Ý: Phải có "isLoadHistory = false" ở cuối dòng này
function addHistoryCard(taskId, textPreview, cost, time, provider, status, isLoadHistory = false, startTimeMs = Date.now()) {

    if ($(`#card-${taskId}`).length > 0) return;

    let badgeStyle = "background: #ffffff; color: #000000; border: 1px solid #000000; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; white-space: nowrap; display: inline-block; min-width: fit-content;";
    let costBadge = cost ? `<span class="hc-cost" style="${badgeStyle}">${cost}</span>` : '';
    let logoUrl = getProviderLogo(provider);

    let progressBarHtml = '';
    let iconClass = '';
    let deleteButtonHtml = '';
    let statusTextContent = ''; // Nội dung sẽ hiển thị trong status

    // 🔥 1. Gom nhóm trạng thái đang chạy để dùng chung
    let isProcessing = ['pending', 'processing', 'doing', 'queued'].includes(status);

    // 🔥 2. Xử lý text an toàn (Fix lỗi xuống dòng & nháy đơn)
    let safeText = (textPreview || '')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/(\r\n|\n|\r)/g, ' ');

    // 🔥 3. Nút Metadata
    let detailButtonHtml = ``;

    // Logic hiển thị theo trạng thái
    if (isProcessing) {
        iconClass = 'spinning bi-arrow-repeat';
        progressBarHtml = `<div class="hc-progress-track" id="track-${taskId}"><div class="hc-progress-fill" id="progress-${taskId}" data-progress="0"></div></div>`;

        // 🔥 [MỚI]: Nội dung đếm ngược/xử lý
        statusTextContent = `<span id="time-elapsed-${taskId}">${status === 'queued' ? 'Đang chờ' : '0%'}</span>`;

        // Nút xóa hoàn tiền
        deleteButtonHtml = `
        <button onclick="openDeleteModal('${taskId}', '${safeText}', 'refund', ${cost})" 
            id="btn-delete-${taskId}"
            style="background: transparent; border: 1px solid #333; color: #888; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
            title="Xóa task"><i class="bi bi-trash"></i></button>`;

    } else if (status === 'done') {
        iconClass = 'bi-check-circle-fill';
        statusTextContent = 'Hoàn thành';

        // Nút xóa lịch sử
        deleteButtonHtml = `
        <button onclick="openDeleteModal('${taskId}', '${safeText}', 'history')" 
            class="btn-delete-history"
            style="background: transparent; border: 1px solid #666; color: #999; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
            title="Xóa lịch sử"><i class="bi bi-trash"></i></button>`;

    } else if (status === 'failed') {
        iconClass = 'bi-exclamation-triangle-fill';
        statusTextContent = 'Thất bại';

        // Nút xóa lịch sử
        deleteButtonHtml = `
        <button onclick="openDeleteModal('${taskId}', '${safeText}', 'history')" 
            class="btn-delete-history"
            style="background: transparent; border: 1px solid #666; color: #999; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
            title="Xóa lịch sử"><i class="bi bi-trash"></i></button>`;

    } else {
        iconClass = 'bi-clock';
        statusTextContent = 'Lỗi trạng thái';
    }

    // 🔥 [FIX]: Thêm class 'processing' nếu biến isProcessing = true
    let html = `
    <div class="history-card ${isProcessing ? 'processing' : ''}" id="card-${taskId}" data-start-time="${startTimeMs}">
        <div class="hc-header" style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #222; padding-bottom: 8px;">
            <span class="hc-time" style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #888;">
                <img src="${logoUrl}" class="hc-provider-icon" title="${provider}" style="width: 18px; height: 18px; border-radius: 50%;">
                <i class="bi ${iconClass}" id="icon-spin-${taskId}" style="font-size: 14px;"></i> 
                <span>${time || 'Vừa xong'}</span>
            </span>
            <div style="display: flex; gap: 8px; align-items: center;">
                ${costBadge}
                <span class="hc-status status-${status}" id="status-${taskId}" style="${badgeStyle}">
                    ${statusTextContent}
                </span>
                
                <div style="display: flex; gap: 4px;">
                    ${detailButtonHtml}
                    ${deleteButtonHtml}
                </div>

            </div>
        </div>
        <div class="hc-content" style="margin-bottom: 12px; font-size: 14px; line-height: 1.5;">${textPreview}</div>
        ${progressBarHtml}
    </div>`;

    // Logic chèn vào danh sách
    if (isLoadHistory) {
        $('#historyListContainer').append(html);
    } else {
        $('#historyListContainer').prepend(html);
    }

    // 🔥 [MỚI] Nếu là tác vụ Tải lại từ Server và đang chạy, phải gọi Polling
    if (isLoadHistory && isProcessing) {
        // startPolling sẽ được gọi ở hàm loadHistory (chúng ta không cần gọi ở đây nữa)
    }
}
// ========== XÓA LỊCH SỬ TASK (FIX HOÀN CHỈNH) ==========
function deleteHistoryTask(taskId) {
    console.log('🔴 Executing deleteHistoryTask for:', taskId);

    // 🔥 VALIDATE ID TRƯỚC KHI GỬI
    if (!taskId || taskId.trim() === '') {
        console.error('❌ INVALID TASK ID:', taskId);
        showToast('❌ Lỗi: Task ID không hợp lệ');
        return;
    }

    // 🔥 THÊM LOADING STATE (Tìm tất cả nút delete liên quan)
    const deleteBtn = $(`button[onclick*="${taskId}"]`).filter(function () {
        return $(this).attr('onclick') && $(this).attr('onclick').includes('deleteDetailedTask') ||
            $(this).attr('onclick').includes('deleteHistoryTask') ||
            $(this).attr('onclick').includes('openDeleteModal');
    });

    const originalHtml = deleteBtn.html();
    deleteBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i>');

    $.ajax({
        url: '../../ajaxs/tts3.php',
        method: 'POST',
        data: {
            action: 'delete_task',
            task_id: taskId
        },
        dataType: 'json',
        timeout: 10000,

        success: function (res) {
            console.log('✅ DELETE RESPONSE:', res);

            if (res.status === 'success') {
                // 🔥 CHỈ đóng popup xác nhận DELETE, KHÔNG đóng modal chi tiết
                $('#deleteModal').fadeOut(200, function () {
                    $(this).hide();
                });

                // Đóng popup xác nhận bằng function (nếu có)
                if (typeof closeDeleteModal === 'function') {
                    closeDeleteModal();
                }

                // Xóa card khỏi UI (cả sidebar và modal chi tiết)
                $(`#card-${taskId}, #row-${taskId}`).fadeOut(300, function () {
                    $(this).remove();

                    // Cập nhật bulk actions nếu có checkbox
                    if (typeof updateBulkActions === 'function') {
                        updateBulkActions();
                    }

                    // 🔥 Kiểm tra nếu modal chi tiết không còn row nào
                    if ($('#detailedHistoryList .dh-row').length === 0) {
                        $('#detailedHistoryList').html(`
                            <div style="padding:80px 20px; text-align:center; color:#888;">
                                <i class="bi bi-inbox" style="font-size:64px; opacity:0.5; margin-bottom:16px; display:block;"></i>
                                <div style="font-size:16px; font-weight:500; margin-bottom:8px;">Chưa có lịch sử nào</div>
                                <div style="font-size:13px; color:#aaa;">Các tác vụ TTS của bạn sẽ hiển thị ở đây</div>
                            </div>
                        `);
                    }

                    // 🔥 Kiểm tra nếu sidebar không còn card nào
                    if ($('#historyListContainer .history-card').length === 0) {
                        $('#historyListContainer').html(`
                            <div style="text-align:center; padding:60px 20px; color:#666;">
                                <i class="bi bi-inbox" style="font-size:48px; display:block; margin-bottom:15px; opacity:0.5;"></i>
                                <p style="font-size:14px;">Chưa có lịch sử nào</p>
                            </div>
                        `);
                    }
                });

                // 🔥 Refresh sidebar history NHƯNG KHÔNG ẢNH HƯỞNG modal chi tiết
                if (typeof silentRefreshHistory === 'function') {
                    setTimeout(() => {
                        // Chỉ refresh nếu modal chi tiết đang ĐÓNG
                        if (!$('#detailedHistoryModal').is(':visible')) {
                            silentRefreshHistory();
                        }
                    }, 500);
                }

                showToast('✅ Đã xóa task thành công');

            } else {
                console.error('❌ DELETE ERROR:', res);
                showToast('❌ Lỗi: ' + (res.message || 'Không thể xóa task'));

                // Re-enable nút delete nếu có lỗi
                if (deleteBtn && deleteBtn.length) {
                    deleteBtn.prop('disabled', false).html(originalHtml);
                }
            }
        },

        error: function (xhr, status, error) {
            console.error('❌ DELETE AJAX ERROR:', {
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                error: error
            });

            let errorMsg = 'Lỗi kết nối';

            // Parse error message từ backend
            try {
                let errJson = JSON.parse(xhr.responseText);
                if (errJson.message) {
                    errorMsg = errJson.message;
                }
            } catch (e) {
                errorMsg = xhr.responseText || 'Lỗi không xác định';
            }

            // Xử lý các mã lỗi cụ thể
            if (xhr.status === 429) {
                errorMsg = 'Quá nhiều request, vui lòng đợi';
            } else if (xhr.status === 403) {
                errorMsg = 'Không có quyền xóa task này';
            } else if (xhr.status === 404) {
                errorMsg = 'Task không tồn tại';
            } else if (xhr.status === 500) {
                errorMsg = 'Lỗi server';
            }

            showToast('❌ ' + errorMsg);

            // Re-enable nút delete
            if (deleteBtn && deleteBtn.length) {
                deleteBtn.prop('disabled', false).html(originalHtml);
            }
        }
    });
}
function updateCardToDone(taskId, audioUrl, srtUrl, jsonUrl, duration) {
    // 1. Kiểm tra trùng lặp Player trong Sidebar
    if ($(`#card-${taskId} .hc-player`).length > 0) {
        return;
    }

    // 2. Cập nhật Sidebar Card
    $(`#card-${taskId}`).removeClass('processing');

    let $statusElement = $(`#card-${taskId} #status-${taskId}`);
    if ($statusElement.length) {
        $statusElement.text('Xong')
            .removeClass('status-pending status-queued')
            .addClass('status-done');

        $(`#time-elapsed-${taskId}`).replaceWith('Xong');
    }

    $(`#icon-spin-${taskId}`)
        .removeClass('spinning bi-arrow-repeat')
        .addClass('bi-check-circle-fill');

    let $deleteBtn = $(`#btn-delete-${taskId}`);
    if ($deleteBtn.length) {
        $deleteBtn
            .css({
                'border-color': '#666',
                'color': '#999'
            })
            .attr('title', 'Xóa lịch sử đã hoàn thành')
            .attr('onclick', `openDeleteModal('${taskId}', 'Nội dung preview', 'history')`)
            .prop('disabled', false);
    }

    // 🔥 3. NÚT REMAKE
    let remakeBtn = `
        <button class="hc-download-btn" onclick="openRemakeModal('${taskId}')" 
                title="Tạo lại tác vụ này"
                style="
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
                ">
            <i class="bi bi-arrow-repeat"></i>
        </button>
    `;

    // 🔥 4. DROPDOWN TẢI XUỐNG - DÙNG downloadViaProxy()
    let safeText = '';
    if (historyDataMap[taskId]) {
        let rawText = historyDataMap[taskId].text_input || historyDataMap[taskId].text || '';
        safeText = rawText
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/(\r\n|\n|\r)/g, ' ')
            .substring(0, 500);
    }

    let downloadDropdownHtml = `
    <div class="hc-download-wrapper" style="position: relative;">
        <button class="hc-download-btn" onclick="toggleSidebarDownloadMenu(event, '${taskId}')" title="Tải xuống">
            <i class="bi bi-download"></i>
        </button>
        
        <div class="hc-download-menu" id="sidebar-download-menu-${taskId}" style="display: none;">
            <div class="hc-download-header">Tải xuống (hết hạn sau 72 giờ)</div>
            
            <!-- Audio -->
            ${audioUrl ? `
            <a href="javascript:void(0)" 
               onclick="downloadViaProxy('${audioUrl}', 'audio_${taskId}.mp3', '${safeText}')" 
               class="hc-download-item">
                <i class="bi bi-music-note-beamed"></i>
                <span>Audio</span>
            </a>` : `
            <div class="hc-download-item hc-download-disabled">
                <i class="bi bi-music-note-beamed"></i>
                <span>Audio</span>
            </div>`}
            
            <!-- SRT -->
            ${srtUrl ? `
            <a href="javascript:void(0)" 
               onclick="downloadViaProxy('${srtUrl}', 'subtitle_${taskId}.srt', '${safeText}')" 
               class="hc-download-item">
                <i class="bi bi-file-earmark-text"></i>
                <span>Phụ đề (SRT)</span>
            </a>` : `
            <div class="hc-download-item hc-download-disabled">
                <i class="bi bi-file-earmark-text"></i>
                <span>Phụ đề (SRT)</span>
            </div>`}
            
            <!-- JSON -->
            ${jsonUrl ? `
            <a href="javascript:void(0)" 
               onclick="downloadViaProxy('${jsonUrl}', 'subtitle_${taskId}.json', '${safeText}')" 
               class="hc-download-item">
                <i class="bi bi-file-earmark-code"></i>
                <span>Phụ đề (JSON)</span>
            </a>` : `
            <div class="hc-download-item hc-download-disabled">
                <i class="bi bi-file-earmark-code"></i>
                <span>Phụ đề (JSON)</span>
            </div>`}
        </div>
    </div>
`;

    // 🔥 5. GOM NHÓM CÁC NÚT: [Remake] [Download] [Delete]
    let actionGroup = `
        <div style="display: flex; align-items: center; gap: 5px; margin-left: 8px;">
            ${remakeBtn}
            ${downloadDropdownHtml}
            ${$deleteBtn.length ? $deleteBtn[0].outerHTML : ''}
        </div>
    `;

    // Xóa nút delete cũ để tránh trùng lặp
    if ($deleteBtn.length) {
        $deleteBtn.remove();
    }

    // 🔥 6. XÂY DỰNG PLAYER HTML - VỚI DURATION PLACEHOLDER
    let durationText = duration ? formatTime(duration) : '--:--';

    let playerHtml = `
    <div class="hc-player">
        <button class="hc-play-btn" id="play-btn-${taskId}" onclick="playAudio('${taskId}', '${audioUrl}')">
            <i class="bi bi-play-fill"></i>
        </button>
        <div class="hc-progress-container">
            <div class="hc-progress" onclick="seekAudio(event, '${taskId}')">
                <div class="hc-progress-bar" id="progress-${taskId}" style="width: 0%"></div>
            </div>
            <div class="hc-time-display">
                <span id="time-current-${taskId}">0:00</span>
                <span id="time-total-${taskId}">${durationText}</span>
            </div>
        </div>
        <div class="hc-actions">
            ${actionGroup}
        </div>
    </div>`;

    $(`#card-${taskId}`).append(playerHtml);

    $(`#track-${taskId}`).fadeOut(300, function () {
        $(this).remove();
    });

    // 🔥 7. TỰ ĐỘNG LẤY DURATION TỪ AUDIO NẾU CHƯA CÓ
    if (!duration && audioUrl) {
        let tempAudio = new Audio(audioUrl);
        tempAudio.addEventListener('loadedmetadata', function () {
            let realDuration = tempAudio.duration;
            if (realDuration && !isNaN(realDuration)) {
                $(`#time-total-${taskId}`).text(formatTime(realDuration));

                // Lưu vào map để lần sau không phải load lại
                if (historyDataMap[taskId]) {
                    historyDataMap[taskId].duration = realDuration;
                }
            }
        });
    }

    // 🔥 8. ĐỒNG BỘ SANG MODAL CHI TIẾT
    syncDetailedHistoryCard(taskId, 'done', audioUrl, srtUrl, jsonUrl, duration);
}
// Đóng Remake Modal khi click ngoài
$(document).on('click', '#remakeTaskModal', function (e) {
    if (e.target.id === 'remakeTaskModal') {
        closeRemakeModal();
    }
});

// Đóng khi nhấn ESC
$(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $('#remakeTaskModal').is(':visible')) {
        closeRemakeModal();
    }
});
// ========================================
// 🔄 BIẾN LƯU TRỮ TASK CẦN REMAKE
// ========================================
let pendingRemakeTaskId = null;

// ========================================
// 🔄 MỞ POPUP REMAKE (CẢI TIẾN)
// ========================================
function openRemakeModal(taskId) {
    console.log('🔄 Opening remake modal for:', taskId);

    let taskData = historyDataMap[taskId];

    if (!taskData) {
        console.error('❌ Task not found:', taskId);
        showToast('❌ Không tìm thấy thông tin task');
        return;
    }

    pendingRemakeTaskId = taskId;

    // Text preview
    let textPreview = taskData.text_input || 'Không có nội dung';
    if (textPreview.length > 300) {
        textPreview = textPreview.substring(0, 300) + '...';
    }
    $('#remakeTextPreview').text(textPreview);

    // Settings info
    let settingsHtml = '';
    settingsHtml += `<div><i class="bi bi-cpu"></i> <strong>Provider:</strong> ${taskData.provider || 'Unknown'}</div>`;

    if (taskData.model_id) {
        settingsHtml += `<div><i class="bi bi-layers"></i> <strong>Model:</strong> ${taskData.model_id}</div>`;
    }

    if (taskData.voice_name) {
        settingsHtml += `<div><i class="bi bi-mic"></i> <strong>Voice:</strong> ${taskData.voice_name}</div>`;
    }

    if (taskData.speed) {
        settingsHtml += `<div><i class="bi bi-speedometer"></i> <strong>Speed:</strong> ${taskData.speed}</div>`;
    }

    $('#remakeSettingsInfo').html(settingsHtml);

    // 🔥 SET SUBTITLE CHECKBOX (Theo trạng thái cũ)
    let hadSubtitle = taskData.with_transcript || false;
    $('#remakeSubtitleCheck').prop('checked', hadSubtitle);

    // Hiện badge nếu có subtitle
    if (hadSubtitle) {
        $('#remakeSubtitleBadge').show();
    } else {
        $('#remakeSubtitleBadge').hide();
    }

    // 🔥 TÍNH COST BAN ĐẦU
    updateRemakeCost();

    // Mở popup
    $('#remakeTaskModal').css('display', 'flex');
    setTimeout(() => {
        $('#remakeTaskModal').addClass('show');
    }, 10);
}
function updateRemakeCost() {
    if (!pendingRemakeTaskId) return;

    let taskData = historyDataMap[pendingRemakeTaskId];
    if (!taskData) return;

    // Lấy text
    let text = taskData.text_input || '';
    let charCount = text.length;

    // Lấy cost_factor
    let cost_factor = 1.0;
    if (taskData.provider === 'minimax') {
        let model = loadedModels.minimax.find(m => m.id === taskData.model_id);
        if (model) cost_factor = model.cost_factor || 1.0;
    } else {
        let model = loadedModels.elevenlabs.find(m => m.id === taskData.model_id);
        if (model) cost_factor = model.cost_factor || 1.0;
    }

    // Clone multiplier (chỉ với Minimax)
    let clone_multiplier = 1.0;
    if (taskData.provider === 'minimax') {
        let voiceObj = (loadedVoices.minimax || []).find(v => v.id == taskData.voice_id);
        if (voiceObj && (voiceObj.source === 'cloned' || (voiceObj.tags && voiceObj.tags.includes('Clone')))) {
            clone_multiplier = 1.3;
        }
    }

    // 🔥 CHECK SUBTITLE TOGGLE
    let with_transcript = $('#remakeSubtitleCheck').is(':checked');

    // Hiện/ẩn badge
    if (with_transcript) {
        $('#remakeSubtitleBadge').fadeIn(200);
    } else {
        $('#remakeSubtitleBadge').fadeOut(200);
    }

    // Tính toán
    let base_rate = 1.12;
    let estimated_cost = charCount * base_rate * cost_factor * clone_multiplier;

    if (with_transcript) {
        estimated_cost *= 1.2;
    }

    // Làm tròn
    let total_cost;
    if (cost_factor < 1.0) {
        total_cost = Math.ceil(estimated_cost);
    } else {
        total_cost = Math.floor(estimated_cost);
    }
    total_cost = Math.max(1, total_cost);

    // Hiển thị
    $('#remakeCostDisplay').text(total_cost.toLocaleString() + ' credits');

    // Check balance
    let currentCredits = parseInt($('#userCredits').text().replace(/,/g, '') || '0');
    if (currentCredits < total_cost) {
        $('#remakeCostDisplay').css('color', '#ef4444');
        $('#btnConfirmRemake').prop('disabled', true);
    } else {
        $('#remakeCostDisplay').css('color', '#fff');
        $('#btnConfirmRemake').prop('disabled', false);
    }
}


// ========================================
// 🔒 ĐÓNG POPUP
// ========================================
function closeRemakeModal() {
    $('#remakeTaskModal').removeClass('show');
    setTimeout(() => {
        $('#remakeTaskModal').css('display', 'none');
    }, 300);
    pendingRemakeTaskId = null;
}

// ========================================
// ✅ XÁC NHẬN REMAKE - DEBUG ENHANCED
// ========================================
async function confirmRemakeTask() {
    if (!pendingRemakeTaskId) {
        showToast('❌ Lỗi: Không tìm thấy task ID');
        return;
    }

    let taskData = historyDataMap[pendingRemakeTaskId];
    if (!taskData) {
        showToast('❌ Không tìm thấy thông tin task');
        closeRemakeModal();
        return;
    }

    // Loading state
    let $btnRemake = $('#btnConfirmRemake');
    $btnRemake.addClass('loading').prop('disabled', true);
    $btnRemake.find('i').removeClass('bi-magic').addClass('bi-arrow-repeat');
    $btnRemake.find('span').text('Đang tạo...');

    // XỬ LÝ voice_id
    let voiceId = taskData.voice_id;
    if (!voiceId && taskData.voice_name) {
        if (typeof allVoicesData !== 'undefined' && allVoicesData.length > 0) {
            let foundVoice = allVoicesData.find(v => v.name === taskData.voice_name);
            if (foundVoice) voiceId = foundVoice.voice_id;
        }
    }
    if (!voiceId) {
        voiceId = taskData.provider === 'minimax' ? 'male-qn-qingse' : 'pNInz6obpgDQGcFmaJgB';
    }

    // XỬ LÝ speed
    let speed = taskData.speed || 1.0;

    // 🔥 [FIX] LẤY SUBTITLE TỪ CHECKBOX TRONG POPUP (KHÔNG PHẢI DATA CŨ)
    let with_transcript = $('#remakeSubtitleCheck').is(':checked');

    console.log('🔄 Remake Payload Debug:', {
        task_id: pendingRemakeTaskId,
        provider: taskData.provider,
        voice_id: voiceId,
        with_transcript: with_transcript,  // ← Giá trị mới từ checkbox
        old_value: taskData.with_transcript  // ← Giá trị cũ (để so sánh)
    });

    // Payload
    let payload = {
        action: 'create_speech',
        text: taskData.text_input,
        provider: taskData.provider,
        voice_id: voiceId,
        with_transcript: with_transcript ? 1 : 0  // ← ĐÃ FIX
    };

    if (taskData.provider === 'minimax') {
        payload.model_id = taskData.model_id || 'speech-2.6-hd';
        payload.speed = speed;
        payload.pitch = taskData.pitch || 0;
        payload.vol = taskData.vol || 1.0;
        payload.language_boost = taskData.language_boost || 'Auto';
    } else {
        payload.model_id = taskData.model_id || 'eleven_multilingual_v2';
        payload.speed = speed;
        payload.stability = taskData.stability !== undefined ? taskData.stability : 0.5;
        payload.similarity = taskData.similarity !== undefined ? taskData.similarity : 0.75;
        payload.style = taskData.style !== undefined ? taskData.style : 0;
        payload.use_boost = taskData.use_boost !== undefined ? taskData.use_boost : true;
    }

    try {
        const response = await $.ajax({
            url: '../../ajaxs/tts3.php',
            method: 'POST',
            data: payload,
            dataType: 'json',
            timeout: 30000
        });

        if (response.status === 'success') {
            closeRemakeModal();
            showToast('✅ Đã tạo lại tác vụ thành công!');
            setTimeout(() => refreshHistory(), 500);
        } else {
            throw new Error(response.message || 'Backend error');
        }

    } catch (error) {
        console.error('❌ Remake error:', error);

        let errorMsg = 'Không thể tạo lại task';
        if (error.responseJSON) {
            errorMsg = error.responseJSON.message || error.responseJSON.error || errorMsg;
        }
        if (error.status) {
            errorMsg += ` (HTTP ${error.status})`;
        }

        showToast('❌ Lỗi: ' + errorMsg);

        // Reset button
        $btnRemake.removeClass('loading').prop('disabled', false);
        $btnRemake.find('i').removeClass('bi-arrow-repeat').addClass('bi-magic');
        $btnRemake.find('span').text('Tạo lại ngay');
    }
}


// ========================================
// 📋 LOAD TASK SETTINGS VÀO UI
// ========================================
function loadTaskSettingsToUI(taskData) {
    console.log('📋 Loading task settings:', taskData);

    // 1. Load text vào textarea
    $('#txtInput').val(taskData.text_input || '');
    togglePlaceholder();

    // 2. Lưu vào localStorage
    localStorage.setItem('tts_input_draft', taskData.text_input || '');

    // 3. Load provider
    if (taskData.provider) {
        selectProvider(taskData.provider);
    }

    // 4. Load voice (nếu có voice_id)
    if (taskData.voice_id && taskData.voice_name) {
        $('#voiceIdVal').val(taskData.voice_id);
        $('#selectedVoiceName').text(taskData.voice_name);
    }

    // 5. Load settings theo provider
    if (taskData.provider === 'minimax') {
        // Minimax settings
        if (taskData.model_id) {
            selectedMinimaxModel = taskData.model_id;
            $('#selectedMinimaxModel').text(taskData.model_id);
        }

        if (taskData.speed) $('#speed').val(taskData.speed).trigger('input');
        if (taskData.pitch) $('#pitch').val(taskData.pitch).trigger('input');
        if (taskData.vol) $('#vol').val(taskData.vol).trigger('input');

        if (taskData.language_boost) {
            selectedLanguage = taskData.language_boost;
            $('#selectedLang').text(taskData.language_boost);
        }

        // Subtitle
        $('#minimaxSubtitleCheck').prop('checked', taskData.with_transcript || false);

    } else {
        // ElevenLabs settings
        if (taskData.speed) $('#elevenSpeed').val(taskData.speed).trigger('input');
        if (taskData.stability !== undefined) $('#stability').val(taskData.stability * 100).trigger('input');
        if (taskData.similarity !== undefined) $('#similarity').val(taskData.similarity * 100).trigger('input');
        if (taskData.style !== undefined) $('#style').val(taskData.style * 100).trigger('input');

        if (taskData.use_boost !== undefined) {
            $('#boostCheck').prop('checked', taskData.use_boost);
        }

        // Subtitle
        $('#subtitleCheck').prop('checked', taskData.with_transcript || false);
    }

    // 6. Cập nhật cost
    updateEstimatedCost();

    // 7. Focus vào textarea
    setTimeout(() => {
        $('#txtInput').focus();
    }, 500);
}
// ========================================
// 🔥 TOGGLE DOWNLOAD DROPDOWN (SIDEBAR)
// ========================================
function toggleSidebarDownloadMenu(event, taskId) {
    event.stopPropagation();

    const menuId = `#sidebar-download-menu-${taskId}`;
    const $menu = $(menuId);

    // Đóng tất cả menu khác (cả sidebar và modal)
    $('.hc-download-menu, .dh-download-menu').not($menu).hide();

    // Toggle menu hiện tại
    $menu.toggle();
}

// Đóng dropdown khi click ra ngoài (Cập nhật để bao gồm sidebar)
$(document).on('click', function (e) {
    if (!$(e.target).closest('.hc-download-wrapper, .dh-download-wrapper').length) {
        $('.hc-download-menu, .dh-download-menu').hide();
    }
});
function updateCardToFailed(taskId) {
    $(`#card-${taskId}`).removeClass('processing');

    $(`#card-${taskId} #status-${taskId}`)
        .text('Thất bại')
        .removeClass('status-pending')
        .addClass('status-failed');

    // 🔥 [THÊM MỚI] Đồng bộ sang Modal Chi tiết
    syncDetailedHistoryCard(taskId, 'failed', null, null, null, null);
}
function playAudio(taskId, url) {
    if (currentPlayingTaskId === taskId && !mainAudio.paused) {
        mainAudio.pause();
        $(`#play-btn-${taskId}`).html('<i class="bi bi-play-fill"></i>');
        currentPlayingTaskId = null;
    } else {
        if (currentPlayingTaskId) {
            $(`#play-btn-${currentPlayingTaskId}`).html('<i class="bi bi-play-fill"></i>');
        }

        currentPlayingTaskId = taskId;
        mainAudio.src = url;
        mainAudio.play();
        $(`#play-btn-${taskId}`).html('<i class="bi bi-pause-fill"></i>');
    }
}

// Thêm tham số isModal vào cuối
function seekAudio(event, taskId, isModal = false) {
    if (mainAudio.src && mainAudio.duration) {
        let progressBar = event.currentTarget;
        let clickX = event.offsetX;
        let width = progressBar.offsetWidth;
        let percent = clickX / width;

        mainAudio.currentTime = percent * mainAudio.duration;

        // Nếu user tua bài khác với bài đang phát, cần chuyển taskId để thanh chạy đúng
        if (currentPlayingTaskId !== taskId) {
            // Logic xử lý nếu cần (thường thì phải bấm play trước mới tua được)
        }
    }
}
// ========== BULK UPLOAD ==========
// ========== UPLOAD DROPDOWN ==========
function toggleUploadDropdown() {
    $('#uploadDropdown').toggle();
    updateChevron();
}

function updateChevron() {
    if ($('#uploadDropdown').is(':visible')) {
        $('#uploadChevron').removeClass('bi-chevron-up').addClass('bi-chevron-down');
    } else {
        $('#uploadChevron').removeClass('bi-chevron-down').addClass('bi-chevron-up');
    }
}

$(document).on('click', function (e) {
    if (!$(e.target).closest('#uploadDropdownBtn').length && !$(e.target).closest('#uploadDropdown').length) {
        $('#uploadDropdown').hide();
        updateChevron();
    }
});

// ========== GLOBAL DROP HANDLER ==========
let dragCounter = 0;

$(document).on('dragenter', function (e) {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
        $('#globalDropOverlay').css('display', 'flex').hide().fadeIn(200);
    }
});

$(document).on('dragleave', function (e) {
    dragCounter--;
    if (dragCounter === 0) {
        $('#globalDropOverlay').fadeOut(200);
    }
});

$(document).on('dragover', function (e) {
    e.preventDefault();
});

$(document).on('drop', function (e) {
    e.preventDefault();
    dragCounter = 0;
    $('#globalDropOverlay').fadeOut(200);

    let files = Array.from(e.originalEvent.dataTransfer.files);
    handleGlobalDrop(files);
});

function handleGlobalDrop(files) {
    let validFiles = files.filter(f => {
        let name = f.name.toLowerCase();
        return (name.endsWith('.txt') || name.endsWith('.srt') || name.endsWith('.zip')) && f.size < 5 * 1024 * 1024;
    });

    if (validFiles.length === 0) {
        alert('Không có file hợp lệ! Chỉ chấp nhận .txt, .srt, .zip < 5MB');
        return;
    }

    // 🔥 [FIX] KIỂM TRA GIỌNG TRƯỚC KHI XỬ LÝ FILE
    if (!$('#voiceIdVal').val()) {
        // Lưu file vào biến tạm
        pendingUploadFiles = validFiles;

        // Hiện popup yêu cầu chọn giọng
        showModernConfirm(
            'Chưa chọn giọng nói',
            'Vui lòng chọn giọng nói trước khi tải file lên.',
            function () {
                openVoiceModal();
            },
            {
                type: 'warning',
                confirmText: 'Chọn giọng',
                cancelText: 'Hủy'
            }
        );
        return;
    }

    // Nếu đã có giọng → Xử lý file ngay
    processUploadFiles(validFiles);
}
function showModernConfirm(title, message, onConfirm, options = {}) {
    // Xóa popup cũ
    $('#modernConfirmPopup').remove();

    let type = options.type || 'info'; // info, warning, error
    let confirmText = options.confirmText || 'Xác nhận';
    let cancelText = options.cancelText || 'Hủy';
    let showCancel = options.showCancel !== false;

    let iconHtml = '';
    if (type === 'warning') {
        iconHtml = '<i class="bi bi-exclamation-triangle-fill" style="color: #fbbf24; font-size: 32px;"></i>';
    } else if (type === 'error') {
        iconHtml = '<i class="bi bi-x-circle-fill" style="color: #ef4444; font-size: 32px;"></i>';
    } else {
        iconHtml = '<i class="bi bi-info-circle-fill" style="color: #667eea; font-size: 32px;"></i>';
    }

    let html = `
    <div id="modernConfirmPopup" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; opacity: 0; animation: fadeIn 0.2s forwards;
    ">
        <div style="
            background: #111; border: 1px solid #333; border-radius: 16px;
            padding: 32px; max-width: 400px; width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8); text-align: center;
            transform: scale(0.95); animation: slideUp 0.3s forwards;
        ">
            ${iconHtml}
            <h3 style="margin: 20px 0 10px 0; font-size: 18px; font-weight: 700; color: #fff;">${title}</h3>
            <p style="color: #999; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">${message}</p>
            
            <div style="display: flex; gap: 10px;">
                ${showCancel ? `<button id="mcCancelBtn" style="flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #333; background: transparent; color: #ccc; font-weight: 500; cursor: pointer;">${cancelText}</button>` : ''}
                <button id="mcConfirmBtn" style="flex: 1; padding: 12px; border-radius: 10px; border: none; background: #fff; color: #000; font-weight: 700; cursor: pointer;">${confirmText}</button>
            </div>
        </div>
        <style>
            @keyframes fadeIn { to { opacity: 1; } }
            @keyframes slideUp { to { opacity: 1; transform: scale(1); } }
        </style>
    </div>`;

    $('body').append(html);

    // Events
    $('#mcCancelBtn').on('click', function () {
        $('#modernConfirmPopup').fadeOut(200, function () { $(this).remove(); });
    });

    $('#mcConfirmBtn').on('click', function () {
        $('#modernConfirmPopup').fadeOut(200, function () { $(this).remove(); });
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });
}
function processUploadFiles(validFiles) {
    console.log('🎯 processUploadFiles called with:', validFiles.length, 'files');

    // In ra tên file để debug
    validFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}`));

    // 🔥 LOGIC QUYẾT ĐỊNH:
    // - 1 file .txt/.srt (không phải .zip) → Textarea
    // - Còn lại (2+ files HOẶC 1 file .zip) → Bulk Modal

    let isSingleTextFile = (
        validFiles.length === 1 &&
        !validFiles[0].name.toLowerCase().endsWith('.zip')
    );

    if (isSingleTextFile) {
        // ═══════════════════════════════════════════════
        // ✅ TRƯỜNG HỢP 1: 1 FILE .TXT/.SRT → TEXTAREA
        // ═══════════════════════════════════════════════
        let file = validFiles[0];

        console.log('→ Single file mode: Loading into textarea');

        $('#inputLoader').show();

        // Check SRT & Set Flag
        if (file.name.toLowerCase().endsWith('.srt')) {
            window.isSrtFile = true;
            $('#srtFeeInfo').show();
        } else {
            window.isSrtFile = false;
            $('#srtFeeInfo').hide();
        }

        // Lưu thông tin file
        localStorage.setItem('tts_filename', file.name);
        localStorage.setItem('tts_is_srt', window.isSrtFile);

        let reader = new FileReader();
        reader.onload = function (e) {
            let currentText = $('#txtInput').val();
            let newContent = currentText + (currentText ? '\n\n' : '') + e.target.result;

            $('#txtInput').val(newContent);
            localStorage.setItem('tts_input_draft', newContent);

            togglePlaceholder();
            updateEstimatedCost();

            $('#inputLoader').hide();
            $('#fileNameDisplay').text(`📂 ${file.name}`).fadeIn();

            showToast('✅ Đã tải file vào ô nhập liệu');
        };

        reader.onerror = function () {
            $('#inputLoader').hide();
            alert('Lỗi đọc file!');
        };

        reader.readAsText(file);
    }
    else {
        // ═══════════════════════════════════════════════
        // ✅ TRƯỜNG HỢP 2: 2+ FILES HOẶC .ZIP → BULK MODAL
        // ═══════════════════════════════════════════════
        console.log('→ Bulk mode: Opening Bulk Modal');

        // 🔥 BẮT BUỘC: MỞ MODAL TRƯỚC
        openBulkModal();

        // 🔥 SAU ĐÓ MỚI XỬ LÝ FILE
        handleBulkFiles(validFiles);
    }
}

// ========== ELECTRON FILE/FOLDER UPLOAD ==========
async function uploadFileElectron() {
    console.log('📄 [Electron] Upload file clicked');
    $('#uploadDropdown').hide();
    updateChevron();

    // Kiểm tra giọng trước
    if (!$('#voiceIdVal').val()) {
        showModernConfirm(
            'Chưa chọn giọng nói',
            'Vui lòng chọn giọng nói trước khi tải file lên.',
            function () { openVoiceModal(); },
            { type: 'warning', confirmText: 'Chọn giọng', cancelText: 'Hủy' }
        );
        return;
    }

    try {
        const result = await window.electronAPI.selectFiles({
            filters: [
                { name: 'Text Files', extensions: ['txt', 'srt', 'zip'] }
            ],
            properties: ['openFile', 'multiSelections']
        });

        console.log('📄 [Electron] selectFiles result:', result);

        if (result && result.success && result.filePaths && result.filePaths.length > 0) {
            // Đọc nội dung các file
            const files = [];
            for (const filePath of result.filePaths) {
                try {
                    const content = await window.electronAPI.readFile(filePath);
                    const fileName = filePath.split(/[/\\]/).pop();
                    files.push({
                        name: fileName,
                        path: filePath,
                        content: content,
                        size: content ? content.length : 0
                    });
                } catch (e) {
                    console.error('Error reading file:', filePath, e);
                }
            }

            if (files.length > 0) {
                console.log('📄 [Electron] Read', files.length, 'files');
                processElectronFiles(files);
            }
        }
    } catch (error) {
        console.error('❌ [Electron] selectFiles error:', error);
        alert('Lỗi chọn file: ' + error.message);
    }
}

async function uploadFolderElectron() {
    console.log('📁 [Electron] Upload folder clicked');
    $('#uploadDropdown').hide();
    updateChevron();

    // Kiểm tra giọng trước
    if (!$('#voiceIdVal').val()) {
        showModernConfirm(
            'Chưa chọn giọng nói',
            'Vui lòng chọn giọng nói trước khi tải folder lên.',
            function () { openVoiceModal(); },
            { type: 'warning', confirmText: 'Chọn giọng', cancelText: 'Hủy' }
        );
        return;
    }

    try {
        const result = await window.electronAPI.selectFolder();
        console.log('📁 [Electron] selectFolder result:', result);

        if (result && result.success && result.files && result.files.length > 0) {
            // Filter valid files based on the path string
            const validFilePaths = result.files.filter(filePath => {
                const name = filePath.toLowerCase();
                return name.endsWith('.txt') || name.endsWith('.srt');
            });

            if (validFilePaths.length === 0) {
                alert('Không có file .txt hoặc .srt hợp lệ trong thư mục!');
                return;
            }

            console.log('📁 [Electron] Found', validFilePaths.length, 'valid files');

            // Map the paths to file objects with content
            const filesForProcessing = [];
            for (const filePath of validFilePaths) {
                try {
                    const fileData = await window.electronAPI.readFile(filePath);
                    filesForProcessing.push({
                        name: fileData.fileName,
                        path: fileData.filePath,
                        content: fileData.content,
                        size: fileData.content ? fileData.content.length : 0
                    });
                } catch (e) {
                    console.error('Error reading file from folder:', filePath, e);
                }
            }

            if (filesForProcessing.length > 0) {
                processElectronFiles(filesForProcessing);
            }
        }
    } catch (error) {
        console.error('❌ [Electron] selectFolder error:', error);
        alert('Lỗi chọn thư mục: ' + error.message);
    }
}

// Process files from Electron API
function processElectronFiles(files) {
    if (!files || files.length === 0) return;

    console.log('📄 [Electron] Processing', files.length, 'files');

    // Nếu chỉ 1 file text -> đưa vào textarea
    if (files.length === 1) {
        const file = files[0];
        const name = file.name.toLowerCase();

        if (name.endsWith('.txt') || name.endsWith('.srt')) {
            // Đưa nội dung vào textarea
            const content = file.content || '';
            $('#inputText').val(content);
            updateCharCount();
            showToast(`✅ Đã tải: ${file.name}`);
            return;
        }
    }

    // Nhiều file -> Mở Bulk Modal
    // Convert to File-like objects for processUploadFiles
    const fileObjects = files.map(f => ({
        name: f.name,
        size: f.size || (f.content ? f.content.length : 0),
        text: () => Promise.resolve(f.content || ''),
        _electronFile: true,
        _content: f.content
    }));

    processUploadFiles(fileObjects);
}

// ========== SINGLE FILE UPLOAD (HTML Input fallback) ==========
$('#fileInput').on('change', function (e) {
    let files = e.target.files;
    if (!files || files.length === 0) return;

    // Lọc file hợp lệ
    let validFiles = Array.from(files).filter(f => {
        let name = f.name.toLowerCase();
        return (name.endsWith('.txt') || name.endsWith('.srt') || name.endsWith('.zip')) && f.size < 5 * 1024 * 1024;
    });

    if (validFiles.length === 0) {
        alert('Không có file hợp lệ! Chỉ chấp nhận .txt, .srt, .zip < 5MB');
        $(this).val('');
        return;
    }

    // 🔥 [FIX] KIỂM TRA GIỌNG TRƯỚC
    if (!$('#voiceIdVal').val()) {
        // Lưu file
        pendingUploadFiles = validFiles;

        // Reset input
        $(this).val('');

        // Hiện popup
        showModernConfirm(
            'Chưa chọn giọng nói',
            'Vui lòng chọn giọng nói trước khi tải file lên.',
            function () {
                openVoiceModal();
            },
            {
                type: 'warning',
                confirmText: 'Chọn giọng',
                cancelText: 'Hủy'
            }
        );
        return;
    }

    // ✅ ĐÃ CÓ GIỌNG → XỬ LÝ FILE
    console.log('📄 File upload: Processing', validFiles.length, 'files');

    // Reset input
    $(this).val('');

    // 🔥 [QUAN TRỌNG] GỌI HÀM CHUNG (Sẽ tự động phân loại 1 file hay nhiều file)
    processUploadFiles(validFiles);
});

// 🔥 FOLDER INPUT - Đảm bảo event được gắn sau khi DOM ready
$(document).ready(function () {
    console.log('📁 Setting up folder input handler...');

    const folderInput = document.getElementById('folderInput');
    if (folderInput) {
        console.log('✅ Found #folderInput element');

        // Dùng native addEventListener để đảm bảo hoạt động
        folderInput.addEventListener('change', function (e) {
            let files = e.target.files;
            console.log('📁 Folder input changed, files:', files ? files.length : 0);

            if (!files || files.length === 0) {
                console.log('❌ No files selected');
                return;
            }

            // Log tất cả file trong folder
            console.log('📁 All files in folder:');
            Array.from(files).forEach((f, i) => {
                console.log(`  ${i + 1}. ${f.name} (${(f.size / 1024).toFixed(1)}KB)`);
            });

            // Lọc file hợp lệ (.txt, .srt, .zip)
            let validFiles = Array.from(files).filter(f => {
                let name = f.name.toLowerCase();
                return (name.endsWith('.txt') || name.endsWith('.srt') || name.endsWith('.zip')) && f.size < 5 * 1024 * 1024;
            });

            console.log('📁 Valid files after filter:', validFiles.length);

            if (validFiles.length === 0) {
                alert('Không có file hợp lệ trong thư mục!\nChỉ chấp nhận .txt, .srt, .zip < 5MB');
                this.value = '';
                return;
            }

            // 🔥 KIỂM TRA GIỌNG TRƯỚC
            if (!$('#voiceIdVal').val()) {
                pendingUploadFiles = validFiles;
                this.value = '';

                showModernConfirm(
                    'Chưa chọn giọng nói',
                    'Vui lòng chọn giọng nói trước khi tải folder lên.',
                    function () { openVoiceModal(); },
                    { type: 'warning', confirmText: 'Chọn giọng', cancelText: 'Hủy' }
                );
                return;
            }

            // 🔥 NẾU CÓ 10+ FILES → HIỆN POPUP XÁC NHẬN
            if (validFiles.length >= 10) {
                showFolderConfirmPopup(validFiles, this);
                return;
            }

            // Dưới 10 files → Xử lý bình thường
            console.log('📁 Folder upload: Opening Bulk Modal with', validFiles.length, 'files');
            this.value = '';
            processUploadFiles(validFiles);
        });
    } else {
        console.log('❌ #folderInput element not found!');
    }
});
function setupBulkDropZone() {
    const dropZone = document.getElementById('bulkDropZone');
    const fileInput = document.getElementById('bulkFileInput');

    if (!dropZone || !fileInput) return;

    // Click to upload
    dropZone.addEventListener('click', function (e) {
        e.preventDefault();

        if (!$('#voiceIdVal').val()) {
            showToast('⚠️ Vui lòng chọn giọng nói trước!');
            closeBulkModal();
            setTimeout(() => openVoiceModal(), 300);
            return;
        }

        fileInput.click();
    });

    // Prevent defaults
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, function (e) {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // Add dragover class
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, function () {
            dropZone.classList.add('dragover');
        }, false);
    });

    // Remove dragover class
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, function () {
            dropZone.classList.remove('dragover');
        }, false);
    });

    // Handle drop
    dropZone.addEventListener('drop', function (e) {
        if (!$('#voiceIdVal').val()) {
            showToast('⚠️ Vui lòng chọn giọng nói trước!');
            closeBulkModal();
            setTimeout(() => openVoiceModal(), 300);
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        handleBulkFiles(files);
    }, false);

    // File input change
    fileInput.addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
            handleBulkFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset
        }
    });
}

// 🔥 HÀM HIỂN THỊ POPUP XÁC NHẬN FOLDER
function showFolderConfirmPopup(files, $input) {
    // Render danh sách file
    let fileListHtml = files.slice(0, 20).map((f, i) => `
        <div style="padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; color: #333; display: flex; align-items: center; gap: 8px;">
            <i class="bi bi-file-earmark-text" style="color: #666;"></i>
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.name}</span>
            <span style="color: #999; font-size: 10px;">${(f.size / 1024).toFixed(1)}KB</span>
        </div>
    `).join('');

    if (files.length > 20) {
        fileListHtml += `<div style="padding: 8px; text-align: center; color: #999; font-size: 11px;">... và ${files.length - 20} file khác</div>`;
    }

    $('#folderFileList').html(fileListHtml);

    // Cập nhật số lượng trong tiêu đề
    $('#folderConfirmPopup h3').text(`Bạn muốn tải ${files.length} tệp lên trang web này?`);

    // Hiển thị popup
    $('#folderConfirmPopup').css('display', 'flex').hide().fadeIn(200);

    // Xử lý sự kiện nút
    $('#folderCancelBtn').off('click').on('click', function () {
        $('#folderConfirmPopup').fadeOut(200);
        $input.val(''); // Reset input
    });

    $('#folderUploadBtn').off('click').on('click', function () {
        $('#folderConfirmPopup').fadeOut(200);
        $input.val(''); // Reset input

        // Xử lý upload
        console.log('✅ User confirmed folder upload:', files.length, 'files');
        processUploadFiles(files);
    });
}
$('#dropZone').on('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();

    $(this).removeClass('dragover');

    let files = e.originalEvent.dataTransfer.files;
    if (!files || files.length === 0) return;

    // 🔥 [FIX] KIỂM TRA GIỌNG TRƯỚC
    if (!$('#voiceIdVal').val()) {
        // Lưu file
        pendingUploadFiles = Array.from(files);

        // Hiện popup
        showModernConfirm(
            'Chưa chọn giọng nói',
            'Vui lòng chọn giọng nói trước khi tải file lên.',
            function () {
                openVoiceModal();
            },
            {
                type: 'warning',
                confirmText: 'Chọn giọng',
                cancelText: 'Hủy'
            }
        );
        return;
    }

    // ✅ ĐÃ CÓ GIỌNG → XỬ LÝ FILE
    $('#inputLoader').show();

    let file = files[0];

    if (!file.name.endsWith('.txt')) {
        alert('Chỉ hỗ trợ file .txt');
        $('#inputLoader').hide();
        return;
    }

    let reader = new FileReader();

    reader.onload = function (event) {
        let content = event.target.result;
        $('#txtInput').val(content);

        updateEstimatedCost();
        togglePlaceholder();

        $('#inputLoader').hide();
        $('#fileNameDisplay').html(`<span style="color: #4ade80;">✓ ${file.name}</span>`);
        showToast('✅ Đã tải file vào ô nhập liệu');
    };

    reader.readAsText(file);
});
// ========== BULK UPLOAD ==========
let bulkFiles = [];

function openBulkModal() {
    $('#bulkUploadModal').css('display', 'flex').hide().fadeIn(200);
    bulkFiles = [];
    $('#bulkFileList').hide();
    $('#bulkSummary').hide();
    $('#btnBulkProcess').hide();
    $('#currentBalance').text($('#userCredits').text() + ' credits');

    // Setup events
    setTimeout(() => setupBulkDropZone(), 100);
}


function closeBulkModal() {
    $('#bulkUploadModal').fadeOut();
    bulkFiles = [];
}

// Drag & Drop trong modal
let bulkDropZone = document.getElementById('bulkDropZone');

$('#bulkDropZone').on('click', function () {
    if (!$('#voiceIdVal').val()) {
        alert('⚠️ Vui lòng chọn giọng nói trước!');
        closeBulkModal();
        openVoiceModal();
        return;
    }
    $('#bulkFileInput').click();
});

$('#bulkFileInput').on('change', function (e) {
    handleBulkFiles(Array.from(e.target.files));
    $(this).val(''); // Reset
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    bulkDropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    bulkDropZone.addEventListener(eventName, () => {
        $('#bulkDropZone').css('border-color', '#667eea');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    bulkDropZone.addEventListener(eventName, () => {
        $('#bulkDropZone').css('border-color', '#444');
    }, false);
});

bulkDropZone.addEventListener('drop', e => {
    let dt = e.dataTransfer;
    let files = Array.from(dt.files);
    handleBulkFiles(files);
}, false);

async function handleBulkFiles(files) {
    console.log('📦 handleBulkFiles called with:', files.length, 'files');

    let validFiles = files.filter(f => {
        let name = f.name.toLowerCase();
        return (name.endsWith('.txt') || name.endsWith('.srt') || name.endsWith('.zip')) && f.size < 5 * 1024 * 1024;
    });

    console.log('✅ Valid files after filter:', validFiles.length);

    if (validFiles.length === 0) {
        alert('Không có file hợp lệ! Chỉ chấp nhận .txt, .srt, .zip < 5MB');
        return;
    }

    if (bulkFiles.length + validFiles.length > 20) {
        alert('Tối đa 20 file!');
        return;
    }

    // Show loading
    $('#bulkDropZone').html('<div class="spinner-border" style="color: #667eea;"></div><p style="margin-top: 15px; color: #888;">Đang đọc file...</p>');

    // Process files
    for (let file of validFiles) {
        if (file.name.endsWith('.zip')) {
            await extractZipFile(file);
        } else {
            await readTextFile(file);
        }
    }

    // Reset drop zone
    $('#bulkDropZone').html(`
        <i class="bi bi-cloud-upload" style="font-size: 48px; color: #667eea; display: block; margin-bottom: 16px;"></i>
        <h4 style="margin-bottom: 8px;">Kéo thả file hoặc click để chọn</h4>
        <p style="color: #888; font-size: 13px;">Hỗ trợ: .txt, .zip (tối đa 20 file, mỗi file < 5MB)</p>
    `);

    console.log('✅ Finished processing. Total files in bulkFiles:', bulkFiles.length);

    renderFileList();
    calculateBulkCost();
}
async function extractZipFile(zipFile) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = async function (e) {
            try {
                let zip = await JSZip.loadAsync(e.target.result);
                let filePromises = [];

                zip.forEach((relativePath, zipEntry) => {
                    if (!zipEntry.dir && (relativePath.endsWith('.txt'))) {
                        filePromises.push(
                            zipEntry.async('string').then(content => {
                                // 🔥 KHÔNG TRIM
                                bulkFiles.push({
                                    name: relativePath,
                                    content: content,
                                    chars: content.length,
                                    from: zipFile.name
                                });
                            })
                        );
                    }
                });

                await Promise.all(filePromises);
                resolve();
            } catch (err) {
                console.error('ZIP extract error:', err);
                alert('Lỗi khi giải nén file ZIP!');
                reject(err);
            }
        };
        reader.readAsArrayBuffer(zipFile);
    });
}
async function readTextFile(file) {
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.onload = function (e) {
            let content = e.target.result; // 🔥 KHÔNG TRIM

            bulkFiles.push({
                name: file.name,
                content: content,
                chars: content.length,
                from: 'upload'
            });
            resolve();
        };
        reader.readAsText(file);
    });
}

function renderFileList() {
    if (bulkFiles.length === 0) {
        $('#bulkFileList').hide();
        return;
    }

    $('#bulkFileList').show();
    $('#fileCount').text(bulkFiles.length);

    let html = '';
    bulkFiles.forEach((file, index) => {
        let fromBadge = file.from !== 'upload'
            ? `<span class="bulk-file-badge">từ ${file.from}</span>`
            : '';

        html += `
        <div class="bulk-file-item">
            <div class="bulk-file-info">
                <div class="bulk-file-name">
                    <i class="bi bi-file-earmark-text" style="color: #667eea;"></i>
                    ${file.name}${fromBadge}
                </div>
                <div class="bulk-file-chars">
                    ${file.chars.toLocaleString()} ký tự
                </div>
            </div>
            <button class="bulk-btn-remove" onclick="removeFile(${index})">
                <i class="bi bi-trash"></i>
            </button>
        </div>`;
    });

    $('#fileListContainer').html(html);
}

function removeFile(index) {
    bulkFiles.splice(index, 1);
    renderFileList();
    calculateBulkCost();
}

function clearAllFiles() {
    if (confirm('Xóa tất cả file?')) {
        bulkFiles = [];
        renderFileList();
        $('#bulkSummary').hide();
        $('#btnBulkProcess').hide();
    }
}

function calculateBulkCost() {
    console.log('💰 calculateBulkCost() called');
    console.log('  - bulkFiles.length:', bulkFiles.length);

    if (bulkFiles.length === 0) {
        $('#bulkSummary').hide();
        $('#btnBulkProcess').hide();
        console.log('  → No files, hiding summary');
        return;
    }

    // 1. TỔNG KÝ TỰ
    let totalChars = bulkFiles.reduce((sum, f) => sum + f.chars, 0);
    console.log('  - Total chars:', totalChars);

    // 2. HỆ SỐ MODEL & VOICE
    let cost_factor = 1.0;
    let voice_multiplier = 1.0;

    if (currentProvider === 'minimax') {

        let isHDModel = (
            selectedMinimaxModel === 'speech-2.6-hd' ||
            selectedMinimaxModel === 'speech-02-hd'
        );

        if (isHDModel) {
            cost_factor = 1.15;
        }

        // KIỂM TRA VOICE CLONE
        let isClone = false;
        let voiceId = $('#voiceIdVal').val();

        if (typeof currentVoiceTab !== 'undefined' && currentVoiceTab === 'cloned') {
            isClone = true;
        }

        if (!isClone) {
            let voiceName = $('#selectedVoiceName').text().toLowerCase();
            if (voiceName.includes('clone') || voiceName.includes('(clone)')) {
                isClone = true;
            }
        }

        if (!isClone && voiceId && typeof loadedVoices !== 'undefined' && loadedVoices.minimax) {
            let voiceObj = loadedVoices.minimax.find(v => v.id == voiceId);

            if (voiceObj && voiceObj.source === 'cloned') {
                isClone = true;
            }
        }

        if (isClone) {
            voice_multiplier = 1.3;
        }

    } else {
        // ElevenLabs
        let currentModelName = $('#selectedModelName').text();

        if (currentModelName.includes('v3') || currentModelName.includes('V3')) {
            cost_factor = 1.3;
        }
    }

    console.log('  - cost_factor:', cost_factor);
    console.log('  - voice_multiplier:', voice_multiplier);

    // 3. PHỤ ĐỀ
    let srt_multiplier = 1.0;
    let with_transcript = false;

    if (currentProvider === 'minimax') {
        with_transcript = $('#minimaxSubtitleCheck').is(':checked');
    } else {
        with_transcript = $('#subtitleCheck').is(':checked');
    }

    if (with_transcript) {
        srt_multiplier = 1.15;
    }

    console.log('  - with_transcript:', with_transcript);
    console.log('  - srt_multiplier:', srt_multiplier);

    // 4. CÔNG THỨC TÍNH (BỎ x1.12 như bạn yêu cầu)
    let base_cost = totalChars * cost_factor * voice_multiplier * srt_multiplier;

    console.log('  - base_cost (before rounding):', base_cost);

    // 5. LÀM TRÒN
    let total_cost = Math.round(base_cost);
    total_cost = Math.max(bulkFiles.length, total_cost); // Tối thiểu = số file

    console.log('  - total_cost (after rounding):', total_cost);

    // 6. GENAI BACKUP
    let isGenAIBackup = (
        typeof elevenlabsDown !== 'undefined' && elevenlabsDown &&
        typeof backupEligible !== 'undefined' && backupEligible &&
        currentProvider === 'elevenlabs'
    );

    if (isGenAIBackup) {
        total_cost = 0;
        console.log('  → Using GenAI Backup, cost = 0');
    }

    // 7. CẬP NHẬT UI
    $('#totalChars').text(totalChars.toLocaleString());
    $('#baseCost').text(Math.round(base_cost).toLocaleString() + ' credits');

    if (isGenAIBackup) {
        // 🔥 SỬA: Đổi từ #estimatedCost sang #bulkEstimatedCost
        $('#bulkEstimatedCost').html('<span class="badge bg-success">Miễn phí (Backup)</span>');
        $('#btnBulkProcess').prop('disabled', false).css('opacity', '1');
    } else {
        // 🔥 SỬA: Đổi từ #estimatedCost sang #bulkEstimatedCost
        $('#bulkEstimatedCost').text(total_cost.toLocaleString() + ' credits');

        let currentCredits = parseInt($('#userCredits').text().replace(/,/g, '') || '0');

        console.log('  - Current credits:', currentCredits);
        console.log('  - Need:', total_cost);

        if (currentCredits < total_cost) {
            $('#btnBulkProcess').prop('disabled', true).css('opacity', '0.5');
            $('#bulkEstimatedCost').css('color', '#ef4444'); // 🔥 SỬA
            console.log('  → Not enough credits');
        } else {
            $('#btnBulkProcess').prop('disabled', false).css('opacity', '1');
            $('#bulkEstimatedCost').css('color', '#fbbf24'); // 🔥 SỬA
            console.log('  → Enough credits');
        }
    }

    // 8. HIỂN THỊ SUMMARY
    $('#bulkSummary').show();
    $('#btnBulkProcess').show();

    // 9. CẬP NHẬT MODEL INFO
    if (currentProvider === 'elevenlabs') {
        let currentModelName = $('#selectedModelName').text();
        $('#summaryModel').text(currentModelName);
    } else {
        $('#summaryModel').text(selectedMinimaxModel);
    }

    // 10. HIỂN THỊ TRANSCRIPT TAG
    if (with_transcript) {
        $('#summaryTranscript').show();
    } else {
        $('#summaryTranscript').hide();
    }

    // 11. SCROLL XUỐNG CUỐI
    setTimeout(() => {
        let scrollArea = document.getElementById('bulkModalScrollArea');
        if (scrollArea) {
            scrollArea.scrollTo({
                top: scrollArea.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, 100);

    console.log('✅ calculateBulkCost() finished');
}
// ========================================
// 🔥 MỞ POPUP XÁC NHẬN BULK (FIXED)
// ========================================
function processBulkFiles() {
    // 1. Validate
    if (bulkFiles.length === 0) {
        showToast('⚠️ Chưa có file nào để xử lý');
        return;
    }

    // 2. Tính toán thông tin
    let totalChars = bulkFiles.reduce((sum, f) => sum + f.chars, 0);
    let estimatedCost = parseInt($('#bulkEstimatedCost').text().replace(/[^0-9]/g, '')) || 0;
    let currentCredits = parseInt($('#userCredits').text().replace(/[^0-9]/g, '')) || 0;
    let balanceAfter = currentCredits - estimatedCost;

    // 3. Điền thông tin vào popup
    $('#bcFileCount').text(bulkFiles.length);
    $('#bcCharCount').text(totalChars.toLocaleString());
    $('#bcCost').text(estimatedCost.toLocaleString() + ' credits');
    $('#bcBalanceAfter').text(balanceAfter.toLocaleString() + ' credits');

    // 4. Kiểm tra số dư & hiện warning
    let $warning = $('#bcWarning');
    let $confirmBtn = $('#btnBulkConfirm');

    if (balanceAfter < 0) {
        $('#bcBalanceAfter').removeClass('balance').addClass('danger');
        $warning.show();
        $('#bcWarningText').text(
            currentLang === 'vi'
                ? `Bạn thiếu ${Math.abs(balanceAfter).toLocaleString()} credits. Vui lòng nạp thêm để tiếp tục.`
                : `You need ${Math.abs(balanceAfter).toLocaleString()} more credits. Please top up to continue.`
        );
        $confirmBtn.prop('disabled', true);
    } else {
        $('#bcBalanceAfter').removeClass('danger').addClass('balance');
        $warning.hide();
        $confirmBtn.prop('disabled', false);
    }

    // 5. Hiện popup với class 'show'
    $('#bulkConfirmPopup').addClass('show');
}

// ========================================
// 🔒 ĐÓNG POPUP XÁC NHẬN (UPDATED)
// ========================================
function closeBulkConfirmPopup() {
    $('#bulkConfirmPopup').removeClass('show');
}

// ========================================
// ✅ XÁC NHẬN & BẮT ĐẦU XỬ LÝ (UPDATED)
// ========================================
async function confirmBulkProcess() {
    // 1. Khóa nút
    let $btn = $('#btnBulkConfirm');
    $btn.addClass('loading').prop('disabled', true);
    $btn.find('i').removeClass('bi-magic').addClass('bi-arrow-repeat');
    $btn.find('span').text(currentLang === 'vi' ? 'Đang xử lý...' : 'Processing...');

    let successCount = 0;
    let failCount = 0;

    // 2. Kiểm tra chế độ Backup
    let isGenAIBackup = (typeof elevenlabsDown !== 'undefined' && elevenlabsDown &&
        typeof backupEligible !== 'undefined' && backupEligible &&
        currentProvider === 'elevenlabs');

    // 3. Duyệt qua từng file
    for (let i = 0; i < bulkFiles.length; i++) {
        let file = bulkFiles[i];

        // Update progress text
        let progress = Math.round((i + 1) / bulkFiles.length * 100);
        $btn.find('span').text(`${currentLang === 'vi' ? 'Đang xử lý' : 'Processing'} ${i + 1}/${bulkFiles.length} (${progress}%)`);

        // Xác định checkbox phụ đề
        let isSubtitleChecked = (currentProvider === 'minimax')
            ? $('#minimaxSubtitleCheck').is(':checked')
            : $('#subtitleCheck').is(':checked');

        let params = {
            action: 'create_speech',
            provider: currentProvider,
            text: file.content,
            voice_id: $('#voiceIdVal').val(),
            voice_name: $('#selectedVoiceName').text() + ` [${file.name}]`,
            with_transcript: isSubtitleChecked
        };

        if (isGenAIBackup) {
            params.use_genai_backup = true;
        }

        // Cấu hình tham số theo Provider
        if (currentProvider === 'minimax') {
            params.model_id = selectedMinimaxModel;
            params.vol = $('#vol').val();
            params.speed = $('#speed').val();
            params.pitch = $('#pitch').val();
            params.language_boost = selectedLanguage;
        } else {
            let currentModelName = $('#selectedModelName').text();
            let model = loadedModels.elevenlabs.find(m => currentModelName.includes(m.name));
            params.model_id = model ? model.id : (loadedModels.elevenlabs[0]?.id || 'eleven_multilingual_v2');

            params.speed = $('#elevenSpeed').val();
            params.stability = $('#stability').val() / 100;
            params.similarity = $('#similarity').val() / 100;
            params.style = $('#style').val() / 100;
            params.use_boost = $('#boostCheck').is(':checked');
        }

        try {
            let res = await $.post('../../ajaxs/tts3.php', params).promise();

            if (res.status === 'success') {
                successCount++;

                if (res.queue_id && res.history_id) {
                    addPendingCard(res.history_id, file.content.substring(0, 100) + '...', 0, 'elevenlabs', res.character_count);
                    if (typeof startQueuePolling === 'function') {
                        startQueuePolling(res.history_id, res.queue_id);
                    }
                } else if (res.task_id) {
                    addPendingCard(res.task_id, file.content.substring(0, 100) + '...', res.credit_cost, currentProvider);
                    if (typeof startPolling === 'function') {
                        startPolling(res.task_id);
                    }
                }

                let currentBalance = parseInt($('#userCredits').text().replace(/,/g, ''));
                let newBalance = res.new_balance !== undefined ? res.new_balance : (currentBalance - (res.credit_cost || 0));
                $('#userCredits').text(newBalance.toLocaleString());

            } else {
                failCount++;
                console.error("Task failed:", res.message);
            }
        } catch (err) {
            failCount++;
            console.error("Request error:", err);

            // 🔥 [MỚI] BẮT LỖI 429 TRONG BULK
            if (err.status === 429) {
                // Đóng popup đang chạy
                closeBulkConfirmPopup();
                closeBulkModal();

                let msg = 'Bạn thao tác quá nhanh. Hệ thống đã tạm dừng xử lý các file còn lại.';
                try { msg = JSON.parse(err.responseText).message; } catch (e) { }

                showRateLimitPopup(msg);
                return; // 🛑 DỪNG NGAY VÒNG LẶP (Không gửi các file sau nữa)
            }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 🔥 4. ĐÓNG POPUP XÁC NHẬN & BULK MODAL
    closeBulkConfirmPopup();

    // 🔥 Delay 200ms để animation chạy mượt
    setTimeout(() => {
        closeBulkModal();
        switchTab('history');

        // 🔥 5. HIỂN THỊ KẾT QUẢ (DÙNG showModernAlert ĐÃ FIX)
        let resultMsg = `✅ Hoàn thành!\n\n• Thành công: ${successCount}\n• Thất bại: ${failCount}`;
        if (isGenAIBackup) {
            resultMsg += `\n\n(Đã sử dụng Backup miễn phí)`;
        }

        showModernAlert(
            currentLang === 'vi' ? 'Hoàn thành xử lý' : 'Processing Complete',
            resultMsg,
            'success'
        );
    }, 250);
}
// ========================================
// 🎨 MODERN ALERT (FIXED - KHÔNG BỊ ĐEN MỜ)
// ========================================
function showModernAlert(title, message, type = 'info') {
    // 🔥 XÓA ALERT CŨ NẾU CÒN TỒN TẠI
    $('#modernAlert, #modernAlertOverlay').remove();

    let iconClass = 'bi-info-circle-fill';
    let iconColor = '#667eea';

    if (type === 'success') {
        iconClass = 'bi-check-circle-fill';
        iconColor = '#4ade80';
    } else if (type === 'error') {
        iconClass = 'bi-x-circle-fill';
        iconColor = '#ef4444';
    }

    let html = `
    <!-- Overlay -->
    <div id="modernAlertOverlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9999998;
        animation: fadeIn 0.2s;
    "></div>
    
    <!-- Alert Box -->
    <div id="modernAlert" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        z-index: 9999999;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
        text-align: center;
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    ">
        <i class="bi ${iconClass}" style="
            font-size: 48px;
            color: ${iconColor};
            display: block;
            margin-bottom: 20px;
        "></i>
        <h3 style="
            margin: 0 0 12px 0;
            font-size: 18px;
            font-weight: 700;
            color: #fff;
        ">${title}</h3>
        <p style="
            color: #aaa;
            font-size: 14px;
            white-space: pre-line;
            line-height: 1.6;
            margin: 0 0 24px 0;
        ">${message}</p>
        <button onclick="closeModernAlert()" style="
            padding: 12px 32px;
            background: linear-gradient(135deg, #fff 0%, #e5e5e5 100%);
            color: #000;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            OK
        </button>
    </div>
    
    <style>
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translate(-50%, -45%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }
    </style>`;

    $('body').append(html);

    // 🔥 TỰ ĐỘNG ĐÓNG KHI CLICK OVERLAY
    $('#modernAlertOverlay').on('click', closeModernAlert);

    // 🔥 TỰ ĐỘNG ĐÓNG KHI NHẤN ESC
    $(document).on('keydown.modernAlert', function (e) {
        if (e.key === 'Escape') {
            closeModernAlert();
        }
    });
}

// ========================================
// 🔒 ĐÓNG MODERN ALERT (HÀM MỚI)
// ========================================
function closeModernAlert() {
    $('#modernAlert, #modernAlertOverlay').fadeOut(200, function () {
        $(this).remove();
    });
    $(document).off('keydown.modernAlert'); // Remove event listener
}
// ========================================
// 🎨 ĐÓNG POPUP KHI CLICK OVERLAY
// ========================================
$(document).on('click', '#bulkConfirmPopup', function (e) {
    if (e.target.id === 'bulkConfirmPopup') {
        closeBulkConfirmPopup();
    }
});

// Đóng khi nhấn ESC
$(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $('#bulkConfirmPopup').hasClass('show')) {
        closeBulkConfirmPopup();
    }
});



function clearTextInput() {
    let currentText = $('#txtInput').val();

    // 1. Kiểm tra có text không
    if (!currentText || currentText.trim() === '') {
        showToast('⚠️ Không có văn bản để xóa');
        return;
    }

    // 2. Hiển thị preview text trong popup
    let previewText = currentText.substring(0, 300); // Lấy 300 ký tự đầu
    if (currentText.length > 300) {
        previewText += '...';
    }

    $('#clearTextPreview').text(previewText);

    // 3. Mở popup xác nhận
    $('#clearTextModal').css('display', 'flex').hide().fadeIn(200).addClass('show');
}

// ========================================
// 🔒 ĐÓNG POPUP XÓA VĂN BẢN
// ========================================
function closeClearTextModal() {
    $('#clearTextModal').removeClass('show').fadeOut(200);
}

// ========================================
// ✅ XÁC NHẬN XÓA (KHI CLICK "XÓA" TRONG POPUP)
// ========================================
function confirmClearText() {
    // 1. Xóa nội dung textarea
    $('#txtInput').val('');

    // 2. Xóa bộ nhớ tạm
    localStorage.removeItem('tts_input_draft');
    localStorage.removeItem('tts_filename');
    localStorage.removeItem('tts_is_srt');

    // 3. Reset các biến cờ
    window.isSrtFile = false;

    // 4. Ẩn các thông tin file đã tải
    $('#fileNameDisplay').hide().text('');
    $('#srtFeeInfo').hide();

    // 5. Reset chi phí ước tính
    updateEstimatedCost();

    // 6. Hiện lại placeholder
    togglePlaceholder();

    // 7. Đóng popup
    closeClearTextModal();

    // 8. Thông báo thành công
    showToast('✅ Đã xóa toàn bộ văn bản');

    // 9. Focus vào textarea
    setTimeout(() => {
        $('#txtInput').focus();
    }, 300);
}
function updateFilterIndicators() {
    $('.filter-group').each(function () {
        let select = $(this).find('.filter-select');
        let value = select.val();

        if (value && value !== '' && value !== 'all') {
            $(this).addClass('has-value');
        } else {
            $(this).removeClass('has-value');
        }
    });
}

// Hàm Wrapper để reset setting dựa trên provider hiện tại
function resetCurrentSettings() {
    if (typeof currentProvider !== 'undefined' && currentProvider === 'minimax') {
        resetMinimaxSettings();
        // Thông báo nhẹ
        showToast('Đã đặt lại cài đặt Minimax');
    } else {
        resetElevenLabsSettings();
        showToast('Đã đặt lại cài đặt ElevenLabs');
    }
}

function getProviderLogo(provider) {
    // Chẩn hóa chữ thường để so sánh
    let p = (provider || 'elevenlabs').toLowerCase();

    if (p === 'minimax') {
        return 'https://ai33.pro/minimax.png?v=3';
    }
    // Mặc định là ElevenLabs
    return 'https://ai33.pro/11max.png?v=3';
}

// Biến cờ để chặn filterVoices chạy lung tung khi đang tìm ID
let isSearchingServer = false;

function searchVoiceOnServer(voiceId) {
    // 1. Khóa bộ lọc local
    isSearchingServer = true;

    // 2. Hiển thị UI Loading
    $("#voiceGrid").html(`
        <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px;">
            <div class="spinner-border" style="width:30px; height:30px; color:#667eea;"></div>
            <p style="color:#888; margin-top:15px; font-size:14px;">Đang tìm kiếm ID trên server...</p>
        </div>
    `);

    // 3. Gửi Request
    $.post(
        "../../ajaxs/get_resources2.php?action=search_voice_id",
        {
            voice_id: voiceId,
        },
        function (res) {
            console.log("🔍 Server Search Result:", res);

            if (res.status === "success" && res.data) {
                let v = res.data;

                // --- A. XỬ LÝ TAGS (Để hiện viên thuốc màu xám) ---
                let tags = ["ID Lookup"]; // Tag đầu tiên

                // Lấy gender từ root hoặc labels
                let gender = v.gender || (v.labels ? v.labels.gender : "") || "Unknown";
                if (gender && gender !== "unknown") {
                    // Viết hoa chữ cái đầu (male -> Male)
                    tags.push(gender.charAt(0).toUpperCase() + gender.slice(1));
                }

                // Lấy accent
                let accent = v.accent || (v.labels ? v.labels.accent : "") || "";
                if (accent && accent !== "neutral") {
                    tags.push(accent.charAt(0).toUpperCase() + accent.slice(1));
                }

                // --- B. TẠO OBJECT VOICE CHUẨN (Khớp 100% với createVoiceCardHTML) ---
                let formattedVoice = {
                    // ID & Name
                    id: v.voice_id || v.id,
                    name: v.name || "Unknown Voice",

                    // Preview & Desc
                    preview_url: v.preview_url || v.sample_audio || "",
                    description: v.description || "Kết quả tìm kiếm theo ID",

                    // Avatar (fallback)
                    avatar: v.image_url || null,
                    source: "shared",

                    // Tags đã xử lý ở trên
                    tags: tags,

                    // 🔥 CÁC CHỈ SỐ QUAN TRỌNG (Map đúng key từ API về)
                    language: v.language || "en", // Cờ
                    usage_1y: parseInt(v.usage_character_count_1y || v.usage_1y || 0), // Icon tia sét
                    cloned: parseInt(v.cloned_by_count || v.cloned || 0), // Icon người
                };

                // 4. Reset bộ lọc UI
                $("#filterLang, #filterGender, #filterAge, #filterCategory").val("");
                $(".filter-group").removeClass("has-value");

                // 5. Render bằng hàm chuẩn (Sẽ tự gọi createVoiceCardHTML)
                renderVoiceGrid([formattedVoice]);

                // 6. Cache tạm thời vào list hiện tại (để bấm play ko lỗi)
                if (loadedVoices.elevenlabs) {
                    // Kiểm tra trùng trước khi push
                    if (
                        !loadedVoices.elevenlabs.find(
                            (item) => item.id === formattedVoice.id,
                        )
                    ) {
                        loadedVoices.elevenlabs.push(formattedVoice);
                    }
                }
            } else {
                // Trường hợp không tìm thấy
                $("#voiceGrid").html(`
                <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px;">
                    <i class="bi bi-emoji-frown" style="font-size:48px; color:#555; display:block; margin-bottom:15px;"></i>
                    <p style="color:#ef4444; font-size:14px; font-weight:600;">Không tìm thấy giọng nói</p>
                    <p style="color:#666; font-size:12px; margin-top:5px;">ID "${voiceId}" không tồn tại hoặc sai định dạng.</p>
                    <button onclick="resetFilters()" class="btn-generate" style="margin:20px auto; width:auto; padding:8px 20px; font-size:13px;">
                        <i class="bi bi-arrow-left"></i> Quay lại thư viện
                    </button>
                </div>
            `);
            }

            // Mở khóa bộ lọc
            isSearchingServer = false;
        },
        "json",
    ).fail(function () {
        // Xử lý lỗi mạng
        $("#voiceGrid").html(`
            <div style="padding:40px; text-align:center; color:#ef4444;">
                <i class="bi bi-wifi-off" style="font-size:32px; display:block; margin-bottom:10px;"></i>
                Lỗi kết nối server! Vui lòng thử lại.
            </div>
        `);
        isSearchingServer = false;
    });
}

function disableProviderOption(provider) {
    let $option = $(`.provider-option[data-provider="${provider}"]`);

    if ($option.length) {
        $option.addClass('provider-disabled');

        if (!$option.find('.maintenance-badge').length) {
            $option.find('.provider-desc').html(`
                <span class="maintenance-badge">🔴 Đang bảo trì</span>
            `);
        }

        $option.css('pointer-events', 'none');
        $option.css('opacity', '0.5');

        console.log('❌ Disabled provider:', provider);
    }
}

// ========== HIỆN MODAL CHI TIẾT (METADATA) ==========
function showMetadata(taskId) {
    const item = historyDataMap[taskId];
    if (!item) return;

    // 1. Điền text
    $('#dtText').text(item.text_input || '(Không có nội dung)');

    // 2. Điền thông tin kỹ thuật
    $('#dtTaskId').text(taskId);
    $('#dtTime').text(item.created_at || '-');
    $('#dtProvider').text(item.provider || 'elevenlabs');
    $('#dtModel').text(item.model_id || '-');
    $('#dtVoice').text(item.voice_name || 'Mặc định');
    $('#dtCost').text((item.credit_cost || 0) + ' credits');

    // 3. Xử lý Audio Player trong Modal
    const audioUrl = item.audio_url || item.url_audio;
    if (audioUrl && item.status === 'done') {
        $('#dtAudio').attr('src', audioUrl);
        $('#dtPlayerGroup').show();
    } else {
        $('#dtPlayerGroup').hide();
        $('#dtAudio').attr('src', '');
    }

    // 4. Xử lý Lỗi
    if (item.status === 'failed') {
        $('#dtErrorMsg').text(item.error_message || 'Lỗi không xác định');
        $('#dtErrorBox').show();
    } else {
        $('#dtErrorBox').hide();
    }

    // 5. Footer Buttons (Tải xuống)
    let footerHtml = '';
    if (item.status === 'done') {
        let linkJson = item.url_json || item.json_url;
        let linkSrt = item.url_srt || item.srt_url;

        // Style nút tải cho đẹp
        const btnStyle = "text-decoration:none; background:#222; border:1px solid #444; padding:6px 12px; border-radius:6px; color:#fff; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:5px;";

        if (linkSrt) footerHtml += `<a href="${linkSrt}" download style="${btnStyle}"><i class="bi bi-file-text"></i> Tải SRT</a> `;
        if (linkJson) footerHtml += `<a href="${linkJson}" download style="${btnStyle}"><i class="bi bi-filetype-json"></i> Tải JSON</a> `;
        if (audioUrl) footerHtml += `<a href="${audioUrl}" download style="${btnStyle}"><i class="bi bi-download"></i> Tải Audio</a>`;
    }

    // Nút đóng
    footerHtml += `<button onclick="closeTTSDetailModal()" style="margin-left:auto; background:transparent; border:1px solid #444; color:#888; padding:6px 16px; border-radius:6px; cursor:pointer;">Đóng</button>`;

    $('#dtFooterActions').html(footerHtml);

    // 6. Hiện Modal
    $('#ttsDetailModal').css('display', 'flex').hide().fadeIn(200);
}

function closeTTSDetailModal() {
    $('#ttsDetailModal').fadeOut(200);
    const audio = document.getElementById('dtAudio');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}
// ========== HÀM ĐỒNG BỘ GIỮA SIDEBAR VÀ MODAL CHI TIẾT ==========
function syncDetailedHistoryCard(taskId, status, audioUrl, srtUrl, jsonUrl, duration) {
    // Kiểm tra xem modal có đang mở không
    if (!$('#detailedHistoryModal').is(':visible')) {
        return; // Modal đóng thì không cần sync
    }

    let $row = $(`#row-${taskId}`);
    if ($row.length === 0) {
        return; // Row không tồn tại
    }

    console.log('🔄 Syncing detailed card:', taskId, status);

    // Dừng interval nếu đang chạy
    if (detailedIntervals[taskId]) {
        clearInterval(detailedIntervals[taskId]);
        delete detailedIntervals[taskId];
    }

    if (status === 'done') {
        // Cập nhật badge
        $row.find('.dh-badge-processing')
            .removeClass('dh-badge-processing')
            .addClass('dh-badge-done')
            .text('Xong');

        // Cập nhật credit label
        $row.find('.dh-credits-label').text('Tín dụng sử dụng');

        // Thay thế spinner bằng Player
        let durationText = duration ? formatTime(duration) : "--:--";
        let playerHtml = `
            <div class="dh-player" id="dh-player-${taskId}">
                <button class="dh-play-btn" id="dh-play-btn-${taskId}" onclick="playAudio('${taskId}', '${audioUrl}')">
                    <i class="bi bi-play-fill"></i>
                </button>
                
                <div class="dh-progress-track" onclick="seekAudio(event, '${taskId}', true)"> 
                    <div class="dh-progress-bar" id="dh-progress-${taskId}" style="width: 0%"></div>
                </div>
                
                <div class="dh-timer" id="dh-timer-${taskId}">0:00 / ${durationText}</div>
                
                <a href="${audioUrl}" download class="bi bi-download" style="color:#fff; font-size:14px; margin-left: auto; text-decoration:none;" title="Tải nhanh"></a>
            </div>
        `;

        $row.find('.dh-content-area').html(playerHtml);

    } else if (status === 'failed') {
        // Cập nhật badge
        $row.find('.dh-badge-processing')
            .removeClass('dh-badge-processing')
            .addClass('dh-badge-error')
            .text('Lỗi');

        // Cập nhật credit label
        $row.find('.dh-credits-label').text('Đã hoàn trả');

        // Hiển thị lỗi
        let errorHtml = `<div class="dh-status-text dh-text-error"><i class="bi bi-exclamation-circle"></i> Lỗi không xác định</div>`;
        $row.find('.dh-content-area').html(errorHtml);
    }
}

function downloadViaProxy(url, filename, textContent) {
    if (!url) {
        showToast('❌ Không có link tải xuống');
        return;
    }

    let text = textContent || $('#txtInput').val() || '';

    if (!text || text.trim() === '') {
        let taskId = null;

        let match = filename.match(/audio_([a-zA-Z0-9\-]+)\./);
        if (match) {
            taskId = match[1];
        }

        if (!taskId) {
            let urlMatch = url.match(/audio\/([a-zA-Z0-9\-]{30,})\//);
            if (urlMatch) {
                taskId = urlMatch[1];
            }
        }

        if (taskId && historyDataMap[taskId]) {
            text = historyDataMap[taskId].text_input ||
                historyDataMap[taskId].text ||
                historyDataMap[taskId].content || '';

            console.log('✅ Found text from map:', taskId, text.substring(0, 50));
        }
    }

    if (text.length > 200) {
        text = text.substring(0, 200);
    }

    showToast('tải xuống', 'info');

    let iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    let proxyPath = '../../ajaxs/download_audio.php'

    let proxyUrl = `${proxyPath}?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&text=${encodeURIComponent(text)}`;

    iframe.src = proxyUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
        if (iframe.parentNode) {
            document.body.removeChild(iframe);
        }
    }, 5000);
}

// ==================== VOICE CLONE (MINIMAX) ====================
let cloneAudioFilePath = null;

function openVoiceCloneModal() {
    document.getElementById('voiceCloneModal').style.display = 'flex';
    document.getElementById('cloneVoiceName').value = '';
    document.getElementById('cloneAudioPath').value = '';
    document.getElementById('cloneStatus').style.display = 'none';
    cloneAudioFilePath = null;
}

function closeVoiceCloneModal() {
    document.getElementById('voiceCloneModal').style.display = 'none';
}

async function selectCloneAudioFile() {
    try {
        const result = await window.electronAPI.selectFiles({
            filters: [
                { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a'] }
            ]
        });

        if (result.success && result.filePaths && result.filePaths.length > 0) {
            cloneAudioFilePath = result.filePaths[0];
            const fileName = cloneAudioFilePath.split(/[/\\]/).pop();
            document.getElementById('cloneAudioPath').value = fileName;
        }
    } catch (error) {
        console.error('Select audio error:', error);
        showToast('Error selecting file', 'error');
    }
}

async function startVoiceCloneTTS() {
    const voiceName = document.getElementById('cloneVoiceName').value.trim();
    const language = document.getElementById('cloneLanguage').value;
    const previewText = document.getElementById('clonePreviewText').value.trim();

    if (!voiceName) {
        showToast('Please enter voice name', 'warning');
        return;
    }

    if (!cloneAudioFilePath) {
        showToast('Please select audio file', 'warning');
        return;
    }

    // Show status
    document.getElementById('cloneStatus').style.display = 'block';
    document.getElementById('cloneStatusText').textContent = 'Cloning voice...';
    document.getElementById('btnStartClone').disabled = true;

    try {
        // Read audio file as base64
        const fileResult = await window.electronAPI.readFileAsBase64(cloneAudioFilePath);

        if (!fileResult || !fileResult.success) {
            throw new Error('Cannot read audio file');
        }

        const audioFileName = cloneAudioFilePath.split(/[/\\]/).pop();

        // Call API
        const response = await window.electronAPI.apiRequest(
            'https://kingcongstudio.com/ajaxs/tts3.php',
            {
                action: 'clone_voice',
                provider: 'minimax',
                voice_name: voiceName,
                language: language,
                preview_text: previewText,
                audio_data: fileResult.data,
                audio_filename: audioFileName
            }
        );

        console.log('Clone response:', response);

        if (response.success || response.status === 'success') {
            const clonedVoiceId = response.cloned_voice_id || response.voice_id;

            document.getElementById('cloneStatusText').textContent = 'Voice cloned successfully!';
            document.getElementById('cloneStatus').style.background = 'rgba(74, 222, 128, 0.1)';

            showToast(`Voice "${voiceName}" cloned!`, 'success');

            // Save to localStorage for backup
            try {
                const saved = localStorage.getItem('minimaxClonedVoices');
                const voices = saved ? JSON.parse(saved) : [];
                voices.push({
                    voice_id: clonedVoiceId,
                    name: voiceName,
                    language: language,
                    created_at: new Date().toISOString()
                });
                localStorage.setItem('minimaxClonedVoices', JSON.stringify(voices));
            } catch (e) {
                console.error('Save to localStorage error:', e);
            }

            // Auto-select cloned voice
            if (clonedVoiceId) {
                $('#voiceIdVal').val(clonedVoiceId);
                $('#selectedVoiceName').text(voiceName);
            }

            // Close modal after delay
            setTimeout(() => {
                closeVoiceCloneModal();
            }, 2000);
        } else {
            throw new Error(response.message || response.error || 'Clone failed');
        }
    } catch (error) {
        console.error('Voice clone error:', error);
        document.getElementById('cloneStatusText').textContent = `Error: ${error.message}`;
        document.getElementById('cloneStatus').style.background = 'rgba(239, 68, 68, 0.1)';
        showToast(`Clone error: ${error.message}`, 'error');
    } finally {
        document.getElementById('btnStartClone').disabled = false;
    }
}