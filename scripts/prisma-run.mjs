import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { prepareDatabaseEnv } from "./db-env.mjs";

const require = createRequire(import.meta.url);
const prismaBin = require.resolve("prisma/build/index.js");
const args = process.argv.slice(2);

const child = spawn(process.execPath, [prismaBin, ...args], {
  stdio: "inherit",
  env: prepareDatabaseEnv(),
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
