import fs from 'fs';
import path from 'path';

const src = path.join(process.cwd(), 'node_modules', 'monaco-editor', 'min', 'vs');
const dest = path.join(process.cwd(), 'public', 'monaco-vs', 'vs');

try {
  if (fs.existsSync(src)) {
    console.log(`[PostInstall] Copying Monaco Editor assets from ${src} to ${dest}...`);
    
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    
    // Copy directory (Node.js 16.7.0+)
    if (fs.cpSync) {
      fs.cpSync(src, dest, { recursive: true, force: true });
    } else {
      // Fallback for older Node.js versions if necessary
      console.warn('[PostInstall] fs.cpSync not available, attempting manual copy...');
      const copyRecursive = (source, target) => {
        if (fs.lstatSync(source).isDirectory()) {
          if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
          fs.readdirSync(source).forEach(file => {
            copyRecursive(path.join(source, file), path.join(target, file));
          });
        } else {
          fs.copyFileSync(source, target);
        }
      };
      copyRecursive(src, dest);
    }
    
    console.log('[PostInstall] ✅ Monaco Editor assets copied successfully.');
  } else {
    console.error(`[PostInstall] ❌ Source directory not found: ${src}`);
  }
} catch (error) {
  console.error('[PostInstall] ❌ Failed to copy Monaco Editor assets:', error.message);
}

