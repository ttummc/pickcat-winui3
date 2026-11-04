import fs from "node:fs";

const api = fs.readFileSync("docs/API.md", "utf8");
const sections = [];
let current = null;
for (const line of api.split("\n")) {
  const h = line.match(/^## (\S+)$/);
  if (h) { current = { name: h[1], endpoints: [] }; sections.push(current); continue; }
  const m = line.match(/^\|\s*(GET|POST|PATCH|PUT|DELETE)\s*\|\s*`([^`]+)`/);
  if (m && current) current.endpoints.push(`${m[1]} ${m[2]}`);
}

const used = new Set();
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|vue)$/.test(e.name)) {
      const src = fs.readFileSync(p, "utf8");
      const re = /api\.(get|post|patch|put|delete)\b/g;
      let m;
      while ((m = re.exec(src))) {
        const tail = src.slice(m.index + m[0].length, m.index + m[0].length + 300);
        const paren = tail.indexOf("(");
        if (paren < 0) continue;
        const after = tail.slice(paren + 1);
        const q = after.match(/^\s*[`'"]([^`'"]+)/);
        if (q) used.add(`${m[1].toUpperCase()} ${q[1].replace(/\$\{[^}]+\}/g, "{x}")}`);
      }
    }
  }
};
walk("extension/src");

const norm = (s) => s.replace(/\{[^}]+\}/g, "{x}").toLowerCase();
const usedNorm = new Set([...used].map(norm));
const total = sections.reduce((n, s) => n + s.endpoints.length, 0);

console.log(`covered: ${used.size} endpoints used / ${total} documented\n`);
for (const s of sections) {
  const hit = s.endpoints.filter((e) => usedNorm.has(norm(e)));
  if (hit.length) console.log(`  ${s.name.padEnd(26)} ${String(hit.length).padStart(2)}/${String(s.endpoints.length).padEnd(2)}  ${hit.join(" | ")}`);
}
console.log("");
const untouched = sections.filter((s) => !s.endpoints.some((e) => usedNorm.has(norm(e))));
console.log(`untouched sections (${untouched.length}):`);
for (const s of untouched) console.log(`  ${s.name.padEnd(26)} ${s.endpoints.length}`);
fs.writeFileSync("research/endpoint-usage.json", JSON.stringify({ total, used: [...used].sort(), sections: sections.map(s => ({ name: s.name, endpoints: s.endpoints, used: s.endpoints.filter(e => usedNorm.has(norm(e))) })) }, null, 2));
