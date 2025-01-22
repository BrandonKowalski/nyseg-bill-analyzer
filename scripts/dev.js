import { serve, file } from "bun";
import { join } from "path";
import { stat } from "fs/promises";

const ROOT = import.meta.dir.replace("/scripts", "");
const SRC = join(ROOT, "src");
const NODE_MODULES = join(ROOT, "node_modules");

// Map vendor paths to node_modules locations
const VENDOR_MAP = {
  "pdf.min.js": "pdfjs-dist/build/pdf.min.js",
  "pdf.worker.min.js": "pdfjs-dist/build/pdf.worker.min.js",
  "chart.min.js": "chart.js/dist/chart.umd.js",
};

const PORT = 8080;

console.log(`Starting dev server at http://localhost:${PORT}`);

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to index.html
    if (path === "/") {
      path = "/index.html";
    }

    // Route vendor files from node_modules
    if (path.startsWith("/vendor/")) {
      const vendorFile = path.replace("/vendor/", "");
      const modulePath = VENDOR_MAP[vendorFile];
      if (modulePath) {
        const fullPath = join(NODE_MODULES, modulePath);
        try {
          await stat(fullPath);
          return new Response(file(fullPath));
        } catch {
          return new Response("Not found", { status: 404 });
        }
      }
      return new Response("Not found", { status: 404 });
    }

    // Route styles from src/styles
    if (path.startsWith("/styles/")) {
      const stylePath = join(SRC, path);
      try {
        await stat(stylePath);
        return new Response(file(stylePath));
      } catch {
        return new Response("Not found", { status: 404 });
      }
    }

    // Route everything else from src
    const filePath = join(SRC, path);
    try {
      await stat(filePath);
      return new Response(file(filePath));
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
});

console.log("Dev server running. Press Ctrl+C to stop.");
