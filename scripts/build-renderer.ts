import { build } from "bun";
import path from "path";

const root = path.join(import.meta.dir, "..");

async function buildRenderer() {
  const results = await Promise.all([
    build({
      entrypoints: [path.join(root, "src/renderer/prompt/index.tsx")],
      outdir: path.join(root, "dist/renderer/prompt"),
      target: "browser",
      minify: false,
    }),
    build({
      entrypoints: [path.join(root, "src/renderer/timeline/index.tsx")],
      outdir: path.join(root, "dist/renderer/timeline"),
      target: "browser",
      minify: false,
    }),
    build({
      entrypoints: [path.join(root, "src/renderer/shared/preload.ts")],
      outdir: path.join(root, "dist/renderer/shared"),
      target: "node",
      format: "cjs",
      // preload runs in Electron's node context, external electron
      external: ["electron"],
    }),
  ]);

  for (const result of results) {
    if (!result.success) {
      console.error("Build failed:", result.logs);
      process.exit(1);
    }
  }

  // Copy HTML files to dist
  const copies = [
    ["src/renderer/prompt/index.html", "dist/renderer/prompt/index.html"],
    ["src/renderer/timeline/index.html", "dist/renderer/timeline/index.html"],
  ];

  for (const [src, dest] of copies) {
    await Bun.write(
      path.join(root, dest),
      await Bun.file(path.join(root, src)).text()
    );
  }

  console.log("Renderer build complete.");
}

buildRenderer();
