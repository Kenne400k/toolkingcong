<?php
/**
 * =====================================================
 * 🔥 GET_RESOURCES3.PHP - PUBLIC ENDPOINT
 * =====================================================
 * 📌 Purpose: Load voices/models for ALL USERS
 * 🔑 Security: Uses shared API key from User ID 12
 * ✅ Safe: API key NEVER exposed to client
 * 💰 Credit System: Users pay with their own credits when generating TTS
 * =====================================================
 */

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
// 🔥 ENABLE ERROR LOGGING
// =====================================================
error_reporting(E_ALL);
ini_set('display_errors', 0); // IMPORTANT: Hide errors from client
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/api_errors.log');

function logDebug($message, $data = null) {
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[$timestamp] [PUBLIC_API] $message";
    if ($data !== null) {
        $log_message .= "\nData: " . print_r($data, true);
    }
    $log_message .= "\n" . str_repeat('-', 80) . "\n";
    error_log($log_message);
}

logDebug("🚀 Public API Request Started", [
    'action' => $_GET['action'] ?? 'default',
    'method' => $_SERVER['REQUEST_METHOD'],
    'user_session' => isset($_SESSION['Users']) ? 'logged_in' : 'guest'
]);

// =====================================================
// 🔐 GET SHARED API KEY FROM USER ID 12
// =====================================================
$shared_user_id = 12; // User ID for shared resources

$stmt = $mysqli->prepare("SELECT apikey, apikey2 FROM Users WHERE id = ?");
$stmt->bind_param("i", $shared_user_id);
$stmt->execute();
$res = $stmt->get_result()->fetch_assoc();
$stmt->close();

$api_key = trim($res['apikey'] ?? '');
$api_key2 = trim($res['apikey2'] ?? '');

logDebug("🔑 Shared API Key Retrieved", [
    'user_id' => $shared_user_id,
    'has_key' => !empty($api_key),
    'has_key2' => !empty($api_key2),
    'key_preview' => !empty($api_key) ? substr($api_key, 0, 10) . '***' : 'EMPTY'
]);

if (empty($api_key)) {
    logDebug("❌ Shared API Key not configured");
    echo json_encode([
        'status' => 'error', 
        'message' => 'Service temporarily unavailable. Please contact admin.'
    ]);
    exit;
}

$base_url = 'https://api.ai33.pro';

// =====================================================
// 🔥 CURL FUNCTIONS (Same as original)
// =====================================================
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
            $decoded = json_decode($response, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $results[$key] = $decoded;
            } else {
                $results[$key] = null;
            }
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
    
    if ($http_code !== 200) return null;
    
    $decoded = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) return null;
    
    return $decoded;
}

function callAPIPOST($url, $apiKey, $data) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
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
    
    if ($http_code !== 200) return null;
    
    $decoded = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) return null;
    
    return $decoded;
}

// =====================================================
// 🔥 CACHE CONFIGURATION
// =====================================================
$cache_file = __DIR__ . '/voices_cache_public.json';
$cache_duration = 86400; // 24 hours

$action = $_GET['action'] ?? 'default';
$force_refresh = isset($_GET['force']) && $_GET['force'] == '1';

logDebug("🎯 Action determined", ['action' => $action, 'force_refresh' => $force_refresh]);

