import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const dir = process.cwd().replace(/\\/g, "/") + "/extension/dist";
const browser = await connectBrowser();

// 加载已解压扩展
try {
  await browser.send("Extensions.loadUnpacked", { path: dir });
  console.log("扩展已加载:", dir);
} catch (e) {
  console.log("加载扩展失败:", e.message);
}

const t = await browser.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/" });
await sleep(3000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(x => x.id === t.targetId);
const ws = await connectWs(page.webSocketDebuggerUrl);
await ws.send("Runtime.enable");
await ws.send("Log.enable");

const messages = [];
ws.on("Runtime.consoleAPICalled", p => {
  const text = (p.args ?? []).map(a => a.value ?? a.description ?? "").join(" ");
  messages.push(`[console.${p.type}] ${text}`);
});
ws.on("Runtime.exceptionThrown", p => {
  messages.push(`[exception] ${p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text}`);
});
ws.on("Log.entryAdded", p => messages.push(`[log.${p.entry.level}] ${p.entry.text}`));

await sleep(6000);
const html = await ws.send("Runtime.evaluate", { expression: "document.body.innerHTML.slice(0,200)", returnByValue: true });
console.log("body 前 200 字符:", JSON.stringify(html.result.value ?? ""));
console.log("--- 消息 ---");
console.log(messages.slice(0, 25).join("\n") || "(无)");
ws.close(); browser.close();
