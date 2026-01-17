const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const obfuscator = require('javascript-obfuscator');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(PROJECT_ROOT, 'renderer', 'js');
const BACKUP_DIR = path.join(PROJECT_ROOT, 'renderer', 'js_backup');

// Obfuscation Options - High Performance but Safe
const OBFUSCATION_OPTIONS = {
    compact: true,
    controlFlowFlattening: false, // Set true for more security, but slower
    deadCodeInjection: false,
    debugProtection: true, // Prevents DevTools debugging
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: false,
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: true, // Makes code harder to tamper
    shuffleStringArray: true,
    simplify: true,
    splitStrings: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false
};

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    let entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        let srcPath = path.join(src, entry.name);
        let destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function obfuscateDirectory(dir) {
    let entries = fs.readdirSync(dir, { withFileTypes: true });

    for (let entry of entries) {
        let fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            obfuscateDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.includes('.min.js')) {
            console.log(`Obfuscating: ${entry.name}`);
            let content = fs.readFileSync(fullPath, 'utf8');
            try {
                let obfuscatedResult = obfuscator.obfuscate(content, OBFUSCATION_OPTIONS);
                fs.writeFileSync(fullPath, obfuscatedResult.getObfuscatedCode());
            } catch (err) {
                console.error(`Error obfuscating ${entry.name}:`, err);
            }
        }
    }
}

async function build() {
    console.log('🔒 Starting Secure Build Process...');

    try {
        // 1. Backup Source Code
        console.log('📦 Backing up source code...');
        if (fs.existsSync(BACKUP_DIR)) {
            fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
        }
        copyDir(JS_DIR, BACKUP_DIR);

        // 2. Obfuscate Code in Place
        console.log('🛡️  Obfuscating JavaScript files...');
        obfuscateDirectory(JS_DIR);

        // 3. Run Electron Builder
        console.log('🚀 Building executable (this may take a while)...');
        execSync('npm run build:win', { stdio: 'inherit', cwd: PROJECT_ROOT });

        console.log('✅ Build Success!');

    } catch (error) {
        console.error('❌ Build Failed:', error);
    } finally {
        // 4. Restore Source Code
        console.log('♻️  Restoring original source code...');
        if (fs.existsSync(BACKUP_DIR)) {
            // Remove the obfuscated folder
            fs.rmSync(JS_DIR, { recursive: true, force: true });
            // Rename backup back to original
            fs.renameSync(BACKUP_DIR, JS_DIR);
            
            console.log('✨ Source code restored.');
        } else {
            console.error('⚠️  CRITICAL: Backup folder not found! Could not restore source code.');
        }
    }
}

build();
