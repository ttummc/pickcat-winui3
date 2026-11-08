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

// 直接在页面里发一条消息，走真实链路
await send("Runtime.evaluate", { expression: `(async () => {
  const ta = document.querySelector('.pc-dsh-textarea');
  ta.value = 'say hi in one word';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('发送'))?.click();
})()` });
await new Promise(r => setTimeout(r, 12000));
const r = await send("Runtime.evaluate", { expression: `JSON.stringify([...document.querySelectorAll('.pc-dsh-bubble')].map(b => b.textContent.trim().slice(0,80)))`, returnByValue: true });
console.log("气泡:", r.result.value);
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/_dsh-answer.png", Buffer.from(shot.data, "base64"));
console.log("截图已保存");
ws.close();
