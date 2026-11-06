const https = require('https');
const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

const targetFile = path.join(libDir, 'three.min.js');
const url = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

console.log('Downloading Three.js locally for 100% offline support...');

const file = fs.createWriteStream(targetFile);
https.get(url, (response) => {
  if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
    https.get(response.headers.location, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log('Three.js downloaded successfully to lib/three.min.js!');
        });
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log('Three.js downloaded successfully to lib/three.min.js!');
      });
    });
  }
}).on('error', (err) => {
  console.error('Error downloading Three.js:', err);
});
