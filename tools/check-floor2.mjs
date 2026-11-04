import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
const topicId = await ev(`fetch('/api/v1/topics?sort=latest&limit=20',{credentials:'include'}).then(r=>r.json()).then(d=>{const t=(d.items||[]).find(x=>x.replyCount>2);return t?t.id:''})`);
console.log("有回复的帖子:", topicId);
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close();
const created2 = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/#/forum/post/${topicId}/2` });
await sleep(9000);
const list2 = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp2 = await connectWs(list2.find(t => t.id === created2.targetId).webSocketDebuggerUrl);
await cdp2.send("Page.enable"); await cdp2.send("Runtime.enable");
const ev2 = async (e) => (await cdp2.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev2(`JSON.stringify({
  anchors: [...document.querySelectorAll('#pickcat-root .pc-post')].map(e => e.id).filter(Boolean),
  flashed: document.querySelectorAll('#pickcat-root .pc-post--flash').length,
  scrollTop: Math.round(document.querySelector('#pickcat-root .pc-page-scroll')?.scrollTop ?? -1),
  targetY: Math.round(document.getElementById('pc-post-2')?.getBoundingClientRect().top ?? -1)
})`));
const shot = await cdp2.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("docs/screenshots/live/floor-jump.png", Buffer.from(shot.data, "base64"));
await b.send("Target.closeTarget", { targetId: created2.targetId }).catch(()=>{});
cdp2.close(); b.close();
