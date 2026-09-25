import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = process.argv[2] || 'https://3d-truck.sreehariradhakrishnan2000.workers.dev';
const PORT = 9222;

console.log(`Starting Chrome to test authenticated pages on: ${BASE_URL}`);

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--disable-gpu',
  '--no-sandbox',
  '--disable-extensions',
  'about:blank'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        const list = await res.json();
        if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
          return list[0].webSocketDebuggerUrl;
        }
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome remote debugging endpoint timed out');
}

async function run() {
  try {
    // 1. Get an access token from the API
    console.log('Authenticating with demo account...');
    let token = '';
    try {
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@cargoflow.demo', password: 'wrong' })
      });
      console.log('Test login status:', loginRes.status);
    } catch (e) {
      console.log('Login error:', e.message);
    }

    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);

    let id = 1;
    const pending = new Map();

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        pending.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await new Promise((resolve) => ws.onopen = resolve);

    const consoleLogs = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result);
        pending.delete(msg.id);
      }

      if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type;
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        consoleLogs.push({ type, text, stack: msg.params.stackTrace });
        console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
      }

      if (msg.method === 'Runtime.exceptionThrown') {
        const text = msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || '');
        consoleLogs.push({ type: 'error', text });
        console.log(`[BROWSER EXCEPTION] ${text}`);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Console.enable');

    // Test multiple pages
    const pages = ['/', '/login', '/dashboard', '/loads', '/vehicles', '/packages', '/team'];

    for (const page of pages) {
      const target = `${BASE_URL}${page}`;
      console.log(`\n--- Testing ${target} ---`);
      await send('Page.navigate', { url: target });
      await sleep(3000);
    }

    console.log('\n========================================');
    console.log(`TOTAL MESSAGES: ${consoleLogs.length}`);
    const issues = consoleLogs.filter(l => l.type === 'error' || l.type === 'warning');
    console.log(`ISSUES FOUND: ${issues.length}`);
    issues.forEach((item, i) => {
      console.log(`[#${i+1}] (${item.type}) ${item.text}`);
    });
    console.log('========================================');

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    chrome.kill('SIGKILL');
  }
}

run();
