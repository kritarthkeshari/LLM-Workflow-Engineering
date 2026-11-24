// =============================================================================
// FINAL — DEMONSTRATE A RELIABLE AI WORKFLOW
// =============================================================================
//
// This is the whole thing working together as a real pipeline would:
//
//   ingest tickets
//     → reliableTriage() each one   (structured prompt + context  = Task 2
//                                     structured output            = Task 3
//                                     validation of every result   = Task 4
//                                     retry + fallback              = Task 5)
//     → ROUTE by the structured fields (code-controlled logic around the LLM)
//     → report metrics
//
// The key AI-engineering idea: the LLM is ONE step inside a deterministic workflow.
// Your code — not the model — decides what happens with each result. The model
// produces trustworthy structure; your code does the routing, logging, and metrics.
//
// Run:  npm run final
// -----------------------------------------------------------------------------

import { tickets } from "./data/tickets.mjs";
import { reliableTriage } from "./task5-fallback.mjs";

// Code-controlled routing: given a validated triage result, decide where it goes.
function route(data) {
  if (data.needs_human || data.priority === "urgent") return "human-queue";
  if (data.category === "feature_request") return "product-backlog";
  if (data.priority === "low") return "auto-acknowledge";
  return "support-queue";
}

async function runWorkflow(ticketList) {
  const processed = [];

  for (const ticket of ticketList) {
    const started = Date.now();
    const { data, source, attempts, note } = await reliableTriage(ticket.text);
    const destination = route(data);

    processed.push({ id: ticket.id, source, attempts, destination, ...data, note });

    // One structured log line per ticket — this is what you'd ship to your logs.
    console.log(
      `${ticket.id} | ${source.padEnd(8)} | ${data.priority.padEnd(6)} | ` +
        `${data.category.padEnd(15)} | -> ${destination.padEnd(16)} | ${Date.now() - started}ms` +
        (note ? ` | ${note}` : "")
    );
  }
  return processed;
}

function report(processed) {
  const by = (key) =>
    processed.reduce((acc, p) => ((acc[p[key]] = (acc[p[key]] || 0) + 1), acc), {});

  console.log("\n================ WORKFLOW REPORT ================");
  console.log(`Total tickets processed : ${processed.length}`);
  console.log(`Handled by AI           : ${processed.filter((p) => p.source === "ai").length}`);
  console.log(`Handled by fallback     : ${processed.filter((p) => p.source === "fallback").length}`);
  console.log(`Flagged for a human     : ${processed.filter((p) => p.needs_human).length}`);
  console.log("By priority             :", by("priority"));
  console.log("By category             :", by("category"));
  console.log("By destination          :", by("destination"));

  const urgent = processed.filter((p) => p.priority === "urgent");
  if (urgent.length) {
    console.log("\n--- URGENT, needs attention now ---");
    for (const u of urgent) console.log(`  ${u.id}: ${u.summary}`);
  }
  console.log("================================================\n");
}

console.log("=== FINAL: RELIABLE SUPPORT-TRIAGE WORKFLOW ===\n");
console.log("ticket | source   | prio   | category        | destination      | latency\n");

const processed = await runWorkflow(tickets);
report(processed);

// WHY THIS IS "RELIABLE":
//  • Every ticket produces a valid, schema-shaped result — success or degraded.
//  • Nothing crashes on bad input, refusals, truncation, or API errors.
//  • The output is machine-usable, so routing/metrics are plain deterministic code.
//  • `source` + the log lines give you observability: you can see when and why the
//    AI path fell back, which is how you'd catch a regression in production.
