import fs from "node:fs";
import path from "node:path";
import { connectBrowser } from "./cdp.mjs";

const SRC = "C:\\Program Files\\PickCat-WinUI3";
const DST = path.join(process.env.LOCALAPPDATA, "PickCatWinUI3-loadtest");

// mirror the folder into a user-writable location, byte for byte
fs.rmSync(DST, { recursive: true, force: true });
fs.mkdirSync(DST, { recursive: true });
for (const entry of fs.readdirSync(SRC, { withFileTypes: true })) {
  const from = path.join(SRC, entry.name);
  const to = path.join(DST, entry.name);
  if (entry.isDirectory()) fs.cpSync(from, to, { recursive: true });
  else fs.copyFileSync(from, to);
}
const srcRules = fs.readFileSync(path.join(SRC, "rules.json"));
const dstRules = fs.readFileSync(path.join(DST, "rules.json"));
console.log("copied to    :", DST);
console.log("rules identical:", srcRules.equals(dstRules), `(${dstRules.length} bytes)`);

const b = await connectBrowser();
const targets = [
  ["Program Files (受保护)", SRC],
  ["LOCALAPPDATA (用户可写)", DST],
  ["桌面 dist (已知可用)", "C:\\Users\\tjh54\\Desktop\\PickCatButWinUI3OnWeb\\extension\\dist"],
];
for (const [label, p] of targets) {
  try {
    const r = await b.send("Extensions.loadUnpacked", { path: p });
    console.log(`OK    ${label.padEnd(24)} -> ${r.id}`);
  } catch (e) {
    const msg = String(e.message ?? e);
    console.log(`FAIL  ${label.padEnd(24)}`);
    console.log(`        ${msg.replace(/\s+/g, " ").slice(0, 260)}`);
  }
}
b.close();
