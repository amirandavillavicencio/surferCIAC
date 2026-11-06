const http = require('http');
const { spawn } = require('child_process');
const WebSocket = require('ws'); // If ws not installed, we can do it via raw http/socket

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://localhost:9222/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('CDP JSON:', data);
      proc.kill();
    });
  }).on('error', e => {
    console.error('Error:', e.message);
    proc.kill();
  });
}

run();
