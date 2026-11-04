import { connectWs } from "./cdp.mjs";
const list = await (await fetch("http://127.0.0.1:9334/json/list")).json();
const cdp = await connectWs(list.find(t => t.type === "page").webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log("caption font:", await ev(`getComputedStyle(document.querySelector('.win-titlebar-caption-button .win-font-icon')).fontFamily`));
console.log("injected leftover style present:", await ev(`!!document.getElementById('caption-fix')`));
console.log("shipped rule present:", await ev(`[...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => (r.cssText||'').includes('Caption glyphs') || (r.cssText||'').includes('win-titlebar .win-font-icon')); } catch(e) { return false; } })`));
cdp.close();
