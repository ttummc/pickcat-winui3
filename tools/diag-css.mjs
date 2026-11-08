const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
const page = list.find(x => x.url.includes("pickcat"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
const expr = `(() => {
  const pick = sel => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return { sel, x: Math.round(r.x), w: Math.round(r.width), cssW: cs.width, maxW: cs.maxWidth,
             display: cs.display, pad: cs.paddingLeft + '/' + cs.paddingRight, margin: cs.marginLeft + '/' + cs.marginRight,
             gridCols: cs.gridTemplateColumns, overflow: cs.overflowX };
  };
  return JSON.stringify([ '.pc-content', '.pc-page', '.pc-page-scroll', '.pc-dsh', '.pc-dsh-rail', '.pc-dsh-main' ].map(pick), null, 1);
})()`;
const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
console.log(res.result.value);
ws.close();
