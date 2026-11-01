import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const EXT = "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist";
const browser = await connectBrowser();
try {
  await browser.send("Extensions.loadUnpacked", { path: EXT });
} catch {
  /* loaded */
}
await sleep(700);

const created = await browser.send("Target.createTarget", { url: "https://pickcat.dao3.fun/#/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find((t) => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

const ev = async (expr) =>
  (await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

async function rightClick(x, y) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none", buttons: 0 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "right", buttons: 2, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "right", buttons: 0, clickCount: 1 });
  await sleep(700);
}

async function menuItems() {
  return ev(`(() => {
    const m = document.querySelector(".pc-ctx");
    if (!m) return "无菜单";
    return [...m.querySelectorAll(".pc-ctx-label")].map(e => e.textContent).join(" / ");
  })()`);
}

async function escape() {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(400);
}

// 1) 空白处
await rightClick(700, 830);
console.log("空白处      :", await menuItems());
await escape();

// 2) 帖子卡片
await rightClick(700, 300);
console.log("帖子卡片    :", await menuItems());
const shot = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 450, y: 240, width: 620, height: 400, scale: 2 } });
fs.writeFileSync("docs/screenshots/live/ctx-card.png", Buffer.from(shot.data, "base64"));
await escape();

// 3) 有文字选区
await ev(`(() => {
  const p = document.querySelector("#pickcat-root .pc-feed-excerpt");
  const range = document.createRange();
  range.selectNodeContents(p);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
})()`);
await rightClick(700, 300);
console.log("有文字选区  :", await menuItems());
await escape();

// 4) 作品卡片
await ev(`location.hash = "#/works"`);
await sleep(3000);
await rightClick(700, 400);
console.log("作品卡片    :", await menuItems());
await escape();

cdp.close();
browser.close();
