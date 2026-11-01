import fs from "node:fs";
import path from "node:path";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const SHOT_DIR = "docs/screenshots/live";
fs.mkdirSync(SHOT_DIR, { recursive: true });

// Optional: a saved session cookie lets the sweep verify signed-in pages too.
const cookieValue = fs.existsSync("session_cookie.txt")
  ? fs
      .readFileSync("session_cookie.txt", "utf8")
      .trim()
      .split("=")
      .slice(1)
      .join("=")
  : null;

// Extension must be loaded before the target is created, otherwise the content
// script does not inject into the already-open tab.
const browser = await connectBrowser();
let extId = null;
try {
  const loaded = await browser.send("Extensions.loadUnpacked", { path: path.resolve("extension/dist") });
  extId = loaded.id;
} catch (error) {
  if (String(error).includes("already")) console.log("extension already loaded");
  else console.log("load failed:", String(error).slice(0, 200));
}
await sleep(600);

const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
await sleep(500);

const targets = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = targets.find((t) => t.id === targetId);
const cdp = await connectWs(page.webSocketDebuggerUrl);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Network.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
if (cookieValue) {
  await cdp.send("Network.setCookie", {
    name: "pickcat_session",
    value: cookieValue,
    domain: ".pickcat.dao3.fun",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });
}

const topicId = "01a18c19-a4ef-78bb-89ca-5304d29c888b";
const workId = "01a19513-89f1-7d46-b685-2d145cc14fb9";
const uid = "01a0fba5-06a4-7518-b863-cebb1ed0de30";

const routes = process.argv[2]
  ? [[process.argv[2], process.argv[3]]]
  : [
      ["home", "#/"],
      ["forum", "#/forum"],
      ["works", "#/works"],
      ["topic", `#/forum/post/${topicId}`],
      ["work", `#/works/${workId}`],
      ["profile", `#/profile/${uid}`],
      ["notifications", "#/notifications"],
      ["search", "#/search"],
      ["library", "#/library"],
      ["settings", "#/settings"],
      ["compose", "#/forum/editor"],
      ["login", "#/login"],
    ];

let first = true;
for (const [name, hash] of routes) {
  const url = `https://pickcat.dao3.fun/${hash}`;
  if (first) {
    await cdp.send("Page.navigate", { url });
    first = false;
  } else {
    await cdp.send("Runtime.evaluate", { expression: `location.hash = ${JSON.stringify(hash)}` });
  }
  await sleep(name === routes[0][0] ? 4200 : 2600);

  let alive = false;
  let text = "";
  try {
    const result = await Promise.race([
      cdp.send("Runtime.evaluate", {
        expression: `document.getElementById('pickcat-root')?.innerText.slice(0,160) ?? 'NO ROOT'`,
        returnByValue: true,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("hang")), 6000)),
    ]);
    alive = true;
    text = String(result.result.value ?? "");
  } catch {
    alive = false;
  }

  if (alive) {
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${SHOT_DIR}/${name}.png`, Buffer.from(shot.data, "base64"));
  }
  console.log(`${alive ? "OK  " : "HANG"} ${name.padEnd(14)} ${text.replace(/\n+/g, " | ").slice(0, 110)}`);
}

cdp.close();
browser.close();
