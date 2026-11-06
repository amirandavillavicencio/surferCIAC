const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy essential folders and files to dist
copyDirRecursive(path.join(__dirname, 'js'), path.join(distDir, 'js'));
copyDirRecursive(path.join(__dirname, 'lib'), path.join(distDir, 'lib'));
copyDirRecursive(path.join(__dirname, 'assets'), path.join(distDir, 'assets'));
copyDirRecursive(path.join(__dirname, 'css'), path.join(distDir, 'css'));

const rootFiles = ['index.html', 'manifest.json', 'sw.js', 'apple-touch-icon.png', 'favicon.ico', 'Saurabhs_Sprint_Standalone.html'];
rootFiles.forEach(file => {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, file));
  }
});

console.log('Successfully copied js, lib, css, assets, manifest.json, sw.js to dist/ for full production deployment!');
