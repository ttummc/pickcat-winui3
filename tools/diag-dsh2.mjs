import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const browser = await connectBrowser();
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(x => x.url.includes("pickcat.dao3.fun"));
const ws = await connectWs(page.webSocketDebuggerUrl);
await ws.send("Runtime.enable");
const click = `(() => {
  const el = [...document.querySelectorAll('*')].find(e => e.textContent.trim() === 'DSH 定制' && e.children.length < 3);
  if (!el) return 'not found';
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return 'clicked';
})()`;
let r = await ws.send("Runtime.evaluate", { expression: click, returnByValue: true });
console.log("点击:", r.result.value);
await sleep(2000);
r = await ws.send("Runtime.evaluate", {
  expression: `JSON.stringify({ hash: location.hash, title: document.querySelector('.pc-page-title')?.textContent, body: document.querySelector('.pc-page-scroll')?.innerText.slice(0,200) })`,
  returnByValue: true,
});
console.log("结果:", r.result.value);
ws.close(); browser.close();
