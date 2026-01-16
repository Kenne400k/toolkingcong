<?php
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');
session_start();
require_once '../config/database.php'; 

header('Content-Type: application/json; charset=utf-8');
if (extension_loaded('zlib')) {
    ob_start('ob_gzhandler');
}

// =====================================================
// 🔐 LOAD ENVIRONMENT VARIABLES FROM .env
// =====================================================
function loadEnv($file = __DIR__ . '/.env') {
    if (!file_exists($file)) {
        return false;
    }
    
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            $value = trim($value, '"\'');
            
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
    return true;
}

loadEnv();

// Check Login
if (!isset($_SESSION['Users'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$user_identity = $_SESSION['Users'];

// =====================================================
// 🔥 HÀM LẤY API KEY TỪ USER ID 12 (SHARED PUBLIC KEY)
// =====================================================
function getSharedApiKey($mysqli) {
    $stmt = $mysqli->prepare("SELECT apikey FROM Users WHERE id = 12 LIMIT 1");
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    return trim($res['apikey'] ?? '');
}

// =====================================================
// LẤY API KEY CỦA USER HIỆN TẠI (CHO DEFAULT VOICES)
// =====================================================
$stmt = $mysqli->prepare("SELECT apikey, apikey2 FROM Users WHERE taikhoan = ? OR google_id = ?");
$stmt->bind_param("ss", $user_identity, $user_identity);
$stmt->execute();
$res = $stmt->get_result()->fetch_assoc();

$api_key = trim($res['apikey'] ?? '');      // Key AI33
$api_key_ai84 = trim($res['apikey2'] ?? ''); // Key AI84

$stmt->close();

// Nếu user không có key riêng → Dùng shared key
if (empty($api_key)) {
    $api_key = getSharedApiKey($mysqli);
}

if (empty($api_key) && empty($api_key_ai84)) {
    echo json_encode(['status' => 'error', 'message' => 'No API Key available']);
    exit;
}

$base_url = 'https://api.ai33.pro';

// 🔥 CURL MULTI - GỌI SONG SONG NHIỀU API
function callAPIMulti($urls, $apiKey) {
    $mh = curl_multi_init();
    $handles = [];
    $results = [];
    
    foreach ($urls as $key => $url) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'xi-api-key: ' . $apiKey,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        
        curl_multi_add_handle($mh, $ch);
        $handles[$key] = $ch;
    }
    
    $running = null;
    do {
        curl_multi_exec($mh, $running);
        curl_multi_select($mh);
    } while ($running > 0);
    
    foreach ($handles as $key => $ch) {
        $response = curl_multi_getcontent($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if ($http_code === 200 && $response) {
            $results[$key] = json_decode($response, true);
        } else {
            $results[$key] = null;
        }
        
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    
    curl_multi_close($mh);
    return $results;
}

function callAPI($url, $apiKey) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'xi-api-key: ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ($http_code === 200) ? json_decode($response, true) : null;
}

// CACHE FILES
$cache_file = __DIR__ . '/voices_cache2.json';
$shared_cache_file = __DIR__ . '/shared_voices_cache2.json';
$cache_duration = 86400;
$shared_cache_duration = 3600;

$action = $_GET['action'] ?? 'default';

$force_refresh = isset($_GET['force_refresh']) && $_GET['force_refresh'] === 'true';

if ($force_refresh) {
    if (file_exists($cache_file)) {
        @unlink($cache_file);
        error_log("🔥 Cache deleted: $cache_file");
    }
    if (file_exists($shared_cache_file)) {
        @unlink($shared_cache_file);
        error_log("🔥 Cache deleted: $shared_cache_file");
    }
}

// =====================================================
// 🔥 SEARCH VOICE BY ID (DÙNG SHARED API KEY USER 12)
// =====================================================
if ($action == 'search_voice_id') {
    $voice_id = $_POST['voice_id'] ?? '';

    if (empty($voice_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Vui lòng nhập Voice ID']);
        exit;
    }

    // 🔥 LẤY SHARED API KEY TỪ USER ID 12
    $shared_key = getSharedApiKey($mysqli);
    
    if (empty($shared_key)) {
        echo json_encode(['status' => 'error', 'message' => 'Shared API Key not found']);
        exit;
    }

    error_log("🔍 Searching voice ID: $voice_id with Shared Key (User 12)");

    $found_voice = null;

    // Tìm trong Personal Voices
    $url_v2 = "$base_url/v2/voices?search=" . urlencode($voice_id);
    $res_v2 = callAPI($url_v2, $shared_key);

    if ($res_v2 && isset($res_v2['voices']) && is_array($res_v2['voices'])) {
        foreach ($res_v2['voices'] as $voice) {
            if ($voice['voice_id'] === $voice_id) {
                $found_voice = $voice;
                $found_voice['source_type'] = 'personal'; 
                break;
            }
        }
    }

    // Tìm trong Shared Voices
    if (!$found_voice) {
        $url_shared = "$base_url/v1/shared-voices?search=" . urlencode($voice_id) . "&page_size=30";
        $res_shared = callAPI($url_shared, $shared_key);

        if ($res_shared && isset($res_shared['voices']) && is_array($res_shared['voices'])) {
            foreach ($res_shared['voices'] as $voice) {
                if ($voice['voice_id'] === $voice_id) {
                    $found_voice = $voice;
                    $found_voice['source_type'] = 'shared';
                    
                    if (!isset($found_voice['preview_url']) && isset($found_voice['sample_url'])) {
                        $found_voice['preview_url'] = $found_voice['sample_url'];
                    }
                    if (!isset($found_voice['labels'])) {
                        $found_voice['labels'] = [
                            'gender' => $found_voice['gender'] ?? '',
                            'accent' => $found_voice['accent'] ?? '',
                            'age' => $found_voice['age'] ?? '',
                            'category' => $found_voice['category'] ?? ''
                        ];
                    }
                    break;
                }
            }
        }
    }

    // Fallback: Gọi trực tiếp ID
    if (!$found_voice) {
        $url_direct = "$base_url/v1/voices/" . $voice_id . "?with_settings=true";
        $res_direct = callAPI($url_direct, $shared_key);
        
        if ($res_direct && isset($res_direct['voice_id'])) {
            $found_voice = $res_direct;
            $found_voice['source_type'] = 'direct_lookup';
        }
    }

    if ($found_voice) {
        error_log("✅ Voice found: " . $found_voice['name']);
        echo json_encode(['status' => 'success', 'data' => $found_voice]);
    } else {
        error_log("❌ Voice not found: $voice_id");
        echo json_encode(['status' => 'error', 'message' => 'Không tìm thấy giọng nói với ID này']);
    }
    exit;
}

// =====================================================
// 🔥 GET SHARED VOICES (DÙNG SHARED API KEY USER 12)
// =====================================================
if ($action === 'get_shared_voices') {
    
    // Check cache
    if (file_exists($shared_cache_file)) {
        $cache_age = time() - filemtime($shared_cache_file);
        if ($cache_age < $shared_cache_duration) {
            $cached = json_decode(file_get_contents($shared_cache_file), true);
            if ($cached && !empty($cached['data'])) {
                $cached['cache_info'] = ['cached' => true, 'age' => $cache_age];
                echo json_encode($cached);
                exit;
            }
        }
    }
    
    // 🔥 LẤY SHARED API KEY TỪ USER ID 12
    $shared_key = getSharedApiKey($mysqli);
    
    if (empty($shared_key)) {
        echo json_encode(['status' => 'error', 'message' => 'Shared API Key not found']);
        exit;
    }

    error_log("📚 Fetching Shared Voices with Shared Key (User 12)");

    // GỌI SONG SONG 3 PAGES
    $urls = [
        'page1' => "$base_url/v1/shared-voices?page_size=100&page=1",
        'page2' => "$base_url/v1/shared-voices?page_size=100&page=2",
        'page3' => "$base_url/v1/shared-voices?page_size=100&page=3"
    ];
    
    $responses = callAPIMulti($urls, $shared_key);
    
    $shared_voices = [];
    $seen_ids = [];
    
    foreach (['page1', 'page2', 'page3'] as $key) {
        if (isset($responses[$key]['voices'])) {
            foreach ($responses[$key]['voices'] as $v) {
                if (in_array($v['voice_id'], $seen_ids)) continue;
                $seen_ids[] = $v['voice_id'];
                
                $shared_voices[] = [
                    'voice_id' => $v['voice_id'],
                    'name' => $v['name'],
                    'image_url' => $v['image_url'] ?? null,
                    'preview_url' => $v['preview_url'] ?? null,
                    'description' => $v['description'] ?? '',
                    'gender' => $v['gender'] ?? 'unknown',
                    'age' => $v['age'] ?? 'unknown',
                    'accent' => $v['accent'] ?? 'neutral',
                    'language' => $v['language'] ?? 'en',
                    'use_case' => $v['use_case'] ?? 'conversational',
                    'category' => $v['category'] ?? 'shared',
                    'featured' => $v['featured'] ?? false
                ];
            }
        }
    }
    
    error_log("✅ Shared Voices loaded: " . count($shared_voices));

    $result = [
        'status' => 'success',
        'data' => $shared_voices,
        'count' => count($shared_voices)
    ];
    
    @file_put_contents($shared_cache_file, json_encode($result));
    echo json_encode($result);
    exit;
}

// =====================================================
// 🔥 DEFAULT ACTION (OPTIMIZED WITH PARALLEL CALLS)
// =====================================================
// Check cache
if (file_exists($cache_file)) {
    $cache_age = time() - filemtime($cache_file);
    if ($cache_age < $cache_duration) {
        $cached_data = json_decode(file_get_contents($cache_file), true);
        if ($cached_data && isset($cached_data['status']) && $cached_data['status'] === 'success') {
            $cached_data['cache_info'] = ['cached' => true, 'age' => $cache_age];
            echo json_encode($cached_data);
            exit;
        }
    }
}

try {
    // GỌI SONG SONG TẤT CẢ APIs
    $urls = [
        'models' => "$base_url/v1/models",
        'voices' => "$base_url/v2/voices",
        'shared' => "$base_url/v1/shared-voices?page_size=100",
        'mm_config' => "$base_url/v1m/common/config",
        'mm_clones' => "$base_url/v1m/voice/clone"
    ];
    
    $responses = callAPIMulti($urls, $api_key);
    
// ==================================================
// 🔥 MINIMAX VOICES - AI84 API
// ==================================================
$minimax_voices = [];
$voice_ids_seen = [];

// 🔥 GỌI API AI84 MINIMAX
$ai84_base = 'https://api.ai84.pro';

// Lấy API Key AI84 (apikey2)
$stmt_ai84 = $mysqli->prepare("SELECT apikey2 FROM Users WHERE taikhoan = ? OR google_id = ?");
$stmt_ai84->bind_param("ss", $user_identity, $user_identity);
$stmt_ai84->execute();
$res_ai84 = $stmt_ai84->get_result()->fetch_assoc();
$api_key_ai84 = trim($res_ai84['apikey2'] ?? '');
$stmt_ai84->close();

// Helper function để extract language
if (!function_exists('extractLanguage')) {
    function extractLanguage($tags) {
        $map = [
            'Japanese' => 'ja',
            'Chinese (Mandarin)' => 'zh',
            'English' => 'en',
            'Vietnamese' => 'vi',
            'Malay' => 'ms',
            'Tamil' => 'ta',
            'Afrikaans' => 'af',
            'Croatian' => 'hr',
            'Swedish' => 'sv'
        ];
        
        foreach ($tags as $tag) {
            if (isset($map[$tag])) return $map[$tag];
        }
        return 'en';
    }
}

if (!empty($api_key_ai84)) {
    // Fetch Minimax voices từ AI84
    $page = 1;
    $max_pages = 10;
    
    while ($page <= $max_pages) {
        $mm_url = "$ai84_base/v1/minimax/voices?page=$page&page_size=50";
        $mm_response = callAPI($mm_url, $api_key_ai84);
        
        if (!$mm_response || !isset($mm_response['success']) || !$mm_response['success']) {
            break;
        }
        
        if (empty($mm_response['data'])) {
            break;
        }
        
        foreach ($mm_response['data'] as $v) {
            // ✅ Dùng canonical_voice_id
            $voice_id = $v['canonical_voice_id'] ?? '';
            
            if (empty($voice_id) || in_array($voice_id, $voice_ids_seen)) continue;
            $voice_ids_seen[] = $voice_id;
            
            // Metadata
            $meta = $v['minimax_voice'] ?? [];
            $tags = $meta['tag_list'] ?? [];
            
            // Gender
            $gender = 'Unknown';
            if (in_array('Female', $tags)) {
                $gender = 'Female';
            } elseif (in_array('Male', $tags)) {
                $gender = 'Male';
            }
            
            $minimax_voices[] = [
                'id' => $voice_id,
                'name' => $v['name'] ?? $meta['voice_name'] ?? 'Voice',
                'tags' => $tags,
                'avatar' => $meta['cover_url'] ?? null,
                'sample_audio' => $meta['sample_audio'] ?? null,
                'preview_url' => $meta['sample_audio'] ?? null,
                'gender' => $gender,
                'source' => 'system',
                'description' => $meta['description'] ?? '',
                'language' => extractLanguage($tags),
                'created_at' => $v['created_at'] ?? null
            ];
        }
        
        // Stop nếu page này < 50 voices
        if (count($mm_response['data']) < 50) {
            break;
        }
        
        $page++;
    }
    
    error_log("✅ Minimax voices loaded from AI84: " . count($minimax_voices));
} else {
    error_log("⚠️ No AI84 API Key (apikey2) - Minimax voices empty");
}

$cloned_count = 0; // Chưa hỗ trợ cloned voices
$system_count = count($minimax_voices);

if (isset($mm_voices_raw['data']['voice_list']) && is_array($mm_voices_raw['data']['voice_list'])) {
    foreach ($mm_voices_raw['data']['voice_list'] as $v) {
        $voice_id = $v['voice_id'] ?? '';
        if (empty($voice_id) || in_array($voice_id, $voice_ids_seen)) continue;
        $voice_ids_seen[] = $voice_id;
        
        $tags = $v['tag_list'] ?? [];
        
        // Xác định gender chính xác
        $gender = 'Unknown';
        if (in_array('Female', $tags)) {
            $gender = 'Female';
        } elseif (in_array('Male', $tags)) {
            $gender = 'Male';
        }
        
        // Tạo description từ tags
        $description = '';
        $important_tags = array_filter($tags, function($tag) {
            return in_array($tag, ['Young', 'Middle Age', 'Old', 'Elegant', 'Warm', 'Energetic', 'Calm']);
        });
        if (!empty($important_tags)) {
            $description = implode(', ', array_slice($important_tags, 0, 3));
        }
        
        $minimax_voices[] = [
            'id' => $voice_id,
            'name' => $v['voice_name'] ?? 'Voice',
            'tags' => $tags,
            'avatar' => $v['cover_url'] ?? null,
            'sample_audio' => $v['sample_audio'] ?? null,
            'gender' => $gender,
            'source' => 'system',
            'description' => $description,
            'create_time' => $v['create_time'] ?? null,
            'voice_status' => $v['voice_status'] ?? 2,
            'uniq_id' => $v['uniq_id'] ?? null
        ];
    }
}

$cloned_count = count(array_filter($minimax_voices, function($v) { return $v['source'] === 'cloned'; }));
$system_count = count(array_filter($minimax_voices, function($v) { return $v['source'] === 'system'; }));

error_log("Total Minimax voices loaded: " . count($minimax_voices) . " (Cloned: $cloned_count, System: $system_count)");
    // ==================================================
// PROCESS ELEVENLABS MODELS
// ==================================================
$eleven_models = [];

// 🔥 BỎ BLACKLIST - CHO HIỆN TẤT CẢ MODEL
// $excluded_models = ['eleven_multilingual_v1', 'eleven_monolingual_v1'];

if ($responses['models'] && is_array($responses['models'])) {
    foreach ($responses['models'] as $m) {
        // ❌ XÓA dòng này: if (in_array($m['model_id'], $excluded_models)) continue;
        
        if (!isset($m['can_do_text_to_speech']) || !$m['can_do_text_to_speech']) continue;
        
        // 🔥 XÁC ĐỊNH COST_FACTOR MỚI
        $model_id = $m['model_id'];
        $cost_factor = 1.0; // Mặc định
        
        // Nếu là v3 → x1.3
        if (strpos($model_id, 'v3') !== false || strpos($model_id, '_v3') !== false) {
            $cost_factor = 1.3;
        }
        // Tất cả model khác → x1.0
        
        $eleven_models[] = [
            'id' => $model_id,
            'name' => $m['name'],
            'description' => $m['description'] ?? '',
            'cost_factor' => (float)$cost_factor, // 🔥 SỬA: Dùng logic mới thay vì lấy từ API
            'languages' => $m['languages'] ?? [],
            'full_data' => $m
        ];
    }
}

if (empty($eleven_models)) {
    $eleven_models = [
        ['id' => 'eleven_v3', 'name' => 'Eleven v3', 'cost_factor' => 1.3],
        ['id' => 'eleven_multilingual_v2', 'name' => 'Eleven Multilingual v2', 'cost_factor' => 1.0],
    ];
}

    // ==================================================
    // PROCESS ELEVENLABS VOICES
    // ==================================================
    $eleven_voices = [];
    $voice_ids_seen = [];
    
    // Default voices
    if (isset($responses['voices']['voices'])) {
        foreach ($responses['voices']['voices'] as $v) {
            if (in_array($v['voice_id'], $voice_ids_seen)) continue;
            $voice_ids_seen[] = $v['voice_id'];
            
            $tags = [];
            if (isset($v['labels'])) {
                foreach ($v['labels'] as $value) {
                    if (!empty($value)) $tags[] = ucfirst($value);
                }
            }
            
            $eleven_voices[] = [
                'id' => $v['voice_id'],
                'name' => $v['name'],
                'tags' => array_slice(array_unique($tags), 0, 5),
                'preview_url' => $v['preview_url'] ?? null,
                'avatar' => $v['image_url'] ?? null,
                'category' => $v['category'] ?? 'general',
                'description' => $v['description'] ?? '',
                'source' => 'default',
                'full_data' => $v
            ];
        }
    }
    
    // Shared voices
    if (isset($responses['shared']['voices'])) {
        foreach ($responses['shared']['voices'] as $v) {
            if (in_array($v['voice_id'], $voice_ids_seen)) continue;
            $voice_ids_seen[] = $v['voice_id'];
            
            $tags = ['Shared'];
            if (!empty($v['category'])) $tags[] = ucfirst($v['category']);
            if (!empty($v['gender'])) $tags[] = ucfirst($v['gender']);
            
            $eleven_voices[] = [
                'id' => $v['voice_id'],
                'name' => $v['name'],
                'tags' => array_slice(array_unique($tags), 0, 5),
                'preview_url' => $v['preview_url'] ?? null,
                'avatar' => $v['image_url'] ?? null,
                'category' => $v['category'] ?? 'shared',
                'description' => $v['description'] ?? '',
                'source' => 'shared',
                'full_data' => $v
            ];
        }
    }

    // ==================================================
// PROCESS MINIMAX MODELS
// ==================================================
$minimax_models = [];

// 🔥 DANH SÁCH MODEL BỊ BLACKLIST (KHÔNG CHO HIỂN THỊ)
$blacklisted_models = [
];

if (isset($responses['mm_config']['data']['t2a_model'])) {
    foreach ($responses['mm_config']['data']['t2a_model'] as $m) {
        $model_id = $m['value'] ?? '';
        
        // 🔥 BỎ QUA NẾU NẰM TRONG BLACKLIST
        if (in_array($model_id, $blacklisted_models)) {
            continue;
        }
        
        $minimax_models[] = [
            'id' => $model_id,
            'name' => ucwords(str_replace(['-', 'preview'], [' ', ''], $model_id)),
            'description' => 'Minimax TTS model',
            'cost_factor' => (float)($m['creditRatio'] ?? 1.0),
            'full_data' => $m
        ];
    }
}
    
    if (empty($minimax_models)) {
        $minimax_models = [['id' => 'speech-2.6-hd', 'name' => 'Speech 2.6 HD', 'cost_factor' => 1.0]];
    }
    // 🔥 SAU KHI LOAD XONG VOICES, LƯU VÀO DB
if (!empty($minimax_voices)) {
    // Prepare statement
    $stmt_insert = $mysqli->prepare("
        INSERT INTO voice_server_mapping (voice_id, provider, server_type, voice_name) 
        VALUES (?, 'minimax', 'ai84', ?)
        ON DUPLICATE KEY UPDATE voice_name = VALUES(voice_name)
    ");
    
    foreach ($minimax_voices as $v) {
        $stmt_insert->bind_param("ss", $v['id'], $v['name']);
        $stmt_insert->execute();
    }
    $stmt_insert->close();
    
    error_log("✅ Synced " . count($minimax_voices) . " Minimax AI84 voices to DB");
}

if (!empty($eleven_voices)) {
    $stmt_insert = $mysqli->prepare("
        INSERT INTO voice_server_mapping (voice_id, provider, server_type, voice_name) 
        VALUES (?, 'elevenlabs', 'ai84', ?)
        ON DUPLICATE KEY UPDATE voice_name = VALUES(voice_name)
    ");
    
    foreach ($eleven_voices as $v) {
        $stmt_insert->bind_param("ss", $v['id'], $v['name']);
        $stmt_insert->execute();
    }
    $stmt_insert->close();
}
    // ========== FINAL RESULT ==========
    $result = [
        'status' => 'success',
        'data' => [
            'elevenlabs' => [
                'models' => $eleven_models,
                'voices' => $eleven_voices,
                'voices_count' => count($eleven_voices)
            ],
            'minimax' => [
                'models' => $minimax_models,
                'voices' => $minimax_voices,
                'voices_count' => count($minimax_voices),
                'cloned_count' => count(array_filter($minimax_voices, function($v) { 
                    return $v['source'] === 'cloned'; 
                })),
                'system_count' => count(array_filter($minimax_voices, function($v) { 
                    return $v['source'] === 'system'; 
                }))
            ]
        ],
        'cached_at' => time(),
        'cache_info' => ['cached' => false, 'generated' => date('Y-m-d H:i:s')]
    ];
    
    @file_put_contents($cache_file, json_encode($result));
    echo json_encode($result);

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>