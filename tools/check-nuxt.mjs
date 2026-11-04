import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const browser = await connectBrowser();
const created = await browser.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(7000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  nuxtGlobal: typeof window.$nuxt,
  nuxtDivChildren: document.getElementById('__nuxt')?.children.length ?? -1,
  nuxtDivHtmlLength: document.getElementById('__nuxt')?.innerHTML.length ?? -1,
  rootChildren: document.getElementById('pickcat-root')?.children.length ?? -1,
  bodyVisible: [...document.body.children].map(e => e.id || e.tagName)
})`));
await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); browser.close();
