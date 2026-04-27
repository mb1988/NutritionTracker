const { spawnSync } = require("node:child_process");

const maxAttempts = Number(process.env.MIGRATE_MAX_ATTEMPTS ?? 8);
const delayMs = Number(process.env.MIGRATE_RETRY_DELAY_MS ?? 5000);

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`[migrate] Running prisma migrate deploy (${attempt}/${maxAttempts})`);
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status === 0) {
    console.log("[migrate] Migration complete");
    process.exit(0);
  }

  if (attempt === maxAttempts) {
    console.error(`[migrate] Failed after ${maxAttempts} attempts`);
    process.exit(result.status ?? 1);
  }

  console.warn(`[migrate] Attempt failed, retrying in ${Math.round(delayMs / 1000)}s`);
  sleep(delayMs);
}
