import { spawn } from 'child_process';

const TARGET_HOST = process.argv[2] || 'http://localhost:3000';
const PORT = 9229;

console.log(`Auditing all authenticated pages for React hydration errors on: ${TARGET_HOST}`);

// 1. Authenticate with NestJS API
const apiBase = TARGET_HOST.includes('localhost') ? 'http://127.0.0.1:3001/api' : `${TARGET_HOST}/api`;
const loginRes = await fetch(`${apiBase}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@cargoflow.demo', password: 'Admin123!' })
});

const { accessToken } = await loginRes.json();
console.log('Obtained access token:', accessToken ? `${accessToken.slice(0, 20)}...` : 'NONE');

// Get loads list to test 3D planner
let firstLoadId = '';
try {
  const loadsRes = await fetch(`${apiBase}/loads`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const loads = await loadsRes.json();
  if (Array.isArray(loads) && loads.length > 0) {
    firstLoadId = loads[0].id;
    console.log(`Discovered load ID for 3D planner test: ${firstLoadId}`);
  }
} catch (e) {
  console.log('Failed to fetch loads:', e.message);
}

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

await new Promise(r => setTimeout(r, 1000));
const jsonRes = await fetch(`http://127.0.0.1:${PORT}/json`);
const targets = await jsonRes.json();
const pageTarget = targets.find(t => t.type === 'page') || targets[0];
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

await new Promise(r => ws.onopen = r);

ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));

const allLogs = [];

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.method === 'Runtime.consoleAPICalled') {
    const text = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
    allLogs.push({ type: data.params.type, text, stack: data.params.stackTrace });
    console.log(`[CONSOLE ${data.params.type.toUpperCase()}]`, text);
  } else if (data.method === 'Log.entryAdded') {
    allLogs.push({ type: data.params.entry.level, text: data.params.entry.text });
    console.log(`[LOG ${data.params.entry.level.toUpperCase()}]`, data.params.entry.text);
  }
};

const sendCmd = (method, params = {}) => {
  return new Promise(resolve => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
};

// Navigate to root first so domain origin is established
await sendCmd('Page.navigate', { url: `${TARGET_HOST}/login` });
await new Promise(r => setTimeout(r, 2000));

// Set token in localStorage
console.log('Injecting auth token into localStorage...');
await sendCmd('Runtime.evaluate', {
  expression: `localStorage.setItem('cf_access_token', ${JSON.stringify(accessToken)});`
});

// Now visit authenticated routes
const routes = [
  '/dashboard',
  '/loads',
  '/vehicles',
  '/packages',
  '/team',
];

if (firstLoadId) {
  routes.push(`/loads/${firstLoadId}`);
}

for (const route of routes) {
  console.log(`\n==============================================`);
  console.log(`>>> NAVIGATING & AUDITING: ${route} <<<`);
  console.log(`==============================================`);
  await sendCmd('Page.navigate', { url: `${TARGET_HOST}${route}` });
  await new Promise(r => setTimeout(r, 5000));

  const pageInfo = await sendCmd('Runtime.evaluate', {
    expression: '({ url: location.href, title: document.title, bodyLength: document.body.innerHTML.length })'
  });
  console.log('Page state:', pageInfo?.result?.value);
}

console.log('\n================ AUDIT SUMMARY ================');
console.log(`Total console entries: ${allLogs.length}`);
const errors = allLogs.filter(l => 
  l.type === 'error' || 
  l.type === 'warning' ||
  l.text.includes('hydration') ||
  l.text.includes('Hydration') ||
  l.text.includes('Minified React error') ||
  l.text.includes('did not match')
);
console.log(`Errors / Warnings found: ${errors.length}`);
errors.forEach((e, i) => {
  console.log(`\n[#${i + 1}] (${e.type}) ${e.text}`);
  if (e.stack) {
    console.log(JSON.stringify(e.stack, null, 2));
  }
});
console.log('================================================');

ws.close();
chrome.kill();
