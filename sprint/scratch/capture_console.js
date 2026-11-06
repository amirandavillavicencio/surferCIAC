const http = require('http');
const { spawn } = require('child_process');

async function checkPage() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const tabs = JSON.parse(data);
        console.log('Open Tabs:', tabs);
        const wsUrl = tabs[0]?.webSocketDebuggerUrl;
        if (wsUrl) {
          console.log('Debugger WS URL:', wsUrl);
        }
      } catch (e) {
        console.error('Failed to parse CDP tabs:', e);
      }
      chromeProcess.kill();
    });
  }).on('error', (err) => {
    console.error('CDP HTTP Error:', err.message);
    chromeProcess.kill();
  });
}

checkPage();
