import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/forum/post/01a19e50-9d97-7816-9e0a-498ef0ce8be9" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  tables: document.querySelectorAll('#pickcat-root table').length,
  pres: document.querySelectorAll('#pickcat-root pre').length,
  codes: document.querySelectorAll('#pickcat-root code').length,
  tableWidth: document.querySelector('#pickcat-root table')?.getBoundingClientRect().width ?? 0,
  overflowX: document.querySelector('#pickcat-root .pc-post')?.scrollWidth ?? 0,
  clientX: document.querySelector('#pickcat-root .pc-post')?.clientWidth ?? 0
})`));
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/topic-tables.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
