import fs from "node:fs";

/**
 * Reads the site's own bundle to recover request bodies for the endpoints we
 * have not implemented yet. The API doc only lists method + path.
 */
const BASE = "https://pickcat.dao3.fun/_nuxt/";
const wanted = {
  "BgyaON1G.js": ["/bookmarks"],
  "DtA2zKVi.js": ["/works/", "/favorite", "/work-favorites"],
  "uPwtVlii.js": ["/reports"],
  "DGI2sLPV.js": ["/profile-reports"],
};

fs.mkdirSync("research/chunks", { recursive: true });

for (const [chunk, needles] of Object.entries(wanted)) {
  const url = BASE + chunk;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`${chunk}: HTTP ${res.status}`);
    continue;
  }
  const src = await res.text();
  fs.writeFileSync(`research/chunks/${chunk}`, src);
  console.log(`\n=== ${chunk} (${(src.length / 1024).toFixed(0)} KB) ===`);
  for (const needle of needles) {
    let at = -1;
    let hits = 0;
    while ((at = src.indexOf(needle, at + 1)) !== -1 && hits < 4) {
      hits++;
      const from = Math.max(0, at - 260);
      const to = Math.min(src.length, at + 260);
      const snippet = src.slice(from, to).replace(/\s+/g, " ");
      console.log(`  [${needle}] …${snippet}…`);
      console.log("");
    }
  }
}
