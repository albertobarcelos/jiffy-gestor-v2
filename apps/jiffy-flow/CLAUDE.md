# CLAUDE.md — Jiffy Flow (Tauri)

Casco Windows. **Não imprime. Não tem regra de pedido.**

```text
Browser / menu Vendas → gestor-pedidos://open
    → este .exe (WebView2, User-Agent JiffyFlow/)
    → Next em /pedidos/empresas?gestor
    → agente Go imprime (já instalado à parte)
```

## Separação instalado vs web (obrigatória)

| Superfície | Como se reconhece | Depois do login |
|---|---|---|
| **Jiffy Flow `.exe`** | User-Agent contém `JiffyFlow/` | Lista «Suas empresas» — nunca Minhas Empresas |
| **Preview kiosk no Chrome** | só `?gestor` na URL | A mesma lista (dev) |
| **Gestor no Chrome** | nenhum dos dois | Hub de cards, inalterado |

Não usar cookie, `localStorage` nem `sessionStorage` como identidade do produto. O Chrome nunca envia `JiffyFlow/`. A janela do WhatsApp Web no Flow usa UA de Chrome normal (sem `JiffyFlow/`).

## O que este projeto faz

- Janela nativa sem barra de endereço
- Abre o Gestor na janela nativa
- Identifica-se com User-Agent `JiffyFlow/` (o Gestor web nunca abre Minhas Empresas neste casco)
- Regista o protocolo `gestor-pedidos://`
- Uma instância só (segundo clique foca a janela)
- WebView persistente de `web.whatsapp.com` (sem ler conversas)
- Bolha flutuante (janela à parte, sempre no topo, ícone do Flow): só aparece com a janela principal minimizada. Clique restaura o Flow (não troca de aba). Arrasta. Some no Win+D / ecrã exclusivo. Com o WhatsApp aberto, o WebView nativo é escondido enquanto a bolha está visível. A deteção de minimizar e a 2.ª instância usam `get_window("main")` — `get_webview_window("main")` fica `None` depois do filho WhatsApp.

## O que NÃO faz

- ESC/POS, spooler, fila
- API oficial / Baileys / chatbot / gravar mensagens
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
