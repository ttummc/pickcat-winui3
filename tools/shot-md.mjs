import fs from "node:fs";
const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
const page = list.find(x => x.url.includes("pickcat"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1120, height: 760, deviceScaleFactor: 1, mobile: false });
await send("Runtime.evaluate", { expression: `location.hash = '#/dsh'` });
await new Promise(r => setTimeout(r, 2000));
await send("Runtime.evaluate", { expression: `(async () => {
  const ep = window.__PICKCAT_DSH__;
  const chat = await (await fetch('http://127.0.0.1:'+ep.port+'/chats?token='+ep.token, {method:'POST', headers:{'content-type':'text/plain'}, body: JSON.stringify({title:'markdown'})})).json();
  location.reload();
})()` });
await new Promise(r => setTimeout(r, 3500));
await send("Runtime.evaluate", { expression: `(async () => {
  const ta = document.querySelector('.pc-dsh-textarea');
  ta.value = '用 markdown 回复：一个二级标题、一个三行表格、一段代码块、一个列表';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '发送')?.click();
})()` });
await new Promise(r => setTimeout(r, 30000));
const r = await send("Runtime.evaluate", { expression: `JSON.stringify({
  h2: document.querySelectorAll('.pc-dsh-md h2').length,
  table: document.querySelectorAll('.pc-dsh-md table').length,
  code: document.querySelectorAll('.pc-dsh-md pre code').length,
  li: document.querySelectorAll('.pc-dsh-md li').length
})`, returnByValue: true });
console.log("渲染结果:", r.result.value);
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/_md.png", Buffer.from(shot.data, "base64"));
ws.close();
