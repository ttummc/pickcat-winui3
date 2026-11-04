import { connectBrowser, connectWs, sleep } from "./cdp.mjs";
const IDS = ["01a19e50-9d97-7816-9e0a-498ef0ce8be9", "01a195a5-b39d-7709-ad7b-0494928c6dd3"];
const b = await connectBrowser();
const created = await b.send("Target.createTarget", { url: "https://pickcat.dao3.fun/" });
await sleep(6500);
const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const cdp = await connectWs(list.find(t => t.id === created.targetId).webSocketDebuggerUrl);
await cdp.send("Runtime.enable");
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;

for (const id of IDS) {
  const raw = await ev(`fetch('/api/v1/topics/${id}', { credentials: 'include' }).then(r => r.text())`);
  let data;
  try { data = JSON.parse(raw); } catch { console.log("BAD", id, String(raw).slice(0, 120)); continue; }
  const html = data.firstPost?.cookedHtml ?? "";
  // table -> pipe rows, pre -> fenced
  const text = html
    .replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (_, inner) => {
      const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
        [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)]
          .map((c) => c[1].replace(/<[^>]+>/g, "").trim())
          .join(" | "),
      );
      return "\n" + rows.join("\n") + "\n\n";
    })
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (_, code) => "\n```\n" + code.replace(/<[^>]+>/g, "") + "\n```\n\n")
    .replace(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/g, (_, n, t) => "\n" + "#".repeat(+n + 1) + " " + t.replace(/<[^>]+>/g, "") + "\n")
    .replace(/<\/(p|li|div)>/g, "\n")
    .replace(/<li[^>]*>/g, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n");
  console.log("\n" + "=".repeat(72));
  console.log("# " + data.title);
  console.log("=".repeat(72));
  console.log(text.trim());
}
await b.send("Target.closeTarget", { targetId: created.targetId }).catch(()=>{});
cdp.close(); b.close();
