import urllib3
import random
import sys
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import requests
import json
import os
import base64
import threading
import time
from datetime import datetime
from pathlib import Path
import re
import webbrowser
import pygame
import subprocess
import psutil  # Cần cài: pip install psutil
pygame.mixer.init()

# Tắt log của urllib3
urllib3.disable_warnings()


def get_app_path():
    """Lấy đường dẫn thực của ứng dụng, hoạt động cả khi chạy script và exe"""
    if getattr(sys, 'frozen', False):
        # Nếu đang chạy từ file exe (PyInstaller)
        return os.path.dirname(sys.executable)
    else:
        # Nếu đang chạy từ script Python
        return os.path.dirname(os.path.abspath(__file__))


# Try to import pydub for audio processing
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("Warning: pydub not installed. Audio joining will be disabled.")
    print("Install with: pip install pydub")

# Thư viện song ngữ


def get_language_dict():
    return {
        'en': {
            'credits': 'Credits',
            'status_error_warning': '⚠️ WARNING: When tool shows "Failed" or "Error. Try again", check in "Backup" to verify real status. If task is still "Processing", wait for "Completed" to download. Only retry if truly "Failed". Retrying will cost more credits but won\'t solve the issue because old task is still processing. Display errors may be due to slow network or delayed API response. If "Processing" status takes too long, contact admin for solution.',
            'one_line_one_file': '1 Line 1 File',
            'page': 'Page',
            'server_status': 'Server Status',
            'good': 'Good',
            'degraded': 'Degraded',
            'overloaded': 'Overloaded',
            'check_credits_server': 'Check Credits & Server',
            'download_progress': 'Download Progress',
            'preparing_downloads': 'Preparing downloads...',
            'downloading': 'Downloading',
            'project': 'Project',
            'backup': 'Backup',
            'backup_tasks': 'Backup Tasks',
            'task_id': 'Task ID',
            'input_text': 'Input Text',
            'created_date': 'Created Date',
            'details': 'Details',
            'refresh': 'Refresh',
            'task_details': 'Task Details',
            'completed': 'Completed',
            'processing': 'Processing',
            'failed': 'Failed',
            'download_success': 'File downloaded successfully!',
            'delete_confirm': 'Are you sure you want to delete this task?',
            'task_deleted': 'Task deleted successfully!',
            'no_result_url': 'No download URL available for this task',
            'download_failed': 'Failed to download file',
            'open_download_folder': 'Open Download Folder',
            'delete_all_tasks': 'Delete All Tasks',
            'delete_all_confirm': 'Are you sure you want to delete ALL tasks? This cannot be undone!',
            'all_tasks_deleted': 'All tasks deleted successfully!',
            'download_selected': 'Download Selected Rows',
            'done': 'Done',
            'server_maintenance': 'Server is under maintenance. Please try again after 30-60 minutes',
            'api_maintenance_status': 'Out of credits',
            'auto_srt': 'Auto SRT',
            'status': 'Status',
            'api_key_management': 'API Key Management',
            'voice_column': 'Voice ID',
            'please_enter_voice_id_warning': 'Please enter a Voice ID!',
            'please_enter_voice_id': 'Please enter Voice ID',
            'invalid_format': 'Invalid Format',
            'checking': 'Checking...',
            'no_api_key_status': 'No API Key',
            'network_error': 'Network Error',
            'search': 'Search',
            'load_voices': 'Load Voices',
            'pitch': 'Pitch', 
            'volume': 'Volume',
            'voice_library': 'Voice Library',
            'advanced_settings': 'Advanced Settings',
            'clear_all': 'Clear All',
            'when_joining_files': 'When joining files',
            'max_segment_length': 'Maximum segment length',
            'characters': 'Characters',
            'local_id': 'Local ID',
            'elevenlabs_id': 'ElevenLabs ID',
            'name': 'Name',
            'model': 'Model',
            'id': 'ID',
            'timing': 'Timing',
            'invalid_json_file': 'Invalid JSON file! Missing required fields.',
            'invalid_settings_config': 'Invalid settings configuration!',
            'voice_import_success': 'Voice configuration imported successfully!',
            'error_joining_mp3': 'Failed to join MP3 files: {0}',
            'invalid_api_key': 'Invalid API key!',
            'mp3_files': 'MP3 files',
            'json_files': 'JSON files',
            'api_quota': 'API Quota',
            'text_files': 'Text files',
            'srt_files': 'SRT files',
            'all_files': 'All files',
            'voice_id_not_found': 'Voice ID not found!',
            'subtitles_loaded': 'Loaded {0} subtitles',
            'voices_found': 'Found {0} voices',
            'analysis_result': 'Analysis: {0} subtitles, {1} words, {2} characters, ~{3}s duration',
            'voice_duplicate': 'Voice preset already exists in library! Overwrite?',
            'Content': 'Content',
            'open': 'Open',
            'info': 'Information',
            'api_key_label': 'API Key',
            'test_connection': 'Test Connection',
            'save': 'Save',
            'download': 'Download',
            'unknown': 'Unknown',
            'delete': 'Delete',
            'status_not_configured': 'Not Configured',
            'request_timeout': 'Request Timeout (seconds)',
            'save_all': 'Save All',
            'tool_intro': 'Tool Introduction',
            'tool_functions': 'Tool Functions',
            'usage_guide': 'Usage Guide',
            'contact': 'Contact',
            'contact_zalo': 'Contact via Zalo',
            'visit_facebook': 'Visit Facebook',
            'voice': 'Voice',
            'voice_clone': 'Voice Clone',
            'voice_name': 'Voice Name',
            'voice_id': 'Voice ID',
            'add_to_library': 'Add to Library',
            'voice_model': 'Voice Model',
            'Output': 'Output',
            'change_voice_setting': 'Change voice setting',
            'speed': 'Speed',
            'style': 'Style',
            'stability': 'Stability',
            'speaker_boost': 'Speaker Boost',
            'similarity': 'Similarity',
            'thread': 'Thread',
            'threads': 'Threads',
            'folder': 'Folder',
            'options': 'Options',
            'loop': 'Loop',
            'auto_split': 'Auto Split',
            'subtitles': 'Subtitles (Done: {0} Processing: {1} Total: {2}) Elapsed: {3}s',
            'start': 'Start',
            'stop': 'Stop',
            'import_file': 'Import File (*.srt;*.txt,*.dgt)',
            'import_folder': 'Import Folder',
            'import_voice': 'Import Voice',
            'open_audio_output': 'Open Audio Output',
            'join_mp3': 'Join Mp3 & SRT',
            'ready': 'Ready',
            'main_tab': 'Elevenlabs',
            'api_config_tab': 'API Configuration',
            'about_tab': 'About',
            'delay_between_segments': 'Delay between segments',
            'silent_by_character': 'Silent by character',
            'character': 'Character',
            'auto_remove_special_chars': 'Auto remove special characters',
            'ok': 'OK',
            'apply': 'Apply',
            'close': 'Close',
            'complete': 'Complete',
            'success': 'Success',
            'warning': 'Warning',
            'error': 'Error',
            'import_audio_success': 'Successfully imported {0} audio files!',
            'no_api_key': 'Please enter API key and search voices!',
            'no_voice': 'Please select a voice!',
            'no_subtitles': 'Please import subtitles!',
            'pydub_error': 'pydub is not installed!\nInstall with: pip install pydub',
            'no_files_to_join': 'No files to join!',
            'output_not_found': 'Output folder not found!',
            'invalid_folder': 'Please select a valid folder!',
            'voice_added': 'Voice preset added to library!',
            'voice_library_empty': 'Voice library is empty!',
            'voice_import_soon': 'Voice import feature coming soon!',
            'api_key_saved': 'API key saved successfully!',
            'api_key_deleted': 'API key deleted successfully!',
            'no_api_key_provided': 'No API key provided',
            'connection_success': 'Connection successful',
            'connection_failed': 'Connection failed',
            'settings_saved': 'All settings saved successfully!',
            'mp3_joined': 'Joined {0} MP3 files successfully!',
            'no_mp3_found': 'No MP3 files found to join!',
            'tool_intro_text': (
                "Elevenlabs_Pro_Tool is a powerful text-to-speech application that integrates with the ElevenLabs API. "
                "Simply validate a Voice ID, import text files, and generate high-quality audio with customizable voice settings. "
                "Features voice library management, subtitle creation, and audio joining capabilities. Version 3.0."
            ),
            'tool_functions_text': (
                "• Voice ID validation with ElevenLabs API integration\n"
                "• Support for 6 voice models (eleven_monolingual_v1, eleven_multilingual_v2, eleven_turbo_v2, eleven_turbo_v2_5, eleven_flash_v2, eleven_v3)\n"
                "• Text/SRT file import with auto-split and loop features\n"
                "• Voice library with customizable presets (speed, stability, similarity, style, speaker boost)\n"
                "• Multi-threaded processing for efficient audio generation\n"
                "• Audio joining with configurable delays and silent characters\n"
                "• SRT subtitle creation with accurate timing\n"
                "• Multilingual interface (English, Vietnamese, Urdu, Hindi, Bengali)"
            ),
            'usage_guide_text': (
                "1. Validate the integrated ElevenLabs API key in the 'API Configuration' tab\n"
                "2. Enter a Voice ID and click 'Search' to verify\n"
                "3. Choose voice model and adjust settings (speed, stability, etc.)\n"
                "4. Import text/SRT files or folders using Import buttons\n"
                "5. Click 'Start' to begin audio generation\n"
                "6. Use 'Join Mp3' to combine generated audio files"
            ),
            'contact_text': (
                "• Zalo: 0353633663\n"
                "• Facebook: https://www.facebook.com/61578186428817"
            ),
            'credits_amount': 'Credits Amount',
            'price': 'Price',
            'voice_duration': 'Voice Duration',
            'usage_period': 'Usage Period',
            'unlimited': 'Unlimited',
            'rate': 'Rate',
            'no_refund': 'Note: No refund',
            'processing_complete': 'Processing completed! Processed {0} files.',
            'language': 'Language',
            'file_exists_overwrite': 'The output file already exists. Do you want to overwrite it?',
            'delete_items_confirm': 'Delete {0} item(s)?',
            'audio_files_count': 'Audio files: {0}',
            'checking_voice': 'Checking Voice',
            'generating_audio': 'Generating audio',
            'downloading': 'Downloading',
            'error_try_again': 'Error. Try Again',
            'api_timeout_detail': 'API request timeout. Please check network or increase timeout.',
            'no_valid_mp3_files': 'No valid MP3 files found (e.g., 1.mp3, 2.mp3, ...) in the folder!',
            'minimax_tab': 'Minimax',
            'minimax_intro': 'Minimax AI Integration',
            'minimax_description': 'Advanced text-to-speech with Minimax AI technology'
        },
        'vi': {
            'credits': 'Số Tín Dụng',
            'status_error_warning': '⚠️ CẢNH BÁO: Khi tool hiển thị lỗi "Thất bại" hoặc "Lỗi. Thử lại", hãy kiểm tra trong "Sao lưu" để xác nhận trạng thái thật. Nếu task vẫn "Đang xử lý" thì đợi "Hoàn Thành" rồi tải về. Chỉ chạy lại khi thật sự "Thất bại". Chạy lại sẽ mất thêm tín dụng nhưng không giải quyết được vấn đề vì task cũ vẫn đang được xử lý. Lỗi hiển thị có thể do mạng chậm hoặc API phản hồi muộn. Nếu "Đang xử lý" quá lâu có thể hỏi admin để có hướng giải quyết.',
            'one_line_one_file': '1 Dòng 1 File',
            'page': 'Trang',
            'server_status': 'Trạng thái Server',
            'good': 'Tốt',
            'degraded': 'Suy giảm',
            'overloaded': 'Quá tải',
            'check_credits_server': 'Kiểm tra Credits & Server',
            'download_progress': 'Tiến trình tải về',
            'preparing_downloads': 'Đang chuẩn bị tải về...',
            'downloading': 'Đang tải về',
            'project': 'Dự án',
            'backup': 'Sao lưu',
            'backup_tasks': 'Sao lưu Tasks',
            'task_id': 'ID Nhiệm vụ',
            'input_text': 'Văn bản đầu vào',
            'created_date': 'Ngày tạo',
            'details': 'Chi tiết',
            'refresh': 'Làm mới',
            'task_details': 'Chi tiết Task',
            'completed': 'Hoàn thành',
            'processing': 'Đang xử lý',
            'failed': 'Thất bại',
            'download_success': 'Tải file thành công!',
            'delete_confirm': 'Bạn có chắc muốn xóa task này?',
            'task_deleted': 'Đã xóa task thành công!',
            'no_result_url': 'Không có URL tải về cho task này',
            'download_failed': 'Tải file thất bại',
            'open_download_folder': 'Mở thư mục tải về',
            'delete_all_tasks': 'Xóa tất cả Tasks',
            'delete_all_confirm': 'Bạn có chắc muốn xóa TẤT CẢ tasks? Không thể hoàn tác!',
            'all_tasks_deleted': 'Đã xóa tất cả tasks thành công!',
            'download_selected': 'Tải về các dòng đã chọn',
            'done': 'Hoàn thành',
            'server_maintenance': 'Server đang bảo trì. Hãy thử lại sau 30-60 phút',
            'api_maintenance_status': 'Hết credits',
            'auto_srt': 'Tự động SRT',
            'api_key_management': 'Quản lý khóa API',
            'voice_column': 'ID Giọng nói',
            'please_enter_voice_id_warning': 'Vui lòng nhập Voice ID!',
            'please_enter_voice_id': 'Vui lòng nhập Voice ID',
            'invalid_format': 'Định dạng không hợp lệ',
            'checking': 'Đang kiểm tra...',
            'no_api_key_status': 'Không có API Key',
            'network_error': 'Lỗi mạng',
            'search': 'Tìm kiếm',
            'load_voices': 'Tải giọng nói',
            'pitch': 'Cao độ',
            'volume': 'Âm lượng',
            'voice_library': 'Thư viện giọng nói',
            'advanced_settings': 'Cài đặt nâng cao',
            'clear_all': 'Xóa tất cả',
            'when_joining_files': 'Khi ghép tệp',
            'max_segment_length': 'Độ dài tối đa mỗi đoạn',
            'characters': 'Ký tự',
            'local_id': 'ID cục bộ',
            'elevenlabs_id': 'ID ElevenLabs',
            'name': 'Tên',
            'model': 'Mô hình',
            'id': 'ID',
            'timing': 'Thời gian',
            'invalid_json_file': 'Tệp JSON không hợp lệ! Thiếu các trường bắt buộc.',
            'invalid_settings_config': 'Cấu hình settings không hợp lệ!',
            'voice_import_success': 'Đã nhập cấu hình giọng nói thành công!',
            'error_joining_mp3': 'Không thể ghép tệp MP3: {0}',
            'invalid_api_key': 'Khóa API không hợp lệ!',
            'mp3_files': 'Tệp MP3',
            'json_files': 'Tệp JSON',
            'api_quota': 'Hạn mức API',
            'text_files': 'Tệp văn bản',
            'srt_files': 'Tệp SRT',
            'all_files': 'Tất cả tệp',
            'voice_id_not_found': 'Voice ID không tồn tại!',
            'subtitles_loaded': 'Đã tải {0} phụ đề',
            'voices_found': 'Tìm thấy {0} giọng nói',
            'analysis_result': 'Phân tích: {0} phụ đề, {1} từ, {2} ký tự, ~{3}s thời lượng',
            'voice_duplicate': 'Cấu hình giọng nói đã tồn tại trong thư viện! Ghi đè?',
            'Content': 'Nội dung',
            'info': 'Thông tin',
            'open': 'Mở',
            'api_key_label': 'Khóa API',
            'test_connection': 'Kiểm tra kết nối',
            'save': 'Lưu',
            'download': 'Tải về',
            'unknown': 'Không xác định',
            'delete': 'Xóa',
            'status_not_configured': 'Chưa cấu hình',
            'request_timeout': 'Thời gian chờ yêu cầu (giây)',
            'save_all': 'Lưu tất cả',
            'tool_intro': 'Giới thiệu công cụ',
            'tool_functions': 'Chức năng công cụ',
            'usage_guide': 'Hướng dẫn sử dụng',
            'contact': 'Liên hệ',
            'contact_zalo': 'Liên hệ qua Zalo',
            'visit_facebook': 'Truy cập Facebook',
            'voice': 'Giọng nói',  # Thêm dòng này
            'voice_clone': 'Clone Giọng',
            'voice_name': 'Tên giọng nói',
            'voice_id': 'ID Giọng nói',
            'add_to_library': 'Thêm vào thư viện',
            'voice_model': 'Mô hình giọng nói',
            'Output': 'Đầu ra',
            'change_voice_setting': 'Thay đổi cài đặt giọng nói',
            'speed': 'Tốc độ',
            'style': 'Phong cách',
            'stability': 'Độ ổn định',
            'speaker_boost': 'Tăng cường giọng nói',
            'similarity': 'Độ tương đồng',
            'status': 'Trạng thái',
            'thread': 'Luồng',
            'threads': 'Luồng',
            'folder': 'Thư mục',
            'options': 'Tùy chọn',
            'loop': 'Lặp',
            'auto_split': 'Tự động chia',
            'subtitles': 'Phụ đề (Hoàn thành: {0} Đang xử lý: {1} Tổng: {2}) Thời gian: {3}s',
            'start': 'Bắt đầu',
            'stop': 'Dừng',
            'import_file': 'Nhập tệp (*.srt;*.txt,*.dgt)',
            'import_folder': 'Nhập thư mục',
            'import_voice': 'Nhập giọng nói',
            'open_audio_output': 'Mở thư mục âm thanh',
            'join_mp3': 'Ghép Mp3 & SRT',
            'ready': 'Sẵn sàng',
            'main_tab': 'Elevenlabs',
            'api_config_tab': 'Cấu hình API',
            'about_tab': 'Giới thiệu',
            'delay_between_segments': 'Khoảng trễ giữa các đoạn',
            'silent_by_character': 'Im lặng theo ký tự',
            'character': 'Ký tự',
            'auto_remove_special_chars': 'Tự động xóa ký tự đặc biệt',
            'ok': 'OK',
            'apply': 'Áp dụng',
            'close': 'Đóng',
            'complete': 'Hoàn thành',
            'success': 'Thành công',
            'warning': 'Cảnh báo',
            'error': 'Lỗi',
            'import_audio_success': 'Đã nhập {0} tệp âm thanh thành công!',
            'no_api_key': 'Vui lòng nhập khóa API và tìm kiếm giọng nói!',
            'no_voice': 'Vui lòng chọn một giọng nói!',
            'no_subtitles': 'Vui lòng nhập phụ đề!',
            'pydub_error': 'pydub chưa được cài đặt!\nCài đặt bằng: pip install pydub',
            'no_files_to_join': 'Không có tệp để ghép!',
            'output_not_found': 'Không tìm thấy thư mục đầu ra!',
            'invalid_folder': 'Vui lòng chọn một thư mục hợp lệ!',
            'voice_added': 'Cấu hình giọng nói đã được thêm vào thư viện!',
            'voice_library_empty': 'Thư viện giọng nói trống!',
            'voice_import_soon': 'Tính năng nhập giọng nói sắp ra mắt!',
            'api_key_saved': 'Khóa API đã được lưu thành công!',
            'api_key_deleted': 'Khóa API đã được xóa thành công!',
            'no_api_key_provided': 'Chưa cung cấp khóa API',
            'connection_success': 'Kết nối thành công',
            'connection_failed': 'Kết nối thất bại',
            'settings_saved': 'Tất cả cài đặt đã được lưu thành công!',
            'mp3_joined': 'Đã ghép {0} tệp MP3 thành công!',
            'no_mp3_found': 'Không tìm thấy tệp MP3 để ghép!',
            'tool_intro_text': (
                "Elevenlabs_Pro_Tool là ứng dụng chuyển văn bản thành giọng nói mạnh mẽ tích hợp với ElevenLabs API. "
                "Chỉ cần xác thực Voice ID, nhập file văn bản và tạo âm thanh chất lượng cao với cài đặt giọng nói tùy chỉnh. "
                "Có tính năng quản lý thư viện giọng nói, tạo phụ đề và ghép âm thanh. Phiên bản 3.0."
            ),
            'tool_functions_text': (
                "• Xác thực Voice ID với tích hợp ElevenLabs API\n"
                "• Hỗ trợ 6 mô hình giọng nói (eleven_monolingual_v1, eleven_multilingual_v2, eleven_turbo_v2, eleven_turbo_v2_5, eleven_flash_v2, eleven_v3)\n"
                "• Nhập file Text/SRT với tính năng tự động chia và lặp\n"
                "• Thư viện giọng nói với preset tùy chỉnh (tốc độ, độ ổn định, độ tương đồng, phong cách, tăng cường giọng nói)\n"
                "• Xử lý đa luồng để tạo âm thanh hiệu quả\n"
                "• Ghép âm thanh với độ trễ và ký tự im lặng tùy chỉnh\n"
                "• Tạo phụ đề SRT với thời gian chính xác\n"
                "• Giao diện đa ngôn ngữ (Tiếng Anh, Tiếng Việt, Urdu, Hindi, Bengali)"
            ),
            'usage_guide_text': (
                "1. Xác thực khóa API ElevenLabs tích hợp trong tab 'Cấu hình API'\n"
                "2. Nhập Voice ID và nhấn 'Tìm kiếm' để xác thực\n"
                "3. Chọn mô hình giọng nói và điều chỉnh cài đặt (tốc độ, độ ổn định, v.v.)\n"
                "4. Nhập file text/SRT hoặc thư mục bằng các nút Import\n"
                "5. Nhấn 'Bắt đầu' để bắt đầu tạo âm thanh\n"
                "6. Dùng 'Ghép Mp3' để kết hợp các file âm thanh đã tạo"
            ),
            'contact_text': (
                "• Zalo: 0353633663\n"
                "• Facebook: https://www.facebook.com/61578186428817"
            ),
            'credits_amount': 'Số Credits',
            'price': 'Giá',
            'voice_duration': 'Thời lượng giọng nói',
            'usage_period': 'Thời hạn sử dụng',
            'unlimited': 'Không giới hạn',
            'rate': 'Tỷ lệ',
            'no_refund': 'Lưu ý: Không hoàn tiền',
            'processing_complete': 'Xử lý hoàn tất! Đã xử lý {0} tệp.',
            'language': 'Ngôn ngữ',
            'file_exists_overwrite': 'File đầu ra đã tồn tại. Bạn có muốn ghi đè không?',
            'delete_items_confirm': 'Xóa {0} mục?',
            'audio_files_count': 'File âm thanh: {0}',
            'checking_voice': 'Đang kiểm tra giọng nói',
            'generating_audio': 'Đang tạo âm thanh',
            'downloading': 'Đang tải về',
            'error_try_again': 'Lỗi. Thử lại',
            'api_timeout_detail': 'Yêu cầu API hết thời gian chờ. Vui lòng kiểm tra mạng hoặc tăng thời gian chờ.',
            'no_valid_mp3_files': 'Không tìm thấy file MP3 hợp lệ (ví dụ: 1.mp3, 2.mp3, ...) trong thư mục!',
            'minimax_tab': 'Minimax',
            'minimax_intro': 'Tích hợp Minimax AI',
            'minimax_description': 'Chuyển văn bản thành giọng nói tiên tiến với công nghệ Minimax AI'
        }
    }


class SubtitleItem:
    """Represents a single subtitle entry"""

    def __init__(self, id, text, output_name="", voice_number="", timing=""):
        self.id = id
        self.text = text
        self.output_name = output_name or str(id)
        self.voice_number = voice_number
        self.timing = timing  # Thêm dòng này
        self.is_processed = False
        self.status = ""
        self.duration = 0
        self.word_timings = []


class VoicePreset:
    """Voice preset configuration"""

    def __init__(self, name, voice_id, voice_name, model_id, settings):
        self.name = name
        self.voice_id = voice_id
        self.voice_name = voice_name
        self.model_id = model_id
        self.settings = settings
        self.local_id = ""
        self.project = ""  # Thêm thuộc tính project

# Thêm hàm helper này


def get_voice_by_local_id(voice_presets, local_id):
    """Tìm voice preset theo Local ID"""
    try:
        index = int(local_id) - 1  # Local ID bắt đầu từ 1, index từ 0
        if 0 <= index < len(voice_presets):
            return voice_presets[index]
    except (ValueError, IndexError):
        pass
    return None


