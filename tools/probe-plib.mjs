import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/personal-library" });
await sleep(6200);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`JSON.stringify({
  pathname: location.pathname,
  hash: location.hash,
  title: document.querySelector("#pickcat-root .pc-page-title")?.textContent,
  navSelected: [...document.querySelectorAll("#pickcat-root .win-navigation-view-item")].filter(e=>/is-selected/.test(e.className)).map(e=>e.innerText.trim())
})`));
console.log("titlebar buttons:", await ev(`JSON.stringify([...document.querySelectorAll("#pickcat-root .win-titlebar button")].map(b => b.getAttribute("aria-label")))`));
cdp.close(); b.close();
