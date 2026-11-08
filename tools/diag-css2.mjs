const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
const page = list.find(x => x.url.includes("pickcat"));
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
const expr = `(() => {
  const g = sel => { const e = document.querySelector(sel); if (!e) return null;
    const r = e.getBoundingClientRect(); return { sel, x: Math.round(r.x), w: Math.round(r.width) }; };
  const nav = document.querySelector('.win-navigation-view') || document.querySelector('[class*="navigation"]');
  const nr = nav ? nav.getBoundingClientRect() : null;
  return JSON.stringify({
    viewport: [innerWidth, innerHeight],
    shell: g('.pc-shell'),
    nav: nr ? { x: Math.round(nr.x), w: Math.round(nr.width) } : null,
    content: g('.pc-content'),
    dsh: g('.pc-dsh'),
    rail: g('.pc-dsh-rail'),
    main: g('.pc-dsh-main'),
  }, null, 1);
})()`;
const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
console.log(res.result.value);
ws.close();
