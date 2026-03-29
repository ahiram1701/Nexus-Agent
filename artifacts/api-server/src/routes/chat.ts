import { Router, type IRouter } from "express";
import { db, agentStateTable, chatMessagesTable } from "@workspace/db";
import {
  SendChatMessageBody,
  SendChatMessageResponse,
  GetChatHistoryResponse,
} from "@workspace/api-zod";
import { desc } from "drizzle-orm";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

async function getState() {
  const rows = await db.select().from(agentStateTable).limit(1);
  return rows[0] ?? null;
}

router.get("/agent/chat", async (req, res): Promise<void> => {
  const limitRaw = req.query.limit;
  const limit = limitRaw ? parseInt(String(limitRaw), 10) : 100;

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .orderBy(desc(chatMessagesTable.timestamp))
    .limit(limit);

  res.json(
    GetChatHistoryResponse.parse({
      messages: messages.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
    })
  );
});

router.post("/agent/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const state = await getState();

  const systemPrompt = `You are an autonomous AI agent. 
Your current goal: "${state?.goal ?? "Help the user be more productive and happy."}"

Your current memory:
${state?.memory ? state.memory : "(no memory yet)"}

You are now in a direct conversation with the user. Be helpful, concise, and speak from the perspective of an AI agent that is actively working toward your goal. Reference your memory and ongoing work when relevant.`;

  const recentMessages = await db
    .select()
    .from(chatMessagesTable)
    .orderBy(desc(chatMessagesTable.timestamp))
    .limit(20);

  const history = recentMessages
    .reverse()
    .map((m) => ({
      role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

  const [savedUser] = await db
    .insert(chatMessagesTable)
    .values({ role: "user", content: parsed.data.content })
    .returning();

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: parsed.data.content },
    ],
  });

  const replyContent =
    completion.choices[0]?.message?.content ?? "I could not generate a response.";

  const [savedAgent] = await db
    .insert(chatMessagesTable)
    .values({ role: "agent", content: replyContent })
    .returning();

  res.json(
    SendChatMessageResponse.parse({
      id: savedAgent.id,
      role: "agent",
      content: replyContent,
      timestamp: savedAgent.timestamp.toISOString(),
    })
  );
});

export default router;
