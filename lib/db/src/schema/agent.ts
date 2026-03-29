import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentLogsTable = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  thought: text("thought").notNull(),
  action: text("action").notNull(),
  result: text("result").notNull().default(""),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAgentLogSchema = createInsertSchema(agentLogsTable).omit({ id: true, timestamp: true });
export type InsertAgentLog = z.infer<typeof insertAgentLogSchema>;
export type AgentLog = typeof agentLogsTable.$inferSelect;

export const agentStateTable = pgTable("agent_state", {
  id: serial("id").primaryKey(),
  memory: text("memory").notNull().default(""),
  goal: text("goal").notNull().default("Help the user be more productive and happy."),
  intervalSeconds: integer("interval_seconds").notNull().default(30),
  isRunning: boolean("is_running").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAgentStateSchema = createInsertSchema(agentStateTable).omit({ id: true, updatedAt: true });
export type InsertAgentState = z.infer<typeof insertAgentStateSchema>;
export type AgentState = typeof agentStateTable.$inferSelect;
