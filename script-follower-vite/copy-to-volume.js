import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src = path.resolve(__dirname, 'dist');
const dest = '/Volumes/web/scriptFollower';

function copyRecursiveSync(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const item of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(dest)) {
  console.log(`Copying build to ${dest}...`);
  copyRecursiveSync(src, dest);
  console.log('Copy complete.');
} else {
  console.warn(`Destination ${dest} not accessible. Skipping copy.`);
}