class ElevenLabsAPI:
    BASE_URL = "https://api.kingcongstudio.com"

    def __init__(self, api_key, timeout=30):
        self.api_key = api_key
        self.timeout = timeout
        self.headers = {
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }

    def text_to_speech(
            self,
            text,
            voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=None,
            with_transcript=False):
        # Tạo data cơ bản
        data = {
            "text": text,
            "model_id": model_id,
            "with_transcript": with_transcript
        }

        # Chỉ thêm voice_settings nếu model KHÔNG phải eleven_v3
        if model_id != "eleven_v3":
            if voice_settings is None:
                voice_settings = {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "speed": 1.0,
                    "use_speaker_boost": False
                }

            data["voice_settings"] = {
                "stability": voice_settings.get(
                    "stability", 0.5), "similarity_boost": voice_settings.get(
                    "similarity_boost", 0.75), "style": voice_settings.get(
                    "style", 0.0), "speed": voice_settings.get(
                    "speed", 1.0), "use_speaker_boost": voice_settings.get(
                        "use_speaker_boost", False)}

        try:
            response = requests.post(
                f"{self.BASE_URL}/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
                json=data,
                headers=self.headers,
                timeout=self.timeout
            )

            # Kiểm tra trạng thái phản hồi
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    if isinstance(
                            response_data,
                            dict) and response_data.get(
                            'success',
                            False):
                        task_id = response_data.get('task_id')
                        remaining_credits = response_data.get(
                            'ec_remain_credits', 'Unknown')
                        return task_id, remaining_credits
                except ValueError:
                    print(f"Warning: API returned non-JSON response")
                    return None, None

            print(f"API Error: {response.status_code} - {response.text}")
            # Trả về thông tin lỗi chi tiết
            if response.status_code == 400:
                return None, None, "maintenance"
            else:
                return None, None, "other_error"

        except requests.exceptions.ConnectionError:
            print("Connection error in text_to_speech")
            return None, None
        except requests.exceptions.Timeout:
            print("Timeout error in text_to_speech")
            return None, None
        except Exception as e:
            print("API error in text_to_speech")
            return None, None

    def get_task(self, task_id):
        """Retrieve task details by task ID"""
        try:
            response = requests.get(
                f"{self.BASE_URL}/v1/task/{task_id}",
                headers=self.headers,
                timeout=60
            )
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'done':
                    metadata = result.get('metadata', {})
                    return metadata.get('audio_url'), result.get(
                        'credit_cost', 0), metadata.get('srt_url'), 100
                elif result.get('status') == 'error':
                    error_message = result.get(
                        'error_message', 'Unknown error')
                    print(f"Task Error: {error_message}")
                    # Trả về -1 để báo hiệu lỗi không khôi phục (bao gồm
                    # content_against_policy, tts_chunk_error, etc.)
                    return None, None, None, -1
                else:
                    # Task still processing - get progress
                    # SỬA: Default = 0 thay vì None
                    progress = result.get('progress', 0)
                    if progress is None:  # SỬA: Kiểm tra thêm None
                        progress = 0
                    return None, None, None, progress
            else:
                print(f"API Error: {response.status_code} - {response.text}")
                return None, None, None, 0
        except Exception as e:
            print("API request failed")
            return None, None, None, 0

    def search_voice_by_id(self, voice_id):
        """Search voice by ID using both /v2/voices and /v1/shared-voices endpoints"""
        try:
            # Tìm trong personal voices trước
            response = requests.get(
                f"{self.BASE_URL}/v2/voices",
                headers={"xi-api-key": self.api_key},
                params={"search": voice_id, "page_size": 50},
                timeout=self.timeout
            )

            if response.status_code == 200:
                data = response.json()
                voices = data.get('voices', [])
                for voice in voices:
                    if voice.get('voice_id') == voice_id:
                        return voice.get('name', '')

            # Nếu không tìm thấy, tìm trong shared voices
            response = requests.get(
                f"{self.BASE_URL}/v1/shared-voices",
                headers={"xi-api-key": self.api_key},
                params={"search": voice_id, "page_size": 50},
                timeout=self.timeout
            )

            if response.status_code == 200:
                data = response.json()
                voices = data.get('voices', [])
                for voice in voices:
                    if voice.get('voice_id') == voice_id:
                        return voice.get('name', '')

            return None
        except requests.exceptions.ConnectionError:
            print("Connection error searching voice")
            return None
        except requests.exceptions.Timeout:
            print("Timeout error searching voice")
            return None
        except Exception as e:
            print("Error searching voice")
            return None

    def get_user_subscription(self):
        """Get user credits by calling a test TTS request"""
        try:
            data = {
                "text": "x",
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "speed": 1.0,
                    "use_speaker_boost": False
                }
            }

            response = requests.post(
                f"{self.BASE_URL}/v1/text-to-speech/pNInz6obpgDQGcFmaJgB?output_format=mp3_44100_128",
                json=data,
                headers=self.headers,
                timeout=self.timeout
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return {
                        'username': 'ElevenLabs User',
                        'remaining_credits': result.get(
                            'ec_remain_credits',
                            'Unknown')}
            return None
        except Exception as e:
            return None


def ensure_config_exists():
    """Đảm bảo file config.json tồn tại, nếu không thì tạo mới"""
    app_dir = get_app_path()
    config_file = os.path.join(app_dir, "config.json")

    print(f"Checking config at: {config_file}")

    if not os.path.exists(config_file):
        default_config = {
            'voice_presets': [],
            'advanced_settings': {
                'is_delay_join': True,
                'delay_join_time': 1.0,
                'is_auto_silent_char': False,
                'is_auto_replace_symbol': False,
                'text1': ',;',
                'text1_time': 0.3,
                'text2': '.:?!',
                'text2_time': 0.5,
                'max_length': 10000,
                'request_timeout': 120
            },
            'proxy_settings': {
                'thread': 3,
            },
            'language': 'en'
        }

        try:
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=4, ensure_ascii=False)
            print(f"Created default config.json at: {config_file}")
            return True
        except Exception as e:
            print(f"Error creating config.json: {str(e)}")
            return False
    return True


