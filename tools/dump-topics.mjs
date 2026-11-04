import { connectBrowser, connectWs, sleep } from "./cdp.mjs";

const IDS = [
  "01a19e50-9d97-7816-9e0a-498ef0ce8be9",
  "01a195a5-b39d-7709-ad7b-0494928c6dd3",
];

const browser = await connectBrowser();
const created = await browser.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find((t) => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) =>
  (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;

for (const id of IDS) {
  const out = await ev(`(async () => {
    const r = await fetch('/api/v1/topics/${id}', { credentials: 'include' });
    if (!r.ok) return 'HTTP ' + r.status;
    const t = await r.json();
    const html = t.firstPost?.cookedHtml ?? '';
    const count = (re) => (html.match(re) || []).length;
    return JSON.stringify({
      title: t.title,
      kind: t.kind,
      bookmarkCount: t.bookmarkCount,
      htmlLength: html.length,
      tagsUsed: [...new Set((html.match(/<([a-z0-9-]+)/gi) || []).map(s => s.slice(1).toLowerCase()))].sort(),
      emojiTokens: count(/\\[emoji:[^\\]]+\\]/g),
      images: count(/<img/g),
      tables: count(/<table/g),
      codeBlocks: count(/<pre/g),
      details: count(/<details/g),
      videos: count(/<video/g),
      iframes: count(/<iframe/g),
      mentions: count(/@\\{/g),
      excerpt: html.slice(0, 240).replace(/\\s+/g, ' ')
    }, null, 1);
  })()`);
  console.log(`\n### ${id}\n${out}`);
}

await browser.send("Target.closeTarget", { targetId: created.targetId }).catch(() => {});
cdp.close();
browser.close();
