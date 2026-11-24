// =============================================================================
// TASK 5 — IMPLEMENT FALLBACK BEHAVIOUR
// =============================================================================
//
// THEORY
// ------
// "Reliable" does not mean "never fails" — it means "always produces a usable,
// safe result, even when a part fails." Two layers:
//
//   1. RETRY (for transient failures): rate limits, network blips, an occasional
//      truncated/garbled response. Wait a bit and try again. Use EXPONENTIAL
//      BACKOFF with JITTER so you don't hammer a struggling API: 0.5s, 1s, 2s…,
//      plus a little randomness so many clients don't retry in lockstep.
//      (The SDK already retries at the HTTP layer; this is a second, semantic layer
//      that also retries when the *content* was unusable, e.g. failed validation.)
//
//   2. GRACEFUL DEGRADATION (for permanent or exhausted failures): if the AI path
//      is unusable, fall back to a DETERMINISTIC rule-based classifier. It is dumber,
//      but it always returns a valid, schema-shaped result and flags needs_human=true
//      so a person reviews it. The queue keeps moving; nothing is silently dropped.
//
// Golden rule: a fallback must be SAFE. When unsure, escalate to a human and pick
// the cautious option (here: never auto-resolve, always needs_human = true).
//
// reliableTriage() returns: { data, source, attempts, note }
//   source = "ai"       → model produced a validated result
//          = "fallback" → rule-based result after the AI path failed
//
// Run:  npm run task5
// -----------------------------------------------------------------------------

import { pathToFileURL } from "url";
import { tickets } from "./data/tickets.mjs";
import { safeTriage, RETRYABLE } from "./lib/triage.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Layer 2: the deterministic fallback classifier (no AI, never fails) ----
function ruleBasedTriage(ticketText) {
  const t = (ticketText || "").toLowerCase();
  const has = (...words) => words.some((w) => t.includes(w));

  let category = "other";
  if (has("refund", "charged", "invoice", "payment", "subscription", "billing")) category = "billing";
  else if (has("crash", "error", "bug", "upload", "broken", "not working")) category = "technical";
  else if (has("log in", "login", "password", "account", "email", "sign in")) category = "account";
  else if (has("feature", "would love", "suggestion", "nice-to-have")) category = "feature_request";
  else if (has("unacceptable", "terrible", "angry", "complaint", "worst")) category = "complaint";

  let priority = "medium";
  if (has("can't log in", "cannot log in", "cannot", "outage", "demo", "deadline", "charged twice", "urgent", "1 hour")) priority = "urgent";
  else if (has("crash", "lost work", "broken")) priority = "high";
  else if (has("nice-to-have", "someday", "not urgent")) priority = "low";

  return {
    category,
    priority,
    sentiment: "neutral", // we can't infer tone reliably without the model
    summary: (ticketText || "").trim().slice(0, 120) || "Empty or unreadable ticket.",
    needs_human: true, // ALWAYS — the fallback is a safety net, not a decision-maker
    suggested_reply:
      "Thanks for reaching out — we've received your message and a support specialist will follow up shortly.",
  };
}

// ---- Layers 1 + 2 combined ----
export async function reliableTriage(ticketText, { maxAttempts = 3 } = {}) {
  let last = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await safeTriage(ticketText);
    if (result.ok) {
      return { data: result.data, source: "ai", attempts: attempt, note: null };
    }
    last = result;

    // Permanent failures (empty input, auth, bad_request, refusal): no point retrying.
    if (!RETRYABLE.has(result.reason)) break;

    // Transient: back off and try again, unless that was our last attempt.
    if (attempt < maxAttempts) {
      const backoff = 500 * 2 ** (attempt - 1); // 500ms, 1000ms, 2000ms…
      const jitter = Math.floor(Math.random() * 250);
      await sleep(backoff + jitter);
    }
  }

  // Exhausted or permanent → graceful degradation.
  return {
    data: ruleBasedTriage(ticketText),
    source: "fallback",
    attempts: maxAttempts,
    note: `AI path failed (${last?.reason}: ${last?.detail})`,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log("=== TASK 5: RETRY + FALLBACK ===\n");
  for (const ticket of tickets) {
    console.log(`----- ${ticket.id} -----`);
    const { data, source, attempts, note } = await reliableTriage(ticket.text);
    console.log(`source=${source} attempts=${attempts}${note ? ` (${note})` : ""}`);
    console.log(JSON.stringify(data));
    console.log();
  }
}

// WHAT CHANGED vs TASK 4:
//  • Transient failures are retried automatically with backoff.
//  • If the AI is unreachable or keeps failing, EVERY ticket still gets a valid,
//    human-flagged result. The system degrades instead of breaking.
//  • `source` tells you which path produced each result — essential for monitoring.
