import { spawn } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "src", "app", "api");
const stagedDir = join(root, "src", "app", "_api-staged");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const env = {
  ...process.env,
  EXPORT_STATIC: "1",
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? "https://binder-inky.vercel.app",
};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)),
    );
  });
}

console.log(`Staging out api route for static export (${apiDir})`);
const hadApi = existsSync(apiDir);
if (hadApi) renameSync(apiDir, stagedDir);

try {
  await run(npx, ["next", "build"]);
  const outHtml = join(root, "out", "index.html");
  if (!existsSync(outHtml)) throw new Error("Export missing out/index.html");
  console.log("Export complete, syncing to Android");
  await run(npx, ["cap", "sync", "android"]);
  console.log("cap sync android done");
} finally {
  if (hadApi) {
    rmSync(apiDir, { recursive: true, force: true });
    renameSync(stagedDir, apiDir);
    console.log("Restored api route");
  }
}