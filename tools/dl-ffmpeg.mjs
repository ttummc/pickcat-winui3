import fs from "node:fs";
const urls = [
  "https://github.com/GyanD/codexffmpeg/releases/latest/download/ffmpeg-release-essentials.zip",
  "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-lgpl.zip",
];
for (const url of urls) {
  console.log("try", url);
  const r = await fetch(url, { redirect: "follow" });
  console.log("  status", r.status, "len", r.headers.get("content-length"), "ctype", r.headers.get("content-type"));
  if (r.ok && (r.headers.get("content-type") || "").includes("zip") === false && r.headers.get("content-length") === null) {
    console.log("  unexpected, skipping"); continue;
  }
  if (!r.ok) continue;
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync("vendor/ffmpeg.zip", buf);
  console.log("  saved MB", (buf.length / 1024 / 1024).toFixed(1));
  process.exit(0);
}
console.log("all failed");
process.exit(1);
