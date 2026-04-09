# Nexus Agent

Autonomous AI agent dashboard — pure frontend React + Vite app using **Puter exclusively**.

## Architecture

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS
- **AI:** `puter.ai.chat` (no backend, no API keys)
- **Persistence:** `puter.kv` for memory, logs, config, chat history
- **Auth:** `puter.auth.isLoggedIn()` / `puter.auth.signIn()`
- **Desktop:** Electron wrapper (Windows) — no backend required

## Puter KV Keys

| Key                 | Purpose                       |
|---------------------|-------------------------------|
| `nexus:memory`      | Agent core memory             |
| `nexus:config`      | Goal, interval, running state |
| `nexus:logs`        | Activity log entries          |
| `nexus:chat`        | Chat message history          |
| `nexus:log_counter` | Auto-increment for log IDs    |
| `nexus:chat_counter`| Auto-increment for chat IDs   |

## Key Files

- `artifacts/agent-dashboard/src/lib/puter.ts` — All Puter interactions
- `artifacts/agent-dashboard/src/hooks/use-puter-agent.ts` — Agent state & loop
- `artifacts/agent-dashboard/src/types/agent.ts` — Local TypeScript types
- `artifacts/agent-dashboard/src/types/puter.d.ts` — Puter global type declarations
- `artifacts/agent-dashboard/electron/main.cjs` — Electron main process
- `artifacts/agent-dashboard/vite.electron.config.ts` — Vite config for Electron build
- `artifacts/agent-dashboard/electron-builder.yml` — Windows installer config

## Running

### Web (Replit / browser)
The Replit workflow handles this automatically via `pnpm dev`.

### Desktop — Development (Windows)
```bash
git clone <repo>
pnpm install
pnpm --filter @workspace/agent-dashboard run electron:dev
```
This starts a Vite dev server on port 5173 and opens an Electron window pointing to it.

### Desktop — Build installer (Windows)
```bash
pnpm --filter @workspace/agent-dashboard run electron:build
```
Output: `artifacts/agent-dashboard/dist/release/`
- `Nexus Agent Setup.exe` — NSIS installer
- `NexusAgent-portable.exe` — Single-file portable EXE

### Desktop — Quick test without installer (Windows)
```bash
pnpm --filter @workspace/agent-dashboard run electron:build:dir
```
Produces an unpacked app in `dist/release/win-unpacked/` you can run directly.

## Default Config

```json
{
  "goal": "",
  "intervalSeconds": 30,
  "isRunning": false
}
```
Goal is intentionally empty — the user must define their own goal before starting the agent.

## Notes

- Puter auth opens an OAuth popup; the Electron main process is configured to allow this popup as a child window
- All Puter calls work identically in Electron and the browser (Electron uses Chromium)
- No backend, no server, no database — fully standalone
