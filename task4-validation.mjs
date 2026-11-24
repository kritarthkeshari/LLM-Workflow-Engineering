// =============================================================================
// TASK 4 — HANDLE INVALID OR UNEXPECTED RESPONSES
// =============================================================================
//
// THEORY
// ------
// Even with structured outputs, a real call can go wrong in ways the happy path
// ignores. A reliable workflow checks for EACH of these BEFORE trusting a result:
//
//   A. Bad INPUT          — empty/whitespace ticket. Don't waste an API call; guard it.
//   B. Refusal            — safety classifier declines. stop_reason === "refusal";
//                           the response has NO usable content, so check it first.
//   C. Truncation         — stop_reason === "max_tokens". Output was cut off.
//   D. Parse failure      — parsed_output is null (model produced invalid JSON).
//   E. Schema-valid junk  — JSON fits the schema but is semantically empty
//                           (blank summary). Add your own business checks.
//   F. API errors         — thrown exceptions (auth, rate limit, network, 400s).
//                           Catch typed classes, don't string-match messages.
//
// The implementation lives in lib/triage.mjs as `safeTriage()`, which turns ALL of
// the above into a RESULT OBJECT instead of throwing:
//     { ok: true, data } | { ok: false, reason, detail }
// Returning (not throwing) lets the caller decide what to do — Task 5 uses that to
// retry and fall back. Read lib/triage.mjs alongside this file; the comments map
// each code branch to A–F above.
//
// Run:  npm run task4
// -----------------------------------------------------------------------------

import { pathToFileURL } from "url";
import { tickets } from "./data/tickets.mjs";
import { safeTriage } from "./lib/triage.mjs";

// Only run the demo when this file is executed directly (`node task4-validation.mjs`),
// NOT when another file imports from it. Standard ESM "is this the main module?" check.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log("=== TASK 4: VALIDATION & ERROR HANDLING ===\n");

  for (const ticket of tickets) {
    console.log(`----- ${ticket.id} -----`);
    const result = await safeTriage(ticket.text);
    if (result.ok) {
      console.log("OK  ", JSON.stringify(result.data));
    } else {
      console.log(`FAIL [${result.reason}] ${result.detail}`);
    }
    console.log();
  }
}

// WHAT CHANGED vs TASK 3:
//  • Nothing crashes. Every outcome — success OR a specific, named failure — is a
//    value you can act on.
//  • Empty ticket (T-1006) never hits the API. Refusals and truncation are detected,
//    not mistaken for answers.
//
// REMAINING GAP: when a call fails for a TRANSIENT reason (rate limit, network,
// truncation), we currently just give up. A reliable system RETRIES and, if that
// still fails, degrades gracefully. That is Task 5.
