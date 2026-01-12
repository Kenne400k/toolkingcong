<?php
// File: /pages/tools-login.php
session_start();

// Nếu đã đăng nhập → redirect về dashboard
if (isset($_SESSION['Users']) || isset($_SESSION['api_key'])) {
    header('Location: /dashboard');
    exit();
}

$page_title = 'Đăng nhập - Tools';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $page_title; ?></title>
    
    <!-- Favicon -->
    <link rel="icon" href="https://kingcongstudio.com/assets/media/logos/Kingkong.jpg">
    
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #fff;
        }

        .login-container {
            width: 100%;
            max-width: 450px;
            background: #111;
            border: 1px solid #333;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }

        /* HEADER */
        .login-header {
            padding: 40px 40px 30px;
            text-align: center;
            background: linear-gradient(180deg, #1a1a1a 0%, #111 100%);
            border-bottom: 1px solid #222;
        }

        .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 20px;
        }

        .logo {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            border: 2px solid #333;
        }

        .logo-text {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #fff 0%, #888 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .login-title {
            font-size: 20px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 8px;
        }

        .login-subtitle {
            font-size: 14px;
            color: #888;
        }

        /* TABS */
        .login-tabs {
            display: flex;
            background: #0a0a0a;
            border-bottom: 1px solid #222;
        }

        .tab-btn {
            flex: 1;
            padding: 16px;
            background: transparent;
            border: none;
            color: #666;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            position: relative;
            transition: all 0.3s;
        }

        .tab-btn:hover {
            color: #888;
            background: #151515;
        }

        .tab-btn.active {
            color: #fff;
            background: #111;
        }

        .tab-btn.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }

        .tab-btn i {
            margin-right: 6px;
            font-size: 16px;
        }

        /* FORM CONTENT */
        .login-body {
            padding: 40px;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #ccc;
            margin-bottom: 8px;
        }

        .form-input-wrapper {
            position: relative;
        }

        .form-input {
            width: 100%;
            padding: 12px 16px;
            padding-left: 42px;
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            transition: all 0.2s;
        }

        .form-input:focus {
            outline: none;
            border-color: #667eea;
            background: #111;
        }

        .form-input::placeholder {
            color: #555;
        }

        .input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #666;
            font-size: 16px;
        }

        .password-toggle {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            color: #666;
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
        }

        .password-toggle:hover {
            color: #fff;
        }

        /* BUTTONS */
        .btn-primary {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:active {
            transform: translateY(0);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .btn-google {
            width: 100%;
            padding: 14px;
            background: #fff;
            color: #333;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .btn-google:hover {
            background: #f5f5f5;
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }

        .btn-google img {
            width: 20px;
            height: 20px;
        }

        /* DIVIDER */
        .divider {
            display: flex;
            align-items: center;
            gap: 16px;
            margin: 24px 0;
            color: #666;
            font-size: 13px;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #222;
        }

        /* ALERT */
        .alert {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13px;
            display: none;
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
        }

        .alert-success {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #22c55e;
        }

        .alert i {
            margin-right: 8px;
        }

        /* REMEMBER & FORGOT */
        .form-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .checkbox-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .checkbox-wrapper input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        .checkbox-wrapper label {
            font-size: 13px;
            color: #888;
            cursor: pointer;
        }

        .forgot-link {
            font-size: 13px;
            color: #667eea;
            text-decoration: none;
        }

        .forgot-link:hover {
            text-decoration: underline;
        }

        /* API KEY INFO */
        .api-info {
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #888;
        }

        .api-info-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #667eea;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .api-info ul {
            margin: 8px 0 0 20px;
            color: #aaa;
        }

        .api-info li {
            margin-bottom: 4px;
        }

        /* FOOTER */
        .login-footer {
            padding: 20px 40px;
            background: #0a0a0a;
            border-top: 1px solid #222;
            text-align: center;
            font-size: 13px;
            color: #666;
        }

        .login-footer a {
            color: #667eea;
            text-decoration: none;
        }

        .login-footer a:hover {
            text-decoration: underline;
        }

        /* LOADING SPINNER */
        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #ffffff40;
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* RESPONSIVE */
        @media (max-width: 500px) {
            .login-container {
                margin: 0;
                border-radius: 0;
            }

            .login-header,
            .login-body,
            .login-footer {
                padding: 30px 24px;
            }

            .tab-btn {
                font-size: 13px;
                padding: 14px 8px;
            }

            .tab-btn i {
                display: none;
            }
        }
    </style>

    <!-- Google Sign-In -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body>
    <div class="login-container">
        <!-- HEADER -->
        <div class="login-header">
            <div class="logo-container">
                <img src="https://kingcongstudio.com/assets/media/logos/Kingkong.jpg" alt="Logo" class="logo">
                <div class="logo-text">KingCong Studio</div>
            </div>
            <h1 class="login-title">Đăng nhập vào Tools</h1>
            <p class="login-subtitle">Chọn phương thức đăng nhập phù hợp với bạn</p>
        </div>

        <!-- TABS -->
        <div class="login-tabs">
            <button class="tab-btn active" onclick="switchTab('account')" id="tabAccount">
                <i class="bi bi-person-fill"></i>
                <span>Tài khoản</span>
            </button>
            <button class="tab-btn" onclick="switchTab('google')" id="tabGoogle">
                <i class="bi bi-google"></i>
                <span>Google</span>
            </button>
            <button class="tab-btn" onclick="switchTab('apikey')" id="tabApikey">
                <i class="bi bi-key-fill"></i>
                <span>API Key</span>
            </button>
        </div>

        <!-- BODY -->
        <div class="login-body">
            <!-- Alert -->
            <div class="alert alert-error" id="alertError">
                <i class="bi bi-exclamation-circle"></i>
                <span id="errorMessage"></span>
            </div>
            <div class="alert alert-success" id="alertSuccess">
                <i class="bi bi-check-circle"></i>
                <span id="successMessage"></span>
            </div>

            <!-- TAB 1: ACCOUNT LOGIN -->
            <div class="tab-content active" id="contentAccount">
                <form id="formAccount" onsubmit="loginWithAccount(event)">
                    <div class="form-group">
                        <label class="form-label">Tên đăng nhập</label>
                        <div class="form-input-wrapper">
                            <i class="bi bi-person input-icon"></i>
                            <input type="text" class="form-input" id="username" placeholder="Nhập tên đăng nhập hoặc email" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Mật khẩu</label>
                        <div class="form-input-wrapper">
                            <i class="bi bi-lock input-icon"></i>
                            <input type="password" class="form-input" id="password" placeholder="Nhập mật khẩu" required>
                            <button type="button" class="password-toggle" onclick="togglePassword('password')">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="remember" checked>
                            <label for="remember">Ghi nhớ đăng nhập</label>
                        </div>
                        <a href="/forgot-password" class="forgot-link">Quên mật khẩu?</a>
                    </div>

                    <button type="submit" class="btn-primary" id="btnLoginAccount">
                        <span>Đăng nhập</span>
                        <div class="spinner"></div>
                    </button>
                </form>
            </div>

            <!-- TAB 2: GOOGLE LOGIN -->
            <!-- TAB 2: GOOGLE LOGIN -->
<div class="tab-content" id="contentGoogle">
    
    <!-- 🔥 CHỈ LOAD GOOGLE SDK NẾU KHÔNG PHẢI ELECTRON -->
    <script>
        const isElectronEnv = navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        
        if (!isElectronEnv) {
            // Load Google SDK cho browser
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    </script>
    
    <!-- Google Sign-In Button (chỉ trong browser) -->
    <div id="g_id_onload"
         data-client_id="189817716633-jt198qfpjmtno4hjmhm4fd4aqo5eo452.apps.googleusercontent.com"
         data-callback="handleGoogleLogin"
         data-auto_prompt="false"
         style="display: none;">
    </div>
    
    <div class="g_id_signin" 
         data-type="standard"
         data-size="large"
         data-theme="outline"
         data-text="sign_in_with"
         data-shape="rectangular"
         data-logo_alignment="left"
         style="display: none;">
    </div>
    
    <!-- Custom Button (hoạt động cả browser lẫn Electron) -->
    <button class="btn-google" onclick="triggerGoogleLogin()">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
        <span>Đăng nhập bằng Google</span>
    </button>
    
    <div class="divider">hoặc</div>
    
    <button class="btn-primary" onclick="switchTab('account')">
        <i class="bi bi-arrow-left"></i>
        <span>Dùng tài khoản thường</span>
    </button>
</div>

<script>
// Show/hide Google SDK button based on environment
document.addEventListener('DOMContentLoaded', () => {
    const isElectron = navigator.userAgent.toLowerCase().indexOf('electron') > -1;
    const gsiElements = document.querySelectorAll('#g_id_onload, .g_id_signin');
    
    gsiElements.forEach(el => {
        el.style.display = isElectron ? 'none' : 'block';
    });
    
    if (isElectron) {
        console.log('🔍 Electron detected - Using popup OAuth flow');
    } else {
        console.log('🌐 Browser detected - Using Google SDK');
    }
});
</script>

            <!-- TAB 3: API KEY LOGIN -->
            <div class="tab-content" id="contentApikey">
                <div class="api-info">
                    <div class="api-info-title">
                        <i class="bi bi-info-circle"></i>
                        <span>Về API Key</span>
                    </div>
                    <ul>
                        <li>API Key có format: <code>kingcongstudio_...</code></li>
                        <li>Tìm API Key tại trang Dashboard sau khi đăng nhập</li>
                        <li>Không chia sẻ API Key với người khác</li>
                    </ul>
                </div>

                <form id="formApikey" onsubmit="loginWithApikey(event)">
                    <div class="form-group">
                        <label class="form-label">API Key</label>
                        <div class="form-input-wrapper">
                            <i class="bi bi-key input-icon"></i>
                            <input type="password" class="form-input" id="apikey" placeholder="kingcongstudio_..." required>
                            <button type="button" class="password-toggle" onclick="togglePassword('apikey')">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" class="btn-primary" id="btnLoginApikey">
                        <span>Đăng nhập với API Key</span>
                        <div class="spinner"></div>
                    </button>
                </form>
            </div>
        </div>

        <!-- FOOTER -->
        <div class="login-footer">
            Chưa có tài khoản? <a href="/register">Đăng ký ngay</a>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="/serverkingcong_tools/login.js?v=<?php echo time(); ?>"></script>
</body>
</html>