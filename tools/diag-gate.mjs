import fs from "node:fs";
const TARGET = "01a0faca-3c45-7654-bea1-4147d7af5165";
const stub = `
(() => {
  const realFetch = window.fetch.bind(window);
  let following = false;
  const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init && init.method) || 'GET';
    const path = url.replace(/^https?:\\/\\/[^/]+/, '');
    if (path === '/api/v1/session' && method === 'GET')
      return json({ user: { id: 'test-user', username: 'test', createdAt: '2026-01-01T00:00:00Z', avatar: null, level: { current: 1 } }, createdAt: '2026-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z' });
    if (path.startsWith('/api/v1/users/${TARGET}') && method === 'GET')
      return json({ id: '${TARGET}', username: 'Kitter', avatar: null, createdAt: '2026-01-01T00:00:00Z', level: { current: 1 }, stats: { followers: 16, following: 0, topics: 0, replies: 0 }, viewerState: { following, canFollow: true } });
    if (path === '/api/v1/users/${TARGET}/follow' && method === 'PUT') { following = true; return json({}, 200); }
    if (path === '/api/v1/notifications') return json({ unreadCount: 0, unreadCountByType: {} });
    return realFetch(input, init);
  };
})();`;

// 新建空白标签页
const created = await (await fetch("http://127.0.0.1:9333/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => (ws.onopen = r));
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Page.enable");
await send("Runtime.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: stub });
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 820, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "https://pickcat.dao3.fun/#/" });
await new Promise(r => setTimeout(r, 9000));

const probe = `JSON.stringify({ gate: !!document.querySelector('.pc-gate'),
  title: document.querySelector('.pc-gate-title')?.textContent?.trim() ?? null,
  buttons: [...document.querySelectorAll('.pc-gate-actions button')].map(b => b.textContent.trim()) })`;
let r = await send("Runtime.evaluate", { expression: probe, returnByValue: true });
console.log("拦截状态:", r.result.value);
fs.writeFileSync("docs/_gate.png", Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));

await send("Runtime.evaluate", { expression: `[...document.querySelectorAll('.pc-gate-actions button')].find(b => b.textContent.includes('一键关注'))?.click()` });
await new Promise(r => setTimeout(r, 3000));
r = await send("Runtime.evaluate", { expression: probe, returnByValue: true });
console.log("关注后:", r.result.value);
fs.writeFileSync("docs/_gate-after.png", Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
ws.close();
