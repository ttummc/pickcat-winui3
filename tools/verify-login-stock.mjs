import fs from "node:fs";
import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const EXT = "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist";
const browser = await connectBrowser();
try {
  await browser.send("Extensions.loadUnpacked", { path: EXT });
} catch {
  /* already loaded */
}
await sleep(800);

async function open(url) {
  const created = await browser.send("Target.createTarget", { url });
  await sleep(7000);
  const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
  const cdp = await connectWs(list.find((t) => t.id === created.targetId).webSocketDebuggerUrl);
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  const ev = async (e) =>
    (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
  return { cdp, created, ev };
}

// 1. official login page must be untouched
{
  const { cdp, created, ev } = await open("https://pickcat.dao3.fun/login");
  const state = await ev(`JSON.stringify({
    path: location.pathname,
    mounted: !!document.getElementById('pickcat-root'),
    styleInjected: !!document.getElementById('pickcat-style'),
    mountedClass: document.documentElement.classList.contains('pc-mounted'),
    nuxtContainer: !!document.getElementById('__nuxt'),
    hasLoginForm: !!document.querySelector('input[type=password], input[name=account], form')
  })`);
  console.log("官方 /login:", state);

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.mkdirSync("docs/screenshots/live", { recursive: true });
  fs.writeFileSync("docs/screenshots/live/login-official.png", Buffer.from(shot.data, "base64"));
  await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(() => {});
  cdp.close();
}

// 2. the app page must still be rewritten and must block its own bundle
{
  const { cdp, created, ev } = await open("https://pickcat.dao3.fun/");
  const state = await ev(`JSON.stringify({
    mounted: !!document.getElementById('pickcat-root'),
    styleInjected: !!document.getElementById('pickcat-style'),
    mountedClass: document.documentElement.classList.contains('pc-mounted'),
    nuxtScripts: [...document.querySelectorAll('script[src*="/_nuxt/"]')].length
  })`);
  console.log("主页面   :", state);
  await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(() => {});
  cdp.close();
}

await browser.close();
