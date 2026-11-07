import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const EXT = "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: EXT }); } catch (e) { console.log("load:", e.message); }
await sleep(1500);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/forum/editor" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log("signedIn:", await ev("!!document.querySelector('#pickcat-root .pc-editor')"));
console.log("shell:", await ev(`(() => {
  const nav = document.querySelector('#pickcat-root .pc-nav');
  const host = document.querySelector('#pickcat-root .pc-titlebar-host');
  return JSON.stringify({ nav: nav ? Math.round(nav.getBoundingClientRect().width) : null, titlebar: host ? Math.round(host.getBoundingClientRect().height) : null });
})()`));
cdp.close(); b.close();
