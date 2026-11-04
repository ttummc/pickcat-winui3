import fs from "node:fs";
import { connectWs, sleep } from "./cdp.mjs";
const list = await (await fetch("http://127.0.0.1:9334/json/list")).json();
const page = list.find(t => t.type === "page");
const cdp = await connectWs(page.webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;

console.log("before:", await ev(`getComputedStyle(document.querySelector('.win-titlebar-caption-button .win-font-icon')).fontFamily`));

await ev(`(() => {
  const s = document.createElement('style');
  s.id = 'caption-fix';
  s.textContent = \`
    .win-font-icon, .win-icon-element {
      font-family: 'WinUIOnWebFontIcons', 'Segoe Fluent Icons', 'Segoe MDL2 Assets' !important;
    }
  \`;
  document.documentElement.appendChild(s);
})()`);
await sleep(500);
console.log("after :", await ev(`getComputedStyle(document.querySelector('.win-titlebar-caption-button .win-font-icon')).fontFamily`));

const shot = await cdp.send("Page.captureScreenshot", {
  format: "png",
  clip: { x: 900, y: 0, width: 260, height: 60, scale: 3 }
});
fs.writeFileSync("docs/screenshots/desktop/caption-after.png", Buffer.from(shot.data, "base64"));
console.log("saved");
cdp.close();
