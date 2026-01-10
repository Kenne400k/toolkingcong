# Security Policy

## 🔒 Reporting Security Issues

If you discover a security vulnerability, please email: [your-email@example.com]

**DO NOT** open a public GitHub issue for security vulnerabilities.

## 🛡️ Security Best Practices

### For Developers

1. **Never commit sensitive data:**
   - API keys
   - Passwords
   - Session files
   - `.env` files

2. **Always use environment variables:**
   - Store secrets in `.env` (gitignored)
   - Use `.env.example` as template

3. **Before committing:**
   ```bash
   # Check for accidentally staged sensitive files
   git status
   
   # Search for potential secrets
   git diff --cached | grep -i "api.*key\|password\|secret"
   ```

4. **If you accidentally commit a secret:**
   ```bash
   # Remove from Git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch sessions/session.json" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (use with caution)
   git push origin --force --all
   
   # Rotate the compromised secret immediately
   ```

### For Users

1. **Keep your `.env` file private**
2. **Don't share your session files**
3. **Update the app regularly**
4. **Use strong, unique passwords**

## 🔐 Encryption

- Session data is encrypted using AES-256-CBC
- Encryption key is derived from `SESSION_SECRET` environment variable
- Each session has a unique IV (Initialization Vector)

## 🚨 Known Security Considerations

1. **Electron Security:**
   - DevTools disabled in production builds
   - Context isolation enabled
   - Node integration disabled in renderer
   - WebSecurity enabled

2. **Session Management:**
   - Sessions stored locally (encrypted)
   - Auto-logout on session expiry
   - Cookie-based authentication with server

3. **Network:**
   - All communications over HTTPS
   - Cookies sent only to trusted domain

## 📋 Security Checklist

Before deploying:
- [ ] All secrets in environment variables
- [ ] `.gitignore` properly configured
- [ ] No hardcoded credentials
- [ ] DevTools disabled in production
- [ ] HTTPS enforced
- [ ] Dependencies updated
- [ ] Code obfuscation applied (optional)

## 🔄 Dependency Security

Run security audit regularly:
```bash
npm audit
npm audit fix
```

## 📊 Version Support

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## 📝 License

Security policy is part of the MIT licensed project.
