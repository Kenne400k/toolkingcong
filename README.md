# 🎙️ KingCong TTS Tool

Text-to-Speech desktop application built with Electron for KingCong Studio.

## ⚠️ Security Notice

**IMPORTANT:** This repository does NOT contain API keys or credentials. All sensitive data must be configured locally.

## 📋 Prerequisites

- Node.js 16+ and npm
- Valid KingCong Studio account

## 🚀 Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/kingcong-tts-tool.git
cd kingcong-tts-tool
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` and add your configuration (generate random secrets):
```env
SESSION_SECRET=put-a-random-32-character-string-here
SESSION_SALT=another-random-string
```

4. **Run the application:**
```bash
npm start
```

## 🔒 Security

### Files That Should NEVER Be Committed:
- `sessions/` - Contains user session data
- `.env` - Contains secrets and configuration
- `node_modules/` - Dependencies

### Environment Variables Required:
See `.env.example` for full list

## 📦 Building

Build for current platform:
```bash
npm run build
```

Build for specific platforms:
```bash
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## 🛠️ Development

Run in development mode with logging:
```bash
npm run dev
```

## 📁 Project Structure

```
kingcong-tts-tool/
├── main.js           # Main process
├── preload.js        # Preload script
├── renderer/         # Renderer process files
│   ├── dashboard.html
│   ├── tts.html
│   └── js/
├── image/            # App icons
└── sessions/         # Session storage (gitignored)
```

## 🐛 Troubleshooting

**Issue:** "Cannot find module"
- **Solution:** Run `npm install`

**Issue:** Login fails
- **Solution:** Check your internet connection and verify KingCong Studio credentials

**Issue:** Session not persisting
- **Solution:** Ensure `sessions/` folder exists and is writable

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## ⚠️ Disclaimer

This is an unofficial tool. Use at your own risk. Always comply with KingCong Studio's Terms of Service.

## 📧 Support

For issues and questions, please open an issue on GitHub.
