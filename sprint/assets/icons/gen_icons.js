const fs = require('fs');
const path = require('path');
const http = require('http');

// Simple PNG generator or SVG wrapper
const svgContent = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');

// For PWA compatibility, we also make icon-192.svg and copy SVG
fs.writeFileSync(path.join(__dirname, 'icon-192.svg'), svgContent);
fs.writeFileSync(path.join(__dirname, 'icon-512.svg'), svgContent);

console.log('SVG icons generated successfully!');
