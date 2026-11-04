import { rmSync } from "node:fs";
import { execSync } from "node:child_process";

/**
 * Builds the landing page into docs/.
 * The old site-assets folder is removed first: with emptyOutDir disabled (it would
 * wipe the screenshots) Vite otherwise keeps every previous hash around forever.
 */
rmSync("docs/site-assets", { recursive: true, force: true });
execSync("npx vite build", { cwd: "site", stdio: "inherit" });
console.log("site built -> docs/");