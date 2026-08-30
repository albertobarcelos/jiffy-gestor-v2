# CLAUDE.md — Jiffy Flow (Tauri)

Casco Windows. **Não imprime. Não tem regra de pedido.**

```text
Browser / menu Vendas → gestor-pedidos://open
    → este .exe (WebView2)
    → Next em /pedidos?gestor
    → agente Go imprime (já instalado à parte)
```

## O que este projeto faz

- Janela nativa sem barra de endereço
- Abre o Gestor em `/pedidos?gestor`
- Regista o protocolo `gestor-pedidos://`
- Uma instância só (segundo clique foca a janela)

## O que NÃO faz

- ESC/POS, spooler, fila
- WhatsApp
- Embutir o Next no .exe
- Alterar o agente Go

## Comandos

```powershell
npm install
npm test
npm run tauri:dev
npm run tauri:build
.\scripts\package-flow.ps1 -GestorUrl "https://app.jiffy.run"
```

URL em runtime: `GESTOR_PEDIDOS_URL`. Dev sem env = localhost. Setup da loja grava a URL no compile (`JIFFY_FLOW_BAKED_GESTOR_URL`).

## Pré-requisitos

- Rust (https://www.rust-lang.org/learn/get-started)
- [Pré-requisitos Tauri](https://v2.tauri.app/start/prerequisites/) (Windows: WebView2 + Visual Studio Build Tools)

## Versão e updates

Semver próprio (`Cargo.toml`), independente do agente e do Next.

No arranque: manifesto HTTP `schemaVersion: 1` (iguais campos do Jiffy Print), SHA-256, popup obrigatório, helper `apply-pending`. Falha de rede não bloqueia o quadro.

- Bucket R2: `jiffy-flow` (`brand/` `stable/` `releases/{semver}/`)
- Manifesto: `{JIFFY_FLOW_R2_PUBLIC_BASE}/stable/update-manifest.stable.json`
- Override: `JIFFY_FLOW_UPDATE_MANIFEST_URL`
- Staging local: `%LOCALAPPDATA%\JIFFY_FLOW\updates\`
