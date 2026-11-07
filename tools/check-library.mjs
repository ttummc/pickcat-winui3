import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const EXT = "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: EXT }); } catch (e) { console.log("load:", e.message); }
await sleep(1500);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/personal-library" });
await sleep(9000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
const errors = [];
cdp.on("Runtime.exceptionThrown", (p) => errors.push(String(p.exceptionDetails.exception?.description ?? "").split("\n")[0]));
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  root: !!document.getElementById('pickcat-root'),
  title: document.querySelector('#pickcat-root .pc-page-title')?.textContent?.trim(),
  signedOut: !!document.querySelector('#pickcat-root .pc-empty-title'),
  tabs: [...document.querySelectorAll('#pickcat-root .win-selector-bar-item')].map(e=>e.textContent.trim())
})`));
console.log("errors:", errors.slice(0,2));
cdp.close(); b.close();
