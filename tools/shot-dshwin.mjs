import fs from "node:fs";
const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
const target = list.find(t => t.title === "DeepSeek Harness");
if (!target) { console.log("找不到 DSH 窗口"); process.exit(0); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1180, height: 800, deviceScaleFactor: 1, mobile: false });
await new Promise(r => setTimeout(r, 2500));
const r = await send("Runtime.evaluate", { expression: `JSON.stringify({ text: document.body.innerText.slice(0, 120), buttons: document.querySelectorAll('button').length })`, returnByValue: true });
console.log(r.result.value);
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/_dshwin.png", Buffer.from(shot.data, "base64"));
console.log("saved");
ws.close();
