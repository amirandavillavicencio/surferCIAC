const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001; // Changed to 3001 to bypass old cached service worker
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';

  const filePath = path.join(__dirname, reqUrl);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    };

    // Force clear ALL browser caches for HTML pages
    if (ext === '.html' || reqUrl === '/index.html') {
      headers['Clear-Site-Data'] = '"cache", "storage"';
    }

    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`Saurabh's Sprint Game Server is LIVE`);
  console.log(`Laptop / PC Browser : http://localhost:${PORT}/`);
  console.log(`Mobile / Tab Browser: http://172.20.10.2:${PORT}/`);
  console.log(`====================================================`);
});
