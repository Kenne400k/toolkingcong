<?php
// =================================================================
// 🔥 CẤU HÌNH SESSION LƯU 10 NGÀY (Đã sửa để đồng bộ với login.php)
// =================================================================

// 1. Set thời gian 10 ngày
$lifetime = 10 * 24 * 60 * 60; // 864,000 giây

// 2. QUAN TRỌNG: Chỉ set thời gian, KHÔNG đổi đường dẫn thư mục
// Dòng này giúp tts3.php đọc được session do login.php tạo ra
ini_set('session.gc_maxlifetime', $lifetime); 
ini_set('session.cookie_lifetime', $lifetime);

session_set_cookie_params([
    'lifetime' => $lifetime,
    'path' => '/',
    'domain' => '', 
    'secure' => true, 
    'httponly' => true,
    'samesite' => 'Lax' // Thêm cái này để ổn định trên Chrome mới
]);

session_start();

// 3. Gia hạn thêm 10 ngày mỗi khi user vào tool
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), $_COOKIE[session_name()], time() + $lifetime, "/");
}

ob_start();

// 🔥 BẬT FULL ERROR
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error_log_tts3.txt');
// 🔥 LOG ACTION NGAY ĐẦU
$action = $_POST['action'] ?? 'NONE';
// file_put_contents(__DIR__ . '/action_log.txt', date('Y-m-d H:i:s') . " - Action: $action\n", FILE_APPEND);

header('Content-Type: application/json; charset=utf-8');

function writeToLog($message) {
    // 🔥 CẤU HÌNH LOG: false = Chỉ log lỗi (Nhẹ server), true = Log tất cả (Nặng)
    $debug_mode = true; 

    // Chuyển message về string để kiểm tra
    $msgContent = is_array($message) || is_object($message) ? print_r($message, true) : $message;

    // Nếu KHÔNG phải chế độ debug VÀ tin nhắn KHÔNG chứa từ khóa lỗi -> Bỏ qua, không ghi
    if (!$debug_mode) {
        // Các từ khóa nhận diện lỗi
        $errorKeywords = ['Error', 'Exception', 'Failed', '❌', 'CRITICAL', 'cURL error'];
        $isError = false;
        foreach ($errorKeywords as $keyword) {
            if (stripos($msgContent, $keyword) !== false) {
                $isError = true;
                break;
            }
        }
        if (!$isError) return; // Thoát ngay, không ghi đĩa
    }

    $file = __DIR__ . '/tts_debug_log.txt';
    $date = date('Y-m-d H:i:s');
    $logEntry = "[$date] $msgContent" . PHP_EOL . str_repeat("-", 50) . PHP_EOL;
    @file_put_contents($file, $logEntry, FILE_APPEND);
}

