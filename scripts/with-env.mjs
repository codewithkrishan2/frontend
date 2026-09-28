#!/usr/bin/env node
/**
 * Runs the Next.js CLI with a chosen env file loaded.
 *
 *   node scripts/with-env.mjs <dev|prod> <next-args...>
 *
 * Why this exists: Next.js only auto-loads `.env`, `.env.development` and
 * `.env.production`, and this project uses `.env.dev` / `.env.prod`. Node's
 * `--env-file` flag can't be used instead, because `next build` spawns Workers
 * and Node rejects `--env-file` in worker exec arguments.
 *
 * Precedence, lowest to highest:
 *   .env.dev | .env.prod  ->  .env.local  ->  real environment variables
 *
 * Real environment variables are never overwritten, so CI and container
 * config keeps working untouched.
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import process from "node:process";
import { parseEnv } from "node:util";

const ENV_FILES = {
  dev: ".env.dev",
  prod: ".env.prod",
};

const [target, ...nextArgs] = process.argv.slice(2);
const envFile = ENV_FILES[target];

if (!envFile) {
  console.error(
    `with-env: expected "dev" or "prod" as the first argument, got "${target ?? ""}".`,
  );
  process.exit(1);
}

/** Applies parsed values without clobbering anything already set. */
function load(fileName, { required }) {
  const path = resolve(process.cwd(), fileName);
  let contents;

  try {
    contents = readFileSync(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      if (required) {
        console.error(`with-env: ${fileName} not found.`);
        process.exit(1);
      }
      return;
    }
    throw error;
  }

  for (const [key, value] of Object.entries(parseEnv(contents))) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// `.env.local` is read first so its values win over the shared env file.
load(".env.local", { required: false });
load(envFile, { required: true });

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

// Spawning a fresh node process keeps our flags out of the child's execArgv,
// which is what `next build`'s Workers choke on.
const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("with-env: failed to start next.", error);
  process.exit(1);
});
