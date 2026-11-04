import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/works/01a16c71-7fd6-75ae-9fa2-d0af927a3176" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  comments: document.querySelectorAll('#pickcat-root .pc-post').length,
  actionRows: document.querySelectorAll('#pickcat-root .pc-comment-actions').length,
  likeButtons: [...document.querySelectorAll('#pickcat-root .pc-comment-actions .pc-action')].slice(0,3).map(b => b.textContent.replace(/\\s+/g,' ').trim())
})`));
await ev(`document.querySelector('#pickcat-root .pc-comment-actions')?.scrollIntoView({block:'center'})`);
await sleep(600);
const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/work-comments.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
