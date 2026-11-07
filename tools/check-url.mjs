import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const EXT = "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist";
const TOPIC = "01a19f18-ca0d-7b7d-b39b-55ae719323c6";
const b = await connectBrowser();
try { await b.send("Extensions.loadUnpacked", { path: EXT }); } catch (e) { console.log("load:", e.message); }
await sleep(1500);
// 模拟用户遇到的场景：先以真实路径打开帖子页
const created = await b.send("Target.createTarget", { url: `https://pickcat.dao3.fun/forum/post/${TOPIC}` });
await sleep(9000);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true })).result.value;
console.log("打开帖子后 URL:", await ev("location.href"));
console.log("hash:", await ev("location.hash"), "| pathname:", await ev("location.pathname"));
await ev("location.hash = '#/personal-library'");
await sleep(2500);
console.log("切图盘后 URL:", await ev("location.href"));
console.log("pathname:", await ev("location.pathname"), "| hash:", await ev("location.hash"));
cdp.close(); b.close();
