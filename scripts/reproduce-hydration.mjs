import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET = process.argv[2] || 'https://3d-truck.sreehariradhakrishnan2000.workers.dev';
const PORT = 9225;

console.log(`Auditing hydration for: ${TARGET}`);

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  await sleep(1000);
  const jsonRes = await fetch(`http://127.0.0.1:${PORT}/json`);
  const targets = await jsonRes.json();
  const wsUrl = targets[0].webSocketDebuggerUrl;
  console.log(`Connecting to CDP: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  const send = (method, params = {}) => {
    return new Promise(resolve => {
      const id = msgId++;
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

  const logs = [];

  ws.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.log(`[CONSOLE ${data.params.type}]`, text);
      logs.push({ source: 'console', type: data.params.type, text, stack: data.params.stackTrace });
    } else if (data.method === 'Log.entryAdded') {
      console.log(`[LOG ${data.params.entry.level}]`, data.params.entry.text);
      logs.push({ source: 'log', type: data.params.entry.level, text: data.params.entry.text });
    } else if (data.method === 'Runtime.exceptionThrown') {
      const desc = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
      console.log(`[EXCEPTION]`, desc);
      logs.push({ source: 'exception', type: 'error', text: desc });
    }
  };

  await send('Log.enable');
  await send('Runtime.enable');
  await send('Page.enable');

  console.log(`Navigating to ${TARGET}...`);
  await send('Page.navigate', { url: TARGET });

  await sleep(6000);

  console.log('\n================ HYDRATION AUDIT REPORT ================');
  const hydErrors = logs.filter(l => 
    l.text.includes('Hydration') || 
    l.text.includes('hydration') || 
    l.text.includes('Minified React error') ||
    l.text.includes('#418') ||
    l.text.includes('#425') ||
    l.text.includes('#423') ||
    l.text.includes('#329') ||
    l.text.includes('did not match')
  );

  console.log(`Total captured logs: ${logs.length}`);
  console.log(`Hydration-specific errors: ${hydErrors.length}`);
  hydErrors.forEach((e, idx) => {
    console.log(`\n--- Issue #${idx + 1} ---`);
    console.log(e.text);
    if (e.stack) {
      console.log('Stack trace:', JSON.stringify(e.stack, null, 2));
    }
  });

  ws.close();
  chrome.kill();
}

main().catch(err => {
  console.error('Fatal error:', err);
  chrome.kill();
});
