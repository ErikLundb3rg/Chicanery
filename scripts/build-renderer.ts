import { build, $ } from "bun";
import path from "path";

const root = path.join(import.meta.dir, "..");

async function buildRenderer() {
  // Build Tailwind CSS
  await $`${root}/node_modules/.bin/tailwindcss \
    --input ${root}/src/renderer/styles/globals.css \
    --output ${root}/dist/renderer/styles/globals.css`.quiet();

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
      external: ["electron"],
    }),
  ]);

  for (const result of results) {
    if (!result.success) {
      console.error("Build failed:", result.logs);
      process.exit(1);
    }
  }

  const copies: [string, string][] = [
    ["src/renderer/prompt/index.html", "dist/renderer/prompt/index.html"],
    ["src/renderer/timeline/index.html", "dist/renderer/timeline/index.html"],
  ];

  await Promise.all(
    copies.map(([src, dest]) =>
      Bun.write(path.join(root, dest), Bun.file(path.join(root, src)))
    )
  );

  console.log("Renderer build complete.");
}

buildRenderer();
