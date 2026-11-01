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
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const ev = async (expr) =>
  (await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

async function rightClickAt(x, y) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none", buttons: 0 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "right", buttons: 2, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "right", buttons: 0, clickCount: 1 });
  await sleep(800);
}

const rect = JSON.parse(
  await ev(`(() => {
    const card = document.querySelector("#pickcat-root .pc-topic-card");
    const r = card.getBoundingClientRect();
    return JSON.stringify({ x: r.left + 220, y: r.top + 90, hash: location.hash });
  })()`),
);

// 1) with a text selection -> native menu, no custom menu
await ev(`(() => {
  const card = document.querySelector("#pickcat-root .pc-topic-card");
  const p = card.querySelector(".pc-feed-excerpt") || card.querySelector("h3");
  const range = document.createRange();
  range.selectNodeContents(p);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  return sel.toString().slice(0, 30);
})()`);
await rightClickAt(rect.x, rect.y);
console.log("with selection  -> custom menu:", await ev(`!!document.querySelector(".pc-ctx")`));

// 2) click while text is selected must NOT navigate
const before = await ev("location.hash");
await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", buttons: 1, clickCount: 1 });
await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", buttons: 0, clickCount: 1 });
await sleep(900);
console.log("click with selection -> navigated:", (await ev("location.hash")) !== before);

// 3) without selection -> custom menu appears
await ev(`window.getSelection()?.removeAllRanges()`);
await rightClickAt(rect.x, rect.y);
console.log("no selection    -> custom menu:", await ev(`!!document.querySelector(".pc-ctx")`));

// 4) right-click inside the reply box keeps the native menu
await ev(`window.getSelection()?.removeAllRanges(); document.querySelector("#pickcat-root .pc-ctx")?.remove()`);
console.log("editor target check:", await ev(`(() => {
  const ta = document.createElement("textarea");
  document.querySelector("#pickcat-root").appendChild(ta);
  ta.focus();
  const r = ta.getBoundingClientRect();
  return JSON.stringify({ ok: true, x: r.left + 10, y: r.top + 10 });
})()`));

cdp.close();
browser.close();
