import fs from "node:fs";
const raw = fs.readFileSync("api_calls.txt", "utf8").trim().split(/\r?\n/).slice(1);
const rows = raw.map(l => {
  const m = l.match(/^(\w+)\s+(\S+)\s+::\s*(.*)$/);
  return m ? { method: m[1], path: m[2], files: m[3] } : null;
}).filter(Boolean);

function group(path) {
  const seg = path.split("/").filter(Boolean);
  return seg[0] || "/";
}

const groups = new Map();
for (const r of rows) {
  const g = group(r.path);
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(r);
}

let md = "# PickCat API 接口清单\n\n";
md += `从 \`pickcat.dao3.fun\` 的前端 bundle 中静态提取，共 **${rows.length}** 个接口。\n\n`;
md += "Base URL：`https://pickcat.dao3.fun/api/v1`\n\n";
md += "认证：Cookie `pickcat_session`（`POST /session` 获取，需要阿里云人机验证）。\n\n";
md += "分页统一为 `?cursor=<nextCursor>&limit=<n>`，返回 `{ items, pageInfo: { hasNextPage, nextCursor } }`。\n\n";
md += "## 目录\n\n";
for (const g of [...groups.keys()].sort()) {
  md += `- [${g}](#${g.replace(/[^a-z0-9]/gi, "")}) — ${groups.get(g).length} 个\n`;
}
md += "\n";
for (const g of [...groups.keys()].sort()) {
  md += `## ${g}\n\n`;
  md += "| 方法 | 路径 |\n| --- | --- |\n";
  for (const r of groups.get(g).sort((a,b)=>a.path.localeCompare(b.path))) {
    md += `| ${r.method} | \`${r.path}\` |\n`;
  }
  md += "\n";
}
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/API.md", md);
console.log("wrote docs/API.md", md.length, "bytes,", rows.length, "endpoints");
