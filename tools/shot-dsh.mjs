import fs from "node:fs";
const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
const page = list.find(x => x.url.includes("pickcat"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
// 建一个中文标题的会话，验证编码链路
await send("Runtime.evaluate", { expression: `(async () => {
  const ep = window.__PICKCAT_DSH__;
  await fetch('http://127.0.0.1:' + ep.port + '/chats?token=' + ep.token, {
    method: 'POST', headers: {'content-type':'text/plain;charset=UTF-8'},
    body: JSON.stringify({ title: '测试会话 中文标题' })
  });
  location.reload();
})()` });
await new Promise(r => setTimeout(r, 3500));
await send("Runtime.evaluate", { expression: `document.querySelector('.pc-dsh-item')?.textContent.trim()`, returnByValue: true }).then(r => console.log("条目文本:", r.result.value));
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/_dsh-ui.png", Buffer.from(shot.data, "base64"));
console.log("截图已保存 docs/_dsh-ui.png");
ws.close();
