// One shared Anthropic client for every task file.
//
// THEORY — why a single client?
// The SDK client is a thin, reusable HTTP wrapper. Creating one and importing it
// everywhere means one place to configure timeouts, retries, and the API key.
//
// `new Anthropic()` with NO arguments automatically reads the ANTHROPIC_API_KEY
// environment variable. We load that from the .env file using Node's built-in
// `--env-file=.env` flag (see the npm scripts in package.json) — no extra library.
//
// We NEVER hardcode the key in source code. Hardcoded keys leak through git, logs,
// and screenshots. The key lives only in .env, which .gitignore excludes.

import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "\n[config error] ANTHROPIC_API_KEY is not set.\n" +
      "Fix: copy .env.example to .env and paste your real key, then re-run.\n"
  );
  process.exit(1);
}

export const client = new Anthropic({
  // These are optional but good defaults for a reliable app:
  maxRetries: 2, // SDK auto-retries 429/5xx/network errors with backoff (default is 2)
  timeout: 60 * 1000, // 60s per request (default is 10 min; we fail faster)
});

// The model we use throughout. Keeping it in one constant makes it trivial to
// swap models later (e.g. for the fallback step in Task 5).
export const MODEL = "claude-haiku-5-5";
