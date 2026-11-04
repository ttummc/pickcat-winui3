import fs from "node:fs";
import { connectWs, sleep } from "./cdp.mjs";

const list = await (await fetch("http://127.0.0.1:9334/json/list")).json();
const page = list.find((t) => t.type === "page");
const cdp = await connectWs(page.webSocketDebuggerUrl);

const errors = [];
cdp.on("Runtime.exceptionThrown", (p) => {
  const d = p.exceptionDetails;
  errors.push(`${d.exception?.description ?? d.text}`.split("\n").slice(0, 4).join("\n"));
});
cdp.on("Log.entryAdded", (p) => {
  if (p.entry.level === "error") errors.push(`LOG: ${p.entry.text}`);
});

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Log.enable");

await cdp.send("Page.reload", { ignoreCache: true });
await sleep(6000);

const ev = async (expr) =>
  (await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

console.log("state:", await ev(`JSON.stringify({
  hasRoot: !!document.getElementById('pickcat-root'),
  hasStyle: !!document.getElementById('pc-host-style'),
  scripts: [...document.querySelectorAll('script[src]')].map(s => s.src.replace(location.origin, '')).slice(0, 8)
})`));

console.log("\nerrors:");
if (errors.length === 0) console.log("  (none)");
for (const e of errors.slice(0, 5)) console.log("  " + e.replace(/\n/g, "\n  "));

cdp.close();
