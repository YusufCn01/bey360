import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { prepareDatabaseEnv } from "./db-env.mjs";

const require = createRequire(import.meta.url);
const prismaBin = require.resolve("prisma/build/index.js");
const nextBin = require.resolve("next/dist/bin/next");
const env = prepareDatabaseEnv();

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env,
    });

    child.on("exit", (code) => {
      if ((code ?? 1) === 0) {
        resolve(null);
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code ?? 1}`));
    });
  });
}

await run(process.execPath, [prismaBin, "generate"]);
await run(process.execPath, [prismaBin, "migrate", "deploy"]);
await run(process.execPath, [nextBin, "build", "--webpack"]);
