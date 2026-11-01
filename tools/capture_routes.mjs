import fs from "node:fs";
import { connectPage, evalIn, sleep, screenshot } from "./cdp.mjs";

const OUT = "docs/original-ui";
fs.mkdirSync(OUT, { recursive: true });

const uid = "01a0fba5-06a4-7518-b863-cebb1ed0de30";
const routes = [
  ["home", "/"],
  ["forum", "/forum"],
  ["works", "/works"],
  ["search", "/search"],
  ["profile", `/profile/${uid}`],
  ["settings", "/settings"],
  ["personal-library", "/personal-library"],
  ["circles", "/circles"],
  ["notifications", "/notifications"],
];

const cdp = await connectPage("pickcat.dao3.fun");
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

for (const [name, path] of routes) {
  try {
    await cdp.send("Page.navigate", { url: "https://pickcat.dao3.fun" + path });
    await sleep(3500);
    const info = await evalIn(
      cdp,
      `(() => {
        const t = document.title;
        const h = document.body.innerText.slice(0, 1600);
        return JSON.stringify({t, h, scrollH: document.documentElement.scrollHeight});
      })()`,
    );
    fs.writeFileSync(`${OUT}/${name}.txt`, info);
    await screenshot(cdp, `${OUT}/${name}.png`);
    console.log("captured", name, path);
  } catch (e) {
    console.log("FAIL", name, String(e).slice(0, 120));
  }
}
cdp.close();
