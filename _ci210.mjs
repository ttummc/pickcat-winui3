const headers = { "User-Agent": "pickcat", Accept: "application/vnd.github+json" };
for (let i = 0; i < 40; i++) {
  const runs = await (await fetch("https://api.github.com/repos/ttummc/pickcat-winui3/actions/runs?per_page=4", { headers })).json();
  const run = runs.workflow_runs.find(r => r.head_branch === "v2.1.0");
  if (run && run.status === "completed") { console.log("CI:", run.conclusion); break; }
  await new Promise(r => setTimeout(r, 10000));
}
const rel = await (await fetch("https://api.github.com/repos/ttummc/pickcat-winui3/releases/tags/v2.1.0", { headers })).json();
console.log("release:", rel.tag_name);
for (const a of rel.assets ?? []) console.log("  " + a.name + "  " + Math.round(a.size/1024/1024) + " MB  " + (a.digest ?? "").replace("sha256:","").slice(0,16));
if (rel.body) console.log("\n更新说明前 200 字:\n" + rel.body.slice(0, 200));
