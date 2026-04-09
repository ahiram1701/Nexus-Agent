# Release Checklist

## Antes de empaquetar

1. Usa Node.js `24.x` y pnpm `10.x`.
2. Ejecuta `pnpm install` desde la raíz.
3. Ejecuta `pnpm --filter @workspace/agent-dashboard run typecheck`.
4. Ejecuta `pnpm --filter @workspace/agent-dashboard run test`.
5. Ejecuta `pnpm --filter @workspace/agent-dashboard run build` para validar el bundle web.

## Requisito de Windows para `electron-builder`

`pnpm --filter @workspace/agent-dashboard run electron:build` y `electron:build:dir` ahora ejecutan un preflight que intenta crear un symlink.

Si ese preflight falla:

1. Activa `Developer Mode` en Windows.
2. O ejecuta PowerShell como administrador.
3. Reintenta el build de Electron.

## Salida esperada

1. `pnpm --filter @workspace/agent-dashboard run electron:build:dir`
2. `pnpm --filter @workspace/agent-dashboard run electron:build`

Los artefactos salen en `artifacts/agent-dashboard/dist/release/`.
