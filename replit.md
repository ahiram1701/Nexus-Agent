# Nexus Agent

## Descripción

Dashboard web para un agente de inteligencia artificial autónomo. Toda la IA, memoria, almacenamiento y autenticación corren a través de **Puter** — no hay backend propio ni base de datos externa. El frontend es una app React + Vite que se comunica directamente con la API de Puter desde el navegador.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Package manager**: pnpm
- **TypeScript**: 5.9
- **Frontend**: React 19 + Vite 7
- **Estilos**: Tailwind CSS 4 + shadcn/ui
- **Animaciones**: Framer Motion
- **Enrutamiento**: Wouter
- **IA / Storage**: Puter SDK (`puter.ai.chat`, `puter.kv`, `puter.fs`, `puter.auth`)

## Estructura

```text
workspace/
├── artifacts/
│   ├── agent-dashboard/        # App principal (React + Vite)
│   │   ├── src/
│   │   │   ├── components/     # UI: AgentHeader, ChatPanel, LiveThoughtStream, LogViewer, MemoryEditor, ConfigPanel
│   │   │   ├── hooks/
│   │   │   │   └── use-puter-agent.ts   # Hook central — toda la lógica del agente con Puter
│   │   │   ├── lib/
│   │   │   │   └── puter.ts    # Wrappers para puter.kv, puter.ai.chat, puter.fs
│   │   │   ├── pages/
│   │   │   │   └── Dashboard.tsx
│   │   │   └── types/
│   │   │       ├── agent.ts    # Tipos: AgentLog, ChatMessage, AgentConfig, AgentMemory
│   │   │       └── puter.d.ts  # Declaraciones TypeScript del SDK de Puter
│   │   └── index.html          # Incluye <script src="https://js.puter.com/v2/">
│   └── mockup-sandbox/         # Servidor de preview para canvas (herramienta Replit)
├── scripts/                    # Scripts de utilidad del workspace
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── replit.md
```

## Cómo funciona Puter en la app

### Autenticación
`puter.auth.isLoggedIn()` detecta si el usuario ya tiene sesión. Si no, se muestra la pantalla de login con un botón que llama a `puter.auth.signIn()`.

### Almacenamiento en `puter.kv`
| Clave | Contenido |
|---|---|
| `nexus:memory` | Memoria acumulada del agente (JSON `AgentMemory`) |
| `nexus:config` | Configuración: objetivo, intervalo, isRunning (JSON `AgentConfig`) |
| `nexus:logs` | Array de los últimos 100 ciclos (JSON `AgentLog[]`) |
| `nexus:chat` | Historial de chat (JSON `ChatMessage[]`) |
| `nexus:log_counter` | Contador de IDs de logs |
| `nexus:chat_counter` | Contador de IDs de mensajes |

### IA con `puter.ai.chat`
- **Ciclos autónomos**: el agente recibe su objetivo + memoria, razona, decide una acción, actualiza su memoria y registra el ciclo.
- **Chat directo**: el agente responde en contexto con su objetivo y memoria actuales.
- Los ciclos pueden ejecutarse manualmente o en bucle automático cada N segundos.

### Archivo de log en `puter.fs`
Cada ciclo se escribe en `nexus-agent-log.txt` en la cuenta Puter del usuario.

## Componentes principales

| Componente | Función |
|---|---|
| `AgentHeader` | Nombre, estado (activo/standby), botones Run Cycle / Start-Stop Auto-Run |
| `ChatPanel` | Canal directo de chat con el agente |
| `LiveThoughtStream` | Último pensamiento, acción y resultado del agente |
| `LogViewer` | Historial cronológico de todos los ciclos |
| `ConfigPanel` | Editar objetivo e intervalo del agente |
| `MemoryEditor` | Ver y editar manualmente la memoria del agente |

## Hook central: `use-puter-agent.ts`

Exporta todo el estado y acciones que necesita el Dashboard:

```ts
const {
  config, memory, logs, chatMessages,
  isLoading, needsLogin,
  isRunningCycle, isSendingChat,
  login, runCycle, toggleIsRunning,
  updateConfig, updateMemory, sendChatMessage,
} = usePuterAgent();
```

## Comandos útiles

```bash
# Iniciar el servidor de desarrollo
pnpm --filter @workspace/agent-dashboard run dev

# Build de producción
pnpm --filter @workspace/agent-dashboard run build

# Typecheck
pnpm --filter @workspace/agent-dashboard run typecheck
```

## Despliegue

La app se despliega como sitio estático (solo frontend). No requiere servidor ni base de datos propia. Todo el estado del agente vive en la cuenta Puter del usuario.