function getSharedApiKey($mysqli) {
    $stmt = $mysqli->prepare("SELECT apikey FROM Users WHERE id = 12 LIMIT 1");
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    return trim($res['apikey'] ?? '');
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
// 🔥 CHECK CACHE (Skip if force refresh)
// =====================================================
if (!$force_refresh && file_exists($cache_file)) {
    $cache_age = time() - filemtime($cache_file);
    if ($cache_age < $cache_duration) {
        $cached_data = json_decode(file_get_contents($cache_file), true);
        if ($cached_data && isset($cached_data['status']) && $cached_data['status'] === 'success') {
            $cached_data['cache_info'] = [
                'cached' => true, 
                'age' => $cache_age,
                'expires_in' => $cache_duration - $cache_age
            ];
            
            logDebug("✅ Serving from cache", ['age' => $cache_age . 's']);
            echo json_encode($cached_data);
            exit;
        }
    }
}

try {
    logDebug("🔄 Fetching fresh data from APIs");
    
    $urls = [
        'models' => "$base_url/v1/models",
        'voices' => "$base_url/v2/voices",
        'shared' => "$base_url/v1/shared-voices?page_size=100",
        'mm_config' => "$base_url/v1m/common/config"
    ];
    
    $responses = callAPIMulti($urls, $api_key);
    
    // =====================================================
    // 🔥 PROCESS MINIMAX VOICES - CHỈ LẤY AI33 TỪ DATABASE
    // =====================================================
    $minimax_voices = [];
    $voice_count_system = 0;
    $voice_count_cloned = 0;

    logDebug("🔍 Loading Minimax voices from DATABASE (AI33 only)");

    $stmt_voices = $mysqli->prepare("
        SELECT 
            voice_id,
            voice_name,
            gender,
            tags,
            avatar_url,
            sample_audio_url,
            voice_source,
            match_confidence
        FROM voice_ai_mapping
        WHERE provider = 'minimax'
        AND server_type = 'ai33'
        ORDER BY 
            CASE 
                WHEN voice_source = 'cloned' THEN 1
                WHEN voice_source = 'system' THEN 2
                ELSE 3
            END,
            voice_name ASC
    ");

    if ($stmt_voices) {
        $stmt_voices->execute();
        $result_voices = $stmt_voices->get_result();

        while ($row = $result_voices->fetch_assoc()) {
            $tags = [];
            if (!empty($row['tags'])) {
                $decoded_tags = json_decode($row['tags'], true);
                if (is_array($decoded_tags)) {
                    $tags = $decoded_tags;
                }
            }
            
            $gender = $row['gender'] ?? 'Unknown';
            if (!in_array($gender, $tags)) {
                $tags[] = $gender;
            }
            
            $source = $row['voice_source'] ?? 'system';
            if ($source === 'cloned' && !in_array('Clone', $tags)) {
                $tags[] = 'Clone';
            }
            
            $minimax_voices[] = [
                'id' => $row['voice_id'],
                'name' => $row['voice_name'],
                'tags' => $tags,
                'avatar' => $row['avatar_url'],
                'sample_audio' => $row['sample_audio_url'],
                'preview_url' => $row['sample_audio_url'],
                'gender' => $gender,
                'source' => $source,
                'server_type' => 'ai33',
                'description' => implode(', ', array_slice($tags, 0, 3))
            ];
            
            if ($source === 'cloned') {
                $voice_count_cloned++;
            } else {
                $voice_count_system++;
            }
        }

        $stmt_voices->close();
    }

    logDebug("✅ Loaded Minimax voices from DB", [
        'total' => count($minimax_voices),
        'system' => $voice_count_system,
        'cloned' => $voice_count_cloned
    ]);
    
    // =====================================================
    // 🔥 PROCESS ELEVENLABS MODELS
    // =====================================================
    $eleven_models = [];
    $excluded_models = ['eleven_multilingual_v1', 'eleven_monolingual_v1'];
    
    if ($responses['models'] && is_array($responses['models'])) {
        foreach ($responses['models'] as $m) {
            if (in_array($m['model_id'], $excluded_models)) continue;
            if (!isset($m['can_do_text_to_speech']) || !$m['can_do_text_to_speech']) continue;
            
            $eleven_models[] = [
                'id' => $m['model_id'],
                'name' => $m['name'],
                'description' => $m['description'] ?? '',
                'cost_factor' => (float)($m['model_rates']['character_cost_multiplier'] ?? 1.0),
                'languages' => $m['languages'] ?? []
            ];
        }
    }
    
    if (empty($eleven_models)) {
        $eleven_models = [
            ['id' => 'eleven_multilingual_v2', 'name' => 'Eleven Multilingual v2', 'cost_factor' => 1.0],
            ['id' => 'eleven_turbo_v2_5', 'name' => 'Eleven Turbo v2.5', 'cost_factor' => 0.5]
        ];
    }
    
    // =====================================================
    // 🔥 PROCESS ELEVENLABS VOICES
    // =====================================================
    $eleven_voices = [];
    $voice_ids_seen_eleven = [];
    
    if (isset($responses['voices']['voices'])) {
        foreach ($responses['voices']['voices'] as $v) {
            if (in_array($v['voice_id'], $voice_ids_seen_eleven)) continue;
            $voice_ids_seen_eleven[] = $v['voice_id'];
            
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
                'source' => 'default'
            ];
        }
    }
    
    if (isset($responses['shared']['voices'])) {
        foreach ($responses['shared']['voices'] as $v) {
            if (in_array($v['voice_id'], $voice_ids_seen_eleven)) continue;
            $voice_ids_seen_eleven[] = $v['voice_id'];
            
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
                'source' => 'shared'
            ];
        }
    }
    
    // =====================================================
    // 🔥 PROCESS MINIMAX MODELS
    // =====================================================
    $minimax_models = [];
    if (isset($responses['mm_config']['data']['t2a_model'])) {
        foreach ($responses['mm_config']['data']['t2a_model'] as $m) {
            $minimax_models[] = [
                'id' => $m['value'],
                'name' => ucwords(str_replace(['-', 'preview'], [' ', ''], $m['value'])),
                'description' => 'Minimax TTS model',
                'cost_factor' => (float)($m['creditRatio'] ?? 1.0)
            ];
        }
    }
    
    if (empty($minimax_models)) {
        $minimax_models = [['id' => 'speech-2.6-hd', 'name' => 'Speech 2.6 HD', 'cost_factor' => 1.0]];
    }
    
    // =====================================================
    // 🔥 BUILD FINAL RESPONSE
    // =====================================================
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
                'cloned_count' => $voice_count_cloned,
                'system_count' => $voice_count_system,
                'server_info' => 'AI33 only'
            ]
        ],
        'cached_at' => time(),
        'cache_info' => [
            'cached' => false, 
            'generated' => date('Y-m-d H:i:s'),
            'expires_in' => $cache_duration,
            'source' => 'database'
        ]
    ];
    
    @file_put_contents($cache_file, json_encode($result));
    
    logDebug("✅ Fresh data loaded and cached", [
        'elevenlabs_voices' => count($eleven_voices),
        'minimax_voices' => count($minimax_voices)
    ]);
    
    echo json_encode($result);
    
} catch (Exception $e) {
    logDebug("❌ Exception occurred", ['error' => $e->getMessage()]);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Failed to load resources. Please try again later.'
    ]);
}

logDebug("✅ Request completed");
?>