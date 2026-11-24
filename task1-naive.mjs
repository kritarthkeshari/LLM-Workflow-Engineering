// =============================================================================
// TASK 1 — REVIEW THE EXISTING AI FEATURE (the naive, unreliable version)
// =============================================================================
//
// This is what a typical "first attempt" at an AI feature looks like: throw the
// raw user text at the model with a vague instruction, print whatever comes back.
//
// It WORKS in a demo and FAILS in production. Run it, read the output, and notice
// every place it could break. Tasks 2–5 fix each weakness.
//
// Run:  npm run task1
// -----------------------------------------------------------------------------

import { client, MODEL } from "./lib/client.mjs";
import { tickets } from "./data/tickets.mjs";

async function triageNaive(ticketText) {
  // PROBLEM 1: the instruction lives tangled with the user's data in one string.
  // PROBLEM 2: no system prompt, no role, no rules, no examples.
  // PROBLEM 3: we ask for "a category and priority" but never define the allowed
  //            values — so the model invents its own wording every time.
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Here is a support ticket. Tell me the category and priority and what to do:\n\n${ticketText}`,
      },
    ],
  });

  // PROBLEM 4: we blindly read content[0].text. If the model refused, or returned
  //            no text block, this throws or prints "undefined".
  return response.content[0].text;
}

console.log("=== TASK 1: NAIVE TRIAGE (free-form text output) ===\n");

for (const ticket of tickets) {
  console.log(`----- ${ticket.id} -----`);
  try {
    const result = await triageNaive(ticket.text);
    console.log(result);
  } catch (err) {
    console.log("[CRASHED]", err.message);
  }
  console.log();
}

// WHAT TO NOTICE WHEN YOU RUN THIS:
//  • Every ticket comes back as a paragraph of prose in a slightly different shape.
//    You cannot reliably store "priority" in a database — it might be "High",
//    "high priority", "quite urgent", etc.
//  • The empty ticket (T-1006) and gibberish (T-1007) produce confused answers.
//  • The injection ticket (T-1008) may obey the attacker ("Case closed") because
//    the malicious text sits in the same channel as our own instruction.
//  • There is NO error handling for refusals, timeouts, or malformed responses.
//
// => This output is unusable by downstream code. We need STRUCTURE and GUARDRAILS.
