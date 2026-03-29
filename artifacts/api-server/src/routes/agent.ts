import { Router, type IRouter } from "express";
import { db, agentLogsTable, agentStateTable } from "@workspace/db";
import {
  GetMemoryResponse,
  UpdateMemoryBody,
  RunAgentCycleResponse,
  GetAgentLogsResponse,
  GetAgentConfigResponse,
  UpdateAgentConfigBody,
} from "@workspace/api-zod";
import { desc, asc } from "drizzle-orm";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

async function getOrCreateState() {
  const rows = await db.select().from(agentStateTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db
    .insert(agentStateTable)
    .values({
      memory: "",
      goal: "Help the user be more productive and happy.",
      intervalSeconds: 30,
      isRunning: false,
    })
    .returning();
  return created;
}

router.get("/agent/memory", async (req, res): Promise<void> => {
  const state = await getOrCreateState();
  res.json(
    GetMemoryResponse.parse({
      content: state.memory,
      updatedAt: state.updatedAt.toISOString(),
    })
  );
});

router.put("/agent/memory", async (req, res): Promise<void> => {
  const parsed = UpdateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const state = await getOrCreateState();
  const [updated] = await db
    .update(agentStateTable)
    .set({ memory: parsed.data.content })
    .returning();
  res.json(
    GetMemoryResponse.parse({
      content: updated.memory,
      updatedAt: updated.updatedAt.toISOString(),
    })
  );
});

router.post("/agent/run", async (req, res): Promise<void> => {
  const state = await getOrCreateState();

  const prompt = `You are an autonomous AI agent. Your goal is: "${state.goal}"

Your previous memory:
${state.memory || "(empty — this is your first cycle)"}

Your task:
1. Reflect on what you know and what your goal is.
2. Decide what action to take right now to make progress toward that goal.
3. Describe the result of that action (simulate it if needed).
4. Update your memory with important learnings, progress, and next steps.

Respond ONLY with a valid JSON object in this exact format:
{
  "thought": "<your reflection and reasoning>",
  "action": "<the specific action you are taking>",
  "result": "<what happened as a result of the action>",
  "newMemory": "<updated memory text for your next cycle>"
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { thought: string; action: string; result: string; newMemory: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {
      thought: "Failed to parse agent response",
      action: "none",
      result: "Parse error",
      newMemory: state.memory,
    };
  }

  await db.update(agentStateTable).set({ memory: parsed.newMemory ?? state.memory });

  const now = new Date();
  await db.insert(agentLogsTable).values({
    thought: parsed.thought ?? "",
    action: parsed.action ?? "",
    result: parsed.result ?? "",
  });

  res.json(
    RunAgentCycleResponse.parse({
      thought: parsed.thought ?? "",
      action: parsed.action ?? "",
      result: parsed.result ?? "",
      newMemory: parsed.newMemory ?? "",
      timestamp: now.toISOString(),
    })
  );
});

router.get("/agent/logs", async (req, res): Promise<void> => {
  const limitRaw = req.query.limit;
  const limit = limitRaw ? parseInt(String(limitRaw), 10) : 50;
  const logs = await db
    .select()
    .from(agentLogsTable)
    .orderBy(desc(agentLogsTable.timestamp))
    .limit(limit);

  res.json(
    GetAgentLogsResponse.parse({
      logs: logs.map((l) => ({
        id: l.id,
        thought: l.thought,
        action: l.action,
        result: l.result,
        timestamp: l.timestamp.toISOString(),
      })),
    })
  );
});

router.get("/agent/config", async (req, res): Promise<void> => {
  const state = await getOrCreateState();
  res.json(
    GetAgentConfigResponse.parse({
      intervalSeconds: state.intervalSeconds,
      goal: state.goal,
      isRunning: state.isRunning,
    })
  );
});

router.put("/agent/config", async (req, res): Promise<void> => {
  const parsed = UpdateAgentConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await getOrCreateState();
  const [updated] = await db
    .update(agentStateTable)
    .set({
      goal: parsed.data.goal,
      intervalSeconds: parsed.data.intervalSeconds,
      isRunning: parsed.data.isRunning,
    })
    .returning();
  res.json(
    GetAgentConfigResponse.parse({
      intervalSeconds: updated.intervalSeconds,
      goal: updated.goal,
      isRunning: updated.isRunning,
    })
  );
});

export default router;
