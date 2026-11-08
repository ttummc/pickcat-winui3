import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const browser = await connectBrowser("http://127.0.0.1:9444");
const list = await (await fetch("http://127.0.0.1:9444/json/list")).json();
const page = list.find(x => x.url.includes("pickcat"));
const ws = await connectWs(page.webSocketDebuggerUrl);
await ws.send("Runtime.enable");
const expr = `(() => {
  const q = s => document.querySelector(s);
  const rail = q('.pc-dsh-rail');
  const item = q('.pc-dsh-item');
  const main = q('.pc-dsh-main');
  const title = q('.pc-dsh-title');
  const r = e => e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null;
  return JSON.stringify({
    viewport: { w: innerWidth, h: innerHeight },
    rail: r(rail), item: r(item), main: r(main),
    itemText: item?.textContent?.trim(),
    itemCount: document.querySelectorAll('.pc-dsh-item').length,
    title: title?.textContent,
    titleClipped: title ? title.scrollWidth > title.clientWidth : null,
    pageOverflowX: document.documentElement.scrollWidth > innerWidth,
    setupVisible: !!q('.pc-dsh-setup'),
    threadVisible: !!q('.pc-dsh-thread'),
    composerVisible: !!q('.pc-dsh-composer'),
  }, null, 1);
})()`;
const res = await ws.send("Runtime.evaluate", { expression: expr, returnByValue: true });
console.log(res.result.value);
ws.close(); browser.close();

