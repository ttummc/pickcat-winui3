import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const browser = await connectBrowser();
const t = await browser.send("Target.createTarget", { url: "about:blank" });
await sleep(1000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const ws = await connectWs(list.find(x => x.id === t.targetId).webSocketDebuggerUrl);
await ws.send("Runtime.enable");
await ws.send("Page.enable");
await ws.send("Page.navigate", { url: "https://pickcat.dao3.fun/#/" });
await sleep(6000);

const click = `(() => {
  const el = [...document.querySelectorAll('*')].find(e => e.textContent.trim() === 'DSH 定制' && e.children.length < 3);
  if (!el) return 'not found';
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return 'clicked';
})()`;
let r = await ws.send("Runtime.evaluate", { expression: click, returnByValue: true });
await sleep(2500);
r = await ws.send("Runtime.evaluate", {
  expression: `JSON.stringify({ hash: location.hash, title: document.querySelector('.pc-page-title')?.textContent, body: document.querySelector('.pc-page-scroll')?.innerText.slice(0,140) })`,
  returnByValue: true,
});
console.log(r.result.value);
ws.close(); browser.close();
