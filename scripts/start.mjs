import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const port = process.env.PORT || "3000";
const host = process.env.HOST || "0.0.0.0";
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", port], {
  stdio: "inherit",
  env: process.env,
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
