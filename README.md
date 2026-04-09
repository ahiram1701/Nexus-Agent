# Nexus Agent

Dashboard de agente de inteligencia artificial autónomo. Funciona como **aplicación web** en el navegador y como **aplicación de escritorio nativa** en Windows (Electron). Toda la IA, memoria, almacenamiento y autenticación corren a través de **Puter** — no hay backend propio ni base de datos externa.

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
│       ├── vite.config.ts            # Config Vite para web (Replit)
│       ├── vite.electron.config.ts   # Config Vite para build de escritorio
│       └── electron-builder.yml      # Configuración del instalador Windows
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── replit.md
```

## Comandos

### Aplicación web (Replit)

```bash
# Servidor de desarrollo
pnpm --filter @workspace/agent-dashboard run dev

# Build de producción
pnpm --filter @workspace/agent-dashboard run build

# Typecheck
pnpm --filter @workspace/agent-dashboard run typecheck
```

### Aplicación de escritorio — Windows

**Requisitos:** Node.js 20+, pnpm

```bash
# Clonar e instalar dependencias
git clone <url-del-repo>
cd <carpeta>
pnpm install
```

**Desarrollo** (ventana Electron con hot-reload):

```bash
pnpm --filter @workspace/agent-dashboard run electron:dev
```

**Build — instalador Windows:**

```bash
pnpm --filter @workspace/agent-dashboard run electron:build
```

Genera en `artifacts/agent-dashboard/dist/release/`:
- `Nexus Agent Setup.exe` — instalador NSIS (elige carpeta, crea accesos directos)
- `NexusAgent-portable.exe` — ejecutable portable sin instalación

**Build — carpeta sin empaquetar** (para pruebas rápidas):

```bash
pnpm --filter @workspace/agent-dashboard run electron:build:dir
```

Genera `dist/release/win-unpacked/Nexus Agent.exe`, ejecutable directamente.

## Cómo funciona Puter

### Autenticación

`puter.auth.isLoggedIn()` detecta si el usuario ya tiene sesión. Si no, se muestra una pantalla de login con un botón que llama a `puter.auth.signIn()`. En Electron, la ventana OAuth de Puter se abre como ventana hija nativa.

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
- **Chat directo**: el agente responde en contexto y actualiza su memoria tras cada intercambio.
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
| `ConfigPanel` | Editar objetivo e intervalo, y resetear el agente |
| `MemoryEditor` | Ver y editar manualmente la memoria del agente |

## Hook central: `use-puter-agent.ts`

```ts
const {
  config, memory, logs, chatMessages,
  isLoading, needsLogin,
  isRunningCycle, isSendingChat,
  login, runCycle, toggleIsRunning,
  updateConfig, updateMemory, sendChatMessage,
  resetAgent,
} = usePuterAgent();
```

## Despliegue web

La app web se despliega como sitio estático — solo frontend, sin servidor ni base de datos. Todo el estado del agente vive en la cuenta Puter del usuario.