class MinimaxAPI:
    BASE_URL = "https://api.kingcongstudio.com"

    def __init__(self, api_key, timeout=30):
        self.api_key = api_key
        self.timeout = timeout
        self.headers = {
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }

    def text_to_speech(
            self,
            text,
            voice_id,
            model_id="speech-2.5-hd-preview",
            voice_settings=None,
            language_boost="Auto",
            with_transcript=False):
        """Convert text to speech using Minimax API"""
        if voice_settings is None:
            voice_settings = {"speed": 1.0, "pitch": 0, "volume": 1.0}

        data = {
            "text": text,
            "model": model_id,
            "voice_setting": {
                "voice_id": voice_id,
                "vol": max(0.5, min(2.0, voice_settings.get("volume", 1.0))),
                "pitch": max(-12, min(12, voice_settings.get("pitch", 0))),
                "speed": max(0.01, min(10.00, voice_settings.get("speed", 1.0)))
            },
            "language_boost": language_boost,
            "with_transcript": with_transcript
        }

        try:
            response = requests.post(
                f"{self.BASE_URL}/v1m/task/text-to-speech",
                json=data,
                headers=self.headers,
                timeout=self.timeout
            )
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    task_id = result.get('task_id')
                    remaining_credits = result.get(
                        'ec_remain_credits', 'Unknown')
                    return task_id, remaining_credits, None
                else:
                    return None, None, "api_error"
            else:
                if response.status_code == 400:
                    return None, None, "maintenance"
                else:
                    return None, None, "other_error"

        except Exception as e:
            return None, None, "network_error"

    def get_task(self, task_id):
        """Retrieve task details by task ID"""
        try:
            response = requests.get(
                f"{self.BASE_URL}/v1/task/{task_id}",
                headers=self.headers,
                timeout=60
            )

            if response.status_code == 200:
                try:
                    result = response.json()
                    status = result.get('status', 'unknown')

                    if status == 'done':
                        metadata = result.get('metadata', {})
                        audio_url = metadata.get('audio_url')
                        credit_cost = result.get('credit_cost', 0)
                        srt_url = metadata.get('srt_url')
                        return audio_url, credit_cost, srt_url, 100

                    elif status == 'error':
                        return None, None, None, -1

                    else:  # processing
                        progress = result.get('progress', 0)
                        if progress is None:
                            progress = 0
                        try:
                            progress = int(float(progress))
                            progress = max(0, min(100, progress))
                        except (ValueError, TypeError):
                            progress = 0
                        return None, None, None, progress

                except ValueError:
                    return None, None, None, 0

            else:
                return None, None, None, 0

        except Exception:
            return None, None, None, 0

    def get_voice_list(self, page=1, page_size=50, tag_list=None):
        """Get voice list with filters"""
        data = {
            "page": page,
            "page_size": page_size,
            "tag_list": tag_list or []
        }

        try:
            response = requests.post(
                f"{self.BASE_URL}/v1m/voice/list",
                json=data,
                headers=self.headers,
                timeout=self.timeout
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return result.get('data', {})
            return None
        except Exception:
            return None

    def get_user_subscription(self):
        """Get user credits"""
        try:
            data = {
                "text": "x",
                "model": "speech-2.5-turbo-preview",
                "voice_setting": {
                    "voice_id": "226893671006276",
                    "vol": 1,
                    "pitch": 0,
                    "speed": 1
                },
                "language_boost": "Auto",
                "with_transcript": False
            }

            response = requests.post(
                f"{self.BASE_URL}/v1m/task/text-to-speech",
                json=data,
                headers=self.headers,
                timeout=self.timeout
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return {
                        'username': 'Minimax User',
                        'remaining_credits': result.get(
                            'ec_remain_credits',
                            'Unknown')}
            return None
        except Exception:
            return None


class TTSApp:
    _ENCRYPTED_API = "sk_9geumg7l9v9x5gchkwb8y7igf7oe8bqagi25rjbryn75f6z7"

    def __init__(self, root):
        self.root = root
        self.root.title("Server AI Tool KingCong V1.0")
        self.root.geometry("1470x680")

        # Khởi tạo ngôn ngữ trước
        self.current_language = 'en'
        self.languages = get_language_dict()

        # Thiết lập giao diện chính
        self.setup_main_window()

        # Hiển thị cửa sổ chính ngay lập tức
        self.root.deiconify()

    def update_credits_display(self, credits):
        """Update credits display in API tab"""
        if hasattr(self, 'credits_label'):
            lang = self.languages[self.current_language]
            # Format number with commas for readability
            if isinstance(
                credits,
                int) or (
                isinstance(
                    credits,
                    str) and credits.isdigit()):
                formatted_credits = f"{int(credits):,}"
            else:
                formatted_credits = str(credits)
            self.credits_label.config(
                text=f"{lang['credits']}: {formatted_credits}")
            if hasattr(self, 'usage_label'):
                self.usage_label.config(
                    text=f"{
                        lang['usage_period']}: {
                        lang['unlimited']}")
            self.last_credits = formatted_credits
            # Save to config immediately
            self.save_config()

    def setup_main_window(self):
        """Thiết lập cửa sổ chính"""
        print("DEBUG: Bắt đầu khởi tạo TTSApp")

        # Đảm bảo config.json tồn tại
        ensure_config_exists()

        # Tạo các folder output cố định
        app_dir = get_app_path()
        folders = [
            "ImportFile",
            "ImportFolder",
            "ImportVoice",
            "DownloadFolder"]
        for folder_name in folders:
            folder_path = os.path.join(app_dir, folder_name)
            os.makedirs(folder_path, exist_ok=True)

        # Khởi tạo biến languages trước
        self.current_language = 'en'
        self.languages = get_language_dict()

        # Khởi tạo giao diện chính trực tiếp
        self.setup_ui()

        # Đặt status sau khi setup_ui hoàn thành
        lang = self.languages[self.current_language]
        self.status_var.set(lang['ready'])

    def setup_ui(self):
        """Khởi tạo giao diện chính của ứng dụng"""
        self.root.title("Server AI Tool KingCong V1.0")

        # Configure style
        self.style = ttk.Style()
        self.style.theme_use('clam')

        # Configure font for non-Latin languages
        self.style.configure('TLabel', font=('Noto Sans Devanagari', 10))
        self.style.configure('TButton', font=('Noto Sans Devanagari', 10))
        self.style.configure(
            'Small.TButton', font=(
                'Noto Sans Devanagari', 8), padding=2)
        self.style.configure('TCheckbutton', font=('Noto Sans Devanagari', 10))
        self.style.configure('TEntry', font=('Noto Sans Devanagari', 10))
        self.style.configure('TCombobox', font=('Noto Sans Devanagari', 10))
        self.style.configure(
            'Treeview.Heading', font=(
                'Noto Sans Devanagari', 10))
        self.style.configure('Treeview', font=('Noto Sans Devanagari', 10))

        # Configure style for status labels
        self.style.configure('Success.TLabel', foreground='green')
        self.style.configure('Error.TLabel', foreground='red')
        self.style.configure('Warning.TLabel', foreground='orange')

        # Configure style for error warning status bar
        self.style.configure('ErrorWarning.TLabel',
                             foreground='white',
                             background='#DC3545',
                             font=('Arial', 9, 'bold'),
                             padding=5)

        # Variables
        self.api_key = self._ENCRYPTED_API  # Sử dụng API key cứng
        self.subtitles = []
        self.project_dir = ""
        self.audio_dir = ""
        self.is_running = False
        self.start_time = time.time()
        self.processed_count = 0
        self.voice_presets = []
        self.audio_files = []
        self.current_voice_id = None  # THÊM DÒNG NÀY

        # Configuration variables for advanced settings
        self.is_delay_join = tk.BooleanVar(value=True)
        self.delay_join_time = tk.DoubleVar(value=1.0)
        self.is_auto_silent_char = tk.BooleanVar(value=False)
        self.is_auto_replace_symbol = tk.BooleanVar(value=False)
        self.text1 = tk.StringVar(value=",;")
        self.text1_time = tk.DoubleVar(value=0.3)
        self.text2 = tk.StringVar(value=".:?!")
        self.text2_time = tk.DoubleVar(value=0.5)
        self.max_length_var = tk.IntVar(value=10000)

        # Proxy variables
        self.thread_var = tk.IntVar(value=3)

        # Language dictionary for multilingual support
        self.language_var = tk.StringVar(value="English")

        # Initialize timeout_var before loading config
        self.timeout_var = tk.IntVar(value=120)

        # THÊM 2 DÒNG NÀY: Khởi tạo loop_var và auto_split_var trước khi load
        # config
        self.loop_var = tk.BooleanVar(value=False)
        self.auto_split_var = tk.BooleanVar(value=False)
        self.auto_srt_var = tk.BooleanVar(value=False)
        self.one_line_one_file_var = tk.BooleanVar(value=False)

        # Khởi tạo status_var trước khi gọi update_ui_language
        self.status_var = tk.StringVar(value="Ready")
        self.last_credits = 'Not checked'

        # Create notebook for tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True)

        # Main tab
        self.main_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.main_frame, text="Elevenlabs")

        # THÊM TAB MINIMAX Ở ĐÂY
        self.minimax_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.minimax_frame, text="Minimax")

        # API Configuration tab
        self.api_config_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.api_config_frame, text="API Configuration")

        # About tab
        self.about_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.about_frame, text="About")

        # Call methods to set up the UI
        self.load_config()  # Load config TRƯỚC KHI tạo UI
        self.create_widgets()
        self.setup_minimax_tab()
        self.setup_api_tab()
        self.setup_about_tab()
        # Set language UI after loading config
        if hasattr(self, 'language_var'):
            self.language_var.set(
                "English" if self.current_language == 'en' else "Tiếng Việt")
        self.update_ui_language()

    def create_widgets(self):
        """Create all UI widgets for Main tab"""
        lang = self.languages[self.current_language]  # Thêm dòng này

        # Top section - Voice, Change voice setting
        voice_frame = ttk.LabelFrame(
            self.main_frame,
            text=lang['voice'],
            padding="10")
        voice_frame.grid(row=0, column=0, padx=2, pady=5, sticky="w")

        change_voice_frame = ttk.LabelFrame(
            self.main_frame,
            text=lang['change_voice_setting'],
            padding="10")
        change_voice_frame.grid(row=0, column=1, padx=2, pady=5, sticky="w")

        # Voice section
        ttk.Label(
            voice_frame,
            text=lang['voice_id']).grid(
            row=0,
            column=0,
            sticky=tk.E,
            padx=5,
            pady=2)
        self.name_var = tk.StringVar()
        name_entry = ttk.Entry(
            voice_frame,
            textvariable=self.name_var,
            width=28)
        name_entry.grid(row=0, column=1, padx=5, pady=2)
        ttk.Button(
            voice_frame,
            text="Search",
            command=self.search_voices,
            width=17).grid(
            row=0,
            column=2,
            padx=5,
            pady=1)

        ttk.Label(
            voice_frame,
            text=lang['voice_name']).grid(
            row=1,
            column=0,
            sticky=tk.E,
            padx=5,
            pady=2)
        self.voice_name_var = tk.StringVar()
        self.voice_name_combo = ttk.Combobox(
            voice_frame,
            textvariable=self.voice_name_var,
            width=25,
            state="readonly")
        self.voice_name_combo.grid(
            row=1, column=1, padx=5, pady=2, sticky=tk.W)
        ttk.Button(
            voice_frame,
            text=lang['add_to_library'],
            command=self.add_to_library,
            width=17).grid(
            row=1,
            column=2,
            padx=5,
            pady=1)

        ttk.Label(
            voice_frame,
            text=lang['voice_model']).grid(
            row=2,
            column=0,
            sticky=tk.E,
            padx=5,
            pady=2)
        self.model_var = tk.StringVar(value="eleven_multilingual_v2")
        self.model_combo = ttk.Combobox(
            voice_frame,
            textvariable=self.model_var,
            width=25,
            state="readonly")
        self.model_combo['values'] = [
            "eleven_v3",
            "eleven_multilingual_v2",
            "eleven_turbo_v2_5",
            "eleven_flash_v2_5",
            "eleven_flash_v2",
            "eleven_turbo_v2"
        ]
        self.model_combo.grid(row=2, column=1, padx=5, pady=2)
        # Bind model change event
        self.model_var.trace_add('write', self.on_model_change)
        ttk.Button(
            voice_frame,
            text=lang['voice_library'],
            command=self.show_library,
            width=17).grid(
            row=2,
            column=2,
            padx=5,
            pady=1)

        # Change voice setting section
        self.change_settings_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            change_voice_frame,
            text=lang['change_voice_setting'],
            variable=self.change_settings_var).grid(
            row=0,
            column=0,
            columnspan=4)

        ttk.Label(
            change_voice_frame,
            text=lang['speed']).grid(
            row=1,
            column=0,
            sticky=tk.W)
        self.speed_var = tk.DoubleVar(value=1.0)
        speed_spin = ttk.Spinbox(
            change_voice_frame,
            from_=0.7,
            to=1.2,
            increment=0.05,
            textvariable=self.speed_var,
            width=10)
        speed_spin.grid(row=1, column=1)
        ttk.Label(
            change_voice_frame,
            text=lang['style']).grid(
            row=1,
            column=2,
            sticky=tk.W,
            padx=(
                10,
                0))
        self.style_var = tk.IntVar(value=0)
        style_spin = ttk.Spinbox(change_voice_frame, from_=0, to=100,
                                 textvariable=self.style_var, width=10)
        style_spin.grid(row=1, column=3)
        ttk.Label(change_voice_frame, text="%").grid(row=1, column=4)

        ttk.Label(
            change_voice_frame,
            text=lang['stability']).grid(
            row=2,
            column=0,
            sticky=tk.W)
        self.stability_var = tk.IntVar(value=50)
        stability_spin = ttk.Spinbox(change_voice_frame, from_=0, to=100,
                                     textvariable=self.stability_var, width=10)
        stability_spin.grid(row=2, column=1)
        ttk.Label(change_voice_frame, text="%").grid(row=2, column=2)

        self.speaker_boost_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            change_voice_frame,
            text=lang['speaker_boost'],
            variable=self.speaker_boost_var).grid(
            row=2,
            column=3,
            columnspan=2)

        ttk.Label(
            change_voice_frame,
            text=lang['similarity']).grid(
            row=3,
            column=0,
            sticky=tk.W)
        self.similarity_var = tk.IntVar(value=75)
        similarity_spin = ttk.Spinbox(
            change_voice_frame,
            from_=0,
            to=100,
            textvariable=self.similarity_var,
            width=8)
        similarity_spin.grid(row=3, column=1)
        ttk.Label(change_voice_frame, text="%").grid(row=3, column=2)

        # Middle section - Options and Proxy
        options_frame = ttk.LabelFrame(
            self.main_frame, text=lang['options'], padding="10")
        options_frame.grid(row=0, column=2, padx=2, pady=5, sticky="w")

        threads_frame = ttk.LabelFrame(
            self.main_frame, text=lang['threads'], padding="10")
        threads_frame.grid(row=0, column=3, padx=2, pady=5, sticky="w")

        # Options section
        # Dòng 1: Loop -> Auto Split -> Entry
        ttk.Checkbutton(
            options_frame,
            text=lang['loop'],
            variable=self.loop_var).grid(
            row=0,
            column=0,
            sticky="w",
            padx=5)

        ttk.Checkbutton(
            options_frame,
            text=lang['auto_split'],
            variable=self.auto_split_var).grid(
            row=0,
            column=1,
            sticky="w",
            padx=5)

        self.split_chars_var = tk.StringVar(value="。、,:.!?")
        split_entry = ttk.Entry(
            options_frame,
            textvariable=self.split_chars_var,
            width=15)
        split_entry.grid(row=0, column=2, padx=5)

        # Dòng 2: Auto SRT -> 1 Line 1 File
        ttk.Checkbutton(
            options_frame,
            text=lang['auto_srt'],
            variable=self.auto_srt_var).grid(
            row=1,
            column=0,
            sticky="w",
            padx=5,
            pady=5)

        ttk.Checkbutton(
            options_frame,
            text=lang['one_line_one_file'],
            variable=self.one_line_one_file_var).grid(
            row=1,
            column=1,
            sticky="w",
            padx=5,
            pady=5)

        # Dòng 3: Advanced Settings
        ttk.Button(
            options_frame,
            text=lang['advanced_settings'],
            command=self.advanced_settings).grid(
            row=2,
            column=0,
            columnspan=3,
            pady=5,
            sticky="w",
            padx=5)

        # Threads section
        ttk.Label(
            threads_frame,
            text=lang['thread']).grid(
            row=0,
            column=0,
            sticky=tk.E,
            padx=5,
            pady=2)
        thread_spin = ttk.Spinbox(
            threads_frame,
            from_=1,
            to=20,
            textvariable=self.thread_var,
            width=15)
        thread_spin.grid(row=0, column=1, padx=5, pady=2)

        # Bottom section - Subtitles
        subtitle_frame = ttk.LabelFrame(
            self.main_frame, text=lang['subtitles'].format(
                0, 0, 0, 0), padding="5")
        subtitle_frame.grid(
            row=1, column=0, columnspan=4, sticky=(
                tk.W, tk.E, tk.N, tk.S), pady=5)
        subtitle_frame.columnconfigure(0, weight=1)
        subtitle_frame.rowconfigure(1, weight=1)
        self.subtitle_label = subtitle_frame

        # Control buttons
        button_frame = ttk.Frame(subtitle_frame)
        button_frame.grid(row=0, column=0, sticky=(tk.W, tk.E))

        self.start_btn = ttk.Button(
            button_frame,
            text=lang['start'],
            command=self.start_processing)
        self.start_btn.pack(side=tk.LEFT, padx=2)

        self.stop_btn = ttk.Button(
            button_frame,
            text=lang['stop'],
            command=self.stop_processing,
            state="disabled")
        self.stop_btn.pack(side=tk.LEFT, padx=2)

        ttk.Button(button_frame, text=lang['import_file'],
                   command=self.import_file).pack(side=tk.LEFT, padx=2)

        ttk.Button(button_frame, text=lang['import_folder'],
                   command=self.import_folder).pack(side=tk.LEFT, padx=2)

        ttk.Button(button_frame, text=lang['import_voice'],
                   command=self.import_voice).pack(side=tk.LEFT, padx=2)

        ttk.Button(button_frame, text=lang['open_audio_output'],
                   command=self.open_output).pack(side=tk.LEFT, padx=2)

        ttk.Button(button_frame, text=lang['join_mp3'],
                   command=self.join_mp3).pack(side=tk.LEFT, padx=2)

        ttk.Button(button_frame, text=lang['clear_all'],
                   command=self.clear_all).pack(side=tk.LEFT, padx=2)

        ttk.Button(button_frame, text=lang['backup'],
                   command=self.show_backup_tasks).pack(side=tk.LEFT, padx=2)

        # Subtitle table
        columns = ('ID', 'Output', 'Timing', 'Content', 'Voice', 'Status')
        self.subtitle_tree = ttk.Treeview(
            subtitle_frame, columns=columns, show='headings', height=15)

        # Define headings
        self.subtitle_tree.heading('ID', text=lang['id'])
        self.subtitle_tree.heading('Output', text=lang['Output'])
        self.subtitle_tree.heading('Timing', text=lang['timing'])
        self.subtitle_tree.heading('Content', text=lang['Content'])
        self.subtitle_tree.heading('Voice', text=lang['voice_column'])
        self.subtitle_tree.heading('Status', text=lang['status'])

        # Configure column widths và căn giữa
        self.subtitle_tree.column('ID', width=50, anchor='center')
        self.subtitle_tree.column('Output', width=100, anchor='center')
        self.subtitle_tree.column('Timing', width=100, anchor='center')
        self.subtitle_tree.column('Content', width=600, anchor='center')
        self.subtitle_tree.column('Voice', width=70, anchor='center')
        self.subtitle_tree.column('Status', width=200, anchor='center')

        # Scrollbar
        scrollbar = ttk.Scrollbar(
            subtitle_frame,
            orient='vertical',
            command=self.subtitle_tree.yview)
        self.subtitle_tree.configure(yscrollcommand=scrollbar.set)

        self.subtitle_tree.grid(
            row=1, column=0, sticky=(
                tk.W, tk.E, tk.N, tk.S))
        scrollbar.grid(row=1, column=1, sticky=(tk.N, tk.S))

        def on_subtitle_double_click(event):
            item = self.subtitle_tree.identify_row(event.y)
            column = self.subtitle_tree.identify_column(event.x)
            if not item or column not in ['#4', '#5']:
                return

            bbox = self.subtitle_tree.bbox(item, column)
            if not bbox:
                return

            values = self.subtitle_tree.item(item)['values']
            index = self.subtitle_tree.index(item)

            if column == '#4':  # Content column
                current_content = self.subtitles[index].text

                # Kiểm tra độ dài content
                if len(current_content) > 5000:
                    # Mở dialog riêng để edit
                    edit_window = tk.Toplevel(self.root)
                    edit_window.title("Edit Content")
                    edit_window.geometry("800x400")

                    text_frame = ttk.Frame(edit_window)
                    text_frame.pack(fill='both', expand=True, padx=10, pady=10)

                    text_widget = tk.Text(text_frame, wrap=tk.WORD)
                    scrollbar = ttk.Scrollbar(text_frame, command=text_widget.yview)
                    text_widget.configure(yscrollcommand=scrollbar.set)

                    text_widget.insert('1.0', current_content)
                    text_widget.pack(side='left', fill='both', expand=True)
                    scrollbar.pack(side='right', fill='y')

                    def save_large_edit():
                        new_value = text_widget.get('1.0', 'end-1c')
                        self.subtitles[index].text = new_value
                        self.subtitles[index].is_processed = False
                        self.subtitles[index].status = ""
                        self.refresh_subtitle_list(single_index=index)
                        edit_window.destroy()

                    ttk.Button(edit_window, text="Save", command=save_large_edit).pack(pady=5)
                    ttk.Button(edit_window, text="Cancel", command=edit_window.destroy).pack()

                else:
                    # Content nhỏ, dùng Entry
                    entry = ttk.Entry(self.subtitle_label)
                    entry.insert(0, current_content)
                    entry.place(x=bbox[0], y=bbox[1], width=bbox[2], height=bbox[3])
                    entry.focus()

                    def save_edit(e=None):
                        new_value = entry.get().strip()
                        try:
                            if len(new_value) > 1000:
                                raise ValueError("Nội dung không được vượt quá 1000 ký tự")
                            if not new_value:
                                raise ValueError("Nội dung không được để trống")
                            self.subtitles[index].text = new_value
                            self.subtitles[index].is_processed = False
                            self.subtitles[index].status = ""
                            self.refresh_subtitle_list(single_index=index)
                        except ValueError as ve:
                            messagebox.showerror(lang['error'], str(ve))
                        finally:
                            entry.destroy()

                    def cancel_edit(e=None):
                        entry.destroy()

                    entry.bind('<Return>', save_edit)
                    entry.bind('<Escape>', cancel_edit)
                    entry.bind('<FocusOut>', save_edit)

            elif column == '#5':  # Voice column
                current_voice = self.subtitles[index].voice_number
                entry = ttk.Entry(self.subtitle_label)
                entry.insert(0, current_voice)
                entry.place(x=bbox[0], y=bbox[1], width=bbox[2], height=bbox[3])
                entry.focus()

                def save_edit(e=None):
                    new_value = entry.get().strip()
                    try:
                        if new_value and not new_value.isdigit():
                            raise ValueError("Voice number phải là số")
                        self.subtitles[index].voice_number = new_value
                        self.subtitles[index].is_processed = False
                        self.subtitles[index].status = ""
                        self.refresh_subtitle_list(single_index=index)
                    except ValueError as ve:
                        messagebox.showerror(lang['error'], str(ve))
                    finally:
                        entry.destroy()

                def cancel_edit(e=None):
                    entry.destroy()

                entry.bind('<Return>', save_edit)
                entry.bind('<Escape>', cancel_edit)
                entry.bind('<FocusOut>', save_edit)

        self.subtitle_tree.bind('<Double-1>', on_subtitle_double_click)

        # Status bar
        self.status_var = tk.StringVar(value=lang['ready'])
        status_bar = ttk.Label(self.main_frame, textvariable=self.status_var, relief=tk.SUNKEN)
        status_bar.grid(row=2, column=0, columnspan=4, sticky=(tk.W, tk.E))
        
        # Warning bar
        self.warning_var = tk.StringVar(value="")
        self.warning_bar = ttk.Label(self.main_frame, textvariable=self.warning_var, relief=tk.SUNKEN)
        self.warning_bar.grid(row=3, column=0, columnspan=4, sticky=(tk.W, tk.E))
        
        self.warning_bar.bind('<Button-1>', self.on_status_bar_click)
        self.root.after(100, self.show_error_warning_status)
        
        # Add right-click context menu
        self.create_context_menu()
        self.subtitle_tree.bind('<Button-3>', self.show_context_menu)

        # Bind left click on root
        def on_root_click(event):
            if not self.subtitle_tree.winfo_containing(event.x_root, event.y_root) == self.subtitle_tree:
                self.subtitle_tree.selection_remove(self.subtitle_tree.selection())
        self.root.bind('<Button-1>', on_root_click)

    def on_model_change(self, *args):
        """Handle voice model change"""
        selected_model = self.model_var.get()
        
        if self.main_frame.grid_slaves(row=0, column=1):
            change_voice_frame = self.main_frame.grid_slaves(row=0, column=1)[0]
            state = 'disabled' if selected_model == 'eleven_v3' else 'normal'
            
            for widget in change_voice_frame.winfo_children():
                if isinstance(widget, (ttk.Checkbutton, ttk.Spinbox, ttk.Label)):
                    try:
                        widget.configure(state=state)
                    except:
                        pass
            
            if change_voice_frame.grid_slaves(row=0, column=0):
                change_voice_frame.grid_slaves(row=0, column=0)[0].configure(state=state)
    
    def create_context_menu(self):
        """Create right-click context menu"""
        lang = self.languages[self.current_language]
        self.context_menu = tk.Menu(self.root, tearoff=0)
        self.context_menu.add_command(label=lang['delete'], command=self.delete_selected_rows)

    def show_context_menu(self, event):
        """Show context menu on right-click"""
        item = self.subtitle_tree.identify_row(event.y)
        if item:
            if item not in self.subtitle_tree.selection():
                self.subtitle_tree.selection_set(item)
            self.context_menu.post(event.x_root, event.y_root)

    def delete_selected_rows(self):
        """Delete selected rows"""
        lang = self.languages[self.current_language]
        selected_items = self.subtitle_tree.selection()
        if not selected_items:
            return
        
        if messagebox.askyesno(lang['delete'], f"Delete {len(selected_items)} selected item(s)?"):
            indices_to_delete = []
            for item in selected_items:
                index = self.subtitle_tree.index(item)
                indices_to_delete.append(index)
            
            indices_to_delete.sort(reverse=True)
            
            if hasattr(self, 'audio_files') and self.audio_files:
                for index in indices_to_delete:
                    if index < len(self.audio_files):
                        del self.audio_files[index]
                
                for item in self.subtitle_tree.get_children():
                    self.subtitle_tree.delete(item)
                
                for i, audio_path in enumerate(self.audio_files):
                    self.subtitle_tree.insert('', 'end', values=(
                        i + 1, os.path.basename(audio_path), "00:00:00", "", "", "Imported"
                    ))
            else:
                for index in indices_to_delete:
                    if index < len(self.subtitles):
                        del self.subtitles[index]
                self.refresh_subtitle_list()
            
            if hasattr(self, 'audio_files') and self.audio_files:
                self.status_var.set(lang['audio_files_count'].format(len(self.audio_files)))
            else:
                self.status_var.set(lang['subtitles_loaded'].format(len(self.subtitles)))

    def on_subtitle_double_click(self, event):
        item = self.subtitle_tree.identify_row(event.y)
        column = self.subtitle_tree.identify_column(event.x)
        print(f"DEBUG: Clicked column: {column}")
        if not item or column not in [
                '#2', '#4', '#5']:  # Thêm #2 cho cột Output
            print(f"DEBUG: Column {column} not editable")
            return

        bbox = self.subtitle_tree.bbox(item, column)
        if not bbox:
            return

        values = self.subtitle_tree.item(item)['values']
        index = self.subtitle_tree.index(item)

        if column == '#4':  # Content column - LUÔN mở cửa sổ mới
            current_content = self.subtitles[index].text

            # Mở dialog để edit
            edit_window = tk.Toplevel(self.root)
            edit_window.title(f"Edit Content - ID {values[0]}")
            edit_window.geometry("800x500")

            # Frame chính
            main_frame = ttk.Frame(edit_window, padding="10")
            main_frame.pack(fill='both', expand=True)

            # Label hiển thị thông tin
            info_label = ttk.Label(
                main_frame, text=f"Subtitle ID: {
                    values[0]} | Content length: {
                    len(current_content):,} characters")
            info_label.pack(anchor='w', pady=(0, 5))

            # Text widget với scrollbar
            text_frame = ttk.Frame(main_frame)
            text_frame.pack(fill='both', expand=True)

            text_widget = tk.Text(
                text_frame, wrap=tk.WORD, width=80, height=20)
            scrollbar = ttk.Scrollbar(
                text_frame, command=text_widget.yview)
            text_widget.configure(yscrollcommand=scrollbar.set)

            text_widget.insert('1.0', current_content)
            text_widget.pack(side='left', fill='both', expand=True)
            scrollbar.pack(side='right', fill='y')

            # Button frame
            button_frame = ttk.Frame(main_frame)
            button_frame.pack(fill='x', pady=(10, 0))

            def save_content():
                new_value = text_widget.get('1.0', 'end-1c').strip()
                if not new_value:
                    messagebox.showerror(
                        lang['error'], "Nội dung không được để trống")
                    return
                self.subtitles[index].text = new_value
                self.subtitles[index].is_processed = False
                self.subtitles[index].status = ""
                self.refresh_subtitle_list(single_index=index)
                edit_window.destroy()

            ttk.Button(
                button_frame,
                text="Save",
                command=save_content).pack(
                side='left',
                padx=5)
            ttk.Button(
                button_frame,
                text="Cancel",
                command=edit_window.destroy).pack(
                side='left')

            # Bind phím tắt
            edit_window.bind('<Control-s>', lambda e: save_content())
            edit_window.bind(
                '<Escape>', lambda e: edit_window.destroy())

            # Focus và select all
            text_widget.focus()
            text_widget.tag_add('sel', '1.0', 'end')

        elif column == '#5':  # Voice column - giữ nguyên edit trực tiếp
            current_voice = self.subtitles[index].voice_number
            entry = ttk.Entry(self.subtitle_label)
            entry.insert(0, current_voice)
            entry.place(
                x=bbox[0],
                y=bbox[1],
                width=bbox[2],
                height=bbox[3])
            entry.focus()

            def save_edit(e=None):
                new_value = entry.get().strip()
                try:
                    if new_value and not new_value.isdigit():
                        raise ValueError("Voice number phải là số")
                    self.subtitles[index].voice_number = new_value
                    self.subtitles[index].is_processed = False
                    self.subtitles[index].status = ""
                    self.refresh_subtitle_list(single_index=index)
                except ValueError as ve:
                    messagebox.showerror(lang['error'], str(ve))
                finally:
                    entry.destroy()

            def cancel_edit(e=None):
                entry.destroy()

            entry.bind('<Return>', save_edit)
            entry.bind('<Escape>', cancel_edit)
            entry.bind('<FocusOut>', save_edit)

        elif column == '#2':  # Output column
            current_output = self.subtitles[index].output_name
            entry = ttk.Entry(self.subtitle_label)
            entry.insert(0, current_output)
            entry.place(
                x=bbox[0],
                y=bbox[1],
                width=bbox[2],
                height=bbox[3])
            entry.focus()

            def save_output_edit(e=None):
                new_value = entry.get().strip()
                try:
                    if not new_value:
                        raise ValueError(
                            "Output name không được để trống")
                    self.subtitles[index].output_name = new_value
                    self.subtitles[index].is_processed = False
                    self.subtitles[index].status = ""
                    self.refresh_subtitle_list(single_index=index)
                except ValueError as ve:
                    messagebox.showerror(lang['error'], str(ve))
                finally:
                    entry.destroy()

            def cancel_output_edit(e=None):
                entry.destroy()

            entry.bind('<Return>', save_output_edit)
            entry.bind('<Escape>', cancel_output_edit)
            entry.bind('<FocusOut>', save_output_edit)

    def setup_api_tab(self):
        style = ttk.Style()
        bg_color = style.lookup('TFrame', 'background')

        canvas = tk.Canvas(
            self.api_config_frame,
            bg=bg_color,
            highlightthickness=0)
        scrollbar = ttk.Scrollbar(
            self.api_config_frame,
            orient="vertical",
            command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window(
            (0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        main_frame = ttk.Frame(scrollable_frame, padding="15")
        main_frame.pack(fill='both', expand=True)

        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill='x', pady=(0, 15))

        ttk.Label(header_frame,
                  text="API Key Management",
                  style='Title.TLabel').pack()

        self.test_buttons = {}
        self.status_labels = {}

        self.api_docs = {
            'elevenlabs': 'https://elevenlabs.io/docs/api-reference'
        }

        provider_key = 'elevenlabs'
        api_config = {
            'name': 'Elevenlabs_Pro',
            'icon': '🎙️',
            'models': {
                'tts': [
                    'eleven_monolingual_v1',
                    'eleven_multilingual_v2',
                    'eleven_turbo_v2',
                    'eleven_turbo_v2_5',
                    'eleven_flash_v2',
                    'eleven_flash_v2_5',
                    'eleven_v3']}}
        provider_frame = ttk.LabelFrame(
            main_frame, text=f"{
                api_config['icon']} {
                api_config['name']}", padding="15")
        provider_frame.pack(fill='x', pady=(0, 15))

        content_frame = ttk.Frame(provider_frame)
        content_frame.pack(fill='both', expand=True)

        key_frame = ttk.Frame(content_frame)
        key_frame.pack(fill='x', pady=(0, 10))

        # SỬA: Chỉ hiển thị trạng thái API key, không có entry field
        ttk.Label(key_frame,
                  text="API Key Status:",
                  width=15).pack(side='left')

        self.test_connection_btn = ttk.Button(key_frame,
                                              text=self.languages[self.current_language]['test_connection'],
                                              command=lambda p=provider_key: self.test_connection(p))
        self.test_connection_btn.pack(side='left', padx=10)

        info_frame = ttk.Frame(content_frame)
        info_frame.pack(fill='x')

        status_label = ttk.Label(info_frame,
                                 text="API Key Integrated",
                                 font=('Arial', 9))
        status_label.pack(side='left')
        self.status_labels[provider_key] = status_label

        adv_frame = ttk.LabelFrame(main_frame,
                                   text=self.languages[self.current_language]['advanced_settings'],
                                   padding="15")
        adv_frame.pack(fill='x', pady=(15, 0))

        timeout_frame = ttk.Frame(adv_frame)
        timeout_frame.pack(fill='x', pady=(0, 10))
        ttk.Label(timeout_frame,
                  text=self.languages[self.current_language]['request_timeout']).pack(side='left')
        self.timeout_var = tk.IntVar(value=120)
        ttk.Spinbox(
            timeout_frame,
            from_=10,
            to=300,
            textvariable=self.timeout_var,
            width=10).pack(
            side='left',
            padx=(
                10,
                0))

        save_all_btn = ttk.Button(timeout_frame,
                                  text=self.languages[self.current_language]['save_all'],
                                  command=self.save_all_settings)
        save_all_btn.pack(side='left', padx=(10, 0))

        language_menu = ttk.OptionMenu(timeout_frame,
                                       self.language_var,
                                       "English",
                                       "English",
                                       "Tiếng Việt",
                                       command=self.switch_language)
        language_menu.pack(side='left', padx=(10, 0))

        # Set language from config after UI is created
        if hasattr(self, 'language_var'):
            language_map = {
                'English': 'en',
                'Tiếng Việt': 'vi'
            }
            self.language_var.set(
                language_map.get(
                    self.current_language,
                    'English'))

        # Credits Display section
        lang = self.languages[self.current_language]
        credits_frame = ttk.LabelFrame(main_frame,
                                       text="API Credits",
                                       padding="15")
        credits_frame.pack(fill='x', pady=(15, 0))

        # Display saved credits or default
        saved_credits = getattr(self, 'last_credits', 'Not checked')
        self.credits_label = ttk.Label(
            credits_frame, text=f"{
                lang['credits']}: {saved_credits}", font=(
                'Arial', 12, 'bold'))
        self.credits_label.pack(pady=5)

        # Usage Period label
        self.usage_label = ttk.Label(
            credits_frame, text=f"{
                lang['usage_period']}: {
                lang['unlimited']}", font=(
                'Arial', 10))
        self.usage_label.pack(pady=5)

        # Server Status label
        self.server_status_label = ttk.Label(
            credits_frame, text=f"{
                lang['server_status']}: Unknown", font=(
                'Arial', 10))
        self.server_status_label.pack(pady=5)

        # Check Credits & Server button
        self.check_credits_btn = ttk.Button(
            credits_frame,
            text=lang['check_credits_server'],
            command=self.check_credits_and_server)
        self.check_credits_btn.pack(pady=10)

    def setup_about_tab(self):
        """Setup the About tab"""
        lang = self.languages[self.current_language]  # Thêm dòng này
        style = ttk.Style()
        bg_color = style.lookup('TFrame', 'background')

        canvas = tk.Canvas(
            self.about_frame,
            bg=bg_color,
            highlightthickness=0)
        scrollbar = ttk.Scrollbar(
            self.about_frame,
            orient="vertical",
            command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window(
            (0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        main_frame = ttk.Frame(scrollable_frame, padding="15")
        main_frame.pack(fill='both', expand=True)

        # Create 2 columns
        left_frame = ttk.Frame(main_frame)
        left_frame.grid(row=0, column=0, sticky='nsew', padx=(0, 10))

        right_frame = ttk.Frame(main_frame)
        right_frame.grid(row=0, column=1, sticky='nsew', padx=(10, 0))

        # Configure grid weights
        main_frame.grid_columnconfigure(0, weight=1)
        main_frame.grid_columnconfigure(1, weight=1)
        main_frame.grid_rowconfigure(0, weight=1)

        # LEFT COLUMN - Tool Introduction, Tool Functions, Usage Guide
        intro_frame = ttk.LabelFrame(
            left_frame, text=lang['tool_intro'], padding="10")
        intro_frame.pack(fill='x', pady=(0, 15))
        intro_text = lang['tool_intro_text']
        ttk.Label(
            intro_frame,
            text=intro_text,
            wraplength=600,
            font=(
                'Arial',
                10)).pack(
            anchor='w',
            pady=5)

        functions_frame = ttk.LabelFrame(
            left_frame, text=lang['tool_functions'], padding="10")
        functions_frame.pack(fill='x', pady=(0, 15))
        functions_text = lang['tool_functions_text']
        ttk.Label(
            functions_frame,
            text=functions_text,
            wraplength=600,
            font=(
                'Arial',
                10),
            justify='left').pack(
            anchor='w',
            pady=5)

        usage_frame = ttk.LabelFrame(
            left_frame, text=lang['usage_guide'], padding="10")
        usage_frame.pack(fill='x', pady=(0, 15))
        usage_text = lang['usage_guide_text']
        ttk.Label(
            usage_frame,
            text=usage_text,
            wraplength=600,
            font=(
                'Arial',
                10),
            justify='left').pack(
            anchor='w',
            pady=5)

        contact_frame = ttk.LabelFrame(
            right_frame, text=lang['contact'], padding="10")
        contact_frame.pack(fill='x', pady=(0, 15))

        contact_text = lang['contact_text']
        ttk.Label(
            contact_frame,
            text=contact_text,
            wraplength=600,
            font=(
                'Arial',
                10),
            justify='left').pack(
            anchor='w',
            pady=5)
        button_frame = ttk.Frame(contact_frame)
        button_frame.pack(anchor='w', pady=5)
        ttk.Button(button_frame, text=lang['contact_zalo'], command=lambda: webbrowser.open(
            "https://zalo.me/0353633663")).pack(side='left', padx=(0, 10))
        ttk.Button(button_frame, text=lang['visit_facebook'], command=lambda: webbrowser.open(
            "https://www.facebook.com/61578186428817")).pack(side='left')

    def setup_minimax_tab(self):
        """Setup Minimax tab with full functionality"""
        lang = self.languages[self.current_language]

        # 1. Scrollable container (Giữ nguyên cấu trúc cuộn)
        style = ttk.Style()
        bg_color = style.lookup('TFrame', 'background')

        canvas = tk.Canvas(self.minimax_frame, bg=bg_color, highlightthickness=0)
        scrollbar = ttk.Scrollbar(self.minimax_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        main_frame = ttk.Frame(scrollable_frame, padding="15")
        main_frame.pack(fill='both', expand=True)

        # --- KHAI BÁO BIẾN CHO MINIMAX ---
        self.minimax_api_key = "sk_9geumg7l9v9x5gchkwb8y7igf7oe8bqagi25rjbryn75f6z7"
        
        # Khởi tạo các biến nếu chưa có
        if not hasattr(self, 'minimax_voice_id_var'): self.minimax_voice_id_var = tk.StringVar()
        if not hasattr(self, 'minimax_voice_name_var'): self.minimax_voice_name_var = tk.StringVar()
        if not hasattr(self, 'minimax_model_var'): self.minimax_model_var = tk.StringVar(value="speech-2.5-hd-preview")
        if not hasattr(self, 'minimax_language_var'): self.minimax_language_var = tk.StringVar(value="Auto detect")
        
        # Biến settings
        if not hasattr(self, 'minimax_change_settings_var'): self.minimax_change_settings_var = tk.BooleanVar(value=True)
        if not hasattr(self, 'minimax_speed_var'): self.minimax_speed_var = tk.StringVar(value="1.00")
        if not hasattr(self, 'minimax_pitch_var'): self.minimax_pitch_var = tk.IntVar(value=0)
        if not hasattr(self, 'minimax_volume_var'): self.minimax_volume_var = tk.StringVar(value="1.00")

        # 2. TẠO KHUNG CHỨA TRÊN CÙNG (Để chia cột Trái/Phải)
        top_frame = ttk.Frame(main_frame)
        top_frame.pack(fill='x', pady=(0, 10))

        # ==========================================
        # CỘT TRÁI: VOICE SETTINGS
        # ==========================================
        voice_frame = ttk.LabelFrame(top_frame, text=lang['voice'], padding="10")
        voice_frame.grid(row=0, column=0, padx=5, pady=5, sticky="nw")

        # --- Row 0: Language ---
        ttk.Label(voice_frame, text=lang['language']).grid(row=0, column=0, sticky=tk.E, padx=5, pady=2)
        self.minimax_language_combo = ttk.Combobox(voice_frame, textvariable=self.minimax_language_var, width=25, state="readonly")
        self.minimax_language_combo['values'] = [
            "Auto detect", "English", "Tiếng Việt", "Chinese (Mandarin)", "Japanese", 
            "Korean", "French", "German", "Spanish", "Russian", "Indonesian"
        ]
        self.minimax_language_combo.grid(row=0, column=1, padx=5, pady=2, sticky='w')
        # Nút Voice Clone
        ttk.Button(voice_frame, text=lang['voice_clone'], command=self.show_voice_clone_dialog, width=17).grid(row=0, column=2, padx=5, pady=1)

        # --- Row 1: Voice ID ---
        ttk.Label(voice_frame, text=lang['voice_id']).grid(row=1, column=0, sticky=tk.E, padx=5, pady=2)
        self.minimax_voice_id_combo = ttk.Combobox(voice_frame, textvariable=self.minimax_voice_id_var, width=25)
        self.minimax_voice_id_combo.grid(row=1, column=1, padx=5, pady=2, sticky='w')
        # Nút Load Voices (Dùng hàm riêng của Minimax)
        ttk.Button(voice_frame, text=lang['load_voices'], command=self.show_minimax_voice_browser, width=17).grid(row=1, column=2, padx=5, pady=1)

        # --- Row 2: Voice Name ---
        ttk.Label(voice_frame, text=lang['voice_name']).grid(row=2, column=0, sticky=tk.E, padx=5, pady=2)
        self.minimax_voice_name_combo = ttk.Combobox(voice_frame, textvariable=self.minimax_voice_name_var, width=25, state="readonly")
        self.minimax_voice_name_combo.grid(row=2, column=1, padx=5, pady=2, sticky='w')
        # Nút Add to Library
        ttk.Button(voice_frame, text=lang['add_to_library'], command=self.add_to_library, width=17).grid(row=2, column=2, padx=5, pady=1)

        # --- Row 3: Model ---
        ttk.Label(voice_frame, text=lang['voice_model']).grid(row=3, column=0, sticky=tk.E, padx=5, pady=2)
        self.minimax_model_combo = ttk.Combobox(voice_frame, textvariable=self.minimax_model_var, width=25, state="readonly")
        self.minimax_model_combo['values'] = [
            "speech-2.5-hd-preview", "speech-2.5-turbo-preview", "speech-02-hd", 
            "speech-02-turbo", "speech-01-hd", "speech-01-turbo"
        ]
        self.minimax_model_combo.grid(row=3, column=1, padx=5, pady=2, sticky='w')
        # Nút Voice Library
        ttk.Button(voice_frame, text=lang['voice_library'], command=self.show_library, width=17).grid(row=3, column=2, padx=5, pady=1)

        # ==========================================
        # CỘT PHẢI: CHANGE SETTINGS
        # ==========================================
        settings_frame = ttk.LabelFrame(top_frame, text=lang['change_voice_setting'], padding="10")
        settings_frame.grid(row=0, column=1, padx=5, pady=5, sticky="nw")

        # Checkbox Enable
        ttk.Checkbutton(settings_frame, text=lang['change_voice_setting'], variable=self.minimax_change_settings_var).grid(row=0, column=0, columnspan=2, sticky='w')

        # Speed
        ttk.Label(settings_frame, text=lang['speed']).grid(row=1, column=0, sticky='w', padx=5, pady=5)
        ttk.Spinbox(settings_frame, from_=0.50, to=2.00, increment=0.01, textvariable=self.minimax_speed_var, width=10, format="%.2f").grid(row=1, column=1, sticky='w', padx=5)

        # Pitch
        ttk.Label(settings_frame, text=lang['pitch']).grid(row=2, column=0, sticky='w', padx=5, pady=5)
        ttk.Spinbox(settings_frame, from_=-12, to=12, increment=1, textvariable=self.minimax_pitch_var, width=10).grid(row=2, column=1, sticky='w', padx=5)

        # Volume
        ttk.Label(settings_frame, text=lang['volume']).grid(row=3, column=0, sticky='w', padx=5, pady=5)
        ttk.Spinbox(settings_frame, from_=0.01, to=10.00, increment=0.01, textvariable=self.minimax_volume_var, width=10, format="%.2f").grid(row=3, column=1, sticky='w', padx=5)

        # 3. NÚT XỬ LÝ (START/STOP)
        process_frame = ttk.Frame(main_frame)
        process_frame.pack(fill='x', pady=10)

        ttk.Button(process_frame, text=lang['start'], command=self.start_minimax_processing).pack(side='left', padx=5)
        ttk.Button(process_frame, text=lang['stop'], command=self.stop_processing).pack(side='left', padx=5)

    def show_voice_clone_dialog(self):
        """Hiển thị hộp thoại Clone giọng nói cho Minimax"""
        lang = self.languages[self.current_language]
        
        # Tạo cửa sổ dialog
        dialog = tk.Toplevel(self.root)
        dialog.title(lang['voice_clone']) # Đảm bảo từ điển lang có key 'voice_clone'
        dialog.geometry("500x350")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Căn giữa dialog
        x = self.root.winfo_x() + (self.root.winfo_width() // 2) - 250
        y = self.root.winfo_y() + (self.root.winfo_height() // 2) - 175
        dialog.geometry(f"500x350+{x}+{y}")

        # Frame chứa nội dung
        content_frame = ttk.Frame(dialog, padding="20")
        content_frame.pack(fill='both', expand=True)

        # 1. Nhập tên giọng
        ttk.Label(content_frame, text=lang['voice_name']).grid(row=0, column=0, sticky='w', pady=5)
        clone_name_var = tk.StringVar()
        ttk.Entry(content_frame, textvariable=clone_name_var, width=40).grid(row=0, column=1, sticky='w', pady=5, padx=5)

        # 2. Chọn File mẫu
        ttk.Label(content_frame, text="File Audio (.mp3):").grid(row=1, column=0, sticky='w', pady=5)
        file_path_var = tk.StringVar()
        
        file_frame = ttk.Frame(content_frame)
        file_frame.grid(row=1, column=1, sticky='w', pady=5, padx=5)
        
        entry_file = ttk.Entry(file_frame, textvariable=file_path_var, width=30)
        entry_file.pack(side='left')
        
        def browse_file():
            filename = filedialog.askopenfilename(
                title="Chọn file mẫu",
                filetypes=[("MP3 files", "*.mp3")],
                parent=dialog
            )
            if filename:
                file_path_var.set(filename)

        ttk.Button(file_frame, text="...", width=4, command=browse_file).pack(side='left', padx=5)

        # 3. Nút Clone
        status_label = ttk.Label(content_frame, text="", foreground="blue")
        status_label.grid(row=3, column=0, columnspan=2, pady=10)

        def run_clone():
            voice_name = clone_name_var.get().strip()
            file_path = file_path_var.get().strip()
            
            if not voice_name:
                messagebox.showwarning("Cảnh báo", "Vui lòng nhập tên giọng!", parent=dialog)
                return
            if not file_path or not os.path.exists(file_path):
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn file âm thanh hợp lệ!", parent=dialog)
                return

            status_label.config(text="Đang xử lý clone... Vui lòng đợi.", foreground="blue")
            dialog.update()

            # Gọi API Minimax để clone
            try:
                # Lưu ý: Cần chắc chắn MinimaxAPI đã được khởi tạo đúng
                api = MinimaxAPI(self.minimax_api_key) 
                
                # Gọi hàm clone_voice của api (cần đảm bảo class MinimaxAPI có hàm này)
                # Nếu class MinimaxAPI chưa có hàm clone_voice, bạn cần thêm nó vào class đó
                result = api.clone_voice(
                    file_path=file_path, 
                    voice_name=voice_name,
                    language_tag=self.minimax_language_var.get() # Lấy ngôn ngữ từ tab chính
                )

                if result and result.get('success'):
                    voice_id = result.get('cloned_voice_id')
                    messagebox.showinfo("Thành công", f"Clone thành công!\nVoice ID: {voice_id}", parent=dialog)
                    
                    # Tự động điền ID vào tab chính
                    self.minimax_voice_id_var.set(voice_id)
                    self.minimax_voice_name_var.set(voice_name)
                    dialog.destroy()
                else:
                    err_msg = result.get('error', 'Lỗi không xác định') if result else "API không phản hồi"
                    status_label.config(text=f"Lỗi: {err_msg}", foreground="red")
                    
            except Exception as e:
                status_label.config(text=f"Lỗi ngoại lệ: {str(e)}", foreground="red")

        ttk.Button(content_frame, text="Bắt đầu Clone", command=run_clone).grid(row=2, column=1, sticky='e', pady=20)

    def load_config(self):
        # Lấy đường dẫn đúng cho cả script và exe
        app_dir = get_app_path()
        config_file = os.path.join(app_dir, "config.json")
        alt_config_file = os.path.join(app_dir, "config_new.json")
        backup_file = os.path.join(app_dir, "config.json.backup")
        default_config = {
            'voice_presets': [],
            'advanced_settings': {
                'is_delay_join': True,
                'delay_join_time': 1.0,
                'is_auto_silent_char': False,
                'is_auto_replace_symbol': False,
                'text1': ',;',
                'text1_time': 0.3,
                'text2': '.:?!',
                'text2_time': 0.5,
                'max_length': 10000
            },
            'proxy_settings': {
                'thread': 3,
            },
            'language': 'en'
        }
        lang = self.languages['en']

        def try_load_file(file_path):
            if not os.path.exists(file_path):
                return None
            if not os.access(file_path, os.R_OK):
                return None
            try:
                if os.path.getsize(file_path) == 0:
                    return None
                with open(file_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                if not isinstance(config, dict):
                    return None
                return config
            except json.JSONDecodeError as e:
                return None
            except IOError as e:
                return None
        config = None
        for file_path in [config_file, alt_config_file, backup_file]:
            config = try_load_file(file_path)
            if config:
                break
        if config is None:
            # Tạo file config.json mới với cấu hình mặc định
            try:
                script_dir = os.path.dirname(os.path.abspath(__file__))
                config_file = os.path.join(script_dir, "config.json")
                with open(config_file, 'w', encoding='utf-8') as f:
                    json.dump(default_config, f, indent=4, ensure_ascii=False)
                config = default_config
            except Exception as e:
                messagebox.showerror(
                    lang['error'],
                    f"Không thể tạo config.json: {
                        str(e)}")
                config = default_config
        try:
            for preset in config.get('voice_presets', []):
                if all(
                    key in preset for key in [
                        'name',
                        'voice_id',
                        'voice_name',
                        'model_id',
                        'settings']):
                    voice_preset = VoicePreset(
                        name=preset['name'],
                        voice_id=preset['voice_id'],
                        voice_name=preset['voice_name'],
                        model_id=preset['model_id'],
                        settings=preset['settings']
                    )
                    voice_preset.project = preset.get('project', '')
                    self.voice_presets.append(voice_preset)
            adv_conf = config.get('advanced_settings', {})
            self.is_delay_join.set(adv_conf.get('is_delay_join', True))
            self.delay_join_time.set(adv_conf.get('delay_join_time', 1.0))
            self.is_auto_silent_char.set(
                adv_conf.get('is_auto_silent_char', False))
            self.is_auto_replace_symbol.set(
                adv_conf.get('is_auto_replace_symbol', False))
            self.text1.set(adv_conf.get('text1', ',;'))
            self.text1_time.set(adv_conf.get('text1_time', 0.3))
            self.text2.set(adv_conf.get('text2', '.:?!'))
            self.text2_time.set(adv_conf.get('text2_time', 0.5))
            self.max_length_var.set(adv_conf.get('max_length', 10000))
            self.timeout_var.set(adv_conf.get('request_timeout', 120))
            proxy_conf = config.get('proxy_settings', {})
            self.thread_var.set(proxy_conf.get('thread', 3))
            self.current_language = config.get('language', 'en')
            if self.current_language not in ['en', 'vi']:
                self.current_language = 'en'
            # Load saved credits
            self.last_credits = config.get('last_credits', 'Not checked')
            if hasattr(self, 'language_var'):
                language_map = {
                    'en': 'English',
                    'vi': 'Tiếng Việt'
                }
                self.language_var.set(
                    language_map.get(
                        self.current_language,
                        'English'))
            self.loop_var.set(adv_conf.get('loop', False))
            self.auto_split_var.set(adv_conf.get('auto_split', False))
            self.auto_srt_var.set(adv_conf.get('auto_srt', False))
            self.one_line_one_file_var.set(
                adv_conf.get('one_line_one_file', False))
        except Exception as e:
            messagebox.showwarning(
                lang['warning'], f"Lỗi phân tích cấu hình: {
                    str(e)}. Sử dụng cấu hình mặc định.")
            self.reset_to_default_config(config_file, default_config, lang)

    def reset_to_default_config(self, config_file, default_config, lang):
        """Tạo file config.json mới với cấu hình mặc định"""
        try:
            # Ghi trực tiếp file config
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=4, ensure_ascii=False)

            self.current_language = 'en'
            if hasattr(self, 'language_var'):
                self.language_var.set("English")
            # Chỉ update UI nếu UI đã được tạo
            if hasattr(self, 'subtitle_label'):
                self.update_ui_language()
        except Exception as e:
            messagebox.showerror(
                lang['error'],
                f"Cannot create config.json: {
                    str(e)}")
            self.current_language = 'en'
            if hasattr(self, 'language_var'):
                self.language_var.set("English")
            # Chỉ update UI nếu UI đã được tạo
            if hasattr(self, 'subtitle_label'):
                self.update_ui_language()

    def save_config(self):
        config = {
            'voice_presets': [
                {
                    'name': p.name,
                    'voice_id': p.voice_id,
                    'voice_name': p.voice_name,
                    'model_id': p.model_id,
                    'settings': p.settings,
                    'project': p.project
                } for p in self.voice_presets
            ],
            'advanced_settings': {
                'is_delay_join': self.is_delay_join.get(),
                'delay_join_time': self.delay_join_time.get(),
                'is_auto_silent_char': self.is_auto_silent_char.get(),
                'is_auto_replace_symbol': self.is_auto_replace_symbol.get(),
                'text1': self.text1.get().strip(),
                'text1_time': self.text1_time.get(),
                'text2': self.text2.get().strip(),
                'text2_time': self.text2_time.get(),
                'max_length': self.max_length_var.get(),
                'request_timeout': self.timeout_var.get(),
                'loop': self.loop_var.get(),
                'auto_split': self.auto_split_var.get(),
                'auto_srt': self.auto_srt_var.get(),
                'one_line_one_file': self.one_line_one_file_var.get()
            },
            'proxy_settings': {
                'thread': self.thread_var.get(),
            },
            'language': self.current_language,
            'last_credits': str(getattr(self, 'last_credits', 'Not checked'))
        }
        app_dir = get_app_path()
        config_file = os.path.join(app_dir, "config.json")
        lang = self.languages[self.current_language]
        try:
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=4, ensure_ascii=False)
            print(f"Config saved successfully to: {config_file}")
        except Exception as e:
            print(f"Error saving config: {str(e)}")
            try:
                fallback_config = "config.json"
                with open(fallback_config, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=4, ensure_ascii=False)
                print(f"Config saved to current directory: {fallback_config}")
            except Exception as final_error:
                messagebox.showerror(
                    lang['error'], f"Cannot save config: {
                        str(final_error)}")

    def search_voices(self):
        """Search voice ID with API call"""
        lang = self.languages[self.current_language]
        voice_id = self.name_var.get().strip().lstrip('/')

        if not voice_id:
            self.voice_name_combo['values'] = [lang['please_enter_voice_id']]
            self.voice_name_combo.set(lang['please_enter_voice_id'])
            return

        if len(voice_id) < 10:
            self.voice_name_combo['values'] = [lang['invalid_format']]
            self.voice_name_combo.set(lang['invalid_format'])
            return

        # Set checking status
        self.voice_name_combo['values'] = [lang['checking']]
        self.voice_name_combo.set(lang['checking'])
        self.root.update()

        # API call
        if not self.api_key:
            self.voice_name_combo['values'] = [lang['no_api_key_status']]
            self.voice_name_combo.set(lang['no_api_key_status'])
            return

        try:
            api = ElevenLabsAPI(self.api_key, timeout=10)
            voice_name = api.search_voice_by_id(voice_id)

            if voice_name:
                self.voice_name_combo['values'] = [voice_name]
                self.voice_name_combo.set(voice_name)
                self.current_voice_id = voice_id
                self.status_var.set(f"Voice found: {voice_name}")
            else:
                self.voice_name_combo['values'] = [lang['voice_id_not_found']]
                self.voice_name_combo.set(lang['voice_id_not_found'])
                self.current_voice_id = None

        except requests.exceptions.ConnectionError:
            self.voice_name_combo['values'] = [lang['network_error']]
            self.voice_name_combo.set(lang['network_error'])
        except requests.exceptions.Timeout:
            self.voice_name_combo['values'] = ['Request Timeout']
            self.voice_name_combo.set('Request Timeout')
        except Exception as e:
            self.voice_name_combo['values'] = [lang['network_error']]
            self.voice_name_combo.set(lang['network_error'])

    def import_file(self):
        """Import multiple subtitle files"""
        lang = self.languages[self.current_language]
        filenames = filedialog.askopenfilenames(
            title=lang['import_file'],
            filetypes=[(lang['text_files'], "*.txt"),
                       (lang['srt_files'], "*.srt"),
                       ("DGT files", "*.dgt"),
                       (lang['all_files'], "*.*")]
        )

        if filenames:
            # Sắp xếp theo ABC tên file (case-insensitive)
            filenames = sorted(
                filenames, key=lambda x: os.path.basename(x).lower())

            # Không clear subtitles nữa - để tiếp tục thêm vào
            # self.subtitles.clear()
            # for item in self.subtitle_tree.get_children():
            #     self.subtitle_tree.delete(item)

            # Tính subtitle_id tiếp theo từ số lượng hiện tại
            subtitle_id = len(self.subtitles) + 1

            # Set audio_dir một lần duy nhất trước vòng lặp
            self.audio_dir = os.path.join(get_app_path(), "ImportFile")
            if not os.path.exists(self.audio_dir):
                os.makedirs(self.audio_dir)

            for filename in filenames:
                # Tạo folder theo tên file (không dùng "imported_audio")
                file_base_name = os.path.splitext(
                    os.path.basename(filename))[0]
                file_dir = os.path.dirname(filename)

                # Set project_dir theo file hiện tại
                self.project_dir = file_dir

                with open(filename, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Lưu số lượng subtitles trước khi parse
                old_count = len(self.subtitles)

                # Parse based on file type
                if filename.endswith('.srt'):
                    self.parse_srt(content)
                else:  # .txt or .dgt
                    # Kiểm tra mode 1 Line 1 File
                    if self.one_line_one_file_var.get():
                        self.parse_text_one_line_one_file(
                            content, file_base_name)
                    else:
                        self.parse_text(content)

                # Cập nhật IDs và output_names cho các subtitle mới được thêm
                for i in range(old_count, len(self.subtitles)):
                    # Đảm bảo ID là số nguyên
                    self.subtitles[i].id = int(subtitle_id)

                    # KIỂM TRA: Nếu đã có output_name từ
                    # parse_text_one_line_one_file() thì GIỮ NGUYÊN
                    if self.one_line_one_file_var.get(
                    ) and self.subtitles[i].output_name:
                        # Đã có output_name từ 1 Line 1 File mode, không cần xử
                        # lý thêm
                        pass
                    else:
                        # Xử lý output_name cho các mode khác
                        multi_voice_mode = not self.loop_var.get() and not self.auto_split_var.get()

                        if multi_voice_mode and self.subtitles[i].voice_number:
                            # Multi-voice mode: Giữ tên file gốc + _subtitle_id
                            # (theo thứ tự tuần tự)
                            self.subtitles[i].output_name = f"{file_base_name}_{subtitle_id}"

                        elif filename.endswith('.srt'):
                            # File SRT: Luôn thêm số thứ tự cho mỗi subtitle
                            self.subtitles[i].output_name = f"{file_base_name}_{subtitle_id}"
                        else:
                            # File TXT/DGT: Áp dụng logic cũ
                            if self.loop_var.get() or self.auto_split_var.get():
                                self.subtitles[i].output_name = f"{file_base_name}_{subtitle_id}"
                            else:
                                # Không có Loop/Auto Split -> dùng tên file gốc
                                if len(filenames) > 1:
                                    # Nhiều file -> thêm số để phân biệt
                                    self.subtitles[i].output_name = f"{file_base_name}_{subtitle_id}"
                                else:
                                    # Chỉ 1 file -> dùng tên gốc
                                    self.subtitles[i].output_name = file_base_name

                    subtitle_id += 1

            self.refresh_subtitle_list()
            self.status_var.set(
                lang['subtitles_loaded'].format(len(self.subtitles)))

    def load_subtitle_file(self, filename):
        """Load subtitles from file"""
        self.project_dir = os.path.dirname(filename)
        self.audio_dir = os.path.join(self.project_dir, Path(filename).stem)

        if not os.path.exists(self.audio_dir):
            os.makedirs(self.audio_dir)

        self.subtitles.clear()

        # Clear tree
        for item in self.subtitle_tree.get_children():
            self.subtitle_tree.delete(item)

        # Read file
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()

        # Parse based on file type
        if filename.endswith('.srt'):
            self.parse_srt(content)
        elif filename.endswith(('.txt', '.dgt')):
            self.parse_text(content)

        lang = self.languages[self.current_language]
        self.refresh_subtitle_list()
        self.status_var.set(lang['subtitles_loaded'].format(
            len(self.subtitles)) + f" ({len(self.subtitles)} đoạn)")

    def find_nearest_sentence_end(self, text, target_pos, max_search=100):
        """Tìm vị trí dấu câu gần nhất hoặc ranh giới từ trong khoảng max_search ký tự."""
        search_start = max(0, target_pos - max_search)
        search_end = min(len(text), target_pos + max_search)
        search_text = text[search_start:search_end]

        # Tìm tất cả vị trí dấu câu [.!?]
        sentence_ends = [(m.start() + search_start, m.group())
                         for m in re.finditer(r'[.!?]', search_text)]

        if sentence_ends:
            # Tìm dấu câu gần target_pos nhất
            closest = min(sentence_ends, key=lambda x: abs(x[0] - target_pos))
            return closest[0] + 1  # Trả về vị trí sau dấu câu

        # Nếu không tìm thấy dấu câu, tìm ranh giới từ (khoảng trắng)
        space_pos = text.rfind(' ', search_start, target_pos)
        if space_pos != -1 and space_pos > search_start:
            return space_pos + 1

        # Nếu không có ranh giới từ, trả về target_pos ban đầu
        return target_pos

    def parse_text(self, content):
        if not content or not isinstance(content, str):
            return  # Không xử lý nếu content rỗng hoặc không phải chuỗi

        # Kiểm tra multi-voice mode: Loop = False và Auto Split = False
        multi_voice_mode = not self.loop_var.get() and not self.auto_split_var.get()

        if multi_voice_mode:
            # Multi-voice mode: Parse theo #1, #2, #3
            lines = content.split('\n')
            lines = [line.strip() for line in lines if line.strip()]

            subtitle_id = 1
            has_voice_pattern = False  # Biến kiểm tra có pattern #số không

            for line in lines:
                if not line:
                    continue
                voice_match = re.match(r'^#(\d+)\s*(.*)$', line)
                if voice_match:
                    has_voice_pattern = True  # Tìm thấy ít nhất 1 pattern
                    voice_num = voice_match.group(1)
                    text = voice_match.group(2).strip()
                    if text:
                        subtitle = SubtitleItem(
                            subtitle_id, text, voice_number=voice_num)
                        self.subtitles.append(subtitle)
                        subtitle_id += 1

            # Nếu không có pattern #số nào, load toàn bộ nội dung
            if not has_voice_pattern:
                # Không chia, không xử lý, chỉ load nguyên văn
                subtitle = SubtitleItem(1, content.strip())
                self.subtitles.append(subtitle)
                print(
                    f"No voice pattern found: Loaded entire content as 1 subtitle ({
                        len(content)} characters)")
            else:
                print(
                    f"Multi-voice mode: Parsed {len(lines)} lines into {len(self.subtitles)} subtitles")

        else:
            # Single-voice mode: Logic cũ với Loop và Auto Split
            lines = []

            # Bước 1: Chia theo Auto Split nếu bật
            if self.auto_split_var.get():
                split_chars = self.split_chars_var.get()
                if split_chars:  # Kiểm tra split_chars không rỗng
                    pattern = f"[{re.escape(split_chars)}]"
                    lines = re.split(pattern, content)
                    lines = [line.strip() for line in lines if line.strip()]
            if not lines:  # Nếu không bật Auto Split hoặc không chia được
                lines = re.split(r'\n\s*\n', content)
                lines = [line.strip() for line in lines if line.strip()]

            # Bước 2: Chia theo Loop nếu bật
            if self.loop_var.get():
                max_length = max(1, self.max_length_var.get()
                                 )  # Đảm bảo max_length > 0
                final_lines = []
                for line in lines:
                    if not line:
                        continue
                    start = 0
                    while start < len(line):
                        target_end = start + max_length
                        end = self.find_nearest_sentence_end(
                            line, target_end) if target_end < len(line) else len(line)
                        segment = line[start:end].strip()
                        if segment:
                            final_lines.append(segment)
                        start = end
                lines = final_lines
            else:
                lines = [line for line in lines if line]

            # Bước 3: Tạo SubtitleItem (logic cũ)
            subtitle_id = 1
            for line in lines:
                if not line:
                    continue
                voice_match = re.match(r'^#(\d+)\s*(.*)$', line)
                if voice_match:
                    voice_num = voice_match.group(1)
                    text = voice_match.group(2).strip()
                else:
                    voice_num = ""
                    text = line.strip()
                if text:  # Loại bỏ giới hạn 500 ký tự, chỉ kiểm tra text không rỗng
                    subtitle = SubtitleItem(
                        subtitle_id, text, voice_number=voice_num)
                    self.subtitles.append(subtitle)
                    subtitle_id += 1
            print(
                f"Single-voice mode: Parsed {len(lines)} lines into {len(self.subtitles)} subtitles")

    def parse_text_one_line_one_file(self, content, base_name):
        """Parse text with 1 line = 1 file mode"""
        if not content or not isinstance(content, str):
            return

        # Chuẩn hóa line ending
        content = content.replace('\r\n', '\n').replace('\r', '\n')

        # Chia theo dòng
        lines = content.split('\n')

        # Đếm số thứ tự dòng (chỉ đếm dòng không rỗng)
        line_number = 1

        # Xử lý từng dòng
        for line in lines:
            line = line.strip()

            # Bỏ qua dòng trống
            if not line:
                continue

            # Tạo subtitle ID (ID tổng trong bảng)
            subtitle_id = len(self.subtitles) + 1

            # Tạo output_name: base_name_1, base_name_2, ... (dùng line_number)
            output_name = f"{base_name}_{line_number}"

            # Tạo SubtitleItem
            subtitle = SubtitleItem(subtitle_id, line, output_name=output_name)
            self.subtitles.append(subtitle)

            # Tăng line_number cho dòng tiếp theo
            line_number += 1

        print(
            f"1 Line 1 File mode: Parsed {
                len(lines)} lines into {
                len(
                    self.subtitles)} subtitles")

    def parse_srt(self, content):
        """Parse SRT file"""
        # Chuẩn hóa line endings và loại bỏ BOM nếu có
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        if content.startswith('\ufeff'):
            content = content[1:]

        # Chia thành các blocks bằng double newline
        blocks = re.split(r'\n\s*\n', content.strip())

        for block in blocks:
            if not block.strip():
                continue

            lines = block.strip().split('\n')
            if len(lines) >= 3:
                try:
                    # Kiểm tra dòng đầu có phải số không
                    first_line = lines[0].strip()
                    if not first_line.isdigit():
                        continue

                    subtitle_id = int(first_line)
                    timing = lines[1].strip()

                    # Kiểm tra format timing có đúng không
                    if '-->' not in timing:
                        continue

                    text = ' '.join(lines[2:]).strip()
                    if text:  # Chỉ thêm nếu có nội dung
                        subtitle = SubtitleItem(
                            subtitle_id, text, timing=timing)
                        self.subtitles.append(subtitle)
                except (ValueError, IndexError):
                    # Bỏ qua block không hợp lệ
                    continue

    def refresh_subtitle_list(self, single_index=None):
        """Refresh subtitle list display, optional single row"""
        if single_index is not None:
            # Chỉ update single row
            item = self.subtitle_tree.get_children()[single_index]
            subtitle = self.subtitles[single_index]

            # Tính timing (giữ logic cũ)
            if subtitle.timing:
                timing = subtitle.timing
            elif subtitle.is_processed and PYDUB_AVAILABLE:
                mp3_path = os.path.join(
                    self.audio_dir, f"{
                        subtitle.output_name}.mp3")
                if os.path.exists(mp3_path):
                    try:
                        audio = AudioSegment.from_mp3(mp3_path)
                        duration = len(audio) // 1000
                        hours = duration // 3600
                        minutes = (duration % 3600) // 60
                        seconds = duration % 60
                        timing = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                    except BaseException:
                        timing = "00:00:00"
                else:
                    timing = "00:00:00"
            else:
                words = len(subtitle.text.split())
                chars = len(subtitle.text)
                estimated_words = chars / 5 if chars > 0 else words
                estimated_duration = (estimated_words / 2.5)
                hours = int(estimated_duration // 3600)
                minutes = int((estimated_duration % 3600) // 60)
                seconds = int(estimated_duration % 60)
                timing = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

            self.subtitle_tree.item(item, values=(
                subtitle.id,
                subtitle.output_name,
                timing,
                subtitle.text[:500] + "..." if len(subtitle.text) > 500 else subtitle.text,
                subtitle.voice_number,
                subtitle.status
            ))
            print(
                f"Updated single subtitle {subtitle.id}: {subtitle.text[:50]}...")
        else:
            # Refresh toàn bộ (logic cũ)
            for item in self.subtitle_tree.get_children():
                self.subtitle_tree.delete(item)

            print(f"Refreshing {len(self.subtitles)} subtitles")

            for subtitle in self.subtitles:
                mp3_path = os.path.join(
                    self.audio_dir, f"{
                        subtitle.output_name}.mp3")
                if os.path.exists(mp3_path):
                    subtitle.is_processed = True
                    subtitle.status = self.languages[self.current_language]['done']
                else:
                    pass

                # Tính timing (giữ logic cũ)
                if subtitle.timing:
                    timing = subtitle.timing
                elif subtitle.is_processed and PYDUB_AVAILABLE:
                    mp3_path = os.path.join(
                        self.audio_dir, f"{
                            subtitle.output_name}.mp3")
                    if os.path.exists(mp3_path):
                        try:
                            audio = AudioSegment.from_mp3(mp3_path)
                            duration = len(audio) // 1000
                            hours = duration // 3600
                            minutes = (duration % 3600) // 60
                            seconds = duration % 60
                            timing = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                        except BaseException:
                            timing = "00:00:00"
                    else:
                        timing = "00:00:00"
                else:
                    words = len(subtitle.text.split())
                    chars = len(subtitle.text)
                    estimated_words = chars / 5 if chars > 0 else words
                    estimated_duration = (estimated_words / 2.5)
                    hours = int(estimated_duration // 3600)
                    minutes = int((estimated_duration % 3600) // 60)
                    seconds = int(estimated_duration % 60)
                    timing = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

                self.subtitle_tree.insert('', 'end', values=(
                    subtitle.id,
                    subtitle.output_name,
                    timing,
                    subtitle.text[:500] + "..." if len(subtitle.text) > 500 else subtitle.text,
                    subtitle.voice_number,
                    subtitle.status
                ))
                print(
                    f"Inserted subtitle {subtitle.id}: {subtitle.text[:50]}...")

    def start_processing(self):
        """Start TTS processing"""
        lang = self.languages[self.current_language]

        # SỬA: Kiểm tra self.api_key thay vì entry
        if not self.api_key:
            messagebox.showwarning(lang['warning'], lang['no_api_key'])
            return

        # Check if voice ID is validated
        voice_id = self.name_var.get().strip().lstrip('/')
        voice_name = self.voice_name_var.get()
        if not voice_id or not voice_name or voice_name in [
                lang['please_enter_voice_id'],
                lang['invalid_format'],
                lang['checking'],
                lang['no_api_key_status'],
                lang['network_error']]:
            messagebox.showwarning(lang['warning'], lang['no_voice'])
            return

        # SỬA: Kiểm tra subtitles trước khi bắt đầu
        if not self.subtitles:
            messagebox.showwarning(lang['warning'], lang['no_subtitles'])
            return

        # THÊM: Kiểm tra lại trạng thái file MP3 trước khi bắt đầu
        self.update_processed_status()

        # Start processing
        self.is_running = True
        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")
        self.start_time = time.time()
        self.processed_count = sum(1 for s in self.subtitles if s.is_processed)

        # Update initial status for all subtitles
        for i, subtitle in enumerate(self.subtitles):
            self.update_subtitle_status(i, lang['checking_voice'])
            self.root.update()
            time.sleep(0.1)

        # Start processing thread
        thread = threading.Thread(target=self.process_subtitles)
        thread.daemon = True
        thread.start()

        # Start UI update timer
        self.update_ui()

    def update_processed_status(self):
        """Update processed status based on existing MP3 files"""
        if not self.audio_dir or not os.path.exists(self.audio_dir):
            return

        lang = self.languages[self.current_language]
        updated_count = 0

        for i, subtitle in enumerate(self.subtitles):
            mp3_path = os.path.join(
                self.audio_dir, f"{
                    subtitle.output_name}.mp3")
            if os.path.exists(mp3_path):
                if not subtitle.is_processed:  # Chỉ cập nhật nếu chưa được đánh dấu
                    subtitle.is_processed = True
                    subtitle.status = lang['done']
                    updated_count += 1
                    print(
                        f"Updated status for subtitle {
                            subtitle.id}: {
                            subtitle.output_name}.mp3 exists")
            else:
                if subtitle.is_processed:  # File bị xóa, reset trạng thái
                    subtitle.is_processed = False
                    subtitle.status = ""
                    print(
                        f"Reset status for subtitle {
                            subtitle.id}: {
                            subtitle.output_name}.mp3 not found")

        if updated_count > 0:
            # Refresh UI để hiển thị trạng thái mới
            self.refresh_subtitle_list()
            print(f"Updated processed status for {updated_count} subtitles")

    def stop_processing(self):
        """Stop processing"""
        self.is_running = False
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")

    def process_single_subtitle(
            self,
            index,
            subtitle,
            voice_id,
            model_id,
            voice_settings,
            api,
            initial_delay=0):
        lang = self.languages[self.current_language]
        try:
            # Kiểm tra nếu subtitle đã được xử lý thì bỏ qua
            if subtitle.is_processed:
                return

            # Stagger delay để tránh đồng thời gửi requests
            if initial_delay > 0:
                time.sleep(initial_delay)

            self.update_subtitle_status(index, lang['checking_voice'])
            self.root.update()

            text = subtitle.text
            if self.is_auto_replace_symbol.get():
                text = re.sub(r'[^\w\s]', '', text)

            if self.is_auto_silent_char.get():
                import re
                # Tạo pattern để tránh replace ký tự trong số

                # Replace text1 characters (,;) with 0.3s
                if self.text1.get():
                    for char in self.text1.get():
                        # Tránh replace ký tự trong số thập phân
                        text = re.sub(
                            rf"(?<!\d){
                                re.escape(char)}(?!\d)", f"<break time=\"{
                                self.text1_time.get()}s\"/>", text)

                # Replace text2 characters (.:?!) with 0.5s
                if self.text2.get():
                    for char in self.text2.get():
                        # Tránh replace dấu . trong số thập phân và trong break
                        # tag
                        if char == '.':
                            text = re.sub(
                                r"(?<!\d)\.(?!\d)(?![^<]*>)",
                                f"<break time=\"{
                                    self.text2_time.get()}s\"/>",
                                text)
                        else:
                            text = re.sub(
                                rf"(?![^<]*>){re.escape(char)}", f"<break time=\"{self.text2_time.get()}s\"/>", text)
            subtitle.text = text
            print(f"DEBUG: Text gửi API: {text}")
            self.update_subtitle_status(index, lang['generating_audio'])
            self.root.update()

            result = api.text_to_speech(
                text,
                voice_id,
                model_id,
                voice_settings,
                with_transcript=self.auto_srt_var.get())

            # Kiểm tra định dạng trả về
            if len(result) == 3:
                task_id, remaining_credits, error_type = result
                if not task_id:
                    if error_type == "maintenance":
                        subtitle.status = lang['api_maintenance_status']
                    else:
                        subtitle.status = lang['error_try_again']
                    self.update_subtitle_status(index, subtitle.status)
                    self.root.update()
                    return
            else:
                task_id, remaining_credits = result
                if not task_id:
                    subtitle.status = lang['error_try_again']
                    self.update_subtitle_status(index, subtitle.status)
                    self.root.update()
                    return

            # Main polling - 10 phút (120 lần)
            max_attempts = 600
            audio_url = None

            for attempt in range(max_attempts):
                if not self.is_running:
                    break

                audio_url, credit_cost, srt_url, progress = api.get_task(
                    task_id)

                # Kiểm tra lỗi không khôi phục (progress = -1)
                if progress == -1:
                    subtitle.status = lang['failed']
                    self.update_subtitle_status(index, subtitle.status)
                    self.root.update()
                    return

                if audio_url:
                    self.update_subtitle_status(index, lang['downloading'])
                    self.root.update()

                    response = requests.get(audio_url, timeout=90)
                    if response.status_code == 200:
                        output_path = os.path.join(
                            self.audio_dir, f"{subtitle.output_name}.mp3")
                        with open(output_path, 'wb') as f:
                            f.write(response.content)

                        # Download SRT nếu Auto SRT được bật
                        if self.auto_srt_var.get() and srt_url:
                            try:
                                srt_response = requests.get(
                                    srt_url, timeout=90)
                                if srt_response.status_code == 200:
                                    srt_path = os.path.join(
                                        self.audio_dir, f"{subtitle.output_name}.srt")

                                    # Lấy raw bytes và tự xử lý encoding
                                    srt_content = srt_response.content
                                    try:
                                        # Thử decode UTF-8 trước
                                        decoded_content = srt_content.decode(
                                            'utf-8')
                                    except UnicodeDecodeError:
                                        try:
                                            decoded_content = srt_content.decode(
                                                'utf-8-sig')  # UTF-8 with BOM
                                        except UnicodeDecodeError:
                                            decoded_content = srt_content.decode(
                                                'latin-1')  # Fallback

                                    with open(srt_path, 'w', encoding='utf-8') as f:
                                        f.write(decoded_content)
                                    print(
                                        f"SRT downloaded: {
                                            os.path.basename(srt_path)}")
                            except Exception as e:
                                print(f"SRT download error: {str(e)}")

                        subtitle.is_processed = True
                        subtitle.status = self.languages[self.current_language]['done']
                        self.processed_count += 1
                        self.update_subtitle_status(index, subtitle.status)
                        if remaining_credits and remaining_credits != 'Unknown':
                            self.root.after(
                                0, lambda: self.update_credits_display(remaining_credits))
                        return
                    else:
                        print(
                            f"Failed to download audio: HTTP {
                                response.status_code}")
                        break
                else:
                    # Task still processing - show progress
                    if progress is not None and progress > 0:  # SỬA: Kiểm tra None trước
                        progress_text = f"{
                            lang['generating_audio']} ({progress}%)"
                    else:
                        progress_text = lang['generating_audio']
                    self.update_subtitle_status(index, progress_text)
                    self.root.update()

                # Random delay để spread polling requests (2-7s) - TĂNG DELAY
                import random
                sleep_time = 6
                time.sleep(sleep_time)

            # Nếu polling thất bại
            subtitle.status = lang['error_try_again']
            self.update_subtitle_status(index, subtitle.status)

        except Exception as e:
            subtitle.status = lang['error_try_again']
            self.update_subtitle_status(index, subtitle.status)

        self.root.update()

    def process_subtitles(self):
        from concurrent.futures import ThreadPoolExecutor
        import itertools
        lang = self.languages[self.current_language]

        # Use current validated Voice ID instead of voice selection
        voice_id = self.current_voice_id
        if not voice_id:
            messagebox.showerror(lang['error'], "No valid Voice ID found!")
            self.is_running = False
            self.root.after(0, self.processing_completed)
            return

        # Default model and voice settings (sẽ được override nếu có
        # voice_number)
        default_model_id = self.model_var.get()
        default_voice_settings = {
            "stability": self.stability_var.get() / 100.0,
            "similarity_boost": self.similarity_var.get() / 100.0,
            "style": self.style_var.get() / 100.0,
            "speed": self.speed_var.get(),  # THÊM DÒNG NÀY
            "use_speaker_boost": self.speaker_boost_var.get()
        } if self.change_settings_var.get() else {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "speed": 1.0,  # THÊM DÒNG NÀY
            "use_speaker_boost": False
        }

        # Get list of subtitles to process (all or selected)
        selected_items = self.subtitle_tree.selection()
        subtitles_to_process = []
        if selected_items:
            for item in selected_items:
                index = self.subtitle_tree.index(item)
                # Chỉ thêm vào danh sách nếu chưa được xử lý
                if not self.subtitles[index].is_processed:
                    subtitles_to_process.append((index, self.subtitles[index]))
                    print(
                        f"Selected subtitle {
                            index +
                            1} added to processing queue")
                else:
                    print(
                        f"Selected subtitle {
                            index +
                            1} skipped (already processed)")
        else:
            # Chỉ lấy những subtitle chưa được xử lý
            subtitles_to_process = [
                (i, subtitle) for i, subtitle in enumerate(
                    self.subtitles) if not subtitle.is_processed]
            print(
                f"Auto-selected {len(subtitles_to_process)} unprocessed subtitles")

        # Thông báo nếu không có gì để xử lý
        if not subtitles_to_process:
            messagebox.showinfo(lang['info'],
                                "All subtitles are already processed!")
            self.is_running = False
            self.root.after(0, self.processing_completed)
            return

        # Set loop count (only process once since Loop is handled in
        # parse_text)
        loop_count = 1

        for loop in range(loop_count):
            if not self.is_running:
                break

            # Add Checking Setting status
            for thread_index, (i, subtitle) in enumerate(subtitles_to_process):
                self.update_subtitle_status(i, lang['checking_voice'])
                self.root.update()
                time.sleep(0.1)

            with ThreadPoolExecutor(max_workers=min(self.thread_var.get(), 100)) as executor:
                futures = []
                # Xử lý tuần tự từng subtitle thay vì dùng ThreadPoolExecutor
                for thread_index, (i, subtitle) in enumerate(
                        subtitles_to_process):
                    if not self.is_running:
                        break

                    if subtitle.is_processed and loop == 0:
                        continue  # Skip already processed subtitles in first loop

                    subtitle.status = self.languages[self.current_language]['processing']
                    self.update_subtitle_status(i, subtitle.status)
                    self.root.update()

                    # Create unique output name for each loop iteration
                    output_name = f"{
                        subtitle.output_name}_loop{
                        loop + 1}" if loop > 0 else subtitle.output_name
                    subtitle_copy = SubtitleItem(
                        subtitle.id, subtitle.text, output_name, subtitle.voice_number)

                    # Create ElevenLabs API
                    thread_api = ElevenLabsAPI(self.api_key, timeout=None)

                    # Lưu output_name để dùng trong text_to_speech
                    thread_api.current_output_name = subtitle_copy.output_name

                    # Xác định voice settings cho subtitle này
                    if subtitle.voice_number:
                        # Sử dụng voice từ Library
                        voice_preset = get_voice_by_local_id(
                            self.voice_presets, subtitle.voice_number)
                        if voice_preset:
                            current_voice_id = voice_preset.voice_id
                            current_model_id = voice_preset.model_id
                            current_voice_settings = voice_preset.settings
                        else:
                            # Fallback nếu không tìm thấy voice preset
                            current_voice_id = voice_id
                            current_model_id = default_model_id
                            current_voice_settings = default_voice_settings
                    else:
                        # Sử dụng voice mặc định
                        current_voice_id = voice_id
                        current_model_id = default_model_id
                        current_voice_settings = default_voice_settings

                    # THÊM CODE NÀY: Nếu model là eleven_v3 thì set
                    # voice_settings = None
                    if current_model_id == "eleven_v3":
                        current_voice_settings = None

                    # Lưu output_name để dùng trong process_single_subtitle
                    initial_delay = thread_index * 1
                    futures.append(
                        executor.submit(
                            self.process_single_subtitle,
                            i,
                            subtitle_copy,
                            current_voice_id,
                            current_model_id,
                            current_voice_settings,
                            thread_api,
                            initial_delay))

                for future in futures:
                    future.result()

            if loop < loop_count - 1:
                # Reset status for next loop iteration
                for i, subtitle in subtitles_to_process:
                    subtitle.is_processed = False
                    subtitle.status = ""

        self.is_running = False
        self.root.after(0, self.processing_completed)

    def update_subtitle_status(self, index, status):
        """Update subtitle status in UI"""
        def update():
            if index < len(self.subtitle_tree.get_children()):
                # ✅ ĐÚNG - check với giá trị đa ngôn ngữ
                lang = self.languages[self.current_language]
                if index < len(
                        self.subtitles) and self.subtitles[index].is_processed and status != lang['done']:
                    return

                item = self.subtitle_tree.get_children()[index]
                values = list(self.subtitle_tree.item(item)['values'])

                # SỬA: Chỉ cập nhật cột Status (index 5), giữ nguyên Output
                # name (index 1)
                values[5] = status

                # Đảm bảo Output name không bị thay đổi
                if index < len(self.subtitles):
                    values[1] = self.subtitles[index].output_name

                self.subtitle_tree.item(item, values=values)

        self.root.after(0, update)

    def on_status_bar_click(self, event):
        """Handle click on status bar to open backup tasks"""
        self.show_backup_tasks()

    def show_error_warning_status(self):
        """Show error warning in warning bar"""
        lang = self.languages[self.current_language]

        # Lấy text cảnh báo trực tiếp (không cần format)
        warning_text = lang['status_error_warning']

        # Đổi style và text của warning bar
        self.warning_bar.configure(
            style='ErrorWarning.TLabel',
            wraplength=1460)
        self.warning_var.set(warning_text)

    def update_ui(self):
        """Update UI periodically"""
        if self.is_running:
            elapsed = int(time.time() - self.start_time)
            done = sum(1 for s in self.subtitles if s.is_processed)
            processing = sum(
                1 for s in self.subtitles if "Processing" in s.status and not s.is_processed)
            total = len(self.subtitles)
            lang = self.languages[self.current_language]

            self.subtitle_label.config(
                text=lang['subtitles'].format(done, processing, total, elapsed)
            )

            # Schedule next update
            self.root.after(1000, self.update_ui)

    def processing_completed(self):
        lang = self.languages[self.current_language]
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")

        # Update UI một lần cuối để hiển thị đúng số liệu
        self.update_ui()

        messagebox.showinfo(
            lang['complete'],
            lang['processing_complete'].format(
                self.processed_count))

    def open_output(self):
        """Open audio output folder"""
        lang = self.languages[self.current_language]
        if self.audio_dir and os.path.exists(self.audio_dir):
            mp3_files = [
                f for f in os.listdir(
                    self.audio_dir) if f.endswith('.mp3')]
            if mp3_files:
                if os.name == 'nt':  # Windows
                    os.startfile(self.audio_dir)
                elif os.name == 'posix':  # macOS and Linux
                    os.system(f'open "{self.audio_dir}"')
            else:
                messagebox.showwarning(
                    lang['warning'], "The audio folder is empty!")
        else:
            messagebox.showwarning(lang['warning'], lang['output_not_found'])

    def join_mp3(self):
        """Join MP3 files"""
        lang = self.languages[self.current_language]
        if not PYDUB_AVAILABLE:
            messagebox.showerror(lang['error'], lang['pydub_error'])
            return

        # Kiểm tra self.audio_files hoặc subtitles
        if not self.audio_files:  # Không cần kiểm tra hasattr vì đã khởi tạo
            if not self.subtitles:
                messagebox.showwarning(
                    lang['warning'], lang['no_files_to_join'])
                return
            mp3_files = [
                os.path.join(
                    self.audio_dir, f"{
                        subtitle.output_name}.mp3") for subtitle in self.subtitles]
            existing_files = [f for f in mp3_files if os.path.exists(f)]
            if not existing_files:
                messagebox.showwarning(lang['warning'], lang['no_mp3_found'])
                return
        else:
            existing_files = [f for f in self.audio_files if os.path.exists(f)]
            if not existing_files:
                messagebox.showwarning(lang['warning'], lang['no_mp3_found'])
                return

        # Set default directory based on current audio_dir
        initial_dir = self.audio_dir if self.audio_dir and os.path.exists(
            self.audio_dir) else get_app_path()

        filename = filedialog.asksaveasfilename(
            defaultextension=".mp3",
            filetypes=[("MP3 files", "*.mp3"), ("All files", "*.*")],
            initialdir=initial_dir
        )

        if filename:
            output_dir = os.path.dirname(filename)
            # Kiểm tra output_dir
            if not output_dir or not os.path.exists(output_dir):
                messagebox.showwarning(
                    lang['warning'], lang['output_not_found'])
                return

            # Kiểm tra quyền ghi vào output_dir
            if not os.access(output_dir, os.W_OK):
                messagebox.showerror(
                    lang['error'],
                    f"Không có quyền ghi vào thư mục: {output_dir}")
                return

            if os.path.exists(filename):
                if not messagebox.askyesno(
                        lang['warning'], lang['file_exists_overwrite']):
                    return

            # Tạo file im lặng nếu cần
            self.silent_file_path = None  # Lưu đường dẫn tệp im lặng
            if self.is_delay_join.get():
                silent_duration = int(
                    self.delay_join_time.get() *
                    1000)  # Chuyển sang mili giây
                # Đặt tên tệp im lặng dựa trên delay_join_time
                delay_str = str(self.delay_join_time.get()).replace(
                    ".", "_")  # Thay . thành _ để tránh lỗi tên tệp
                silent_file_name = f"silent_{delay_str}.mp3"
                silent_path = os.path.join(output_dir, silent_file_name)
                try:
                    silent_audio = AudioSegment.silent(
                        duration=silent_duration)
                    silent_audio.export(silent_path, format="mp3")
                    if os.path.exists(silent_path):
                        self.silent_file_path = silent_path
                    else:
                        pass
                except Exception as e:
                    pass

            # Disable UI during join
            self.root.config(cursor="wait")
            # Run in thread to prevent blocking
            thread = threading.Thread(
                target=self.join_audio_files_threaded, args=(
                    filename,))
            thread.daemon = True
            thread.start()

    def join_audio_files_threaded(self, output_file):
        """Thread wrapper for join_audio_files"""
        try:
            self.join_audio_files(output_file)
        finally:
            # Re-enable UI
            self.root.after(0, lambda: self.root.config(cursor=""))

    def join_audio_files(self, output_file):
        lang = self.languages[self.current_language]
        try:
            combined = AudioSegment.empty()
            count = 0
            silent_duration = int(
                self.delay_join_time.get() *
                1000) if self.is_delay_join.get() else 0
            file_list = []  # Danh sách để ghi file list
            output_dir = os.path.dirname(output_file)

            if hasattr(self, 'audio_files') and self.audio_files:
                for i, mp3_path in enumerate(self.audio_files):
                    if os.path.exists(mp3_path):
                        audio = AudioSegment.from_mp3(mp3_path)
                        combined += audio
                        file_list.append(f"file '{mp3_path}'")
                        count += 1
                        if self.is_delay_join.get() and i < len(self.audio_files) - 1:
                            if hasattr(
                                    self, 'silent_file_path') and self.silent_file_path and os.path.exists(
                                    self.silent_file_path):
                                silent_audio = AudioSegment.from_mp3(
                                    self.silent_file_path)
                                combined += silent_audio
                                file_list.append(
                                    f"file '{self.silent_file_path}'")
                            else:
                                silent_audio = AudioSegment.silent(
                                    duration=silent_duration)
                                combined += silent_audio
                                # Ghi đường dẫn giả định cho file im lặng
                                delay_str = str(
                                    self.delay_join_time.get()).replace(
                                    ".", "_")
                                silent_file_name = f"silent_{delay_str}.mp3"
                                silent_path = os.path.join(
                                    output_dir, silent_file_name)
                                file_list.append(f"file '{silent_path}'")
                    else:
                        pass
            else:
                for i, subtitle in enumerate(self.subtitles):
                    mp3_path = os.path.join(
                        self.audio_dir, f"{
                            subtitle.output_name}.mp3")
                    if os.path.exists(mp3_path):
                        audio = AudioSegment.from_mp3(mp3_path)
                        combined += audio
                        file_list.append(f"file '{mp3_path}'")
                        count += 1
                        subtitle.is_processed = True  # Cập nhật trạng thái
                        self.update_subtitle_status(
                            i, self.languages[self.current_language]['done'])
                        if self.is_delay_join.get() and i < len(self.subtitles) - 1:
                            if hasattr(
                                    self, 'silent_file_path') and self.silent_file_path and os.path.exists(
                                    self.silent_file_path):
                                silent_audio = AudioSegment.from_mp3(
                                    self.silent_file_path)
                                combined += silent_audio
                                file_list.append(
                                    f"file '{self.silent_file_path}'")
                            else:
                                silent_audio = AudioSegment.silent(
                                    duration=silent_duration)
                                combined += silent_audio
                                # Ghi đường dẫn giả định cho file im lặng
                                delay_str = str(
                                    self.delay_join_time.get()).replace(
                                    ".", "_")
                                silent_file_name = f"silent_{delay_str}.mp3"
                                silent_path = os.path.join(
                                    output_dir, silent_file_name)
                                file_list.append(f"file '{silent_path}'")
                    else:
                        pass

            if count > 0:
                combined.export(output_file, format="mp3")
                # Tạo file list
                file_list_path = os.path.splitext(
                    output_file)[0] + "_file_list.txt"
                try:
                    with open(file_list_path, 'w', encoding='utf-8') as f:
                        f.write('\n'.join(file_list))
                except Exception as e:
                    messagebox.showwarning(
                        lang['warning'],
                        f"Không thể tạo file danh sách: {
                            str(e)}")

                # Thêm chức năng join SRT
                self.join_srt_files(output_file)

                messagebox.showinfo(
                    lang['success'],
                    lang['mp3_joined'].format(count))
            else:
                messagebox.showwarning(lang['warning'], lang['no_mp3_found'])
        except Exception as e:
            messagebox.showerror(lang['error'], "Failed to join MP3 files")

    def join_srt_files(self, output_mp3_file):
        """Join SRT files corresponding to MP3 files with proper timing"""
        try:
            srt_output_file = os.path.splitext(output_mp3_file)[0] + ".srt"
            srt_entries = []
            current_time_offset = 0.0  # Tính bằng giây
            subtitle_id = 1

            # Helper function để chuyển SRT time thành seconds
            def srt_time_to_seconds(time_str):
                time_str = time_str.replace(',', '.')
                parts = time_str.split(':')
                hours = float(parts[0])
                minutes = float(parts[1])
                seconds = float(parts[2])
                return hours * 3600 + minutes * 60 + seconds

            # Xác định danh sách file cần xử lý
            if hasattr(self, 'audio_files') and self.audio_files:
                # Import Voice mode
                mp3_files_to_process = self.audio_files
            else:
                # Import File mode
                mp3_files_to_process = [
                    os.path.join(
                        self.audio_dir, f"{
                            subtitle.output_name}.mp3") for subtitle in self.subtitles]

            for mp3_file in mp3_files_to_process:
                if not os.path.exists(mp3_file):
                    continue

                # Đọc duration của MP3
                try:
                    audio = AudioSegment.from_mp3(mp3_file)
                    duration_seconds = len(audio) / 1000.0
                except BaseException:
                    duration_seconds = 5.0  # Fallback duration

                # Tìm file SRT tương ứng
                srt_file = os.path.splitext(mp3_file)[0] + ".srt"
                file_end_time = current_time_offset + \
                    duration_seconds  # Mặc định dùng duration MP3

                if os.path.exists(srt_file):
                    # Đọc và parse SRT
                    try:
                        with open(srt_file, 'r', encoding='utf-8') as f:
                            srt_content = f.read().strip()

                        # Parse SRT content để lấy tất cả entries với timing
                        # gốc
                        srt_blocks = srt_content.split('\n\n')
                        max_end_time = 0.0  # Track thời gian kết thúc cuối cùng trong SRT

                        for block in srt_blocks:
                            lines = block.strip().split('\n')
                            if len(lines) >= 3:
                                # Lấy timing gốc từ dòng thứ 2
                                timing_line = lines[1]
                                if '-->' in timing_line:
                                    # Parse timing gốc
                                    start_str, end_str = timing_line.split(
                                        '-->')
                                    start_str = start_str.strip()
                                    end_str = end_str.strip()

                                    original_start = srt_time_to_seconds(
                                        start_str)
                                    original_end = srt_time_to_seconds(end_str)

                                    # Track thời gian kết thúc cuối cùng trong
                                    # file SRT này
                                    max_end_time = max(
                                        max_end_time, original_end)

                                    # Tính timing mới = timing gốc + offset
                                    new_start = current_time_offset + original_start
                                    new_end = current_time_offset + original_end

                                    # Lấy text content
                                    text_content = '\n'.join(lines[2:])

                                    if text_content.strip():
                                        # Format timing theo chuẩn SRT
                                        start_srt = self.seconds_to_srt_time(
                                            new_start)
                                        end_srt = self.seconds_to_srt_time(
                                            new_end)

                                        # Thêm vào danh sách tổng
                                        srt_entries.append({
                                            'id': subtitle_id,
                                            'start': start_srt,
                                            'end': end_srt,
                                            'text': text_content
                                        })
                                        subtitle_id += 1

                        # Cập nhật file_end_time dựa trên SRT thực tế
                        if max_end_time > 0:
                            file_end_time = current_time_offset + max_end_time

                    except Exception as e:
                        print(f"Error reading SRT file {srt_file}: {str(e)}")

                # Cập nhật offset time dựa trên thời gian kết thúc thực tế
                current_time_offset = file_end_time

                # Thêm delay time nếu có
                if self.is_delay_join.get():
                    current_time_offset += self.delay_join_time.get()

            # Ghi file SRT tổng hợp
            if srt_entries:
                with open(srt_output_file, 'w', encoding='utf-8') as f:
                    for entry in srt_entries:
                        f.write(f"{entry['id']}\n")
                        f.write(f"{entry['start']} --> {entry['end']}\n")
                        f.write(f"{entry['text']}\n\n")

                print(
                    f"SRT file created: {
                        os.path.basename(srt_output_file)} with {
                        len(srt_entries)} entries")

        except Exception as e:
            print(f"Error joining SRT files: {str(e)}")

    def seconds_to_srt_time(self, seconds):
        """Convert seconds to SRT time format: HH:MM:SS,mmm"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"

    def import_folder(self):
        lang = self.languages[self.current_language]
        folder = filedialog.askdirectory(title=lang['import_folder'])
        if not folder:
            return

        self.project_dir = folder
        self.audio_dir = os.path.join(get_app_path(), "ImportFolder")
        if not os.path.exists(self.audio_dir):
            os.makedirs(self.audio_dir)

        self.subtitles.clear()
        for item in self.subtitle_tree.get_children():
            self.subtitle_tree.delete(item)

        # Lấy danh sách file .txt và sắp xếp natural sorting
        txt_files = [f for f in os.listdir(folder) if f.endswith('.txt')]

        # Natural sort function
        def natural_sort_key(text):
            import re
            return [int(c) if c.isdigit() else c.lower()
                    for c in re.split(r'(\d+)', text)]

        txt_files.sort(key=natural_sort_key)

        # Xử lý từng file
        for filename in txt_files:
            filepath = os.path.join(folder, filename)
            try:
                # Đọc file với encoding utf-8, nếu lỗi thử latin-1
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                except UnicodeDecodeError:
                    with open(filepath, 'r', encoding='latin-1') as f:
                        content = f.read()

                # Chuẩn hóa line ending: CR LF, CR hoặc LF đều về LF
                content = content.replace('\r\n', '\n').replace('\r', '\n')
                content = content.strip()

                # Bỏ qua file rỗng
                if not content:
                    print(f"Skipped empty file: {filename}")
                    continue

                subtitle_id = len(self.subtitles) + 1
                output_name = filename.replace('.txt', '')

                subtitle = SubtitleItem(
                    subtitle_id, content, output_name=output_name)
                self.subtitles.append(subtitle)

            except Exception as e:
                print(f"Error reading file {filename}: {str(e)}")
                continue

        self.refresh_subtitle_list()
        self.status_var.set(
            lang['subtitles_loaded'].format(len(self.subtitles)))

    def import_voice(self):
        """Import audio files from a folder for joining MP3"""
        lang = self.languages[self.current_language]
        folder = filedialog.askdirectory(title=lang['import_folder'])
        if not folder:
            return

        # Thiết lập project_dir và audio_dir
        self.project_dir = folder
        self.audio_dir = os.path.join(get_app_path(), "ImportVoice")

        # Khởi tạo hoặc clear danh sách audio_files
        self.audio_files = []

        # Lấy danh sách file MP3 trong thư mục, chỉ lấy file có tên là số
        # (1.mp3, 2.mp3, ...)
        audio_files = []
        for filename in os.listdir(folder):
            if filename.endswith('.mp3'):
                try:
                    num = int(
                        ''.join(
                            filter(
                                str.isdigit,
                                filename.split('.')[0])))
                    audio_files.append((num, os.path.join(folder, filename)))
                except ValueError:
                    continue  # Bỏ qua nếu không phải số

        if not audio_files:
            messagebox.showwarning(lang['warning'], lang['no_valid_mp3_files'])
            return

        # Sắp xếp theo số thứ tự
        audio_files.sort(key=lambda x: x[0])
        self.audio_files = [path for _, path in audio_files]

        # Xóa các mục hiện có trong subtitle_tree để tránh trùng lặp
        for item in self.subtitle_tree.get_children():
            self.subtitle_tree.delete(item)

        # Cập nhật subtitle_tree để hiển thị các file audio
        for i, audio_path in enumerate(self.audio_files):
            self.subtitle_tree.insert('', 'end', values=(
                i + 1,
                # Hiển thị tên file (e.g., 1.mp3)
                os.path.basename(audio_path),
                "00:00:00",  # Timing mặc định
                "",  # Content để trống
                "",  # Voice để trống
                "Imported"  # Trạng thái
            ))

        messagebox.showinfo(
            lang['success'],
            lang['import_audio_success'].format(
                len(audio_files)))

    def add_to_library(self):
        """Add current voice configuration to library with duplicate checking"""
        lang = self.languages[self.current_language]

        # Check if voice ID is validated
        voice_id = self.name_var.get().strip().lstrip('/')
        if not voice_id:
            messagebox.showwarning(
                lang['warning'],
                lang['please_enter_voice_id_warning'])
            return

        # Check if voice ID has been validated
        voice_name = self.voice_name_var.get()
        if not voice_name or voice_name in [
                lang['please_enter_voice_id'],
                lang['invalid_format'],
                lang['checking'],
                lang['no_api_key_status'],
                lang['network_error'],
                lang['voice_id_not_found']]:
            messagebox.showwarning(lang['warning'], lang['no_voice'])
            return

        # Create preset from current settings
        voice_name = self.voice_name_var.get()
        preset = VoicePreset(
            name=f"Voice_{voice_id[:8]}_Preset",
            voice_id=voice_id,
            voice_name=voice_name,
            model_id=self.model_var.get(),
            settings={
                "speed": self.speed_var.get(),
                "stability": self.stability_var.get() / 100.0,
                "similarity_boost": self.similarity_var.get() / 100.0,
                "style": self.style_var.get() / 100.0,
                "use_speaker_boost": self.speaker_boost_var.get()
            }
        )
        preset.project = ""  # Thêm project field mặc định

        # Check for duplicates based on voice_id and model_id
        for existing_preset in self.voice_presets:
            if (existing_preset.voice_id == preset.voice_id and
                    existing_preset.model_id == preset.model_id):
                if messagebox.askyesno(
                        lang['warning'],
                        lang['voice_duplicate']):
                    # Overwrite: remove old preset
                    self.voice_presets.remove(existing_preset)
                    break
                else:
                    return  # Don't add if user chooses not to overwrite

        # Add new preset to library
        self.voice_presets.append(preset)
        self.save_config()
        messagebox.showinfo(lang['success'], lang['voice_added'])

    def show_library(self):
        """Show voice library"""
        lang = self.languages[self.current_language]

        library_window = tk.Toplevel(self.root)
        library_window.title(lang['voice_library'])
        library_window.geometry("1100x400")

        # Tạo Treeview với cột 'Project' sau 'Local_Id'
        columns = (
            'ID',
            'Local_Id',
            'Project',
            'ElevenLabs_Id',
            'Voice_Name',
            'Speed',
            'Stability',
            'Similarity',
            'Style',
            'SpeakerBoost',
            'Model')
        tree = ttk.Treeview(
            library_window,
            columns=columns,
            show='headings',
            height=15)

        # Set headings
        tree.heading('ID', text='Id')
        tree.heading('Local_Id', text='ID')
        tree.heading('Project', text='Project')
        tree.heading('ElevenLabs_Id', text='ElevenLabs_Id')
        tree.heading('Voice_Name', text='Voice Name')
        tree.heading('Speed', text='Speed')
        tree.heading('Stability', text='Stability')
        tree.heading('Similarity', text='Similarity')
        tree.heading('Style', text='Style')
        tree.heading('SpeakerBoost', text='Speaker Boost')  # THÊM DÒNG NÀY
        tree.heading('Model', text='Model')

        # Set column widths và căn giữa
        tree.column('ID', width=0, stretch=False)  # Hidden
        tree.column('Local_Id', width=40, anchor='center')
        tree.column('Project', width=80, anchor='center')
        tree.column('ElevenLabs_Id', width=150, anchor='center')
        tree.column('Voice_Name', width=100, anchor='center')
        tree.column('Speed', width=50, anchor='center')
        tree.column('Stability', width=60, anchor='center')
        tree.column('Similarity', width=60, anchor='center')
        tree.column('Style', width=40, anchor='center')
        tree.column('SpeakerBoost', width=80, anchor='center')
        tree.column('Model', width=120, anchor='center')

        # Add scrollbar
        scrollbar = ttk.Scrollbar(
            library_window,
            orient='vertical',
            command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)

        # Pack tree and scrollbar
        tree.grid(row=0, column=0, sticky='nsew', padx=(10, 0), pady=10)
        scrollbar.grid(row=0, column=1, sticky='ns', pady=10, padx=(0, 10))

        # Configure grid weights
        library_window.grid_rowconfigure(0, weight=1)
        library_window.grid_columnconfigure(0, weight=1)

        # Add data
        for i, preset in enumerate(self.voice_presets):
            if not hasattr(preset, 'project'):
                preset.project = ""
            tree.insert('', 'end', values=(
                i,  # Hidden ID
                str(i + 1),  # Local_Id
                preset.project,  # Project
                preset.voice_id,
                preset.voice_name,
                f"{preset.settings.get('speed', 1.0):.2f}",
                f"{preset.settings.get('stability', 0.5):.0%}",
                f"{preset.settings.get('similarity_boost', 0.75):.0%}",
                f"{preset.settings.get('style', 0):.0%}",
                "Yes" if preset.settings.get(
                    'use_speaker_boost', False) else "No",  # THÊM DÒNG NÀY
                preset.model_id
            ))

        # Chức năng chỉnh sửa các cột khi nhấp đúp
        def on_double_click(event):
            item = tree.identify_row(event.y)
            column = tree.identify_column(event.x)
            if not item or column not in [
                '#3',
                '#4',
                '#5',
                '#6',
                '#7',
                '#8',
                '#9',
                '#10',
                    '#11']:  # THÊM '#10' CHO SPEAKERBOOST
                return

            bbox = tree.bbox(item, column)
            if not bbox:
                return

            values = tree.item(item)['values']
            index = values[0]  # Hidden ID

            if column == '#10':  # SpeakerBoost
                current_value = values[9]
                combo = ttk.Combobox(
                    library_window, values=[
                        "Yes", "No"], state="readonly")
                combo.set(current_value)
                combo.place(
                    x=bbox[0],
                    y=bbox[1],
                    width=bbox[2],
                    height=bbox[3])
                combo.focus()

                def save_speakerboost_combo(e=None):
                    new_value = combo.get()
                    self.voice_presets[index].settings['use_speaker_boost'] = (
                        new_value == "Yes")
                    tree.item(
                        item,
                        values=(
                            values[0],
                            values[1],
                            values[2],
                            values[3],
                            values[4],
                            values[5],
                            values[6],
                            values[7],
                            values[8],
                            new_value,
                            values[10]))
                    self.save_config()
                    combo.destroy()

                combo.bind('<<ComboboxSelected>>', save_speakerboost_combo)
                combo.bind('<Escape>', lambda e: combo.destroy())
                combo.bind('<FocusOut>', save_speakerboost_combo)

            elif column == '#11':  # Model
                current_value = values[10]
                combo = ttk.Combobox(library_window, values=[
                    "eleven_v3",
                    "eleven_multilingual_v2",
                    "eleven_turbo_v2_5",
                    "eleven_flash_v2_5",
                    "eleven_flash_v2",
                    "eleven_turbo_v2"
                ], state="readonly")

                combo.set(current_value)
                combo.place(
                    x=bbox[0],
                    y=bbox[1],
                    width=bbox[2],
                    height=bbox[3])
                combo.focus()

                def save_model_combo(e=None):
                    new_value = combo.get()
                    self.voice_presets[index].model_id = new_value
                    tree.item(
                        item,
                        values=(
                            values[0],
                            values[1],
                            values[2],
                            values[3],
                            values[4],
                            values[5],
                            values[6],
                            values[7],
                            values[8],
                            values[9],
                            new_value))
                    self.save_config()
                    combo.destroy()

                combo.bind('<<ComboboxSelected>>', save_model_combo)
                combo.bind('<Escape>', lambda e: combo.destroy())
                combo.bind('<FocusOut>', save_model_combo)

            else:
                # Các cột khác (Project, ElevenLabs_Id, Name, Speed, Stability,
                # Similarity, Style)
                col_index = int(column[1:]) - 1
                current_value = values[col_index]

                if column in [
                        '#7', '#8', '#9']:  # Stability, Similarity, Style
                    current_value = current_value.rstrip(
                        '%')  # Loại bỏ ký hiệu %

                if column in [
                        '#7', '#8', '#9']:  # Stability, Similarity, Style
                    current_value = current_value.rstrip(
                        '%')  # Loại bỏ ký hiệu %

                entry = ttk.Entry(library_window)
                entry.insert(0, current_value)
                entry.place(
                    x=bbox[0],
                    y=bbox[1],
                    width=bbox[2],
                    height=bbox[3])
                entry.focus()

                def save_edit(e=None):
                    new_value = entry.get().strip()
                    try:
                        if column == '#3':  # Project
                            self.voice_presets[index].project = new_value
                        elif column == '#4':  # ElevenLabs_Id
                            self.voice_presets[index].voice_id = new_value
                        elif column == '#5':  # Voice_Name
                            self.voice_presets[index].voice_name = new_value
                        elif column == '#6':  # Speed
                            new_value = float(new_value)
                            if not 0.7 <= new_value <= 1.2:
                                raise ValueError("Speed phải từ 0.7 đến 1.2")
                            self.voice_presets[index].settings['speed'] = new_value
                        elif column in ['#7', '#8', '#9']:  # Stability, Similarity, Style
                            new_value = int(float(new_value.rstrip('%')))
                            if not 0 <= new_value <= 100:
                                raise ValueError(
                                    f"{columns[col_index]} phải từ 0 đến 100")
                            key = {
                                '#7': 'stability',
                                '#8': 'similarity_boost',
                                '#9': 'style'}[column]
                            self.voice_presets[index].settings[key] = new_value / 100.0

                        new_values = list(values)
                        if column in ['#7', '#8', '#9']:
                            new_values[col_index] = f"{new_value:.0%}"
                        elif column == '#3':  # Project
                            new_values[col_index] = new_value
                        elif column == '#4':  # ElevenLabs_Id
                            new_values[col_index] = new_value
                        elif column == '#5':  # Name
                            new_values[col_index] = new_value
                        elif column == '#6':  # Speed
                            new_values[col_index] = f"{new_value:.2f}"
                        else:
                            new_values[col_index] = new_value
                        tree.item(item, values=new_values)
                        self.save_config()
                    except ValueError as ve:
                        messagebox.showerror("Lỗi", str(ve))
                    finally:
                        entry.destroy()

                def cancel_edit(e=None):
                    entry.destroy()

                entry.bind('<Return>', save_edit)
                entry.bind('<Escape>', cancel_edit)
                entry.bind('<FocusOut>', save_edit)

        tree.bind('<Double-1>', on_double_click)

        # Buttons at top
        button_frame = ttk.Frame(library_window)
        button_frame.grid(
            row=1,
            column=0,
            columnspan=2,
            sticky='ew',
            padx=10,
            pady=(
                0,
                10))

        def save_library():
            self.save_config()
            messagebox.showinfo(lang['success'], lang['settings_saved'])

        def delete_selected():
            selected_items = tree.selection()
            if not selected_items:
                return

            indices_to_delete = []
            for item in selected_items:
                values = tree.item(item)['values']
                indices_to_delete.append(values[0])  # Hidden ID

            if messagebox.askyesno(
                lang['delete'], f"Delete {
                    len(indices_to_delete)} item(s)?"):
                for idx in sorted(indices_to_delete, reverse=True):
                    del self.voice_presets[idx]

                self.save_config()
                library_window.destroy()
                self.show_library()

        def apply_preset():
            selection = tree.selection()
            if not selection:
                return

            item = tree.item(selection[0])
            index = item['values'][0]  # Hidden ID
            preset = self.voice_presets[index]

            self.name_var.set(preset.voice_id)
            self.speed_var.set(preset.settings['speed'])
            self.stability_var.set(preset.settings['stability'] * 100)
            self.similarity_var.set(preset.settings['similarity_boost'] * 100)
            self.style_var.set(preset.settings.get('style', 0) * 100)
            # ĐỔI TỪ 'speaker_boost' THÀNH 'use_speaker_boost'
            self.speaker_boost_var.set(
                preset.settings.get(
                    'use_speaker_boost', False))
            self.model_var.set(preset.model_id)

            self.search_voices()
            library_window.destroy()

        # Right-click context menu
        context_menu = tk.Menu(library_window, tearoff=0)
        context_menu.add_command(
            label=lang['delete'],
            command=delete_selected,
            foreground='red')

        def on_right_click(event):
            item = tree.identify_row(event.y)
            if item:
                tree.selection_set(item)
                context_menu.post(event.x_root, event.y_root)

        tree.bind('<Button-3>', on_right_click)

        # Buttons
        ttk.Button(
            button_frame,
            text=lang['save'],
            command=save_library).pack(
            side=tk.LEFT,
            padx=2)
        ttk.Button(
            button_frame,
            text=lang['apply'],
            command=apply_preset).pack(
            side=tk.LEFT,
            padx=2)
        ttk.Button(
            button_frame,
            text=lang['delete'],
            command=delete_selected).pack(
            side=tk.LEFT,
            padx=2)
        ttk.Button(
            button_frame,
            text=lang['close'],
            command=library_window.destroy).pack(
            side=tk.LEFT,
            padx=2)

    def advanced_settings(self):
        lang = self.languages[self.current_language]
        settings_window = tk.Toplevel(self.root)
        settings_window.title(lang['advanced_settings'])
        settings_window.geometry("500x350")
        style = ttk.Style()
        bg_color = style.lookup('TFrame', 'background')
        settings_window.configure(bg=bg_color)

        # Delay Join section
        ttk.Label(
            settings_window,
            text=lang['delay_between_segments']).grid(
            row=0,
            column=0,
            padx=5,
            pady=5,
            sticky=tk.W)
        ttk.Checkbutton(
            settings_window,
            variable=self.is_delay_join,
            command=lambda: self.save_config()).grid(
            row=0,
            column=1,
            padx=5,
            pady=5)
        delay_spin = ttk.Spinbox(
            settings_window,
            from_=0.0,
            to=10.0,
            increment=0.1,
            textvariable=self.delay_join_time,
            width=10)
        delay_spin.grid(row=0, column=2, padx=5, pady=5)
        # Không đặt giá trị mặc định, giữ giá trị hiện tại của
        # self.delay_join_time
        ttk.Label(
            settings_window,
            text="(s)").grid(
            row=0,
            column=3,
            padx=5,
            pady=5)
        ttk.Label(
            settings_window,
            text=lang['when_joining_files']).grid(
            row=0,
            column=4,
            padx=5,
            pady=5)

        # Silent by Character section
        group_frame = ttk.LabelFrame(
            settings_window,
            text=lang['silent_by_character'],
            padding="5")
        group_frame.grid(
            row=1,
            column=0,
            columnspan=5,
            padx=5,
            pady=5,
            sticky=(
                tk.W,
                tk.E))

        ttk.Label(
            group_frame,
            text=lang['character']).grid(
            row=0,
            column=0,
            padx=5,
            pady=5,
            sticky=tk.W)
        text1_entry = ttk.Entry(group_frame, textvariable=self.text1, width=15)
        text1_entry.grid(row=0, column=1, padx=5, pady=5)
        silent1_spin = ttk.Spinbox(
            group_frame,
            from_=0.0,
            to=10.0,
            increment=0.1,
            textvariable=self.text1_time,
            width=10)
        silent1_spin.grid(row=0, column=2, padx=5, pady=5)
        # Không đặt giá trị mặc định, giữ giá trị hiện tại của self.text1_time
        ttk.Label(
            group_frame,
            text="(s)").grid(
            row=0,
            column=3,
            padx=5,
            pady=5)

        ttk.Label(
            group_frame,
            text=lang['character']).grid(
            row=1,
            column=0,
            padx=5,
            pady=5,
            sticky=tk.W)
        text2_entry = ttk.Entry(group_frame, textvariable=self.text2, width=15)
        text2_entry.grid(row=1, column=1, padx=5, pady=5)
        silent2_spin = ttk.Spinbox(
            group_frame,
            from_=0.0,
            to=10.0,
            increment=0.1,
            textvariable=self.text2_time,
            width=10)
        silent2_spin.grid(row=1, column=2, padx=5, pady=5)
        # Không đặt giá trị mặc định, giữ giá trị hiện tại của self.text2_time
        ttk.Label(
            group_frame,
            text="(s)").grid(
            row=1,
            column=3,
            padx=5,
            pady=5)

        ttk.Checkbutton(
            group_frame,
            text=lang['silent_by_character'],
            variable=self.is_auto_silent_char,
            command=lambda: self.save_config()).grid(
            row=2,
            column=0,
            columnspan=4,
            padx=5,
            pady=5)

        # Auto Replace Symbol section
        ttk.Checkbutton(
            settings_window,
            text=lang['auto_remove_special_chars'],
            variable=self.is_auto_replace_symbol,
            command=lambda: self.save_config(),
            style='Teal.TCheckbutton').grid(
            row=2,
            column=0,
            columnspan=5,
            padx=5,
            pady=5)

        # Max Length for Auto Split
        ttk.Label(
            settings_window,
            text=lang['max_segment_length']).grid(
            row=3,
            column=0,
            padx=5,
            pady=5,
            sticky=tk.W)
        max_length_spin = ttk.Spinbox(
            settings_window,
            from_=50,
            to=2000,
            increment=10,
            textvariable=self.max_length_var,
            width=10)
        max_length_spin.grid(row=3, column=1, padx=5, pady=5)
        # Không tạo lại self.max_length_var, sử dụng biến hiện có
        ttk.Label(
            settings_window,
            text=lang['characters']).grid(
            row=3,
            column=2,
            padx=5,
            pady=5)

        # OK button
        ttk.Button(
            settings_window,
            text=lang['ok'],
            command=lambda: [
                self.save_config(),
                settings_window.destroy()]).grid(
            row=4,
            column=0,
            columnspan=5,
            pady=10)

        # Configure style for Teal color
        self.style.configure('Teal.TCheckbutton', foreground='teal')

    def test_connection(self, provider):
        lang = self.languages[self.current_language]
        api_key = self.api_key
        if not api_key:
            if hasattr(
                    self,
                    'status_labels') and provider in self.status_labels:
                self.status_labels[provider].config(
                    text=lang['no_api_key_provided'], style='TLabel')
            return

        if provider == 'elevenlabs':
            # Show testing status immediately
            if hasattr(
                    self,
                    'status_labels') and provider in self.status_labels:
                self.status_labels[provider].config(
                    text="Testing...", style='TLabel')

            # Disable test button temporarily
            if hasattr(self, 'test_connection_btn'):
                self.test_connection_btn.config(
                    state='disabled', text="Testing...")

            def test_in_thread():
                try:
                    print(
                        f"DEBUG: Testing connection to {
                            ElevenLabsAPI.BASE_URL}")
                    print(
                        f"DEBUG: API Key (first 10 chars): {api_key[:10]}...")

                    # Test với TTS endpoint thật
                    headers = {
                        "Content-Type": "application/json",
                        "xi-api-key": api_key
                    }
                    test_data = {
                        "text": "x",
                        "model_id": "eleven_multilingual_v2",
                        "voice_settings": {
                            "stability": 0.5,
                            "similarity_boost": 0.75,
                            "style": 0.0,
                            "speed": 1.0,
                            "use_speaker_boost": False
                        }
                    }

                    print(f"DEBUG: Headers: {headers}")
                    print(f"DEBUG: Test data: {test_data}")

                    response = requests.post(
                        f"{ElevenLabsAPI.BASE_URL}/v1/text-to-speech/pNInz6obpgDQGcFmaJgB?output_format=mp3_44100_128",
                        json=test_data,
                        headers=headers,
                        timeout=5
                    )

                    print(
                        f"DEBUG: Response status code: {
                            response.status_code}")
                    print(f"DEBUG: Response headers: {dict(response.headers)}")
                    print(
                        f"DEBUG: Response content (first 500 chars): {response.text[:500]}")

                    def update_success():
                        if hasattr(
                                self, 'status_labels') and provider in self.status_labels:
                            self.status_labels[provider].config(
                                text=lang['connection_success'], style='Success.TLabel')
                        if hasattr(self, 'test_connection_btn'):
                            self.test_connection_btn.config(
                                state='normal', text=lang['test_connection'])

                    def update_failed():
                        if hasattr(
                                self, 'status_labels') and provider in self.status_labels:
                            self.status_labels[provider].config(
                                text=lang['connection_failed'], style='Error.TLabel')
                        if hasattr(self, 'test_connection_btn'):
                            self.test_connection_btn.config(
                                state='normal', text=lang['test_connection'])

                    def update_maintenance():
                        if hasattr(
                                self, 'status_labels') and provider in self.status_labels:
                            self.status_labels[provider].config(
                                text=lang['server_maintenance'], style='Error.TLabel')
                        if hasattr(self, 'test_connection_btn'):
                            self.test_connection_btn.config(
                                state='normal', text=lang['test_connection'])

                    if response.status_code == 200:
                        self.root.after(0, update_success)
                    elif response.status_code == 400:
                        self.root.after(0, update_maintenance)
                    else:
                        self.root.after(0, update_failed)

                except requests.exceptions.ConnectionError as e:
                    print(f"DEBUG: ConnectionError details: {str(e)}")

                    def update_error():
                        if hasattr(
                                self, 'status_labels') and provider in self.status_labels:
                            self.status_labels[provider].config(
                                text=lang['connection_failed'], style='Error.TLabel')
                        if hasattr(self, 'test_connection_btn'):
                            self.test_connection_btn.config(
                                state='normal', text=lang['test_connection'])
                    self.root.after(0, update_error)
                except requests.exceptions.Timeout as e:
                    print(f"DEBUG: Timeout error details: {str(e)}")

                    def update_error():
                        if hasattr(
                                self, 'status_labels') and provider in self.status_labels:
                            self.status_labels[provider].config(
                                text=lang['connection_failed'], style='Error.TLabel')
                        if hasattr(self, 'test_connection_btn'):
                            self.test_connection_btn.config(
                                state='normal', text=lang['test_connection'])
                    self.root.after(0, update_error)
                except requests.exceptions.RequestException as e:
                    print(f"DEBUG: Request exception details: {str(e)}")

                    def update_error():
                        if hasattr(
                                self, 'status_labels') and provider in self.status_labels:
                            self.status_labels[provider].config(
                                text=lang['connection_failed'], style='Error.TLabel')
                        if hasattr(self, 'test_connection_btn'):
                            self.test_connection_btn.config(
                                state='normal', text=lang['test_connection'])
                    self.root.after(0, update_error)
                except Exception as e:
                    print(
                        f"DEBUG: Unexpected error: {
                            type(e).__name__}: {
                            str(e)}")
                    import traceback
                    traceback.print_exc()

                    def update_error():
                        if hasattr(
                                self, 'status_labels') and provider in self.status_labels:
                            self.status_labels[provider].config(
                                text=lang['connection_failed'], style='Error.TLabel')
                        if hasattr(self, 'test_connection_btn'):
                            self.test_connection_btn.config(
                                state='normal', text=lang['test_connection'])
                    self.root.after(0, update_error)

            # Run test in background thread
            threading.Thread(target=test_in_thread, daemon=True).start()

    def open_docs(self, provider):
        """Open API documentation in browser"""
        webbrowser.open(self.api_docs[provider])

    def save_all_settings(self):
        """Save all API settings"""
        lang = self.languages[self.current_language]
        self.save_config()
        messagebox.showinfo(lang['success'], lang['settings_saved'])

    def check_credits_and_server(self):
        """Check credits and server status"""
        lang = self.languages[self.current_language]

        if not self.api_key:
            messagebox.showwarning(lang['warning'], lang['no_api_key'])
            return

        def check_in_thread():
            try:
                print(f"DEBUG: Checking credits and server status")
                print(f"DEBUG: Base URL: {ElevenLabsAPI.BASE_URL}")
                print(
                    f"DEBUG: API Key (first 10 chars): {self.api_key[:10]}...")

                # Get credits
                print("DEBUG: Sending credits request...")
                credits_response = requests.get(
                    f"{ElevenLabsAPI.BASE_URL}/v1/credits",
                    headers={"xi-api-key": self.api_key},
                    timeout=10
                )
                print(
                    f"DEBUG: Credits response - Status: {credits_response.status_code}")
                print(
                    f"DEBUG: Credits response - Headers: {dict(credits_response.headers)}")
                print(
                    f"DEBUG: Credits response - Body: {credits_response.text}")

                # Get health check
                print("DEBUG: Sending health check request...")
                health_response = requests.get(
                    f"{ElevenLabsAPI.BASE_URL}/v1/health-check",
                    headers={"xi-api-key": self.api_key},
                    timeout=10
                )
                print(
                    f"DEBUG: Health response - Status: {health_response.status_code}")
                print(
                    f"DEBUG: Health response - Headers: {dict(health_response.headers)}")
                print(f"DEBUG: Health response - Body: {health_response.text}")

                def update_ui():
                    # Update credits
                    if credits_response.status_code == 200:
                        try:
                            credits_data = credits_response.json()
                            print(f"DEBUG: Credits JSON data: {credits_data}")
                            if credits_data.get('success'):
                                credits = credits_data.get(
                                    'credits', 'Unknown')
                                print(f"DEBUG: Extracted credits: {credits}")
                                self.update_credits_display(credits)
                            else:
                                print("DEBUG: Credits response success=False")
                        except Exception as e:
                            print(
                                f"DEBUG: Error parsing credits JSON: {
                                    str(e)}")
                    else:
                        print(
                            f"DEBUG: Credits request failed with status {
                                credits_response.status_code}")

                    # Update server status
                    if health_response.status_code == 200:
                        try:
                            health_data = health_response.json()
                            print(f"DEBUG: Health JSON data: {health_data}")
                            if health_data.get('success'):
                                elevenlabs_status = health_data.get(
                                    'data', {}).get('elevenlabs', 'unknown')
                                print(
                                    f"DEBUG: Extracted server status: {elevenlabs_status}")
                                status_colors = {
                                    'good': 'green',
                                    'degraded': 'orange',
                                    'overloaded': 'red'
                                }
                                status_translations = {
                                    'good': lang['good'],
                                    'degraded': lang['degraded'],
                                    'overloaded': lang['overloaded']
                                }
                                color = status_colors.get(
                                    elevenlabs_status, 'black')
                                translated_status = status_translations.get(
                                    elevenlabs_status, elevenlabs_status.title())
                                self.server_status_label.config(
                                    text=f"{lang['server_status']}: {translated_status}",
                                    foreground=color
                                )
                            else:
                                print("DEBUG: Health response success=False")
                                self.server_status_label.config(
                                    text=f"{lang['server_status']}: Error", foreground='red')
                        except Exception as e:
                            print(
                                f"DEBUG: Error parsing health JSON: {
                                    str(e)}")
                            self.server_status_label.config(
                                text=f"{lang['server_status']}: Parse Error", foreground='red')
                    else:
                        print(
                            f"DEBUG: Health request failed with status {
                                health_response.status_code}")
                        self.server_status_label.config(
                            text=f"{lang['server_status']}: Unavailable", foreground='red')

                self.root.after(0, update_ui)

            except requests.exceptions.ConnectionError as e:
                print(f"DEBUG: ConnectionError in check_credits: {str(e)}")

                def update_error():
                    self.server_status_label.config(
                        text=f"{
                            lang['server_status']}: Connection Error",
                        foreground='red')
                self.root.after(0, update_error)
            except requests.exceptions.Timeout as e:
                print(f"DEBUG: Timeout in check_credits: {str(e)}")

                def update_error():
                    self.server_status_label.config(
                        text=f"{
                            lang['server_status']}: Timeout Error",
                        foreground='red')
                self.root.after(0, update_error)
            except Exception as e:
                print(
                    f"DEBUG: Unexpected error in check_credits: {
                        type(e).__name__}: {
                        str(e)}")
                import traceback
                traceback.print_exc()

                def update_error():
                    self.server_status_label.config(
                        text=f"{
                            lang['server_status']}: Connection Error",
                        foreground='red')
                self.root.after(0, update_error)

        # Run in background thread
        threading.Thread(target=check_in_thread, daemon=True).start()

    def switch_language(self, language):
        """Switch language and update UI"""
        language_map = {
            'English': 'en',
            'Tiếng Việt': 'vi'
        }
        self.current_language = language_map.get(language, 'en')
        # Đảm bảo language_var giữ giá trị đã chọn
        self.language_var.set(language)

        # Save language preference
        self.save_config()

        # Update all UI elements
        self.update_ui_language()

    def update_ui_language(self):
        """Update UI text based on current language"""
        lang = self.languages[self.current_language]

        # Update window title
        self.root.title(f"Server AI Tool KingCong V1.0")

        # Update notebook tabs
        self.notebook.tab(self.main_frame, text=lang['main_tab'])
        self.notebook.tab(self.minimax_frame, text=lang['minimax_tab'])
        self.notebook.tab(self.api_config_frame, text=lang['api_config_tab'])
        self.notebook.tab(self.about_frame, text=lang['about_tab'])

        # Đồng bộ menu ngôn ngữ
        if hasattr(self, 'language_var'):
            language_map = {
                'en': 'English',
                'vi': 'Tiếng Việt'
            }
            self.language_var.set(
                language_map.get(
                    self.current_language,
                    'English'))

        # Voice frame
        if self.main_frame.grid_slaves(row=0, column=0):
            voice_frame = self.main_frame.grid_slaves(row=0, column=0)[0]
            voice_frame.config(text=lang['voice'])
            if voice_frame.grid_slaves(row=0, column=0):
                voice_frame.grid_slaves(
                    row=0, column=0)[0].config(
                    text=lang['voice_id'])
            if voice_frame.grid_slaves(row=0, column=2):
                voice_frame.grid_slaves(
                    row=0, column=2)[0].config(
                    text=lang.get(
                        'search', 'Search'))
            if voice_frame.grid_slaves(row=1, column=0):
                voice_frame.grid_slaves(
                    row=1, column=0)[0].config(
                    text=lang['voice_name'])
            if voice_frame.grid_slaves(row=1, column=2):
                voice_frame.grid_slaves(
                    row=1, column=2)[0].config(
                    text=lang['add_to_library'])
            if voice_frame.grid_slaves(row=2, column=0):
                voice_frame.grid_slaves(
                    row=2, column=0)[0].config(
                    text=lang['voice_model'])
            if voice_frame.grid_slaves(row=2, column=2):
                voice_frame.grid_slaves(
                    row=2, column=2)[0].config(
                    text=lang['voice_library'])

        # Change voice setting frame
        if self.main_frame.grid_slaves(row=0, column=1):
            change_voice_frame = self.main_frame.grid_slaves(row=0, column=1)[
                0]
            change_voice_frame.config(text=lang['change_voice_setting'])
            if change_voice_frame.grid_slaves(row=0, column=0):
                change_voice_frame.grid_slaves(
                    row=0, column=0)[0].config(
                    text=lang['change_voice_setting'])
            if change_voice_frame.grid_slaves(row=1, column=0):
                change_voice_frame.grid_slaves(
                    row=1, column=0)[0].config(
                    text=lang['speed'])
            if change_voice_frame.grid_slaves(row=1, column=2):
                change_voice_frame.grid_slaves(
                    row=1, column=2)[0].config(
                    text=lang['style'])
            if change_voice_frame.grid_slaves(row=2, column=0):
                change_voice_frame.grid_slaves(
                    row=2, column=0)[0].config(
                    text=lang['stability'])
            if change_voice_frame.grid_slaves(row=2, column=3):
                change_voice_frame.grid_slaves(
                    row=2, column=3)[0].config(
                    text=lang['speaker_boost'])
            if change_voice_frame.grid_slaves(row=3, column=0):
                change_voice_frame.grid_slaves(
                    row=3, column=0)[0].config(
                    text=lang['similarity'])

        # Options frame (đã chuyển từ row=1,column=1 thành row=0,column=2)
        if self.main_frame.grid_slaves(row=0, column=2):
            options_frame = self.main_frame.grid_slaves(row=0, column=2)[0]
            options_frame.config(text=lang['options'])
            if options_frame.grid_slaves(row=0, column=0):
                options_frame.grid_slaves(
                    row=0, column=0)[0].config(
                    text=lang['loop'])
            if options_frame.grid_slaves(row=0, column=1):
                options_frame.grid_slaves(
                    row=0, column=1)[0].config(
                    text=lang['auto_split'])
            if options_frame.grid_slaves(row=1, column=0):
                options_frame.grid_slaves(
                    row=1, column=0)[0].config(
                    text=lang['auto_srt'])
            if options_frame.grid_slaves(row=1, column=1):
                options_frame.grid_slaves(
                    row=1, column=1)[0].config(
                    text=lang['one_line_one_file'])
            if options_frame.grid_slaves(row=2, column=0):
                options_frame.grid_slaves(
                    row=2, column=0)[0].config(
                    text=lang['advanced_settings'])

        # Threads frame
        if self.main_frame.grid_slaves(row=0, column=3):
            threads_frame = self.main_frame.grid_slaves(row=0, column=3)[0]
            threads_frame.config(text=lang['threads'])

            if threads_frame.grid_slaves(row=0, column=0):
                threads_frame.grid_slaves(
                    row=0, column=0)[0].config(
                    text=lang['thread'])

        # Subtitle frame
        self.subtitle_label.config(text=lang['subtitles'].format(0, 0, 0, 0))
        if self.subtitle_label.grid_slaves(row=0, column=0):
            button_frame = self.subtitle_label.grid_slaves(row=0, column=0)[0]
            buttons = button_frame.pack_slaves()
            if len(buttons) >= 8:
                buttons[0].config(text=lang['start'])
                buttons[1].config(text=lang['stop'])
                buttons[2].config(text=lang['import_file'])
                buttons[3].config(text=lang['import_folder'])
                buttons[4].config(text=lang['import_voice'])
                buttons[5].config(text=lang['open_audio_output'])
                buttons[6].config(text=lang['join_mp3'])
                buttons[7].config(text=lang['clear_all'])
                buttons[8].config(text=lang['backup'])

        # Update subtitle tree headings
        self.subtitle_tree.heading('ID', text=lang['id'])
        self.subtitle_tree.heading('Output', text=lang['Output'])
        self.subtitle_tree.heading('Timing', text=lang['timing'])
        self.subtitle_tree.heading('Content', text=lang['Content'])
        self.subtitle_tree.heading('Voice', text=lang['voice_column'])
        self.subtitle_tree.heading('Status', text=lang['status'])

        # Update status bar
        self.status_var.set(lang['ready'])

        # Update API Configuration tab
        if self.api_config_frame.winfo_children():
            canvas = self.api_config_frame.winfo_children()[0]
            if canvas.winfo_children():
                scrollable_frame = canvas.winfo_children()[0]
                if scrollable_frame.winfo_children():
                    main_frame = scrollable_frame.winfo_children()[0]
                    if main_frame.winfo_children():
                        header_frame = main_frame.winfo_children()[0]
                        if header_frame.winfo_children():
                            header_frame.winfo_children()[0].config(
                                text=lang['api_key_management'])
                        if len(main_frame.winfo_children()) > 1:
                            provider_frame = main_frame.winfo_children()[1]
                            if provider_frame.winfo_children():
                                content_frame = provider_frame.winfo_children()[
                                    0]
                                if content_frame.winfo_children():
                                    key_frame = content_frame.winfo_children()[
                                        0]
                                    if key_frame.winfo_children():
                                        key_frame.winfo_children()[0].config(
                                            text=lang['api_key_label'])
                                        if len(key_frame.winfo_children()) > 3:
                                            buttons_frame = key_frame.winfo_children()[
                                                3]
                                            if buttons_frame.winfo_children():
                                                buttons_frame.winfo_children()[0].config(
                                                    text=lang['save'])
                                                if len(
                                                        buttons_frame.winfo_children()) > 1:
                                                    buttons_frame.winfo_children()[1].config(
                                                        text=lang['delete'])
                                                if len(
                                                        buttons_frame.winfo_children()) > 2:
                                                    buttons_frame.winfo_children()[2].config(
                                                        text=lang['test_connection'])
                                                if len(
                                                        buttons_frame.winfo_children()) > 3:
                                                    buttons_frame.winfo_children()[3].config(
                                                        text=lang['get_api_key'])
                                    if len(content_frame.winfo_children()) > 1:
                                        info_frame = content_frame.winfo_children()[
                                            1]
                                        if info_frame.winfo_children():
                                            info_frame.winfo_children()[0].config(
                                                text=lang['status_not_configured'])
                            if len(main_frame.winfo_children()) > 2:
                                adv_frame = main_frame.winfo_children()[2]
                                adv_frame.config(
                                    text=lang['advanced_settings'])
                                if adv_frame.winfo_children():
                                    timeout_frame = adv_frame.winfo_children()[
                                        0]
                                    if timeout_frame.winfo_children():
                                        timeout_frame.winfo_children()[0].config(
                                            text=lang['request_timeout'])
                                        if len(
                                                timeout_frame.winfo_children()) > 2:
                                            timeout_frame.winfo_children()[2].config(
                                                text=lang['save_all'])

                            # Update Credits Display frame
                            if len(main_frame.winfo_children()) > 3:
                                credits_frame = main_frame.winfo_children()[3]
                                credits_frame.config(text="API Credits")

                                # Update credits label và usage label
                                if hasattr(
                                        self, 'credits_label') and hasattr(
                                        self, 'usage_label'):
                                    # Lấy credits hiện tại từ text
                                    current_credits_text = self.credits_label.cget(
                                        'text')
                                    if ':' in current_credits_text:
                                        credits_value = current_credits_text.split(':', 1)[
                                            1].strip()
                                    else:
                                        credits_value = 'Not checked'

                                    # Cập nhật với ngôn ngữ mới
                                    self.credits_label.config(
                                        text=f"{lang['credits']}: {credits_value}")
                                    self.usage_label.config(
                                        text=f"{
                                            lang['usage_period']}: {
                                            lang['unlimited']}")

        # Update About tab (2-column layout)
        if self.about_frame.winfo_children():
            about_canvas = self.about_frame.winfo_children()[0]
            if about_canvas.winfo_children():
                about_scrollable_frame = about_canvas.winfo_children()[0]
                if about_scrollable_frame.winfo_children():
                    about_main_frame = about_scrollable_frame.winfo_children()[
                        0]
                    if len(about_main_frame.winfo_children()) >= 2:
                        # Left frame (column 0)
                        left_frame = about_main_frame.winfo_children()[0]
                        if left_frame.winfo_children():
                            # Tool Introduction
                            if len(left_frame.winfo_children()) > 0:
                                intro_frame = left_frame.winfo_children()[0]
                                intro_frame.config(text=lang['tool_intro'])
                                if intro_frame.winfo_children():
                                    intro_frame.winfo_children()[0].config(
                                        text=lang['tool_intro_text'])
                            # Tool Functions
                            if len(left_frame.winfo_children()) > 1:
                                functions_frame = left_frame.winfo_children()[
                                    1]
                                functions_frame.config(
                                    text=lang['tool_functions'])
                                if functions_frame.winfo_children():
                                    functions_frame.winfo_children()[0].config(
                                        text=lang['tool_functions_text'])
                            # Usage Guide
                            if len(left_frame.winfo_children()) > 2:
                                usage_frame = left_frame.winfo_children()[2]
                                usage_frame.config(text=lang['usage_guide'])
                                if usage_frame.winfo_children():
                                    usage_frame.winfo_children()[0].config(
                                        text=lang['usage_guide_text'])

                        # Right frame (column 1)
                        right_frame = about_main_frame.winfo_children()[1]
                        if right_frame.winfo_children():

                            # Contact
                            if len(right_frame.winfo_children()) > 0:
                                contact_frame = right_frame.winfo_children()[0]
                                contact_frame.config(text=lang['contact'])
                                if contact_frame.winfo_children():
                                    contact_frame.winfo_children()[0].config(
                                        text=lang['contact_text'])
                                    if len(contact_frame.winfo_children()) > 1:
                                        contact_button_frame = contact_frame.winfo_children()[
                                            1]
                                        if contact_button_frame.winfo_children():
                                            contact_button_frame.winfo_children()[0].config(
                                                text=lang['contact_zalo'])
                                            if len(
                                                    contact_button_frame.winfo_children()) > 1:
                                                contact_button_frame.winfo_children()[1].config(
                                                    text=lang['visit_facebook'])

        # Update Test Connection button
        if hasattr(self, 'test_connection_btn'):
            self.test_connection_btn.config(text=lang['test_connection'])

        # Update error warning bar
        if hasattr(self, 'warning_bar'):
            self.show_error_warning_status()

        # Update API tab elements
        if hasattr(self, 'server_status_label'):
            current_text = self.server_status_label.cget('text')
            if ': ' in current_text:
                status_part = current_text.split(': ', 1)[1]
                self.server_status_label.config(
                    text=f"{lang['server_status']}: {status_part}")
            else:
                self.server_status_label.config(
                    text=f"{lang['server_status']}: Unknown")

        if hasattr(self, 'check_credits_btn'):
            self.check_credits_btn.config(text=lang['check_credits_server'])


    def test_minimax_connection(self):
        """Test Minimax API connection"""
        lang = self.languages[self.current_language]
    
        self.minimax_status_label.config(text="Testing...", foreground='black')
        self.minimax_test_btn.config(state='disabled', text="Testing...")
    
        def test_thread():
            try:
                api = MinimaxAPI(self.minimax_api_key, timeout=10)
                result = api.text_to_speech(
                    text="x",
                    voice_id="273587280617676",
                    model_id="speech-2.5-hd-preview"
                )
    
                def update_ui():
                    if result[0]:
                        self.minimax_status_label.config(
                            text=lang['connection_success'], foreground='green')
                    elif result[2] == "maintenance":
                        self.minimax_status_label.config(
                            text=lang['server_maintenance'], foreground='red')
                    else:
                        self.minimax_status_label.config(
                            text=lang['connection_failed'], foreground='red')
                    self.minimax_test_btn.config(
                        state='normal', text=lang['test_connection'])
    
                self.root.after(0, update_ui)
            except Exception:
                def update_error():
                    self.minimax_status_label.config(
                        text=lang['connection_failed'], foreground='red')
                    self.minimax_test_btn.config(
                        state='normal', text=lang['test_connection'])
                self.root.after(0, update_error)
    
        threading.Thread(target=test_thread, daemon=True).start()
    
    
    def show_minimax_voice_browser(self):
        """Show Minimax voice browser"""
        lang = self.languages[self.current_language]
        messagebox.showinfo(
            lang['info'],
            "Minimax Voice Browser - Coming Soon!\nPlease enter Voice ID directly.")
    
    
    def start_minimax_processing(self):
        """Start processing with Minimax API"""
        lang = self.languages[self.current_language]
    
        if not self.minimax_voice_id_var.get().strip():
            messagebox.showwarning(
                lang['warning'],
                lang['please_enter_voice_id_warning'])
            return
    
        if not self.subtitles:
            messagebox.showwarning(lang['warning'], lang['no_subtitles'])
            return
    
        self.is_running = True
        self.start_time = time.time()
        self.processed_count = 0
    
        thread = threading.Thread(target=self.process_minimax_subtitles)
        thread.daemon = True
        thread.start()
    
        self.update_ui()
    
    
    def process_minimax_subtitles(self):
        """Process subtitles with Minimax API"""
        lang = self.languages[self.current_language]
    
        voice_id = self.minimax_voice_id_var.get().strip()
        model_id = self.minimax_model_var.get()
    
        if self.minimax_change_settings_var.get():
            voice_settings = {
                "speed": float(self.minimax_speed_var.get()),
                "pitch": self.minimax_pitch_var.get(),
                "volume": float(self.minimax_volume_var.get())
            }
        else:
            voice_settings = {"speed": 1.0, "pitch": 0, "volume": 1.0}
    
        api = MinimaxAPI(self.minimax_api_key, timeout=None)
    
        for i, subtitle in enumerate(self.subtitles):
            if not self.is_running or subtitle.is_processed:
                continue
    
            self.update_subtitle_status(i, lang['generating_audio'])
    
            task_id, credits, error = api.text_to_speech(
                subtitle.text, voice_id, model_id, voice_settings
            )
    
            if not task_id:
                subtitle.status = lang['error_try_again']
                self.update_subtitle_status(i, subtitle.status)
                continue
    
            for attempt in range(600):
                if not self.is_running:
                    break
    
                audio_url, credit_cost, srt_url, progress = api.get_task(task_id)
    
                if audio_url:
                    response = requests.get(audio_url, timeout=90)
                    if response.status_code == 200:
                        output_path = os.path.join(
                            self.audio_dir, f"{
                                subtitle.output_name}.mp3")
                        with open(output_path, 'wb') as f:
                            f.write(response.content)
    
                        subtitle.is_processed = True
                        subtitle.status = lang['done']
                        self.processed_count += 1
                        self.update_subtitle_status(i, subtitle.status)
                    break
                elif progress == -1:
                    subtitle.status = lang['failed']
                    self.update_subtitle_status(i, subtitle.status)
                    break
                else:
                    progress_text = f"{
                        lang['generating_audio']} ({progress}%)" if progress > 0 else lang['generating_audio']
                    self.update_subtitle_status(i, progress_text)
    
                time.sleep(6)
    
        self.is_running = False
        self.root.after(0, self.processing_completed)

    def clear_all(self):
        """Clear all current data and reset to initial state"""
        lang = self.languages[self.current_language]
        self.subtitles.clear()
        if hasattr(self, 'audio_files'):
            self.audio_files.clear()
        for item in self.subtitle_tree.get_children():
            self.subtitle_tree.delete(item)
        self.project_dir = ""
        self.audio_dir = ""
        self.status_var.set(lang['ready'])
        self.subtitle_label.config(text=lang['subtitles'].format(0, 0, 0, 0))
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")

    def show_backup_tasks(self):
        """Show backup tasks window"""
        lang = self.languages[self.current_language]

        # Create backup window
        backup_window = tk.Toplevel(self.root)
        backup_window.title(lang['backup_tasks'])
        backup_window.geometry("1200x530")
        backup_window.transient(self.root)

        # Center window relative to main window
        main_x = self.root.winfo_x()
        main_y = self.root.winfo_y()
        main_width = self.root.winfo_width()
        main_height = self.root.winfo_height()
        x = main_x + (main_width // 2) - 600  # 600 is half of window width
        y = main_y + (main_height // 2) - 265  # 300 is half of window height
        backup_window.geometry(f"1200x530+{x}+{y}")

        # Control buttons frame
        control_frame = ttk.Frame(backup_window)
        control_frame.pack(fill='x', padx=10, pady=5)

        ttk.Button(
            control_frame,
            text=lang['refresh'],
            command=lambda: self.refresh_backup_tasks(backup_tree)).pack(
            side='left',
            padx=5)
        ttk.Button(
            control_frame,
            text=lang['delete_all_tasks'],
            command=lambda: self.delete_all_tasks(
                backup_tree,
                lang)).pack(
            side='left',
            padx=5)
        ttk.Button(control_frame, text=lang['close'],
                   command=backup_window.destroy).pack(side='right', padx=5)
        ttk.Button(
            control_frame,
            text=lang['open_download_folder'],
            command=self.open_download_folder).pack(
            side='right',
            padx=5)
        ttk.Button(
            control_frame,
            text=lang['download_selected'],
            command=lambda: self.download_selected_tasks(
                backup_tree,
                lang)).pack(
            side='right',
            padx=5)

        # Tasks table frame
        table_frame = ttk.Frame(backup_window)
        table_frame.pack(fill='both', expand=True, padx=10, pady=5)

        # Create treeview with columns
        columns = (
            'task_id',
            'project',
            'voice_id',
            'voice_name',
            'status',
            'credits',
            'created_date',
            'download',
            'details',
            'delete')
        backup_tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show='headings',
            height=15)

        # Set headings
        backup_tree.heading('task_id', text=lang['task_id'])
        backup_tree.heading('project', text=lang['project'])
        backup_tree.heading('voice_id', text=lang['voice_id'])
        backup_tree.heading('voice_name', text=lang['voice_name'])
        backup_tree.heading('status', text=lang['status'])
        backup_tree.heading('credits', text=lang['credits'])
        backup_tree.heading('created_date', text=lang['created_date'])
        backup_tree.heading('download', text=lang['download'])
        backup_tree.heading('details', text=lang['details'])
        backup_tree.heading('delete', text=lang['delete'])

        # Set column widths
        backup_tree.column('task_id', width=200, anchor='center')
        backup_tree.column('project', width=100, anchor='center')
        backup_tree.column('voice_id', width=150, anchor='center')
        backup_tree.column('voice_name', width=120, anchor='center')
        backup_tree.column('status', width=90, anchor='center')
        backup_tree.column('credits', width=60, anchor='center')
        backup_tree.column('created_date', width=130, anchor='center')
        backup_tree.column('download', width=80, anchor='center')
        backup_tree.column('details', width=80, anchor='center')
        backup_tree.column('delete', width=80, anchor='center')

        # Add scrollbar
        scrollbar = ttk.Scrollbar(
            table_frame,
            orient='vertical',
            command=backup_tree.yview)
        backup_tree.configure(yscrollcommand=scrollbar.set)

        backup_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')

        # Pagination frame
        page_frame = ttk.Frame(backup_window)
        page_frame.pack(fill='x', padx=10, pady=5)

        self.current_page = 1
        self.total_pages = 1

        self.prev_btn = ttk.Button(
            page_frame,
            text="◄",
            state='disabled',
            command=lambda: self.go_prev_page(backup_tree))
        self.prev_btn.pack(side='left', padx=5)

        self.page_label = ttk.Label(
            page_frame, text=f"{lang['page']} {self.current_page}/{self.total_pages}")
        self.page_label.pack(side='left', padx=10)

        self.next_btn = ttk.Button(
            page_frame,
            text="►",
            state='disabled',
            command=lambda: self.go_next_page(backup_tree))
        self.next_btn.pack(side='left', padx=5)

        # Bind double click events
        backup_tree.bind(
            '<Double-1>',
            lambda e: self.on_backup_tree_click(
                e,
                backup_tree,
                lang))

        # Load initial data
        self.refresh_backup_tasks(backup_tree)

    def refresh_backup_tasks(self, tree):
        """Refresh backup tasks from API"""
        lang = self.languages[self.current_language]

        if not self.api_key:
            messagebox.showwarning(lang['warning'], lang['no_api_key'])
            return

        try:
            # Clear existing items
            for item in tree.get_children():
                tree.delete(item)

            # Get tasks from API
            response = requests.get(
                f"{ElevenLabsAPI.BASE_URL}/v1/tasks?page={self.current_page}&limit=20&type=tts",
                headers={"xi-api-key": self.api_key},
                timeout=self.timeout_var.get()
            )

            # Debug logging
            print(f"DEBUG: API Response Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()

                # Debug: Print response structure
                print(f"DEBUG: Response type: {type(data)}")
                if isinstance(data, dict):
                    print(f"DEBUG: Response keys: {list(data.keys())}")
                    if 'data' in data:
                        print(
                            f"DEBUG: 'data' field type: {
                                type(
                                    data['data'])}")

                # Parse response - handle multiple possible formats
                tasks = []
                total = 0

                # Format 1: Direct array response
                if isinstance(data, list):
                    tasks = data
                    total = len(tasks)
                    print(
                        f"DEBUG: Format 1 - Direct array with {len(tasks)} tasks")

                # Format 2: Object with various possible structures
                elif isinstance(data, dict):
                    # Check for 'data' field
                    if 'data' in data:
                        tasks = data.get('data', [])
                        # Convert total to int if it's a string
                        total_raw = data.get('total', len(tasks))
                        if isinstance(total_raw, str):
                            try:
                                total = int(total_raw)
                            except ValueError:
                                total = len(tasks)
                        else:
                            total = total_raw if isinstance(
                                total_raw, int) else len(tasks)
                        print(
                            f"DEBUG: Format 2a - Object with 'data' field, {len(tasks)} tasks, total={total}")

                    # Check for 'tasks' field
                    elif 'tasks' in data:
                        tasks = data.get('tasks', [])
                        total = data.get('total', len(tasks))
                        print(
                            f"DEBUG: Format 2b - Object with 'tasks' field, {len(tasks)} tasks")

                    # Check for any list field in the response
                    else:
                        for key, value in data.items():
                            if isinstance(value, list) and len(value) > 0:
                                # Check if it looks like task data
                                if isinstance(
                                        value[0], dict) and (
                                        'id' in value[0] or 'task_id' in value[0]):
                                    tasks = value
                                    total = len(tasks)
                                    print(
                                        f"DEBUG: Format 2c - Found tasks in '{key}' field, {len(tasks)} tasks")
                                    break

                print(f"DEBUG: Processing {len(tasks)} tasks for display")

                # Process each task
                for task in tasks:
                    try:
                        # Get task ID - check multiple possible fields
                        task_id = task.get(
                            'id', task.get(
                                'task_id', task.get(
                                    '_id', '')))
                        if not task_id:
                            print(f"DEBUG: Skipping task without ID: {task}")
                            continue

                        # Skip test connection tasks (voice_id = pNInz6obpgDQGcFmaJgB + credit_cost = 1)
                        # Hoặc text = "x"
                        voice_id_check = ''
                        credit_cost_check = task.get('credit_cost', 0)
                        text_content = ''

                        # Lấy voice_id từ nhiều vị trí có thể
                        if 'voice_id' in task:
                            voice_id_check = task.get('voice_id', '')
                        elif 'metadata' in task and isinstance(task['metadata'], dict):
                            metadata = task['metadata']
                            if 'voice_id' in metadata:
                                voice_id_check = metadata['voice_id']
                            elif 'voice_setting' in metadata and isinstance(metadata['voice_setting'], dict):
                                voice_id_check = metadata['voice_setting'].get(
                                    'voice_id', '')
                            elif 'data' in metadata and isinstance(metadata['data'], dict):
                                voice_id_check = metadata['data'].get(
                                    'voice_id', '')

                            # Lấy text
                            text_content = metadata.get('text', '')
                            if not text_content and 'data' in metadata:
                                text_content = metadata['data'].get('text', '')

                        # Skip nếu là test connection task
                        if (voice_id_check == 'pNInz6obpgDQGcFmaJgB' and credit_cost_check ==
                                1) or text_content == 'x':
                            print(
                                f"DEBUG: Skipping test connection task: {task_id}")
                            continue

                        # Format date - handle multiple formats with UTC+7
                        # conversion
                        created_at = task.get(
                            'created_at', task.get(
                                'createdAt', task.get(
                                    'created', '')))
                        formatted_date = 'N/A'

                        if created_at:
                            try:
                                from datetime import datetime, timezone, timedelta

                                # Define UTC+7 timezone
                                utc_plus_7 = timezone(timedelta(hours=7))

                                # Try ISO format first
                                if 'T' in str(created_at):
                                    # Parse as UTC time
                                    date_obj = datetime.fromisoformat(
                                        str(created_at).replace('Z', '+00:00'))
                                    # Convert to UTC+7
                                    date_obj = date_obj.astimezone(utc_plus_7)
                                # Try Unix timestamp
                                elif isinstance(created_at, (int, float)):
                                    # fromtimestamp returns local time by
                                    # default, convert to UTC+7
                                    date_obj = datetime.fromtimestamp(
                                        created_at, tz=timezone.utc)
                                    date_obj = date_obj.astimezone(utc_plus_7)
                                else:
                                    # Try parsing as string (assume UTC)
                                    date_obj = datetime.strptime(
                                        str(created_at)[:19], '%Y-%m-%d %H:%M:%S')
                                    date_obj = date_obj.replace(
                                        tzinfo=timezone.utc)
                                    date_obj = date_obj.astimezone(utc_plus_7)

                                formatted_date = date_obj.strftime(
                                    '%d/%m/%Y %H:%M')
                            except Exception as e:
                                print(
                                    f"DEBUG: Date parse error for '{created_at}': {e}")
                                formatted_date = str(created_at)[
                                    :19] if created_at else 'N/A'

                        # Get and translate status
                        status = task.get('status', '')
                        if status == 'done':
                            status_text = lang['completed']
                        elif status == 'doing' or status == 'processing':
                            status_text = lang['processing']
                        elif status == 'error' or status == 'failed':
                            status_text = lang['failed']
                        else:
                            status_text = status or 'Unknown'

                        # Get credit cost
                        credit_cost = task.get('credit_cost', 0)
                        credits_display = str(
                            credit_cost) if credit_cost else '0'

                        # Get task display info
                        task_name = str(task_id)[
                            :30] + "..." if len(str(task_id)) > 30 else str(task_id)

                        # Try to get text content from various possible
                        # locations
                        text_content = ''
                        if 'text' in task:
                            text_content = task.get('text', '')
                        elif 'metadata' in task and isinstance(task['metadata'], dict):
                            text_content = task['metadata'].get('text', '')
                            if not text_content and 'data' in task['metadata']:
                                text_content = task['metadata']['data'].get(
                                    'text', '')

                        display_input = text_content[:30] + "..." if len(
                            text_content) > 30 else text_content
                        if not display_input:
                            display_input = f"Task ID: {task_id}"

                        # Get voice info - check multiple possible locations
                        voice_id = ''

                        # Direct voice_id field
                        if 'voice_id' in task:
                            voice_id = task.get('voice_id', '')

                        # Check in metadata
                        elif 'metadata' in task and isinstance(task['metadata'], dict):
                            metadata = task['metadata']

                            # Direct in metadata
                            if 'voice_id' in metadata:
                                voice_id = metadata['voice_id']

                            # Inside voice_setting
                            elif 'voice_setting' in metadata and isinstance(metadata['voice_setting'], dict):
                                voice_id = metadata['voice_setting'].get(
                                    'voice_id', '')

                            # Inside data field
                            elif 'data' in metadata and isinstance(metadata['data'], dict):
                                if 'voice_id' in metadata['data']:
                                    voice_id = metadata['data']['voice_id']
                                elif 'voice_settings' in metadata['data']:
                                    voice_id = metadata['data'].get(
                                        'voice_settings', {}).get('voice_id', '')

                        voice_display = voice_id[:17] + \
                            "..." if len(voice_id) > 17 else voice_id

                        # Find matching voice preset for project and voice name
                        project_name = lang['unknown']
                        voice_name = lang['unknown']

                        if voice_id:
                            for preset in self.voice_presets:
                                if preset.voice_id == voice_id:
                                    project_name = preset.project if preset.project else lang['unknown']
                                    voice_name = preset.voice_name if preset.voice_name else lang[
                                        'unknown']
                                    break

                        # Insert into tree
                        tree.insert('', 'end', values=(
                            task_id,  # Hiển thị full task_id thay vì task_name
                            project_name,
                            voice_display,
                            voice_name,
                            status_text,
                            credits_display,
                            formatted_date,
                            lang['download'] if status in [
                                'done', 'completed'] else '',
                            lang['details'],
                            lang['delete']
                        ), tags=(task_id,))

                    except Exception as e:
                        print(f"DEBUG: Error processing task: {e}")
                        print(f"DEBUG: Task data: {task}")
                        continue

                # Update pagination
                self.total_pages = max(1, (total + 19) // 20)
                lang = self.languages[self.current_language]
                self.page_label.config(
                    text=f"{lang['page']} {self.current_page}/{self.total_pages}")

                self.prev_btn.config(
                    state='normal' if self.current_page > 1 else 'disabled')
                self.next_btn.config(
                    state='normal' if self.current_page < self.total_pages else 'disabled')

                if len(tasks) == 0:
                    print("DEBUG: No tasks found to display")
                    messagebox.showinfo(lang['info'], "No tasks found")

            else:
                error_msg = f"Failed to fetch tasks: HTTP {
                    response.status_code}"
                print(f"DEBUG: {error_msg}")
                print(f"DEBUG: Response: {response.text[:500]}")
                messagebox.showerror(lang['error'], error_msg)

        except Exception as e:
            error_msg = f"Error fetching tasks: {str(e)}"
            print(f"DEBUG: {error_msg}")
            import traceback
            traceback.print_exc()
            messagebox.showerror(lang['error'], error_msg)

    def on_backup_tree_click(self, event, tree, lang):
        """Handle clicks on backup tree"""
        item = tree.identify_row(event.y)
        column = tree.identify_column(event.x)

        if not item:
            return

        values = tree.item(item)['values']
        task_id = tree.item(item)['tags'][0] if tree.item(item)[
            'tags'] else None

        if not task_id:
            return

        # Column 8 = Download (index 7)
        if column == '#8' and values[7]:
            if messagebox.askyesno(
                lang['download'], f"{
                    lang['download']} task {task_id}?"):
                self.download_task_file(task_id, lang, tree.winfo_toplevel())

        # Column 9 = Details (index 8)
        elif column == '#9':
            self.show_task_details(task_id, lang, tree.winfo_toplevel())

        # Column 10 = Delete (index 9)
        elif column == '#10':
            self.delete_backup_task(task_id, tree, lang)

    def download_task_file(self, task_id, lang, backup_window):
        """Download task file"""
        try:
            # Get task details
            response = requests.get(
                f"{ElevenLabsAPI.BASE_URL}/v1/task/{task_id}",
                headers={"xi-api-key": self.api_key},
                timeout=self.timeout_var.get()
            )

            if response.status_code == 200:
                task_data = response.json()

                # Kiểm tra status trước
                if task_data.get('status') != 'done':
                    messagebox.showwarning(
                        lang['warning'],
                        'Task not completed yet',
                        parent=backup_window)
                    return

                # Lấy metadata trực tiếp từ root
                metadata = task_data.get('metadata', {})

                # Get audio_url directly from metadata (both task types have
                # this)
                result_url = metadata.get('audio_url')

                if not result_url:
                    messagebox.showwarning(
                        lang['warning'],
                        lang['no_result_url'],
                        parent=backup_window)
                    return

                # Download file
                file_response = requests.get(result_url, timeout=30)
                if file_response.status_code == 200:
                    # Save to DownloadFolder
                    download_dir = os.path.join(
                        get_app_path(), "DownloadFolder")
                    if not os.path.exists(download_dir):
                        os.makedirs(download_dir)

                    # Generate filename - lấy text từ metadata hoặc dùng
                    # task_id
                    text_content = metadata.get('text', '')
                    if not text_content:
                        text_content = task_data.get('id', 'unknown')

                    # Create filename from first few words
                    words = [
                        word.strip() for word in re.findall(
                            r'\b\w+\b', text_content) if word.strip()]
                    first_words = '_'.join(words[:3]).replace(
                        ' ', '') if len(words) >= 3 else (task_id[:8])
                    filename = f"backup_{first_words}.mp3"

                    # Handle duplicate filenames
                    filepath = os.path.join(download_dir, filename)
                    base, ext = os.path.splitext(filename)
                    counter = 1
                    while os.path.exists(filepath):
                        filename = f"{base}_{counter}{ext}"
                        filepath = os.path.join(download_dir, filename)
                        counter += 1

                    with open(filepath, 'wb') as f:
                        f.write(file_response.content)

                    # Download SRT nếu có
                    srt_url = metadata.get('srt_url')
                    if srt_url:
                        try:
                            srt_response = requests.get(srt_url, timeout=30)
                            if srt_response.status_code == 200:
                                srt_filepath = os.path.splitext(filepath)[
                                    0] + ".srt"

                                # Lấy raw bytes và tự xử lý encoding
                                srt_content = srt_response.content
                                try:
                                    # Thử decode UTF-8 trước
                                    decoded_content = srt_content.decode(
                                        'utf-8')
                                except UnicodeDecodeError:
                                    try:
                                        decoded_content = srt_content.decode(
                                            'utf-8-sig')  # UTF-8 with BOM
                                    except UnicodeDecodeError:
                                        decoded_content = srt_content.decode(
                                            'latin-1')  # Fallback

                                with open(srt_filepath, 'w', encoding='utf-8') as f:
                                    f.write(decoded_content)
                        except Exception as e:
                            print(f"SRT download error: {str(e)}")

                    # Chỉ hiển thị messagebox khi download đơn lẻ (không phải
                    # batch download)
                    if not hasattr(backup_window, '_is_batch_download'):
                        messagebox.showinfo(
                            lang['success'],
                            lang['download_success'],
                            parent=backup_window)
                else:
                    messagebox.showerror(
                        lang['error'],
                        lang['download_failed'],
                        parent=backup_window)
            else:
                messagebox.showerror(
                    lang['error'], f"Failed to get task details: {
                        response.status_code}", parent=backup_window)

        except Exception as e:
            messagebox.showerror(
                lang['error'], f"{
                    lang['download_failed']}: {
                    str(e)}", parent=backup_window)

    def show_task_details(self, task_id, lang, backup_window=None):
        """Show task details in popup"""
        try:
            # Get task details
            response = requests.get(
                f"{ElevenLabsAPI.BASE_URL}/v1/task/{task_id}",
                headers={"xi-api-key": self.api_key},
                timeout=self.timeout_var.get()
            )

            if response.status_code == 200:
                task_data = response.json()

                # Dùng trực tiếp task_data làm task_info
                task_info = task_data
                metadata = task_data.get('metadata', {})

                details_window = tk.Toplevel(
                    backup_window if backup_window else self.root)
                details_window.title(lang['task_details'])
                details_window.geometry("600x400")

                # Tạo text frame và scrollbar
                text_frame = ttk.Frame(details_window)
                text_frame.pack(fill='both', expand=True, padx=10, pady=10)

                text_widget = tk.Text(
                    text_frame, wrap=tk.WORD, width=70, height=20)
                scrollbar = ttk.Scrollbar(
                    text_frame, orient='vertical', command=text_widget.yview)
                text_widget.configure(yscrollcommand=scrollbar.set)

                # Build details string
                details = f"Task ID: {task_info.get('id', 'N/A')}\n"
                details += f"Status: {task_info.get('status', 'N/A')}\n"
                details += f"Type: {task_info.get('type', 'N/A')}\n"
                details += f"Credit Cost: {
                    task_info.get(
                        'credit_cost', 'N/A')}\n"
                details += f"Progress: {task_info.get('progress', 'N/A')}%\n"
                details += f"Created: {task_info.get('created_at', 'N/A')}\n"

                # Add metadata info
                if task_info.get('type') == 'tts':
                    # TTS task
                    details += f"Voice ID: {metadata.get('voice_id', 'N/A')}\n"
                    if 'data' in metadata:
                        data_info = metadata['data']
                        details += f"Model: {
                            data_info.get(
                                'model_id', 'N/A')}\n"
                        if 'voice_settings' in data_info:
                            vs = data_info['voice_settings']
                            details += f"Speed: {vs.get('speed', 'N/A')}\n"
                            details += f"Stability: {
                                vs.get(
                                    'stability',
                                    'N/A')}\n"
                elif task_info.get('type') == 'minimax_tts':
                    # Minimax task
                    details += f"Model: {metadata.get('model', 'N/A')}\n"
                    if 'voice_setting' in metadata:
                        vs = metadata['voice_setting']
                        details += f"Voice ID: {vs.get('voice_id', 'N/A')}\n"
                        details += f"Speed: {vs.get('speed', 'N/A')}\n"
                        details += f"Volume: {vs.get('vol', 'N/A')}\n"
                        details += f"Pitch: {vs.get('pitch', 'N/A')}\n"

                details += f"Audio URL: {
                    'Available' if metadata.get('audio_url') else 'Not available'}\n"
                details += f"SRT URL: {
                    'Available' if metadata.get('srt_url') else 'Not available'}\n"
                text_widget.insert('1.0', details)
                text_widget.config(state='disabled')

                text_widget.pack(side='left', fill='both', expand=True)
                scrollbar.pack(side='right', fill='y')

                # Close button
                ttk.Button(
                    details_window,
                    text=lang['close'],
                    command=lambda: details_window.destroy()).pack(
                    pady=10)
            else:
                messagebox.showerror(
                    lang['error'], f"Failed to get task details: {
                        response.status_code}", parent=backup_window)

        except Exception as e:
            messagebox.showerror(
                lang['error'], f"Error getting task details: {
                    str(e)}", parent=backup_window)

    def delete_backup_task(self, task_id, tree, lang):
        """Delete backup task"""
        if not messagebox.askyesno(lang['warning'], lang['delete_confirm']):
            return

        try:
            # Delete task via API
            response = requests.post(
                f"{ElevenLabsAPI.BASE_URL}/v1/task/delete",
                json={"task_ids": [task_id]},
                headers={"xi-api-key": self.api_key},
                timeout=self.timeout_var.get()
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    messagebox.showinfo(lang['success'], lang['task_deleted'])
                    # Refresh the tree
                    self.refresh_backup_tasks(tree)
                else:
                    messagebox.showerror(
                        lang['error'], "Failed to delete task")
            else:
                messagebox.showerror(
                    lang['error'], f"Failed to delete task: {
                        response.status_code}")

        except Exception as e:
            messagebox.showerror(
                lang['error'],
                f"Error deleting task: {
                    str(e)}")

    def go_prev_page(self, tree):
        """Go to previous page"""
        if self.current_page > 1:
            self.current_page -= 1
            self.refresh_backup_tasks(tree)

    def go_next_page(self, tree):
        """Go to next page"""
        if self.current_page < self.total_pages:
            self.current_page += 1
            self.refresh_backup_tasks(tree)

    def delete_all_tasks(self, tree, lang):
        """Delete all tasks"""
        if not messagebox.askyesno(
                lang['warning'],
                lang['delete_all_confirm']):
            return

        try:
            # Get all task IDs from tree
            task_ids = []
            for item in tree.get_children():
                item_tags = tree.item(item)['tags']
                if item_tags:
                    task_ids.append(item_tags[0])

            if not task_ids:
                return

            # Delete all tasks
            response = requests.post(
                f"{ElevenLabsAPI.BASE_URL}/v1/task/delete",
                json={"task_ids": task_ids},
                headers={"xi-api-key": self.api_key},
                timeout=self.timeout_var.get()
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    messagebox.showinfo(
                        lang['success'], lang['all_tasks_deleted'])
                    # Refresh the tree
                    self.refresh_backup_tasks(tree)
                else:
                    messagebox.showerror(
                        lang['error'], "Failed to delete some tasks")
            else:
                messagebox.showerror(
                    lang['error'], f"Failed to delete tasks: {
                        response.status_code}")

        except Exception as e:
            messagebox.showerror(
                lang['error'],
                f"Error deleting tasks: {
                    str(e)}")

    def open_download_folder(self):
        """Open download folder"""
        lang = self.languages[self.current_language]

        download_folder = os.path.join(get_app_path(), "DownloadFolder")

        if not os.path.exists(download_folder):
            os.makedirs(download_folder, exist_ok=True)

        try:
            if os.name == 'nt':  # Windows
                os.startfile(download_folder)
            elif os.name == 'posix':  # macOS and Linux
                if sys.platform == 'darwin':  # macOS
                    subprocess.run(['open', download_folder])
                else:  # Linux
                    subprocess.run(['xdg-open', download_folder])
            else:
                messagebox.showinfo(
                    lang['info'], f"Download folder: {download_folder}")
        except Exception as e:
            messagebox.showerror(
                lang['error'],
                f"Cannot open folder: {
                    str(e)}")

    def download_selected_tasks(self, tree, lang):
        """Download multiple selected tasks"""
        selected_items = tree.selection()
        if not selected_items:
            messagebox.showwarning(
                lang['warning'],
                "Please select tasks to download!",
                parent=tree.winfo_toplevel())
            return

        # Get completed tasks only
        download_tasks = []
        for item in selected_items:
            values = tree.item(item)['values']
            task_id = tree.item(item)['tags'][0] if tree.item(item)[
                'tags'] else None
            # Status column (adjusted for new column structure)
            status = values[4]

            if task_id and status == lang['completed']:
                download_tasks.append(task_id)

        if not download_tasks:
            messagebox.showwarning(
                lang['warning'],
                "No completed tasks selected!",
                parent=tree.winfo_toplevel())
            return

        # Create progress window
        progress_window = tk.Toplevel(tree.winfo_toplevel())
        progress_window.title(lang['download_progress'])
        progress_window.geometry("300x100")
        progress_window.transient(tree.winfo_toplevel())

        # Center relative to backup window
        backup_win = tree.winfo_toplevel()
        backup_x = backup_win.winfo_x()
        backup_y = backup_win.winfo_y()
        backup_width = backup_win.winfo_width()
        backup_height = backup_win.winfo_height()
        # 150 is half of progress window width
        x = backup_x + (backup_width // 2) - 150
        # 50 is half of progress window height
        y = backup_y + (backup_height // 2) - 50
        progress_window.geometry(f"300x100+{x}+{y}")

        progress_label = ttk.Label(
            progress_window,
            text=lang['preparing_downloads'])
        progress_label.pack(pady=10)

        progress_var = tk.StringVar()
        progress_status = ttk.Label(progress_window, textvariable=progress_var)
        progress_status.pack(pady=5)

        # Download each task
        success_count = 0
        total_count = len(download_tasks)

        def download_next(index):
            nonlocal success_count
            if index >= total_count:
                progress_window.destroy()
                messagebox.showinfo(
                    lang['success'],
                    f"Downloaded {success_count}/{total_count} files successfully!")
                return

            task_id = download_tasks[index]
            progress_var.set(f"{index + 1}/{total_count}")
            progress_label.config(
                text=f"{lang['downloading']}: {task_id[:20]}...")
            progress_window.update()

            try:
                # Đánh dấu đây là batch download
                progress_window._is_batch_download = True
                self.download_task_file(task_id, lang, progress_window)
                success_count += 1
            except Exception as e:
                print(f"Download failed for {task_id}: {str(e)}")

            # Schedule next download
            progress_window.after(100, lambda: download_next(index + 1))

        # Start downloading
        download_next(0)


if __name__ == "__main__":
    root = tk.Tk()
    app = TTSApp(root)

    def on_closing():
        app.save_config()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_closing)
    root.mainloop()
