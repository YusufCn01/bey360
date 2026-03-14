const { spawn } = require("child_process");

const CONTAINER_NAME = "bey360-postgres";
const LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54329/muhasebe_local?schema=public";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr || stdout || `Komut basarisiz: ${command} ${args.join(" ")}`));
    });
  });
}

async function hasDocker() {
  try {
    await run("docker", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function ensureLocalDatabase() {
  const mode = (process.env.B360_DESKTOP_DB_MODE ?? "hybrid").trim().toLowerCase();
  if (mode === "cloud") {
    return {
      status: "skipped",
      url: null,
      reason: "B360_DESKTOP_DB_MODE=cloud",
    };
  }

  const dockerOk = await hasDocker();
  if (!dockerOk) {
    return {
      status: "unavailable",
      url: null,
      reason: "Docker bulunamadi",
    };
  }

  try {
    const check = await run("docker", ["ps", "-a", "--filter", `name=^/${CONTAINER_NAME}$`, "--format", "{{.Names}}"]);
    const exists = check.stdout.trim() === CONTAINER_NAME;

    if (!exists) {
      await run("docker", [
        "run",
        "-d",
        "--name",
        CONTAINER_NAME,
        "-e",
        "POSTGRES_USER=postgres",
        "-e",
        "POSTGRES_PASSWORD=postgres",
        "-e",
        "POSTGRES_DB=muhasebe_local",
        "-p",
        "54329:5432",
        "postgres:16-alpine",
      ]);
    } else {
      await run("docker", ["start", CONTAINER_NAME]);
    }

    return {
      status: "ready",
      url: LOCAL_DB_URL,
      reason: "Local PostgreSQL container hazir",
    };
  } catch (error) {
    return {
      status: "error",
      url: null,
      reason: error instanceof Error ? error.message : "Local DB baslatilamadi",
    };
  }
}

module.exports = {
  ensureLocalDatabase,
  LOCAL_DB_URL,
};
