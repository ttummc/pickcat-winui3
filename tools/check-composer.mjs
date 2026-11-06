import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: "C:\\Users\\tj54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist" }); } catch {}
await sleep(700);
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/compose" });
await sleep(9000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
const errors = [];
cdp.on("Runtime.exceptionThrown", (p) => errors.push(String(p.exceptionDetails.exception?.description ?? "").split("\n")[0]));
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  signingIn: !!document.querySelector('#pickcat-root .pc-page-title'),
  tools: [...document.querySelectorAll('#pickcat-root .pc-tool-btn')].map(b => b.title || b.textContent.trim()).filter(Boolean),
  textarea: !!document.querySelector('#pickcat-root .pc-editor-input'),
  fileInput: !!document.querySelector('#pickcat-root input[type=file]')
})`));
console.log("errors:", errors.slice(0, 2));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();

