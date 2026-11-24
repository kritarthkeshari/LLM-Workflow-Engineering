// The OUTPUT CONTRACT, expressed once as a Zod schema and reused everywhere.
//
// THEORY — why a schema?
// A schema is a precise, machine-checkable description of the shape you expect.
// It does three jobs at once:
//   1. It can be sent TO the model (via zodOutputFormat) so the API constrains
//      generation to valid JSON of this exact shape — this is "structured outputs".
//   2. It VALIDATES anything you parse yourself (Task 4's manual fallback path).
//   3. It gives your editor/types autocomplete on the result.
//
// Keep the schema small and use enums wherever the value is from a fixed set —
// enums are the single most important reliability tool, because they make it
// impossible for the model to return "High priority!!" instead of "high".

import { z } from "zod";

export const CATEGORIES = ["billing", "technical", "account", "feature_request", "complaint", "other"];
export const PRIORITIES = ["low", "medium", "high", "urgent"];
export const SENTIMENTS = ["positive", "neutral", "negative", "angry"];

export const TriageSchema = z.object({
  category: z.enum(CATEGORIES).describe("The single best-fitting category."),
  priority: z.enum(PRIORITIES).describe("urgent only if the customer is blocked right now."),
  sentiment: z.enum(SENTIMENTS).describe("The customer's emotional tone."),
  summary: z.string().describe("One neutral sentence describing the request."),
  needs_human: z.boolean().describe("true if a person should review before replying."),
  suggested_reply: z.string().describe("A short, polite first reply to the customer."),
});
