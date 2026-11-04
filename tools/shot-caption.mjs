import fs from "node:fs";
import { connectWs } from "./cdp.mjs";
const list = await (await fetch("http://127.0.0.1:9334/json/list")).json();
const page = list.find(t => t.type === "page");
const cdp = await connectWs(page.webSocketDebuggerUrl);
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
const size = JSON.parse(await ev(`JSON.stringify({w: innerWidth, h: innerHeight, dpr: devicePixelRatio})`));
console.log("viewport:", JSON.stringify(size));
const shot = await cdp.send("Page.captureScreenshot", {
  format: "png",
  clip: { x: size.w - 220, y: 0, width: 220, height: 48, scale: 4 }
});
fs.writeFileSync("docs/screenshots/desktop/caption-after.png", Buffer.from(shot.data, "base64"));
cdp.close();