// ✅ Helper functions
function jsonResponse($data, $statusCode = 200) {
    if (ob_get_length()) ob_clean();
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonError($message, $statusCode = 400) {
    jsonResponse(['status' => 'error', 'message' => $message], $statusCode);
}

function jsonSuccess($data) {
    jsonResponse(array_merge(['status' => 'success'], $data), 200);
}

// 🔥 CRITICAL: KẾT NỐI DATABASE TRƯỚC
require_once '../config/database.php';

// 🔥 FIX: ĐẢM BẢO BIẾN $conn TỒN TẠI
if (isset($mysqli)) {
    $conn = $mysqli;
} elseif (isset($db)) {
    $conn = $db;
}

if (empty($conn)) {
    writeToLog("❌ CRITICAL: Database connection failed");
    jsonError('Database connection error', 500);
}

// 🔥 SAU ĐÓ MỚI LOAD LOAD BALANCER
require_once '../config/load_balancer.php';

try {
    $loadBalancer = new LoadBalancer($conn);
} catch (Exception $e) {
    writeToLog("❌ LoadBalancer init failed: " . $e->getMessage());
    jsonError('System initialization error', 500);
}

// 1. CHECK AUTH
if (!isset($_SESSION['Users'])) {
    jsonError('Please login to continue.', 401);
}

$user_identity = $_SESSION['Users'];

$stmt_user = $conn->prepare("SELECT id, email, credits3 FROM Users WHERE taikhoan = ? OR google_id = ?");
if (!$stmt_user) {
    writeToLog("DB Prepare Error: " . $conn->error);
    jsonError('Database query error', 500);
}

$stmt_user->bind_param("ss", $user_identity, $user_identity);
$stmt_user->execute();
$user_result = $stmt_user->get_result()->fetch_assoc();
$stmt_user->close();
// 1. CHECK AUTH
if (!isset($_SESSION['Users'])) {
    // 🔥 THÊM: Check API token cho Electron app
    $api_token = $_POST['api_token'] ?? $_SERVER['HTTP_X_API_TOKEN'] ?? '';
    
    if (!empty($api_token)) {
        // Validate token và lấy user
        $stmt_token = $conn->prepare("SELECT taikhoan, google_id FROM Users WHERE api_token = ? AND is_active = 1");
        $stmt_token->bind_param("s", $api_token);
        $stmt_token->execute();
        $token_user = $stmt_token->get_result()->fetch_assoc();
        $stmt_token->close();
        
        if ($token_user) {
            $user_identity = $token_user['taikhoan'] ?: $token_user['google_id'];
            writeToLog("✅ Auth via API Token | User: $user_identity");
        } else {
            jsonError('Invalid API token.', 401);
        }
    } else {
        jsonError('Please login to continue.', 401);
    }
} else {
    $user_identity = $_SESSION['Users'];
}
if (!$user_result) {
    jsonError('User account not found.', 404);
}

// ✅ BỎ KIỂM TRA API KEY - CHỈ LẤY THÔNG TIN USER
$user_id_real = $user_result['id'];
$user_email_real = $user_result['email'];
$current_credits = (int)$user_result['credits3'];

writeToLog("👤 User: $user_id_real | Email: $user_email_real | Credits: $current_credits");

$action = $_POST['action'] ?? '';
// 🔥 HÀM TÌM ID TƯƠNG ỨNG (LOGIC BẤT TỬ)
function findEquivalentVoiceId($original_id, $target_server_type) {
    $cache_file = __DIR__ . '/voices_cache.json';
    if (!file_exists($cache_file)) return $original_id;

    $json = json_decode(file_get_contents($cache_file), true);
    if (!$json || !isset($json['data']['minimax']['voices'])) return $original_id;

    $voices = $json['data']['minimax']['voices'];
    
    // 1. Lấy thông tin của Giọng Gốc (Original)
    $original_voice = null;
    foreach ($voices as $v) {
        if ($v['id'] == $original_id) {
            $original_voice = $v;
            break;
        }
    }

    // Nếu không tìm thấy thông tin giọng gốc, ta buộc phải chọn đại một giọng ở server đích
    // để tránh gửi ID cũ sang server mới (chắc chắn lỗi).
    if (!$original_voice) {
        writeToLog("⚠️ Original voice info not found for ID: $original_id. Finding fallback on $target_server_type...");
        // Nhảy xuống bước 4 lấy fallback luôn
    } else {
        // 2. Tìm theo TÊN CHÍNH XÁC
        foreach ($voices as $v) {
            if (isset($v['server_type']) && $v['server_type'] === $target_server_type) {
                if ($v['name'] === $original_voice['name']) {
                    writeToLog("✅ MAP EXACT NAME: {$original_voice['name']} -> {$v['id']}");
                    return $v['id'];
                }
            }
        }
        
        // 3. Tìm theo TÊN GẦN GIỐNG (Chứa nhau)
        // Ví dụ: "Voice A" vs "Voice A (Clone)"
        foreach ($voices as $v) {
            if (isset($v['server_type']) && $v['server_type'] === $target_server_type) {
                if (strpos($v['name'], $original_voice['name']) !== false || strpos($original_voice['name'], $v['name']) !== false) {
                    writeToLog("⚠️ MAP FUZZY NAME: {$original_voice['name']} -> {$v['id']}");
                    return $v['id'];
                }
            }
        }
    }

    // 4. FALLBACK: TÌM GIỌNG CÙNG GIỚI TÍNH (System Voice)
    // Đây là chốt chặn quan trọng nhất nếu tên không trùng
    $target_gender = $original_voice['gender'] ?? 'Male'; // Mặc định Male nếu ko biết
    foreach ($voices as $v) {
        if (isset($v['server_type']) && $v['server_type'] === $target_server_type) {
            // Chỉ lấy giọng hệ thống (cho an toàn) và cùng giới tính
            if (($v['source'] ?? '') === 'system' && ($v['gender'] ?? '') === $target_gender) {
                writeToLog("🔄 MAP GENDER FALLBACK: $target_gender | $original_id -> {$v['id']}");
                return $v['id'];
            }
        }
    }

    // 5. ULTIMATE FALLBACK: LẤY ĐẠI 1 GIỌNG BẤT KỲ CỦA SERVER ĐÍCH
    // Thà giọng bị sai còn hơn là Task bị lỗi "Not found"
    foreach ($voices as $v) {
        if (isset($v['server_type']) && $v['server_type'] === $target_server_type) {
            if (($v['source'] ?? '') === 'system') { // Ưu tiên system
                writeToLog("🆘 MAP FINAL FALLBACK: $original_id -> {$v['id']}");
                return $v['id'];
            }
        }
    }

    // Nếu vẫn không tìm được (file cache lỗi?), đành trả về ID cũ
    return $original_id;
}
/**
 * 🔥 MAP VOICE ID THEO SERVER (SỬ DỤNG DATABASE) - VERSION FIX
 * Bỏ qua verify database nếu đã có equivalent_voice_id rõ ràng
 */
function mapVoiceIdForServer($original_voice_id, $target_server, $conn) {
    writeToLog("🔄 MAP VOICE | Original: $original_voice_id | Target Server: $target_server");
    
    // 1️⃣ TÌM VOICE GỐC TRONG DATABASE
    $stmt = $conn->prepare("
        SELECT server_type, equivalent_voice_id, voice_name, gender 
        FROM voice_ai_mapping 
        WHERE voice_id = ? AND provider = 'minimax'
        LIMIT 1
    ");
    $stmt->bind_param("s", $original_voice_id);
    $stmt->execute();
    $original_voice = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    // Nếu không tìm thấy voice gốc trong DB, trả về chính nó (có thể user đang gửi ID của AI84)
    if (!$original_voice) {
        writeToLog("⚠️ Original voice not found in DB. Keeping ID: $original_voice_id");
        return $original_voice_id;
    }

    $current_server = $original_voice['server_type'] ?? null;
    
    // 🔥 NẾU VOICE ĐÃ ĐÚNG SERVER ĐÍCH → KHÔNG CẦN MAP
    if ($current_server === $target_server) {
        writeToLog("✅ VOICE ALREADY ON TARGET SERVER | No mapping needed");
        return $original_voice_id;
    }
    
    // 2️⃣ LẤY equivalent_voice_id (Ưu tiên cao nhất)
    $mapped_id = $original_voice['equivalent_voice_id'] ?? null;
    
    if (!empty($mapped_id)) {
        // 🔥 FIX: Dùng luôn mapped_id mà KHÔNG CẦN VERIFY lại trong DB.
        // Lý do: DB chỉ lưu voice AI33 làm gốc, voice AI84 chỉ là tham chiếu text.
        writeToLog("✅ MAPPED VIA equivalent_voice_id (Direct) | $original_voice_id → $mapped_id");
        return $mapped_id;
    }
    
    // 3️⃣ FALLBACK 1: TÌM THEO TÊN (Exact Match)
    if ($original_voice) {
        $voice_name = $original_voice['voice_name'];
        $stmt_name = $conn->prepare("
            SELECT voice_id 
            FROM voice_ai_mapping 
            WHERE voice_name = ? 
            AND provider = 'minimax' 
            AND server_type = ?
            LIMIT 1
        ");
        $stmt_name->bind_param("ss", $voice_name, $target_server);
        $stmt_name->execute();
        $name_match = $stmt_name->get_result()->fetch_assoc();
        $stmt_name->close();
        
        if ($name_match) {
            writeToLog("⚠️ MAPPED VIA NAME MATCH | $voice_name → {$name_match['voice_id']}");
            return $name_match['voice_id'];
        }
    }
    
    // 4️⃣ FALLBACK 2: TÌM THEO GIỚI TÍNH (System Voice)
    $gender = $original_voice['gender'] ?? 'Male'; // Default Male
    
    $stmt_gender = $conn->prepare("
        SELECT voice_id 
        FROM voice_ai_mapping 
        WHERE gender = ? 
        AND provider = 'minimax' 
        AND server_type = ? 
        AND voice_source = 'system'
        ORDER BY RAND()
        LIMIT 1
    ");
    $stmt_gender->bind_param("ss", $gender, $target_server);
    $stmt_gender->execute();
    $gender_match = $stmt_gender->get_result()->fetch_assoc();
    $stmt_gender->close();
    
    if ($gender_match) {
        writeToLog("🆘 MAPPED VIA GENDER FALLBACK | Gender: $gender → {$gender_match['voice_id']}");
        return $gender_match['voice_id'];
    }
    
    // 5️⃣ ULTIMATE FALLBACK: LẤY ĐẠI 1 VOICE BẤT KỲ
    $stmt_random = $conn->prepare("
        SELECT voice_id, voice_name
        FROM voice_ai_mapping 
        WHERE provider = 'minimax' 
        AND server_type = ? 
        AND voice_source = 'system'
        ORDER BY RAND()
        LIMIT 1
    ");
    $stmt_random->bind_param("s", $target_server);
    $stmt_random->execute();
    $random_match = $stmt_random->get_result()->fetch_assoc();
    $stmt_random->close();
    
    if ($random_match) {
        writeToLog("🎲 ULTIMATE FALLBACK | Random voice: {$random_match['voice_name']} → {$random_match['voice_id']}");
        return $random_match['voice_id'];
    }
    
    // Nếu vẫn không tìm được, trả về ID gốc để liều ăn nhiều
    return $original_voice_id;
}
// 🔥 HELPER: GET MODEL COST FACTOR FROM CACHE
// cost_factor: 1.0 (HD models), 0.5 (Flash/Turbo ElevenLabs), 0.6 (Turbo Minimax)
function getModelCostFactor($provider, $model_id, $conn) {
    $cache_file = __DIR__ . '/voices_cache.json';
    
    if (!file_exists($cache_file)) {
        return 1.0; // Default fallback
    }
    
    $cache_data = json_decode(file_get_contents($cache_file), true);
    
    if (!$cache_data || !isset($cache_data['data'])) {
        return 1.0;
    }
    
    if ($provider === 'elevenlabs') {
        $models = $cache_data['data']['elevenlabs']['models'] ?? [];
        
        foreach ($models as $model) {
            if ($model['id'] === $model_id) {
                return (float)($model['cost_factor'] ?? 1.0);
            }
        }
    } elseif ($provider === 'minimax') {
        $models = $cache_data['data']['minimax']['models'] ?? [];
        
        foreach ($models as $model) {
            if ($model['id'] === $model_id) {
                return (float)($model['cost_factor'] ?? 1.0);
            }
        }
    }
    
    return 1.0; // Default fallback
}

try {

if ($action === 'create_speech') {
    
    // ══════════════════════════════════════════════════════════════
    // 📥 BƯỚC 1: NHẬN DỮ LIỆU
    // ══════════════════════════════════════════════════════════════
    $provider = $_POST['provider'] ?? 'elevenlabs';
    $text = $_POST['text'] ?? '';
    $voice_id = $_POST['voice_id'] ?? '';
    $voice_name = $_POST['voice_name'] ?? 'Unknown';
    $model_id = $_POST['model_id'] ?? '';
    
    // XỬ LÝ FILE UPLOAD
    $is_srt_upload = false;
    if (isset($_FILES['text_file']) && $_FILES['text_file']['error'] === UPLOAD_ERR_OK) {
        $file_tmp = $_FILES['text_file']['tmp_name'];
        $file_name = $_FILES['text_file']['name'];
        $ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
        $text = file_get_contents($file_tmp) ?: '';
        if ($ext === 'srt') $is_srt_upload = true;
    }
    
    // VALIDATE
    if ($text === '' || $text === null) {
        throw new Exception('Text input cannot be empty.');
    }
    if (empty($voice_id)) {
        throw new Exception('Voice ID is required.');
    }
    
    // 1. Lấy cấu hình từ Database (Có giá trị mặc định phòng hờ)
    $limit_requests = 10; 
    $limit_time_minutes = 1;

    $stmt_cfg = $conn->prepare("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('tts_limit_requests', 'tts_limit_minutes')");
    if ($stmt_cfg) {
        $stmt_cfg->execute();
        $res_cfg = $stmt_cfg->get_result();
        while ($row = $res_cfg->fetch_assoc()) {
            if ($row['setting_key'] === 'tts_limit_requests') $limit_requests = (int)$row['setting_value'];
            if ($row['setting_key'] === 'tts_limit_minutes') $limit_time_minutes = (int)$row['setting_value'];
        }
        $stmt_cfg->close();
    }

    // 2. Kiểm tra số lượng request hiện tại của User
    $stmt_check = $conn->prepare("
        SELECT COUNT(*) as total_req 
        FROM tts_kingcong 
        WHERE user_id = ? 
        AND created_at >= (NOW() - INTERVAL ? MINUTE)
    ");
    
    $stmt_check->bind_param("ii", $user_id_real, $limit_time_minutes);
    $stmt_check->execute();
    $check_res = $stmt_check->get_result()->fetch_assoc();
    $stmt_check->close();

   // 3. Chặn nếu vượt quá giới hạn
    if ($check_res['total_req'] >= $limit_requests) {
        // 🔥 SỬA DÒNG NÀY: Dùng jsonError với mã 429
        jsonError("Bạn đã đạt giới hạn $limit_requests yêu cầu / $limit_time_minutes phút.\nVui lòng đợi giây lát rồi thử lại!", 429);
    }
    // ══════════════════════════════════════════════════════════════
    // 💰 BƯỚC 2: TÍNH CHI PHÍ
    // ══════════════════════════════════════════════════════════════
    $char_count = mb_strlen($text, 'UTF-8');
    $cost_factor = getModelCostFactor($provider, $model_id, $conn);
    
    $with_transcript = false;
    if (isset($_POST['with_transcript'])) {
        $value = $_POST['with_transcript'];
        if ($value === true || $value === 'true' || $value === 1 || $value === '1') {
            $with_transcript = true;
        }
    }
    
    $apply_srt_factor = ($with_transcript || $is_srt_upload);
    
    // Clone multiplier (CHỈ MINIMAX)
    $clone_multiplier = 1.0;
    if ($provider === 'minimax' && !empty($voice_id)) {
        $stmt_check = $conn->prepare("SELECT voice_id FROM voice_cloning WHERE voice_id = ? AND user_id = ? LIMIT 1");
        if ($stmt_check) {
            $stmt_check->bind_param("si", $voice_id, $user_id_real);
            $stmt_check->execute();
            $clone_result = $stmt_check->get_result()->fetch_assoc();
            $stmt_check->close();
            if ($clone_result) $clone_multiplier = 1.15;
        }
    }
    
    // Tính toán cuối cùng
    $base_rate = 1.12;
    $base_cost = $char_count * $base_rate * $cost_factor * $clone_multiplier;
    if ($apply_srt_factor) $base_cost *= 1.2;
    
    $total_estimated_cost = ($cost_factor < 1.0) ? ceil($base_cost) : floor($base_cost);
    $total_estimated_cost = max(1, $total_estimated_cost);
    
    writeToLog("💰 COST | Chars: $char_count | Factor: $cost_factor | Clone: $clone_multiplier | SRT: " . ($apply_srt_factor ? 'Yes' : 'No') . " | Final: $total_estimated_cost");
    
    // 🔥 KIỂM TRA SỐ DƯ CREDITS3
    if ($current_credits < $total_estimated_cost) {
        throw new Exception("Insufficient Credits. Cost: " . number_format($total_estimated_cost) . ", Available: " . number_format($current_credits));
    }
// ══════════════════════════════════════════════════════════════
// 🔥 BƯỚC 3: CHỌN SERVER (LOGIC: LOAD BALANCER → CHECK MAINTENANCE → MAP VOICE)
// ══════════════════════════════════════════════════════════════
$selected_server = null;
$original_voice_id = $voice_id; // Lưu ID gốc

// 🔥 BƯỚC 3: CHỌN SERVER
$selected_server = $loadBalancer->selectServer();

// 🔥 THÊM DEBUG
writeToLog("🎲 selectServer() returned: " . ($selected_server ?? 'NULL'));

if ($selected_server === null) {
    throw new Exception("System maintenance. Please try again later.");
}

writeToLog("🎲 LOAD BALANCER SELECTED | Server: $selected_server | Provider: $provider");

// 3️⃣ MAP VOICE ID (CHỈ CHO MINIMAX)
if ($provider === 'minimax') {
    $voice_id = mapVoiceIdForServer($original_voice_id, $selected_server, $conn);
    
    if ($voice_id !== $original_voice_id) {
        writeToLog("✅ VOICE MAPPED | Original: $original_voice_id → Mapped: $voice_id | Server: $selected_server");
        
        // Cập nhật voice_name nếu cần (optional)
        $stmt_vname = $conn->prepare("SELECT voice_name FROM voice_ai_mapping WHERE voice_id = ?");
        $stmt_vname->bind_param("s", $voice_id);
        $stmt_vname->execute();
        $vname_res = $stmt_vname->get_result()->fetch_assoc();
        $stmt_vname->close();
        
        if ($vname_res) {
            $voice_name = $vname_res['voice_name'];
        }
    }
}

// ✅ XÓA ĐOẠN CODE REDUNDANT DƯỚI ĐÂY

// ══════════════════════════════════════════════════════════════
// 📡 BƯỚC 4: CHUẨN BỊ DỮ LIỆU ĐẦU VÀO (SANITIZE)
// ══════════════════════════════════════════════════════════════
$webhook_url = "$protocol://$host$path/ajaxs/webhook_tts3.php";

// Validate các thông số chung
$vol = floatval($_POST['vol'] ?? 1.0);
$speed = floatval($_POST['speed'] ?? 1.0);
$pitch = intval($_POST['pitch'] ?? 0);
$language_boost = $_POST['language_boost'] ?? 'Auto';

// Clamp values an toàn
$vol = max(0.5, min(2.0, $vol));
$speed = max(0.5, min(2.0, $speed));
$pitch = max(-12, min(12, $pitch));

if (empty($model_id)) $model_id = ($provider === 'minimax') ? 'speech-2.6-turbo' : 'eleven_multilingual_v2';

// ══════════════════════════════════════════════════════════════
// 🚀 BƯỚC 5: GỬI REQUEST (CHỈ RETRY KHI LỖI SERVER)
// ══════════════════════════════════════════════════════════════
$max_retries = 1;
$retry_count = 0;
$curl_response_success = false;
$final_response = null;
$final_http_code = 0;
$tried_servers = [];

while ($retry_count <= $max_retries) {
    
    $tried_servers[] = $selected_server;

    // 1. Lấy API Key & Endpoint
    $api_key_data = $loadBalancer->getAvailableApiKey($selected_server, $provider);
    
    if (!$api_key_data) {
        writeToLog("❌ No API keys available for $selected_server");
        
        $other_server = ($selected_server === 'ai33') ? 'ai84' : 'ai33';
        
        if (!in_array($other_server, $tried_servers)) {
            writeToLog("⚠️ Switching to backup server: $other_server");
            
            if ($provider === 'minimax') {
                $voice_id = mapVoiceIdForServer($original_voice_id, $other_server, $conn);
                writeToLog("🔄 VOICE MAPPED FOR BACKUP | Original: $original_voice_id → Mapped: $voice_id | Server: $other_server");
                
                if ($voice_id !== $original_voice_id) {
                    $stmt_vname = $conn->prepare("SELECT voice_name FROM voice_ai_mapping WHERE voice_id = ?");
                    $stmt_vname->bind_param("s", $voice_id);
                    $stmt_vname->execute();
                    $vname_res = $stmt_vname->get_result()->fetch_assoc();
                    $stmt_vname->close();
                    
                    if ($vname_res) {
                        $voice_name = $vname_res['voice_name'];
                    }
                }
            }
            
            $selected_server = $other_server;
            $retry_count++;
            continue;
        }
        break;
    }
    
    $api_key = $api_key_data['api_key'];
    $api_key_id = $api_key_data['id'];
    $endpoint = $loadBalancer->getEndpoint($selected_server);

    // 2. XÂY DỰNG URL & PAYLOAD
    $target_url = "";
    $payload = [];

    if ($provider === 'minimax') {
        if ($selected_server === 'ai33') {
            $target_url = "https://api.ai33.pro/v1m/task/text-to-speech";
            $payload = [
                "text" => $text,
                "model" => $model_id,
                "voice_setting" => [
                    "voice_id" => $voice_id,
                    "vol" => $vol,
                    "pitch" => $pitch,
                    "speed" => $speed
                ],
                "language_boost" => ($language_boost === 'Auto' ? 'auto' : $language_boost)
            ];
            if ($with_transcript) $payload['with_transcript'] = true;
            if (!empty($webhook_url)) $payload['receive_url'] = $webhook_url;

        } else {
            $target_url = "https://api.ai84.pro/v1/minimax/text-to-speech/async";
            
            $current_model_id = $model_id;
            if (ctype_digit((string)$voice_id) && $current_model_id !== 'speech-01') {
                // $current_model_id = 'speech-01-hd';
            }

            $client_uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', 
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), 
                mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, 
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
            );

            $payload = [
                "canonical_voice_id" => $voice_id,
                "text" => $text,
                "model" => $current_model_id,
                "speed" => $speed,
                "pitch" => $pitch,
                "volume" => $vol,
                "language_boost" => ($language_boost === 'Auto' ? 'auto' : $language_boost),
                "client_task_uuid" => $client_uuid
            ];
            
            if ($with_transcript) $payload['with_transcript'] = true;
            if (!empty($_POST['sample_rate'])) $payload['sample_rate'] = intval($_POST['sample_rate']);
            if (!empty($_POST['bitrate'])) $payload['bitrate'] = intval($_POST['bitrate']);
            if (!empty($_POST['format'])) $payload['format'] = $_POST['format'];
        }
    } else {
        // ElevenLabs
        if ($selected_server === 'ai33') {
            $target_url = $endpoint . "/v1/text-to-speech/$voice_id?output_format=mp3_44100_128";
        } else {
            $target_url = $endpoint . "/v2/text-to-speech/async?voice_id=$voice_id";
        }

        $stability = floatval($_POST['stability'] ?? 0.5);
        $similarity = floatval($_POST['similarity'] ?? 0.75);
        $style = floatval($_POST['style'] ?? 0.0);
        $use_boost = (isset($_POST['use_boost']) && $_POST['use_boost'] == 'true');

        $payload = [
            "text" => $text,
            "model_id" => $model_id,
            "voice_settings" => [
                "stability" => $stability,
                "similarity_boost" => $similarity,
                "style" => $style,
                "use_speaker_boost" => $use_boost,
                "speed" => $speed
            ]
        ];
        if ($selected_server === 'ai84') $payload['voice_id'] = $voice_id;
    }

    // 3. EXECUTE CURL
    writeToLog("🚀 SENDING [$selected_server]: $target_url");

    $ch = curl_init($target_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'xi-api-key: ' . $api_key
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    $final_response = $response;
    $final_http_code = $http_code;

    // 4. 🔥 PHÂN LOẠI LỖI
    $is_server_error = false;
    $is_user_error = false;
    
    if ($err) {
        $is_server_error = true;
        writeToLog("❌ cURL Error: $err");
    } elseif ($http_code >= 500) {
        $is_server_error = true;
        writeToLog("❌ Server Error: HTTP $http_code");
    } elseif ($http_code == 200 || $http_code == 201) {
        $json_res = json_decode($response, true);
        
        if (isset($json_res['success']) && $json_res['success'] === true) {
            $curl_response_success = true;
            writeToLog("✅ Request SUCCESS on $selected_server");
            break;
            
        } elseif (isset($json_res['success']) && $json_res['success'] === false) {
            $error_msg = $json_res['message'] ?? $json_res['detail']['message'] ?? '';
            
            // 🔥 LỖI USER (KHÔNG RETRY)
            $user_error_patterns = [
                'voice not found',
                'voice_id not found', 
                'canonical voice not found',
                'invalid voice',
                'insufficient credits',
                'text too long',
                'invalid parameter',
                'validation error'
            ];
            
            foreach ($user_error_patterns as $pattern) {
                if (stripos($error_msg, $pattern) !== false) {
                    $is_user_error = true;
                    writeToLog("🚫 USER ERROR: $error_msg");
                    break;
                }
            }
            
            if (!$is_user_error) {
                $is_server_error = true;
                writeToLog("⚠️ Server logic error: $error_msg");
            }
        }
    } elseif ($http_code == 400 || $http_code == 404 || $http_code == 422) {
        $is_user_error = true;
        writeToLog("🚫 User Error: HTTP $http_code");
    } elseif ($http_code == 429 || $http_code == 503) {
        $is_server_error = true;
        writeToLog("⚠️ Server busy: HTTP $http_code");
    } else {
        $is_server_error = true;
    }

    // 5. 🔥 QUYẾT ĐỊNH RETRY
    if ($is_user_error) {
        writeToLog("🛑 STOP: User error - No retry");
        break;
    }
    
    if ($is_server_error && $retry_count < $max_retries) {
        $next_server = ($selected_server === 'ai33') ? 'ai84' : 'ai33';
        
        if (!in_array($next_server, $tried_servers)) {
            writeToLog("🔄 RETRY: Switching $selected_server → $next_server");
            
            if ($provider === 'minimax') {
                $voice_id = mapVoiceIdForServer($original_voice_id, $next_server, $conn);
                writeToLog("🔄 VOICE MAPPED | Original: $original_voice_id → Mapped: $voice_id");
            }
            
            $selected_server = $next_server;
            $retry_count++;
            continue;
        }
    }
    
    break;
}

// 6. XỬ LÝ KẾT QUẢ
if (!$curl_response_success) {
    writeToLog("❌ FINAL FAILURE | Code: $final_http_code | Body: " . substr($final_response, 0, 200));
    
    $msg = 'Service Error';
    $res = json_decode($final_response, true);
    
    if (isset($res['message'])) {
        $msg = $res['message'];
    } elseif (isset($res['detail']['message'])) {
        $msg = $res['detail']['message'];
    } elseif (isset($res['base_resp']['status_msg'])) {
        $msg = $res['base_resp']['status_msg'];
    }
    
    if (strpos($msg, 'Canonical voice not found') !== false || strpos($msg, 'voice not found') !== false) {
        $msg = "Voice ID không tồn tại hoặc bị xóa.";
    }

    throw new Exception("API Error ($final_http_code): $msg");
}
    
    // ══════════════════════════════════════════════════════════════
// ✅ BƯỚC 6: XỬ LÝ KẾT QUẢ
// ══════════════════════════════════════════════════════════════
$result = json_decode($final_response, true);

// 🔥 NORMALIZE RESPONSE FORMAT
// AI84: job_id, AI33: task_id
$task_id = $result['job_id'] ?? $result['task_id'] ?? null;

writeToLog("📥 API RESPONSE | Code: $final_http_code | Task ID: $task_id | Server: $selected_server");

if (isset($result['success']) && $result['success'] == true && $task_id) {
        
        // 1. TRỪ CREDITS
        $new_balance = $current_credits - $total_estimated_cost;
        $stmt_update = $conn->prepare("UPDATE Users SET credits3 = ? WHERE id = ?");
        $stmt_update->bind_param("ii", $new_balance, $user_id_real);
        
        if (!$stmt_update->execute()) {
            throw new Exception('Failed to deduct credits');
        }
        $stmt_update->close();
        
        // 2. TĂNG LOAD CỦA API KEY
        $loadBalancer->increaseLoad($api_key_id);
        
        // 3. LƯU TASK DISTRIBUTION (Để biết task này thuộc server nào)
        $loadBalancer->recordTaskDistribution($task_id, $user_id_real, $selected_server, $api_key_id);
        
        // 4. LƯU LỊCH SỬ
        $stmt = $conn->prepare("
            INSERT INTO tts_kingcong 
            (user_id, user_email, text_input, voice_id, voice_name, task_id, provider, model_id, status, credit_cost, with_transcript, is_genai_backup, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 0, NOW())
        ");
        
        $transcript_val = $with_transcript ? 1 : 0;
        $stmt->bind_param("isssssssii", $user_id_real, $user_email_real, $text, $voice_id, $voice_name, $task_id, $provider, $model_id, $total_estimated_cost, $transcript_val);
        
        if (!$stmt->execute()) {
            writeToLog("❌ HISTORY SAVE FAILED | Error: " . $stmt->error);
        }
        $stmt->close();
        
        writeToLog("✅ TASK CREATED SUCCESS | Task ID: $task_id | Server: $selected_server");
        
        jsonSuccess([
            'task_id' => $task_id,
            'credit_cost' => $total_estimated_cost,
            'new_balance' => $new_balance,
            'character_count' => $char_count,
            'cost_factor' => $cost_factor,
            'server' => $selected_server,
            'message' => 'Task created successfully'
        ]);
        
    } else {
        // Xử lý lỗi trả về từ API
        $msg = 'Failed to generate speech.';
        if (isset($result['detail'])) {
            if (is_array($result['detail'])) {
                $msg = $result['detail']['message'] ?? json_encode($result['detail']);
            } else {
                $msg = $result['detail'];
            }
        } elseif (isset($result['message'])) {
            $msg = $result['message'];
        }
        
        if ($final_http_code == 401) $msg = "Invalid API Key. Please contact Admin.";
        elseif ($final_http_code == 429) $msg = "Rate limit exceeded. Please try again later.";
        elseif ($final_http_code >= 500) $msg = "API Server Error. Please try again later.";
        
        throw new Exception($msg);
    }
}
// 🔥 AUTO FETCH URLs - HỖ TRỢ CẢ MINIMAX & ELEVENLABS
function autoFetchTaskUrls($task_id, $user_api_key, $conn, $user_id, $provider = 'elevenlabs', $server_type = 'ai33') {
    $max_attempts = 10;
    $attempt = 0;
    
    // 🔥 XÁC ĐỊNH ENDPOINT
    if ($server_type === 'ai84') {
        $endpoint = 'https://api.ai84.pro';
    } else {
        $endpoint = 'https://api.ai33.pro';
    }
    
    while ($attempt < $max_attempts) {
        $attempt++;
        
        // 🔥 BUILD URL THEO PROVIDER VÀ SERVER
        if ($provider === 'minimax') {
    $url = $endpoint . "/v1/minimax/text-to-speech/async";
}else {
    // ElevenLabs
    if ($selected_server === 'ai84') {
        $url = $endpoint . "/v2/text-to-speech/async?voice_id=" . $voice_id;
    } else {
        $url = $endpoint . "/v1/text-to-speech/$voice_id?output_format=mp3_44100_128";
    }
}
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['xi-api-key: ' . $user_api_key]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        writeToLog("🔄 Auto Fetch URLs [$provider] [Server: $server_type] [Attempt $attempt/$max_attempts] | Task: $task_id | Code: $http_code");
        
        if ($http_code === 200 && isset($data['success']) && $data['success'] && isset($data['job'])) {
            $job = $data['job'];
            
            if ($job['status'] === 'done') {
                $audio_url = $job['audio_url'] ?? '';
                $srt_url = $job['transcript_url'] ?? '';
                $json_url = '';
                
                if (!empty($audio_url)) {
                    $update = $conn->prepare("
                        UPDATE tts_kingcong 
                        SET audio_url = ?, srt_url = ?, json_url = ?, updated_at = NOW() 
                        WHERE task_id = ? AND user_id = ?
                    ");
                    $update->bind_param("ssssi", $audio_url, $srt_url, $json_url, $task_id, $user_id);
                    
                    if ($update->execute()) {
                        writeToLog("✅ URLs saved ($provider) | Audio: " . substr($audio_url, 0, 60));
                        $update->close();
                        return [
                            'success' => true,
                            'audio_url' => $audio_url,
                            'srt_url' => $srt_url,
                            'json_url' => $json_url
                        ];
                    }
                    $update->close();
                }
            }
        }
        
        if ($attempt < $max_attempts) {
            sleep(1);
        }
    }
    
    writeToLog("❌ Auto Fetch timeout | Provider: $provider | Task: $task_id");
    return ['success' => false];
}
// ==================================================================
// B. CHECK STATUS
// ==================================================================
if ($action === 'check_status') {
    $task_id = $_POST['task_id'] ?? '';
    
    if (empty($task_id)) {
        throw new Exception('Missing task_id');
    }
    
    writeToLog("🔍 CHECK STATUS | Task: $task_id | User: $user_id_real");
    
    // Auto cleanup stuck tasks (>24h)
    $check_stuck = $conn->prepare("
        SELECT credit_cost FROM tts_kingcong 
        WHERE task_id = ? AND user_id = ? 
        AND status = 'pending'
        AND created_at < (NOW() - INTERVAL 24 HOUR)
    ");
    $check_stuck->bind_param("si", $task_id, $user_id_real);
    $check_stuck->execute();
    $stuck_res = $check_stuck->get_result()->fetch_assoc();
    $check_stuck->close();
    
    if ($stuck_res) {
        $refund_amount = (int)$stuck_res['credit_cost'];
        
        $update_stuck = $conn->prepare("UPDATE tts_kingcong SET status = 'failed', error_message = 'Timeout: Task pending > 24h (Auto Cancelled)', updated_at = NOW() WHERE task_id = ?");
        $update_stuck->bind_param("s", $task_id);
        $update_stuck->execute();
        $update_stuck->close();
        
        if ($refund_amount > 0) {
            $refund = $conn->prepare("UPDATE Users SET credits3 = credits3 + ? WHERE id = ?");
            $refund->bind_param("ii", $refund_amount, $user_id_real);
            $refund->execute();
            $refund->close();
            
            writeToLog("💸 AUTO REFUND (TIMEOUT) | User: $user_id_real | Amount: $refund_amount | Task: $task_id");
        }
        
        jsonSuccess([
            'task_status' => 'failed',
            'error_message' => 'Task expired (>24h) and was refunded.',
            'refunded' => $refund_amount
        ]);
    }
    
    // Check DB first
    $stmt = $conn->prepare("
        SELECT status, audio_url, srt_url, json_url, credit_cost, error_message, provider
        FROM tts_kingcong 
        WHERE task_id = ? AND user_id = ?
    ");
    $stmt->bind_param("si", $task_id, $user_id_real);
    $stmt->execute();
    $db_res = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    if (!$db_res) {
        jsonError('Task not found');
    }
    
    writeToLog("📋 DB Status: {$db_res['status']} | Provider: {$db_res['provider']}");
    
    // Return if already done/failed
    if ($db_res['status'] === 'done') {
        jsonSuccess([
            'task_status' => 'done',
            'progress' => 100,
            'audio_url' => $db_res['audio_url'],
            'srt_url' => $db_res['srt_url'],
            'json_url' => $db_res['json_url'],
            'credit_cost' => (int)$db_res['credit_cost']
        ]);
    }
    
    if ($db_res['status'] === 'failed') {
        jsonSuccess([
            'task_status' => 'failed',
            'error_message' => $db_res['error_message']
        ]);
    }
    
    // 🔥 LẤY SERVER TYPE & API KEY TỪ task_distribution
    $stmt_server = $conn->prepare("
        SELECT server_type, api_key_id 
        FROM task_distribution 
        WHERE task_id = ?
    ");
    $stmt_server->bind_param("s", $task_id);
    $stmt_server->execute();
    $server_info = $stmt_server->get_result()->fetch_assoc();
    $stmt_server->close();
    
    $server_type = $server_info['server_type'] ?? 'ai33';
    $api_key_id = $server_info['api_key_id'] ?? null;
    $endpoint = $loadBalancer->getEndpoint($server_type);
    
    // 🔥 LẤY API KEY THỰC TẾ TỪ POOL
    $system_api_key = null;
    if ($api_key_id) {
        $stmt_key = $conn->prepare("SELECT api_key FROM api_keys_pool WHERE id = ? AND is_active = 1");
        $stmt_key->bind_param("i", $api_key_id);
        $stmt_key->execute();
        $key_result = $stmt_key->get_result()->fetch_assoc();
        $stmt_key->close();
        
        $system_api_key = $key_result['api_key'] ?? null;
    }
    
    // 🔥 FALLBACK: Nếu không tìm thấy, lấy key khả dụng mới
    if (!$system_api_key) {
        writeToLog("⚠️ No API key from distribution, getting new one...");
        $key_data = $loadBalancer->getAvailableApiKey($server_type, $provider);
        $system_api_key = $key_data['api_key'] ?? null;
        
        if ($key_data) {
            $api_key_id = $key_data['id'];
        }
    }
    
    if (!$system_api_key) {
        writeToLog("❌ No API key available for server: $server_type");
        jsonSuccess(['task_status' => 'processing', 'progress' => 0, 'error_note' => 'No API key available']);
    }
    
    writeToLog("🎯 Server: $server_type | API Key ID: $api_key_id | Endpoint: $endpoint");
    
    // 🔥 XÁC ĐỊNH URL THEO SERVER & PROVIDER
    $provider = $db_res['provider'];
    
    if ($server_type === 'ai33') {
        // AI33: Chung endpoint cho tất cả
        $url = $endpoint . "/v1/task/$task_id";
    } else {
        // AI84: Tách endpoint theo provider
        if ($provider === 'minimax') {
            $url = $endpoint . "/v1/minimax/text-to-speech/async/$task_id";
        } else {
            $url = $endpoint . "/v2/text-to-speech/async/$task_id";
        }
    }
    
    writeToLog("📡 Calling API: $url");
    
    // 🔥 DÙNG SYSTEM API KEY THAY VÌ USER KEY
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['xi-api-key: ' . $system_api_key]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $api_res = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    // 🔥 FIX 1: Trim khoảng trắng và BOM để đảm bảo JSON valid
    $api_res = trim($api_res);
    // Loại bỏ BOM nếu có (UTF-8 Byte Order Mark)
    if (substr($api_res, 0, 3) == pack('CCC', 0xef, 0xbb, 0xbf)) {
        $api_res = substr($api_res, 3);
    }

    writeToLog("📥 API Response | HTTP: $http_code | Body: " . substr($api_res, 0, 200));

    // Xử lý lỗi Curl
    if ($curl_error) {
        writeToLog("❌ CURL Error: $curl_error");
        jsonSuccess(['task_status' => 'processing', 'progress' => 0]);
    }

    // Decode JSON
    $api_data = json_decode($api_res, true);

    // 🔥 FIX 2: Kiểm tra lỗi JSON
    if (json_last_error() !== JSON_ERROR_NONE) {
        writeToLog("❌ JSON Decode Error: " . json_last_error_msg());
        // Nếu JSON lỗi nhưng HTTP 200, ta cứ để processing để nó thử lại lần sau
        jsonSuccess(['task_status' => 'processing']);
    }

    // Xử lý cấu trúc dữ liệu (AI84 bọc trong 'job', AI33 thì không)
    $job_data = $api_data;
    if (isset($api_data['job'])) {
        $job_data = $api_data['job'];
    }

    // 🔥 FIX 3: Chuyển status về chữ thường để so sánh chuẩn xác
    $raw_status = $job_data['status'] ?? 'queued';
    $api_status = strtolower(trim($raw_status));
    $progress = intval($job_data['progress'] ?? 0);

    writeToLog("📊 Check Logic | Raw: $raw_status | Parsed: $api_status | Task: $task_id");

    // =======================================================
    // TRƯỜNG HỢP: DONE
    // =======================================================
    if ($api_status === 'done') {
    writeToLog("✅ Task completed!");
    
    // 🔥 THÊM LOG ĐỂ DEBUG
    writeToLog("🔍 FULL API RESPONSE: " . json_encode($api_data));
    writeToLog("🔍 JOB DATA EXTRACTED: " . json_encode($job_data));
    
    // 🔥 AI33 FORMAT: metadata nằm trong root
    $audio_url = '';
    $srt_url = '';
    $json_url = '';
    
    // TRY 1: metadata object (AI33)
    if (isset($job_data['metadata'])) {
        $meta = $job_data['metadata'];
        $audio_url = $meta['audio_url'] ?? '';
        $srt_url = $meta['srt_url'] ?? $meta['transcript_url'] ?? '';
        $json_url = $meta['json_url'] ?? '';
    }
    
    // TRY 2: Direct keys (AI84)
    if (empty($audio_url)) {
        $audio_url = $job_data['audioUrl'] ?? $job_data['audio_url'] ?? '';
    }
    if (empty($srt_url)) {
        $srt_url = $job_data['transcriptUrl'] ?? $job_data['transcript_url'] ?? '';
    }
    if (empty($json_url)) {
        $json_url = $job_data['jsonUrl'] ?? $job_data['json_url'] ?? '';
    }
    
    // 🔥 LOG PARSED URLs
    writeToLog("📦 PARSED URLS | Audio: $audio_url | SRT: $srt_url | JSON: $json_url");
    
    if (empty($audio_url)) {
        writeToLog("❌ WARNING: audio_url is EMPTY after parsing!");
    }
        
        // Fix lỗi cost: Nếu API không trả về cost, dùng cost cũ trong DB
        $actual_cost = isset($job_data['creditCost']) ? (int)$job_data['creditCost'] : (int)$db_res['credit_cost'];

        // Cập nhật DB
        $update = $conn->prepare("
            UPDATE tts_kingcong 
            SET status = 'done', audio_url = ?, srt_url = ?, json_url = ?, credit_cost = ?, updated_at = NOW() 
            WHERE task_id = ? AND user_id = ?
        ");
        
        $update->bind_param("sssisi", $audio_url, $srt_url, $json_url, $actual_cost, $task_id, $user_id_real);
        
        if ($update->execute()) {
            writeToLog("💾 DB Update SUCCESS");
            
            // Xử lý hoàn tiền thừa (nếu có)
            $cost_diff = $actual_cost - (int)$db_res['credit_cost'];
            if ($cost_diff != 0) {
                // ... logic trừ/cộng tiền cũ ...
                $adjust = $conn->prepare("UPDATE Users SET credits3 = GREATEST(0, credits3 - ?) WHERE id = ?");
                $adjust->bind_param("ii", $cost_diff, $user_id_real);
                $adjust->execute();
                $adjust->close();
            }
            
            // Update Load Balancer
            if ($api_key_id) {
                $loadBalancer->updateTaskStatus($task_id, 'done');
            }
        } else {
            writeToLog("❌ DB Update FAILED: " . $update->error);
        }
        $update->close();

        jsonSuccess([
            'task_status' => 'done',
            'progress' => 100,
            'audio_url' => $audio_url,
            'srt_url' => $srt_url,
            'json_url' => $json_url,
            'credit_cost' => $actual_cost
        ]);
    }

    // =======================================================
    // TRƯỜNG HỢP: FAILED
    // =======================================================
    elseif ($api_status === 'failed' || $api_status === 'error') {
        $error_msg = $job_data['errorMessage'] ?? $job_data['error_message'] ?? 'Task failed on server';
        writeToLog("❌ Task failed | Error: $error_msg");

        // Update DB
        $update_failed = $conn->prepare("UPDATE tts_kingcong SET status = 'failed', error_message = ?, updated_at = NOW() WHERE task_id = ? AND user_id = ?");
        $update_failed->bind_param("ssi", $error_msg, $task_id, $user_id_real);
        $update_failed->execute();
        $update_failed->close();

        // Hoàn tiền
        $refund_amount = (int)$db_res['credit_cost'];
        if ($refund_amount > 0) {
             $refund = $conn->prepare("UPDATE Users SET credits3 = credits3 + ? WHERE id = ?");
             $refund->bind_param("ii", $refund_amount, $user_id_real);
             $refund->execute();
             $refund->close();
             writeToLog("💸 Refunded $refund_amount credits");
        }
        
        if ($api_key_id) {
            $loadBalancer->updateTaskStatus($task_id, 'failed');
        }

        jsonSuccess([
            'task_status' => 'failed',
            'error_message' => $error_msg,
            'refunded' => $refund_amount
        ]);
    }

    // =======================================================
    // TRƯỜNG HỢP: PROCESSING / QUEUED
    // =======================================================
    else {
        // Vẫn đang chạy
        jsonSuccess([
            'task_status' => 'processing',
            'progress' => $progress > 0 ? $progress : 0, // Đảm bảo không null
            'queue_position' => $job_data['queuePosition'] ?? null
        ]);
    }
}
if ($action === 'get_history_detailed_v2') {
    
    $page = max(1, intval($_POST['page'] ?? 1));
    $limit = max(1, min(100, intval($_POST['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    $count_stmt = $conn->prepare("SELECT COUNT(*) as total FROM tts_kingcong WHERE user_id = ?");
    $count_stmt->bind_param("i", $user_id_real);
    $count_stmt->execute();
    $total = $count_stmt->get_result()->fetch_assoc()['total'];
    $count_stmt->close();
    
    $stmt = $conn->prepare("
        SELECT 
            id,
            task_id,
            text_input,
            status,
            progress,
            audio_url,
            srt_url,
            json_url,
            DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') as created_at_display,
            created_at,
            credit_cost,
            provider,
            model_id,
            voice_id,
            voice_name,
            error_message,
            duration,
            with_transcript,
            character_count
        FROM tts_kingcong 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ");
    
    $stmt->bind_param("iii", $user_id_real, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $histories = [];
    while ($row = $result->fetch_assoc()) {
        
        if (mb_strlen($row['text_input'], 'UTF-8') > 100) {
            $row['text_preview'] = mb_substr($row['text_input'], 0, 100, 'UTF-8') . '...';
        } else {
            $row['text_preview'] = $row['text_input'];
        }
        
        $histories[] = $row;
    }
    $stmt->close();
    
    writeToLog("✅ Loaded $total histories | Page: $page | Count: " . count($histories));
    
    jsonSuccess([
        'data' => $histories,
        'total' => $total,
        'page' => $page,
        'total_pages' => ceil($total / $limit),
        'has_more' => ($offset + $limit) < $total
    ]);
}
// ==================================================================
// N. DELETE TASK (Xóa từ API + DB)
// ==================================================================
if ($action === 'delete_task_v2') {
    
    $task_id = trim($_POST['task_id'] ?? '');
    
    if (empty($task_id)) {
        jsonError('Missing task_id');
    }
    
    writeToLog("DELETE TASK V2 | Task: $task_id | User: $user_id_real");
    
    // 🔥 BƯỚC 1: XÓA TRONG DATABASE TRƯỚC
    $stmt_del = $conn->prepare("DELETE FROM tts_kingcong WHERE task_id = ? AND user_id = ?");
    $stmt_del->bind_param("si", $task_id, $user_id_real);
    $db_deleted = $stmt_del->execute();
    $stmt_del->close();
    
    writeToLog("DB Delete: " . ($db_deleted ? "SUCCESS" : "FAILED"));
    
    // 🔥 BƯỚC 2: GỌI API ĐỂ XÓA TRÊN SERVER (Thử cả 2 endpoint)
    $endpoints = [
        "/v1/task/$task_id",
        "/v1m/task/$task_id"
    ];
    
    $api_deleted = false;
    foreach ($endpoints as $endpoint) {
        $url = TTS_API_ENDPOINT . $endpoint;
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'xi-api-key: ' . $user_api_key
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        writeToLog("API Delete ($endpoint) | HTTP: $http_code | Response: $response");
        
        if ($http_code == 200 || $http_code == 204) {
            $api_deleted = true;
            break;
        }
    }
    
    // 🔥 BƯỚC 3: TRẢ VỀ KẾT QUẢ
    if ($db_deleted) {
        jsonSuccess([
            'message' => 'Task deleted successfully',
            'db_deleted' => true,
            'api_deleted' => $api_deleted
        ]);
    } else {
        jsonError('Task not found in database', 404);
    }
}
// ==================================================================
// SYSTEM STATS (CHO ADMIN)
// ==================================================================
if ($action === 'get_system_stats') {
    $stats = $loadBalancer->getSystemStats();
    
    jsonSuccess([
        'stats' => $stats,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
// ==================================================================
// DELETE TASK WITH REFUND (Xóa task đang chạy + hoàn tiền)
// ==================================================================
if ($action === 'delete_task_with_refund') {
    
    $task_id = trim($_POST['task_id'] ?? '');
    $current_progress = intval($_POST['current_progress'] ?? 0);
    $original_cost = intval($_POST['original_cost'] ?? 0);
    $isAutoCleanup = isset($_POST['auto_cleanup']) && $_POST['auto_cleanup'] === 'true';

    if (empty($task_id)) {
        jsonError('Missing task_id');
    }
    
    writeToLog("🗑️ DELETE WITH REFUND | Task: $task_id | User: $user_id_real | Progress: $current_progress% | Original Cost: $original_cost");
    
    // 🔥 BƯỚC 1: LẤY THÔNG TIN TASK TỪ DB
    $stmt_info = $conn->prepare("
        SELECT status, credit_cost, provider 
        FROM tts_kingcong 
        WHERE task_id = ? AND user_id = ?
    ");
    $stmt_info->bind_param("si", $task_id, $user_id_real);
    $stmt_info->execute();
    $task_info = $stmt_info->get_result()->fetch_assoc();
    $stmt_info->close();
    
    if (!$task_info) {
        jsonError('Task not found', 404);
    }
    
    $db_cost = intval($task_info['credit_cost']);
    $task_status = $task_info['status'];
    
    // 🔥 BƯỚC 2: TÍNH SỐ TIỀN HOÀN TRẢ
    $refund_amount = 0;
    
    if ($task_status === 'pending' || $task_status === 'processing' || $task_status === 'queued') {
        // 🔥 LOGIC MỚI: CHỈ HOÀN TIỀN KHI PROGRESS = 0%
        if ($current_progress === 0) {
            $refund_amount = $db_cost; // Hoàn toàn bộ
            writeToLog("💸 Refund 100% | Status: $task_status | Progress: 0% | Refund: $refund_amount");
        } else {
            $refund_amount = 0; // Không hoàn tiền
            writeToLog("⚠️ No Refund | Status: $task_status | Progress: $current_progress% | Already started processing");
        }
    } else {
        // Task đã xong hoặc lỗi -> Không hoàn tiền
        writeToLog("ℹ️ Task already completed/failed | No refund");
    }
    
    // 🔥 BƯỚC 3: XÓA KHỎI DATABASE
    $stmt_del = $conn->prepare("DELETE FROM tts_kingcong WHERE task_id = ? AND user_id = ?");
    $stmt_del->bind_param("si", $task_id, $user_id_real);
    $db_deleted = $stmt_del->execute();
    $stmt_del->close();
    
    if (!$db_deleted) {
        jsonError('Failed to delete task from database', 500);
    }
    
    // 🔥 BƯỚC 4: HOÀN TIỀN (NẾU CÓ)
    if ($refund_amount > 0) {
        $stmt_refund = $conn->prepare("UPDATE Users SET credits3 = credits3 + ? WHERE id = ?");
        $stmt_refund->bind_param("ii", $refund_amount, $user_id_real);
        $refund_success = $stmt_refund->execute();
        $stmt_refund->close();
        
        if ($refund_success) {
            writeToLog("✅ Refunded $refund_amount credits to user $user_id_real");
        } else {
            writeToLog("❌ Failed to refund credits");
        }
    }
    
    // 🔥 BƯỚC 5: GỌI API XÓA TRÊN SERVER (OPTIONAL - Best effort)
    $stmt_server = $conn->prepare("
        SELECT server_type, api_key_id 
        FROM task_distribution 
        WHERE task_id = ?
    ");
    $stmt_server->bind_param("s", $task_id);
    $stmt_server->execute();
    $server_info = $stmt_server->get_result()->fetch_assoc();
    $stmt_server->close();
    
    $api_deleted = false;
    
    if ($server_info) {
        $server_type = $server_info['server_type'];
        $endpoint = $loadBalancer->getEndpoint($server_type);
        
        // Lấy API key
        $api_key_id = $server_info['api_key_id'];
        $stmt_key = $conn->prepare("SELECT api_key FROM api_keys_pool WHERE id = ?");
        $stmt_key->bind_param("i", $api_key_id);
        $stmt_key->execute();
        $key_result = $stmt_key->get_result()->fetch_assoc();
        $stmt_key->close();
        
        if ($key_result) {
            $api_key = $key_result['api_key'];
            
            // Thử xóa trên API
            $delete_url = $endpoint . "/v1/task/$task_id";
            
            $ch = curl_init($delete_url);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'xi-api-key: ' . $api_key
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            writeToLog("🌐 API Delete Request | HTTP: $http_code | URL: $delete_url");
            
            if ($http_code == 200 || $http_code == 204) {
                $api_deleted = true;
            }
        }
    }
    
    // 🔥 BƯỚC 6: TRẢ VỀ KẾT QUẢ
    jsonSuccess([
        'message' => 'Task deleted successfully',
        'refund_credits' => $refund_amount,
        'db_deleted' => true,
        'api_deleted' => $api_deleted
    ]);
}
// ==================================================================
// DELETE TASK (Xóa lịch sử đơn giản - không hoàn tiền)
// ==================================================================
if ($action === 'delete_task') {
    
    $task_id = trim($_POST['task_id'] ?? '');
    
    if (empty($task_id)) {
        jsonError('Missing task_id', 400);
    }
    
    writeToLog("🗑️ DELETE HISTORY | Task: $task_id | User: $user_id_real");
    
    // XÓA KHỎI DATABASE
    $stmt_del = $conn->prepare("DELETE FROM tts_kingcong WHERE task_id = ? AND user_id = ?");
    $stmt_del->bind_param("si", $task_id, $user_id_real);
    $db_deleted = $stmt_del->execute();
    $affected = $stmt_del->affected_rows;
    $stmt_del->close();
    
    if ($affected > 0) {
        writeToLog("✅ History deleted | Affected rows: $affected");
        
        jsonSuccess([
            'message' => 'Task deleted successfully',
            'deleted' => true
        ]);
    } else {
        writeToLog("❌ Task not found or already deleted");
        jsonError('Task not found', 404);
    }
}
// Default
throw new Exception("Invalid action: $action");

} catch (Exception $e) {
    writeToLog("❌ EXCEPTION: " . $e->getMessage());
    jsonError('Hệ thống đang bận, vui lòng thử lại sau.');
}

// ✅ Clean buffer
ob_end_clean();
?>
