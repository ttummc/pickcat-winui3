import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const FILE_ID = "01a16e9c-9fad-742f-8e02-7490798e796f";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;
const candidates = [
  `/api/v1/files/${FILE_ID}`,
  `/api/v1/files/${FILE_ID}/content`,
  `/api/v1/files/${FILE_ID}/raw`,
  `/api/v1/files/${FILE_ID}/download`,
  `/api/v1/file-contents/${FILE_ID}`,
  `/api/v1/backgrounds/${FILE_ID}`,
];
for (const path of candidates) {
  const out = await ev(`fetch('${path}', { credentials: 'include' }).then(async r => r.status + ' ' + (r.headers.get('content-type')||'') + ' ' + (r.headers.get('content-length')||''))`);
  console.log(out.padEnd(52), path);
}
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
