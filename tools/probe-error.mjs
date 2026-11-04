import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const U = "01a0faca-3c45-7654-bea1-4147d7af5165";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/#/profile/${U}` });
await sleep(8000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
const errors = [];
cdp.on("Runtime.exceptionThrown", (p) => {
  const d = p.exceptionDetails;
  errors.push((d.exception?.description ?? d.text ?? "").split("\n").slice(0, 5).join("\n"));
});
cdp.on("Runtime.consoleAPICalled", (p) => {
  if (p.type === "error") errors.push("console: " + p.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 300));
});
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("Page.reload", { ignoreCache: true });
await sleep(7000);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log("root children:", await ev(`document.getElementById('pickcat-root')?.children.length ?? -1`));
console.log("errors:");
for (const e of errors.slice(0, 4)) console.log("  " + e.replace(/\n/g, "\n  "));
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
