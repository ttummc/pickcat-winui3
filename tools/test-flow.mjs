import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const EXT_PATH = "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist";
const SHOTS = "docs/screenshots/live";
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await connectBrowser();
try {
  await browser.send("Extensions.loadUnpacked", { path: EXT_PATH });
} catch (error) {
  console.log("load:", String(error).slice(0, 120));
}
await sleep(600);

const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
await sleep(700);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find((t) => t.id === targetId);
const cdp = await connectWs(page.webSocketDebuggerUrl);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

const ev = async (expr) =>
  (await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

async function clickText(label) {
  const rect = JSON.parse(
    await ev(`(() => {
      const el = [...document.querySelectorAll("#pickcat-root *")].find(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(label)});
      if (!el) return "null";
      const b = el.getBoundingClientRect();
      return JSON.stringify({ x: b.left + b.width/2, y: b.top + b.height/2 });
    })()`),
  );
  if (!rect) return null;
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y, button: "none", buttons: 0 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(1400);
  return ev("location.hash");
}

async function shot(name) {
  const s = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(s.data, "base64"));
}

await cdp.send("Page.navigate", { url: "https://pickcat.dao3.fun/" });
await sleep(6000);
await shot("click-01-home");

console.log("初始 hash:", await ev("location.hash"));
console.log("点『论坛』 → ", await clickText("论坛"));
console.log("点『作品』 → ", await clickText("作品"));
console.log("点『搜索』 → ", await clickText("搜索"));
console.log("点『首页』 → ", await clickText("首页"));

// click a feed card
const card = JSON.parse(
  await ev(`(() => {
    const el = document.querySelector("#pickcat-root .pc-feed-item");
    if (!el) return "null";
    const b = el.getBoundingClientRect();
    return JSON.stringify({ x: b.left + 60, y: b.top + 24 });
  })()`),
);
if (card) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: card.x, y: card.y, button: "none", buttons: 0 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: card.x, y: card.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: card.x, y: card.y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(2400);
  console.log("点信息流卡片 → ", await ev("location.hash"), "| 标题:", await ev(`document.querySelector("#pickcat-root .pc-topic-title")?.innerText.slice(0,40) ?? "(no title)"`));
  await shot("click-02-topic");
}

// back button in the title bar
const back = JSON.parse(
  await ev(`(() => {
    const el = document.querySelector('#pickcat-root .win-titlebar button[aria-label="后退"]');
    if (!el) return "null";
    const b = el.getBoundingClientRect();
    return JSON.stringify({ x: b.left + b.width/2, y: b.top + b.height/2 });
  })()`),
);
if (back) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: back.x, y: back.y, button: "none", buttons: 0 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: back.x, y: back.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: back.x, y: back.y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(1600);
  console.log("点标题栏返回 → ", await ev("location.hash"));
}

await shot("click-03-final");
cdp.close();
browser.close();
