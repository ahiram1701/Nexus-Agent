# Nexus Agent

Aplicación de escritorio nativa para Windows con un agente de inteligencia artificial autónomo. Toda la IA, memoria, almacenamiento y autenticación corren a través de **Puter** — no hay backend propio ni base de datos externa.

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
- **Escritorio**: Electron 33

## Estructura

```text
workspace/
├── artifacts/
│   └── agent-dashboard/
│       ├── electron/
│       │   └── main.cjs              # Proceso principal de Electron
│       ├── src/
│       │   ├── components/           # AgentHeader, ChatPanel, LiveThoughtStream, LogViewer, MemoryEditor, ConfigPanel
│       │   ├── hooks/
│       │   │   └── use-puter-agent.ts  # Hook central — toda la lógica del agente
│       │   ├── lib/
│       │   │   └── puter.ts          # Wrappers para puter.kv, puter.ai.chat, puter.fs
│       │   ├── pages/
│       │   │   └── Dashboard.tsx
│       │   └── types/
│       │       ├── agent.ts          # Tipos: AgentLog, ChatMessage, AgentConfig, AgentMemory
│       │       └── puter.d.ts        # Declaraciones TypeScript del SDK de Puter
│       ├── index.html                # Incluye <script src="https://js.puter.com/v2/">
│       ├── vite.electron.config.ts   # Config Vite para el build de escritorio
│       └── electron-builder.yml      # Configuración del instalador Windows
├── README.md
├── LICENSE
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Requisitos

- Node.js 24.x
- pnpm 10.x (`npm install -g pnpm`)

## Instalación

```bash
git clone <url-del-repo>
cd <carpeta>
pnpm install
```

## Comandos

**Desarrollo** — abre una ventana Electron con hot-reload:

```bash
pnpm --filter @workspace/agent-dashboard run electron:dev
```

**Build — instalador Windows:**

Antes de correr el empaquetado de Electron en Windows, asegÃºrate de tener `Developer Mode` activo o usa una PowerShell elevada. El proyecto incluye un preflight (`electron:build:doctor`) que falla rÃ¡pido si `electron-builder` no puede crear symlinks para `winCodeSign`.

```bash
pnpm --filter @workspace/agent-dashboard run electron:build
```

Genera en `artifacts/agent-dashboard/dist/release/`:
- `Nexus Agent Setup.exe` — instalador NSIS (permite elegir carpeta, crea accesos directos)
- `NexusAgent-portable.exe` — ejecutable portable, sin instalación

**Build — carpeta sin empaquetar** (pruebas rápidas sin instalar):

```bash
pnpm --filter @workspace/agent-dashboard run electron:build:dir
```

Genera `dist/release/win-unpacked/Nexus Agent.exe`, ejecutable directamente.

**Build â€” bundle web/verificaciÃ³n CI:**

```bash
pnpm --filter @workspace/agent-dashboard run build
```

**Tests unitarios:**

```bash
pnpm --filter @workspace/agent-dashboard run test
```

**Typecheck:**

```bash
pnpm --filter @workspace/agent-dashboard run typecheck
```

**Checklist de release:**

Consulta `artifacts/agent-dashboard/RELEASE_CHECKLIST.md`.

## Cómo funciona Puter

### Autenticación

`puter.auth.isLoggedIn()` detecta si el usuario ya tiene sesión al arrancar. Si no, se muestra una pantalla de login con un botón que llama a `puter.auth.signIn()`. En Electron, la ventana OAuth de Puter se abre como ventana hija nativa.

### Almacenamiento en `puter.kv`

| Clave | Contenido |
|---|---|
| `nexus:memory` | Memoria acumulada del agente (`AgentMemory`) |
| `nexus:config` | Objetivo, intervalo y estado isRunning (`AgentConfig`) |
| `nexus:logs` | Últimos 500 ciclos de actividad (`AgentLog[]`) |
| `nexus:chat` | Historial de hasta 1000 mensajes (`ChatMessage[]`) |
| `nexus:log_counter` | Contador de IDs para logs |
| `nexus:chat_counter` | Contador de IDs para mensajes |

### IA con `puter.ai.chat`

- **Ciclos autónomos**: el agente recibe su objetivo y memoria, razona, decide una acción, actualiza su memoria y registra el ciclo en el log.
- **Chat directo**: el agente responde en contexto con su objetivo y memoria actuales, y actualiza la memoria tras cada intercambio.
- Los ciclos pueden ejecutarse manualmente o en bucle automático cada N segundos.

### Archivo de log en `puter.fs`

Cada ciclo se escribe también en `nexus-agent-log.txt` dentro de la cuenta Puter del usuario.

## Componentes principales

| Componente | Función |
|---|---|
| `AgentHeader` | Nombre del agente, estado (activo/standby), botones Run Cycle y Start/Stop Auto-Run |
| `ChatPanel` | Canal directo de conversación con el agente |
| `LiveThoughtStream` | Último pensamiento, acción y resultado del ciclo más reciente |
| `LogViewer` | Historial cronológico de todos los ciclos |
| `ConfigPanel` | Editar objetivo e intervalo; resetear el agente |
| `MemoryEditor` | Ver y editar manualmente la memoria del agente |

## Hook central: `use-puter-agent.ts`

Toda la lógica del agente está encapsulada en un único hook:

```ts
const {
  config, memory, logs, chatMessages,
  isLoading, needsLogin, connectionStatus,
  activeIssue, recentIssues, retryConnection,
  isRunningCycle, isSendingChat,
  login, runCycle, toggleIsRunning,
  updateConfig, updateMemory, sendChatMessage,
  reset,
} = usePuterAgent();
```
