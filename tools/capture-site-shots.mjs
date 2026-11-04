import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

/**
 * Captures the current build page by page for the landing page and the promo art.
 * Runs at 2x so the images stay sharp when the site scales them down.
 */
const EXT = "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist";
const OUT = "docs/screenshots/site";
const TOPIC = "01a13aa9-f1d1-7698-9cc7-3ef02c726284";
const WORK = "01a16c71-7fd6-75ae-9fa2-d0af927a3176";
const USER = "01a0faca-3c45-7654-bea1-4147d7af5165";

const PAGES = [
  ["home", "#/", "首页信息流"],
  ["forum", "#/forum", "论坛"],
  ["topic", `#/forum/post/${TOPIC}`, "帖子详情"],
  ["works", "#/works", "作品"],
  ["work", `#/works/${WORK}`, "作品详情"],
  ["profile", `#/profile/${USER}`, "个人主页"],
  ["search", "#/search", "搜索"],
  ["settings", "#/settings", "设置"],
];

fs.mkdirSync(OUT, { recursive: true });

const browser = await connectBrowser();
try {
  await browser.send("Extensions.loadUnpacked", { path: EXT });
} catch {
  /* already loaded */
}
await sleep(800);

for (const [name, hash, label] of PAGES) {
  const created = await browser.send("Target.createTarget", {
    url: `https://pickcat.dao3.fun/${hash}`,
  });
  await sleep(9000);

  const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
  const target = list.find((t) => t.id === created.targetId);
  const cdp = await connectWs(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await sleep(1800);

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(shot.data, "base64"));
  console.log(`captured ${name.padEnd(9)} ${label}`);
  await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(() => {});
  cdp.close();
}

browser.close();
