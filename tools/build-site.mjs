import { rmSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Builds the landing page into docs/.
 *
 * The old site-assets folder is removed first: emptyOutDir stays disabled (it would
 * wipe the screenshots) so Vite otherwise keeps every previous hash around forever.
 * TEMP is redirected into the repo because esbuild's temp files are not writable in
 * the system temp folder on this machine.
 */
const tmp = resolve(".tmp");
mkdirSync(tmp, { recursive: true });
rmSync("docs/site-assets", { recursive: true, force: true });

execSync("npx vite build", {
  cwd: "site",
  stdio: "inherit",
  env: { ...process.env, TEMP: tmp, TMP: tmp },
});

console.log("site built -> docs/");
