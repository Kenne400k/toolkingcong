const statusDiv = document.getElementById('status');
const audioPlayer = document.getElementById('audioPlayer');

document.getElementById('speakBtn').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value;
    const text = document.getElementById('textInput').value;
    const model = document.getElementById('voiceId').value; // Tạm dùng ô này làm model ID cho nhanh

    if (!apiKey || !text) {
        alert("Nhập thiếu API Key hoặc Text!");
        return;
    }

    statusDiv.innerText = "⏳ Đang gọi API Minimax...";

    // Cấu hình data gửi đi
    const payload = {
        model: "speech-01-hd", // Hoặc lấy từ giao diện
        text: text,
        stream: false,
        voice_setting: {
            voice_id: "Male-QN-v2", // Voice ID mẫu
            speed: 1.0,
            vol: 1.0,
            pitch: 0
        }
    };

    try {
        // Gọi API (Dùng fetch của JS - ngắn hơn requests của Python nhiều)
        // Lưu ý: Dùng URL proxy của bạn nếu cần, đây là URL gốc ví dụ
        const response = await fetch('https://api.minimax.chat/v1/text_to_speech', { 
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Lỗi API: ${err}`);
        }

        // Nhận file âm thanh (Blob) và phát luôn
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        audioPlayer.src = audioUrl;
        audioPlayer.play();
        
        statusDiv.innerText = "✅ Đã xong! Đang phát nhạc.";

    } catch (error) {
        console.error(error);
        // Vì bạn dùng proxy riêng, có thể URL trên sai, 
        // bạn thay URL trong hàm fetch bằng: 'https://api.kingcongstudio.com/v1m/task/text-to-speech'
        // và sửa lại headers thành 'xi-api-key': apiKey nếu dùng tool cũ.
        statusDiv.innerText = "❌ Lỗi: " + error.message;
    }
});
// ============================================
// PHẦN HIỂN THỊ TÊN USER (Thêm vào)
// ============================================

function hienThiTenUser() {
    // Kiểm tra xem main.js đã bắn data sang chưa
    if (window.__SESSION__) {
        console.log("✅ Renderer đã nhận được data user:", window.__SESSION__);
        
        const user = window.__SESSION__;
        
        // 1. Tìm thẻ HTML có id là 'user-name' để gán tên
        const nameElement = document.getElementById('user-name');
        
        // 2. Tìm thẻ HTML có id là 'user-credits' để gán số dư (nếu cần)
        const creditElement = document.getElementById('user-credits');

        // Logic hiển thị
        if (nameElement) {
            // Ưu tiên display_name -> username -> id
            nameElement.innerText = user.display_name || user.username || user.user_id;
        }
        
        if (creditElement) {
            creditElement.innerText = user.credits3 || "0";
        }

    } else {
        // Nếu chưa thấy data, thử lại sau 0.5 giây (do main.js chạy bất đồng bộ)
        console.log("⏳ Đang đợi data từ Main process...");
        setTimeout(hienThiTenUser, 500);
    }
}

// Chạy hàm khi file load xong
hienThiTenUser();