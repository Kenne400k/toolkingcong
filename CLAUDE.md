# KingCong TTS Tool - Project Context

## Tổng quan
Đây là ứng dụng Electron desktop cho Text-to-Speech, hỗ trợ 2 provider: **ElevenLabs** và **Minimax**.

## Cấu trúc project

```
toolkingcong/
├── main.js              # Electron main process, IPC handlers
├── preload.js           # Bridge giữa main và renderer
├── renderer/
│   ├── tool.html        # Pro Tool UI chính
│   ├── tts.html         # Text to Speech tab
│   ├── voice-library.html    # Window riêng - Voice Library
│   ├── voices-window.html    # Window riêng - Chọn giọng nói
│   ├── cloned-voices-window.html  # Window riêng - My Clones (Minimax)
│   └── js/
│       ├── tool.js      # Logic Pro Tool (class ProToolManager)
│       └── tts.js       # Logic TTS tab
├── version.json         # Version info + changelog
└── package.json         # Dependencies + build config
```

## Các tính năng chính

### 1. Provider
- **ElevenLabs**: 7 models (eleven_v3, eleven_multilingual_v2, eleven_turbo_v2_5, eleven_turbo_v2, eleven_flash_v2_5, eleven_flash_v2, eleven_monolingual_v1)
- **Minimax**: 4 models (speech-02-hd, speech-02-turbo, speech-01-hd, speech-01-turbo)

### 2. Voice Library
- Lưu riêng cho mỗi provider: `voiceLibrary_elevenlabs`, `voiceLibrary_minimax`
- Mở window riêng (không phải modal)
- Tabs có logo provider
- Columns ElevenLabs: Project, Name, Voice ID, Model, Speed, Stability, Similarity, Style, Boost, Actions
- Columns Minimax: Project, Name, Voice ID, Model, Speed, Pitch, Volume, Actions

### 3. Load Voices (Chọn giọng nói)
- Mở window riêng với parameter `?provider=elevenlabs` hoặc `?provider=minimax`
- Có nút nghe thử (dùng `preview_url` hoặc `sample_audio` từ API)
- Có nút thêm vào thư viện

### 4. Voice Clone (Minimax only)
- Clone giọng từ file audio
- API: `tts3.php?action=clone_voice`
- My Clones: `tts3.php?action=get_cloned_voices`

## API Endpoints

```
Base: https://kingcongstudio.com/ajaxs/

- get_resources2.php          # Lấy voices + models
- get_resources2.php?action=search_voice_id  # Tìm voice info
- tts3.php                    # TTS processing
- tts3.php?action=clone_voice # Clone voice (Minimax)
- tts3.php?action=get_cloned_voices  # List cloned voices
```

## IPC Communication

### Main → Renderer
- `voice-library-updated`: Khi voice library được cập nhật từ window khác
- `voice-selected`: Khi voice được chọn từ window con

### Renderer → Main
- `open-voice-library`: Mở voice-library.html
- `open-voices-window`: Mở voices-window.html
- `open-cloned-voices-window`: Mở cloned-voices-window.html
- `save-voice-library`: Lưu và broadcast voice library updates
- `select-voice-from-window`: Chọn voice từ window con

## Code Style

### CSS
- Copy đúng style từ modal trong `tool.html`
- Dùng CSS variables: `--primary`, `--bg-main`, `--bg-secondary`, `--border`
- Classes: `.modal-header`, `.modal-body`, `.modal-footer`, `.btn`, `.btn-primary`, `.btn-sm`, `.voice-table`

### Logo URLs
```javascript
// ElevenLabs
'https://help.elevenlabs.io/hc/theming_assets/01HZQ08B6SDY5X53YN9ABG4B99'

// Minimax
'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/minimax-color.png'
```

## Lưu ý quan trọng

1. **Không tự sáng tạo UI** - Luôn copy style từ modal trong tool.html
2. **Window riêng, không modal** - Voice Library, Load Voices, Voice Clone mở BrowserWindow riêng
3. **Separate storage** - Voice library lưu riêng cho mỗi provider
4. **Preview audio** - Dùng `preview_url`/`sample_audio` từ API, KHÔNG generate TTS
5. **Sync giữa windows** - Dùng IPC `voice-library-updated` để sync

## GitHub
- Repo: `Kenne400k/toolkingcong`
- Branch: `main`
- Luôn update `version.json` và `package.json` khi release
- **KHÔNG upload CLAUDE.md** (đã thêm vào .gitignore)

## Git Config (QUAN TRỌNG)
Trước khi commit, chạy:
```bash
git config user.name "Kenne400k"
git config user.email "kenne400k@users.noreply.github.com"
```

## Commit Message Format
```
v1.x.x - Short description

- Detail 1
- Detail 2
```
**KHÔNG thêm Co-Authored-By** - commit dưới tên user, không phải Claude.
