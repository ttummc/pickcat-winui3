import { connectWs, sleep } from "./cdp.mjs";

const targets = async () =>
  (await (await fetch("http://127.0.0.1:9334/json/list")).json()).map((t) => ({
    type: t.type,
    title: t.title,
    url: t.url,
  }));

const before = await targets();
console.log("targets before:", JSON.stringify(before));

const list = await (await fetch("http://127.0.0.1:9334/json/list")).json();
const page = list.find((t) => t.type === "page");
const cdp = await connectWs(page.webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
await cdp.send("Runtime.evaluate", { expression: "location.hash = '#/login'" });
console.log("requested #/login");

for (let i = 0; i < 6; i++) {
  await sleep(1000);
  const url = (await cdp.send("Runtime.evaluate", { expression: "location.href", returnByValue: true }))
    .result.value;
  console.log(`  t+${i + 1}s main url: ${url}`);
  if (!url.includes("/login") && i > 1) break;
}

cdp.close();
await sleep(1500);
console.log("targets after:", JSON.stringify(await targets(), null, 1));
