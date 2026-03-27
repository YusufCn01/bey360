import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const desktopRoot = path.join(repoRoot, "apps", "desktop");
const bundleRoot = path.join(desktopRoot, "app-bundle");

async function resetBundle() {
  await fs.rm(bundleRoot, { recursive: true, force: true });
  await fs.mkdir(bundleRoot, { recursive: true });
}

async function copyIfExists(fromPath, toPath) {
  try {
    await fs.access(fromPath);
  } catch {
    return;
  }

  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.cp(fromPath, toPath, { recursive: true, force: true });
}

await resetBundle();

await copyIfExists(path.join(repoRoot, ".next", "standalone"), bundleRoot);
await copyIfExists(path.join(repoRoot, ".next", "static"), path.join(bundleRoot, ".next", "static"));
await copyIfExists(path.join(repoRoot, "public"), path.join(bundleRoot, "public"));
await copyIfExists(path.join(repoRoot, "prisma", "migrations"), path.join(bundleRoot, "prisma", "migrations"));

console.log(`Desktop bundle hazirlandi: ${bundleRoot}`);
