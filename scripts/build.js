import { mkdir, copyFile, readFile, writeFile } from "fs/promises";
import { join } from "path";

const ROOT = import.meta.dir.replace("/scripts", "");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const NODE_MODULES = join(ROOT, "node_modules");

async function build() {
  console.log("Building NYSEG Bill Analyzer...");

  // Ensure dist directory exists
  await mkdir(DIST, { recursive: true });
  await mkdir(join(DIST, "js"), { recursive: true });
  await mkdir(join(DIST, "vendor"), { recursive: true });

  // Bundle the JavaScript modules
  console.log("Bundling JavaScript...");
  const result = await Bun.build({
    entrypoints: [join(SRC, "js/app.js")],
    outdir: join(DIST, "js"),
    minify: true,
    sourcemap: "external",
    target: "browser",
  });

  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  // Copy vendor files from node_modules
  console.log("Copying vendor files...");
  await copyFile(
    join(NODE_MODULES, "pdfjs-dist/build/pdf.min.js"),
    join(DIST, "vendor/pdf.min.js")
  );
  await copyFile(
    join(NODE_MODULES, "pdfjs-dist/build/pdf.worker.min.js"),
    join(DIST, "vendor/pdf.worker.min.js")
  );
  await copyFile(
    join(NODE_MODULES, "chart.js/dist/chart.umd.js"),
    join(DIST, "vendor/chart.min.js")
  );

  // Copy and update HTML
  console.log("Processing HTML...");
  let html = await readFile(join(SRC, "index.html"), "utf-8");

  // Inject build hash from git
  const gitHash = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"]).stdout.toString().trim();
  html = html.replace("__BUILD_HASH__", gitHash || "dev");

  // Update paths for dist folder structure (flatten styles path)
  html = html.replace(
    'href="styles/styles.css"',
    'href="styles.css"'
  );

  await writeFile(join(DIST, "index.html"), html);

  // Copy CSS
  console.log("Copying CSS...");
  await copyFile(join(SRC, "styles/styles.css"), join(DIST, "styles.css"));

  console.log("Build complete! Output in dist/");
}

build().catch(console.error);
