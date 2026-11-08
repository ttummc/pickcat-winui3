import fs from "node:fs";
import path from "node:path";

/**
 * Builds the context pack the kernel reads from a workspace:
 *   components.json — every WinUIonWeb component with its props and events
 *   pages.md        — the pages that already exist, one line each
 *
 * Run: node tools/gen-dsh-context.mjs
 */

const root = path.resolve(import.meta.dirname, "..");
const pkg = path.join(root, "node_modules", "winuionweb");
const outDir = path.join(root, "desktop", "PickCat.WinUI3", "Assets", "dsh-context");

if (!fs.existsSync(pkg)) {
  console.error("winuionweb is not installed");
  process.exit(1);
}

/** Pulls the prop names and their declared defaults out of a generated .vue.d.ts. */
function parseComponent(file) {
  const text = fs.readFileSync(file, "utf8");
  const name = path.basename(file, ".vue.d.ts");

  const props = [];
  // The default export carries `ExtractPropTypes<{ ... }>`; the braces nest, so the
  // body is found by brace matching rather than a lazy regex.
  const start = text.indexOf("ExtractPropTypes<{");
  if (start >= 0) {
    let depth = 0;
    let from = text.indexOf("{", start);
    let end = from;
    for (let i = from; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const body = text.slice(from + 1, end);
    for (const m of body.matchAll(/^\s+([A-Za-z_$][\w$]*):\s*\{/gm)) props.push(m[1]);
  }

  // Emits live in the ComponentOptionsMixin generic; the generated files list them
  // as a string union such as "click" | "update:IsOpen".
  const emits = [];
  for (const m of text.matchAll(/ComponentOptionsMixin,\s*\{([^}]*)\}/g)) {
    for (const e of m[1].matchAll(/'([^']+)'/g)) emits.push(e[1]);
  }

  return { name, props: [...new Set(props)], events: [...new Set(emits)] };
}

const componentDir = path.join(pkg, "dist-lib", "types", "components");
const components = fs
  .readdirSync(componentDir)
  .filter((name) => name.endsWith(".vue.d.ts"))
  .map((name) => parseComponent(path.join(componentDir, name)))
  .filter((entry) => entry.props.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync(outDir, { recursive: true });
const catalog = {
  package: "winuionweb",
  version: JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8")).version,
  note:
    "Props use XAML casing exactly as declared (IsOpen, CornerRadius, Content). " +
    "Events are Vue emits; bind with @Click / @update:IsOpen.",
  count: components.length,
  components,
};
fs.writeFileSync(path.join(outDir, "components.json"), JSON.stringify(catalog, null, 1));

/* ---------- pages.md ---------- */
const pagesDir = path.join(root, "extension", "src", "pages");
const pages = fs
  .readdirSync(pagesDir)
  .filter((name) => name.endsWith(".vue"))
  .map((name) => `- \`${name.replace(".vue", "")}\` — src/pages/${name}`)
  .sort();

const pagesDoc = [
  "# 现有页面",
  "",
  "路由名与文件一一对应（扩展名省略），新增页面时同步登记到 src/pages 与 App.vue 的 PAGES。",
  "",
  ...pages,
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "pages.md"), pagesDoc);

console.log(`components.json: ${components.length} 个组件`);
console.log(`pages.md: ${pages.length} 个页面`);
