import fs from "node:fs";
const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
const page = list.find(x => x.url.includes("pickcat"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1120, height: 720, deviceScaleFactor: 1, mobile: false });
await send("Runtime.evaluate", { expression: `location.hash = '#/dsh'` });
await new Promise(r => setTimeout(r, 2000));
// 新建会话并让它调用工具
await send("Runtime.evaluate", { expression: `(async () => {
  const ep = window.__PICKCAT_DSH__;
  const chat = await (await fetch('http://127.0.0.1:'+ep.port+'/chats?token='+ep.token, {method:'POST', headers:{'content-type':'text/plain'}, body: JSON.stringify({title:'工具测试'})})).json();
  location.hash = '#/dsh';
  location.reload();
})()` });
await new Promise(r => setTimeout(r, 3500));
await send("Runtime.evaluate", { expression: `(async () => {
  const ta = document.querySelector('.pc-dsh-textarea');
  ta.value = 'list the files in this directory';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '发送')?.click();
})()` });
await new Promise(r => setTimeout(r, 25000));
const r = await send("Runtime.evaluate", { expression: `JSON.stringify({
  steps: [...document.querySelectorAll('.pc-dsh-step')].map(s => s.textContent.trim().slice(0,60)),
  bubbles: [...document.querySelectorAll('.pc-dsh-bubble')].map(b => b.textContent.trim().slice(0,70)),
  keybtn: document.querySelector('.pc-dsh-keybtn')?.textContent.trim()
})`, returnByValue: true });
console.log(r.result.value);
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/_dsh-tools.png", Buffer.from(shot.data, "base64"));
console.log("saved");
ws.close();
