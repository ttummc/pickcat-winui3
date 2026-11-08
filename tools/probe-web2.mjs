const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
const target = list.find(x => x.url.includes("127.0.0.1:49808") || x.title === "DeepSeek Harness");
if (!target) { console.log("找不到目标"); console.log(list.map(t => t.title + " | " + t.url).join("\n")); process.exit(0); }
console.log("目标:", target.title, target.url.slice(0, 50));
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
const r = await send("Runtime.evaluate", { expression: `JSON.stringify({ text: document.body.innerText.slice(0, 200), root: document.body.children.length })`, returnByValue: true });
console.log(r.result.value);
ws.close();
