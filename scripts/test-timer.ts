import { build } from "bun";
import { mkdtemp, symlink, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const directory = await mkdtemp(path.join(tmpdir(), "chicanery-timer-test-"));
try {
  const result = await build({
    entrypoints: [path.join(root, "tests/electron-timer-smoke.ts")],
    outdir: directory, naming: "main.cjs", target: "node", format: "cjs", external: ["electron"],
  });
  if (!result.success) throw new Error(String(result.logs));
  await writeFile(path.join(directory, "package.json"), JSON.stringify({ name: "chicanery-timer-test", main: "main.cjs" }));
  await symlink(path.join(root, "dist"), path.join(directory, "dist"));
  const child = Bun.spawn([path.join(root, "node_modules/.bin/electron"), directory], { stdout: "inherit", stderr: "inherit" });
  const code = await child.exited;
  if (code !== 0) throw new Error(`Electron timer test exited with ${code}`);
} finally { await rm(directory, { recursive: true, force: true }); }
