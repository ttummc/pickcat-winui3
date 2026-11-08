const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
const page = list.find(x => x.url.includes("pickcat"));
if (!page) { console.log("no page"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = e => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
};
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
const expr = `(() => {
  const q = s => document.querySelector(s);
  const r = e => e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null;
  const item = q('.pc-dsh-item');
  const title = q('.pc-dsh-title');
  return JSON.stringify({
    viewport: { w: innerWidth, h: innerHeight },
    rail: r(q('.pc-dsh-rail')), item: r(item), main: r(q('.pc-dsh-main')),
    itemText: item?.textContent?.trim(),
    itemCount: document.querySelectorAll('.pc-dsh-item').length,
    title: title?.textContent, titleClipped: title ? title.scrollWidth > title.clientWidth : null,
    overflowX: document.documentElement.scrollWidth > innerWidth,
    setup: !!q('.pc-dsh-setup'), thread: !!q('.pc-dsh-thread'), composer: !!q('.pc-dsh-composer'),
  }, null, 1);
})()`;
const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
console.log(res.result.value);
ws.close();
