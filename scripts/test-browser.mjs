import { spawn } from 'child_process';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9227',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

await new Promise(r => setTimeout(r, 1000));
const res = await fetch('http://127.0.0.1:9227/json');
const targets = await res.json();
const pageTarget = targets.find(t => t.type === 'page') || targets[0];
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

await new Promise(r => ws.onopen = r);

ws.send(JSON.stringify({ id: 1, method: 'Target.setAutoAttach', params: { autoAttach: true, waitForDebuggerOnStart: false, flatten: true } }));
ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
ws.send(JSON.stringify({ id: 4, method: 'Log.enable' }));
ws.send(JSON.stringify({ id: 5, method: 'Network.enable' }));

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.method === 'Runtime.consoleAPICalled') {
    console.log('CONSOLE:', data.params.type, data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
  } else if (data.method === 'Log.entryAdded') {
    console.log('LOG:', data.params.entry.level, data.params.entry.text);
  } else if (data.method === 'Network.responseReceived') {
    if (data.params.response.status >= 400) {
      console.log('HTTP ERROR:', data.params.response.status, data.params.response.url);
    }
  }
};

const targetUrl = process.argv[2] || 'https://3d-truck.sreehariradhakrishnan2000.workers.dev';
console.log('Navigating to', targetUrl);
ws.send(JSON.stringify({ id: 5, method: 'Page.navigate', params: { url: targetUrl } }));

await new Promise(r => setTimeout(r, 5000));

ws.send(JSON.stringify({ id: 6, method: 'Runtime.evaluate', params: { expression: 'location.href' } }));
await new Promise(resolve => {
  const orig = ws.onmessage;
  ws.onmessage = (e) => {
    orig(e);
    const data = JSON.parse(e.data);
    if (data.id === 6) {
      console.log('CURRENT URL:', data.result.result.value);
      resolve();
    }
  };
});

ws.close();
chrome.kill();
