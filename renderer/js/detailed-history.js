
// ========================================
// 🔥 DETAILED HISTORY BULK ACTIONS
// ========================================

// Toggle all checkboxes in detailed history
function toggleAllDetailed(checkbox) {
    const isChecked = $(checkbox).is(':checked');
    $('.dh-item-checkbox').prop('checked', isChecked);
    updateBulkActions();
}

// Update bulk action button states and counts
function updateBulkActions() {
    const $checkboxes = $('.dh-item-checkbox:checked');
    const count = $checkboxes.length;

    // Count items by type
    let audioCount = 0;
    let srtCount = 0;

    $checkboxes.each(function () {
        const audioUrl = $(this).data('audio');
        const srtUrl = $(this).data('srt');

        if (audioUrl) audioCount++;
        if (srtUrl) srtCount++;
    });

    // Update delete button
    $('#btnBulkDelete').prop('disabled', count === 0);
    $('#deleteCount').text(count);

    // Update audio download button
    $('#btnBulkDownloadAudio').prop('disabled', audioCount === 0);
    $('#audioCount').text(audioCount);

    // Update SRT download button
    $('#btnBulkDownloadSrt').prop('disabled', srtCount === 0);
    $('#srtCount').text(srtCount);

    // Update select all checkbox
    const totalCheckboxes = $('.dh-item-checkbox').length;
    $('#dhSelectAll').prop('checked', count === totalCheckboxes && count > 0);
}

// Bulk download function
function bulkDownload(type) {
    const $checkboxes = $('.dh-item-checkbox:checked');
    const urls = [];

    $checkboxes.each(function () {
        let url = '';
        if (type === 'audio') {
            url = $(this).data('audio');
        } else if (type === 'srt') {
            url = $(this).data('srt');
        } else if (type === 'json') {
            url = $(this).data('json');
        }

        if (url) {
            urls.push(url);
        }
    });

    if (urls.length === 0) {
        showToast(`Không có ${type} nào để tải xuống`, 'warning');
        return;
    }

    // Download each file
    let downloaded = 0;
    urls.forEach((url, index) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            downloaded++;
            if (downloaded === urls.length) {
                showToast(`Đã tải xuống ${downloaded} file ${type}`, 'success');
            }
        }, index * 200); // Delay to avoid browser blocking
    });
}

// Bulk delete function
function bulkDelete() {
    const $checkboxes = $('.dh-item-checkbox:checked');
    const taskIds = [];

    $checkboxes.each(function () {
        taskIds.push($(this).val());
    });

    if (taskIds.length === 0) return;

    const confirmMsg = `Bạn có chắc chắn muốn xóa ${taskIds.length} task đã chọn?`;

    if (!confirm(confirmMsg)) return;

    // Delete each task
    let deleted = 0;
    taskIds.forEach(taskId => {
        $.ajax({
            url: '../../ajaxs/tts3.php',
            method: 'POST',
            data: {
                action: 'delete_history',
                task_id: taskId
            },
            dataType: 'json',
            success: function (res) {
                if (res.status === 'success') {
                    $(`#row-${taskId}`).fadeOut(300, function () {
                        $(this).remove();
                        updateBulkActions();
                    });
                    deleted++;

                    if (deleted === taskIds.length) {
                        showToast(`Đã xóa ${deleted} task`, 'success');
                    }
                }
            }
        });
    });
}

// Refresh detailed history
function refreshDetailedHistory() {
    const $icon = $('#dhRefreshIcon');
    $icon.addClass('spinning');

    loadDetailedHistoryData(1, false);

    setTimeout(() => {
        $icon.removeClass('spinning');
    }, 1000);
}
