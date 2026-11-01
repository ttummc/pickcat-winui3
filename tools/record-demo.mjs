import fs from "node:fs";
import path from "node:path";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const EXT = "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist";
const OUT = "video/frames";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await connectBrowser();
try {
  await browser.send("Extensions.loadUnpacked", { path: EXT });
} catch {
  /* loaded */
}
await sleep(700);

const created = await browser.send("Target.createTarget", { url: "about:blank" });
await sleep(700);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find((t) => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const started = Date.now();
const index = [];
const marks = [];

cdp.on("Page.screencastFrame", async (params) => {
  const i = index.length;
  fs.writeFileSync(path.join(OUT, `${String(i).padStart(5, "0")}.jpg`), Buffer.from(params.data, "base64"));
  index.push({ i, ts: Date.now() - started });
  try {
    await cdp.send("Page.screencastFrameAck", { sessionId: params.sessionId });
  } catch {
    /* ignore */
  }
});

const ev = async (expr) =>
  (await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

const mark = (label) => {
  marks.push({ label, t: +((Date.now() - started) / 1000).toFixed(1) });
  console.log(`  [${((Date.now() - started) / 1000).toFixed(1)}s] ${label}`);
};

async function waitFor(predicate, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await sleep(100);
  }
  return false;
}

async function go(hash) {
  await ev(`location.hash = ${JSON.stringify(hash)}`);
  await waitFor(async () => (await ev("location.hash")) === hash);
  await sleep(900);
}

async function rectOf(selector) {
  const raw = await ev(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return "null";
    const r = el.getBoundingClientRect();
    return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  })()`);
  return raw === "null" ? null : JSON.parse(raw);
}

async function click(x, y, button = "left") {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none", buttons: 0 });
  await sleep(140);
  const buttons = button === "right" ? 2 : 1;
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button, buttons, clickCount: 1 });
  await sleep(60);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button, buttons: 0, clickCount: 1 });
}

async function scroll(deltaY, steps = 8, gap = 90) {
  for (let i = 0; i < steps; i++) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseWheel", x: 700, y: 500, deltaX: 0, deltaY: deltaY / steps, button: "none", buttons: 0,
    });
    await sleep(gap);
  }
}

// ---------------------------------------------------------------- boot (dark)
await cdp.send("Page.navigate", { url: "https://pickcat.dao3.fun/" });
await sleep(5500);
await ev(`localStorage.setItem("pickcat-winui-theme", "dark")`);
await cdp.send("Page.reload", { ignoreCache: false });
await sleep(3000);
await waitFor(async () => (await ev(`!!document.querySelector("#pickcat-root .pc-topic-card")`)) === true);
await sleep(1200);

await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
await sleep(1600);
mark("start");

// ---------------------------------------------------------------- beat 1: feed
await scroll(220, 8, 95);
await sleep(500);
await scroll(-220, 8, 95);
await sleep(600);
mark("feed");

// ---------------------------------------------------------------- beat 2: context menu
const title = await rectOf("#pickcat-root .pc-topic-card .pc-feed-title");
if (title) {
  await click(title.x, title.y, "right");
  await sleep(2400);
  mark("context menu");
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(600);
}

// ---------------------------------------------------------------- beat 3: topic detail
const topicId = await ev(`(() => {
  const card = document.querySelector("#pickcat-root .pc-topic-card");
  const key = card?.getAttribute("data-card-key") ?? "";
  return key.startsWith("topic:") ? key.slice(6) : "";
})()`);
if (topicId) {
  await go(`#/forum/post/${topicId}`);
  await sleep(1600);
  await scroll(280, 7, 95);
  await sleep(700);
  mark("topic detail");
}

// ---------------------------------------------------------------- beat 4: works + pips
await go("#/works");
await sleep(1500);
await scroll(240, 7, 95);
await sleep(500);
const pips = await rectOf("#pickcat-root .win-pips-pager");
if (pips) {
  await click(pips.x + 26, pips.y);
  await sleep(1500);
}
mark("works");

// ---------------------------------------------------------------- beat 5: settings -> light
await go("#/settings");
await sleep(1400);
const light = await ev(`(() => {
  const el = [...document.querySelectorAll("#pickcat-root .pc-segment")].find(b => b.textContent.includes("浅色"));
  if (!el) return "null";
  const r = el.getBoundingClientRect();
  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
})()`);
if (light !== "null") {
  const p = JSON.parse(light);
  await click(p.x, p.y);
  await sleep(2200);
}
mark("light theme");

// ---------------------------------------------------------------- beat 6: home (light)
await go("#/");
await sleep(1600);
await scroll(160, 6, 95);
await sleep(1200);
mark("end");

await cdp.send("Page.stopScreencast");
await sleep(300);

fs.writeFileSync("video/index.json", JSON.stringify({ fps: 30, width: 1440, height: 900, marks, frames: index }, null, 1));
console.log(`captured ${index.length} frames / ${((Date.now() - started) / 1000).toFixed(1)}s`);

cdp.close();
browser.close();
