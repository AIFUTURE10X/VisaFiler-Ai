import { getAiFieldExplanation } from "../src/lib/ai";

if (process.env.RUN_OPENAI_SMOKE !== "1") {
  console.log("Set RUN_OPENAI_SMOKE=1 to run live OpenAI smoke checks.");
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required for live AI smoke checks.");
}

console.log(getAiFieldExplanation("writtenAt"));
