# CLAUDE.md — Gestor Pedidos Shell (Tauri)

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
```

URL: `GESTOR_PEDIDOS_URL` (default `http://localhost:5000`).

## Pré-requisitos

- Rust (https://www.rust-lang.org/learn/get-started)
- [Pré-requisitos Tauri](https://v2.tauri.app/start/prerequisites/) (Windows: WebView2 + Visual Studio Build Tools)

## Versão e updates

Semver próprio (`Cargo.toml`), independente do agente e do Next.

No arranque: manifesto HTTP `schemaVersion: 1` (iguais campos do Jiffy Print), SHA-256, popup obrigatório, helper `apply-pending`. Falha de rede não bloqueia o quadro.

- URL: `https://pub-f30dc155e8504591ac42219788281ee9.r2.dev/jiffy-flow-update-manifest.stable.json`
- Override: `JIFFY_FLOW_UPDATE_MANIFEST_URL`
- Staging: `%LOCALAPPDATA%\JIFFY_FLOW\updates\`
