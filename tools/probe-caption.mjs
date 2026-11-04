import { connectWs } from "./cdp.mjs";
const list = await (await fetch("http://127.0.0.1:9334/json/list")).json();
const page = list.find(t => t.type === "page");
const cdp = await connectWs(page.webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log(await ev(`(() => {
  const btns = [...document.querySelectorAll('#pickcat-root [class*="caption-button"]')];
  return JSON.stringify(btns.map(b => ({
    cls: b.className,
    html: b.innerHTML.slice(0, 200),
    text: b.textContent.trim(),
    font: getComputedStyle(b).fontFamily,
    size: getComputedStyle(b).fontSize
  })), null, 1);
})()`));
cdp.close();
