import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const cookieValue = fs
  .readFileSync("session_cookie.txt", "utf8")
  .trim()
  .split("=")
  .slice(1)
  .join("=");

const browser = await connectBrowser();
const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
await sleep(500);
const targets = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = targets.find((t) => t.id === targetId);
const cdp = await connectWs(page.webSocketDebuggerUrl);

const consoleLines = [];
cdp.on("Runtime.consoleAPICalled", (p) => {
  consoleLines.push(
    p.type + ": " + p.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300),
  );
});
cdp.on("Runtime.exceptionThrown", (p) => {
  consoleLines.push(
    "EXC: " + (p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? "").slice(0, 400),
  );
});

let paused = null;
cdp.on("Debugger.paused", (p) => {
  paused = p.callFrames.map((f) => ({
    fn: f.functionName || "(anonymous)",
    url: (f.url || "").split("/").pop(),
    line: f.location.lineNumber,
  }));
});

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Network.enable");
await cdp.send("Debugger.enable");
await cdp.send("Network.setCookie", {
  name: "pickcat_session",
  value: cookieValue,
  domain: ".pickcat.dao3.fun",
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
});

console.log("navigating to #/settings …");
await cdp.send("Page.navigate", { url: "https://pickcat.dao3.fun/#/settings" });
await sleep(5000);

try {
  await cdp.send("Debugger.pause");
} catch (e) {
  console.log("pause failed:", String(e).slice(0, 120));
}
await sleep(2500);

if (paused) {
  console.log("=== STACK AT PAUSE (" + paused.length + " frames) ===");
  for (const frame of paused.slice(0, 30)) console.log(`  ${frame.fn}  @${frame.url}:${frame.line}`);
} else {
  console.log("no pause event — main thread may be in native/GC");
}

console.log("=== console ===");
console.log(consoleLines.slice(0, 25).join("\n") || "(none)");

cdp.close();
browser.close();
