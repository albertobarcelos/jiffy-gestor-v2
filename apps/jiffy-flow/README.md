# Jiffy Flow — shell Windows

Casco Tauri 2. Abre a lista de empresas do Gestor em `/pedidos/empresas?gestor`. Sem regra de negócio. Identifica-se com User-Agent `JiffyFlow/` — o Gestor web no Chrome não muda.

Bolha flutuante (janela sem barra, sempre no topo, fora da taskbar, ícone do Flow): só aparece ao minimizar o Gestor. Clique restaura a janela do Flow. Arrasta para outro sítio. Não é overlay do Windows — some no Win+D. Com a aba WhatsApp aberta, o WebView nativo fica escondido enquanto a principal está minimizada, para não cobrir a bolha.

## Dev

1. Instalar [Rust](https://www.rust-lang.org/learn/get-started) e os [pré-requisitos Tauri](https://v2.tauri.app/start/prerequisites/).
2. Subir o Gestor (`npm run dev` na raiz, porta 5000).
3. Neste pasta:

```powershell
npm install
npm test
npm run tauri:dev
```

Homolog/produção:

```powershell
$env:GESTOR_PEDIDOS_URL="https://gestor.homolog.jiffy.run"
npm run tauri:dev
```

O menu **Vendas → Abrir no Windows** chama `gestor-pedidos://open`. Na primeira execução o Windows associa o protocolo a este exe.

## Updates (igual ao Jiffy Print)

Contrato: manifesto JSON `schemaVersion: 1` (os mesmos campos `version`, `url`, `sha256`, `notes`, `minAgentVersion`).

URL padrão:

`https://pub-f30dc155e8504591ac42219788281ee9.r2.dev/jiffy-flow-update-manifest.stable.json`

Override local: `$env:JIFFY_FLOW_UPDATE_MANIFEST_URL`.

No arranque, se o manifesto tiver versão mais nova, um popup obrigatório **Atualizar** baixa o `.exe`, verifica SHA-256, lança `apply-pending` e sai. O helper espera o processo terminar, troca o ficheiro e relança. Falha de rede não bloqueia o quadro. Sem update silencioso.

## Instalador da loja

Setup NSIS **só do Flow**. Não inclui o Jiffy Print.

```powershell
.\scripts\package-flow.ps1 -GestorUrl "https://app.jiffy.run"
```

Sai em `dist\`. Per-user, atalho **Jiffy Flow**, arranque com o Windows. A URL do Gestor fica gravada no `.exe`. No fim do Setup pergunta se já tem o Print; se não, abre o download.

R2: bucket **`jiffy-flow`** (não o do Print). Árvore em `dist\r2\`:

```text
brand/logo.png
brand/icon.png
stable/JiffyFlow-setup.exe
stable/update-manifest.stable.json
releases/0.1.1/jiffy-flow.exe
```

Base pública: `https://pub-143026e1401641a5ad59a389410eed2a.r2.dev`. Ver `docs/arquitetura-jiffy/4.infrastructure/JIFFY_FLOW_R2.md`.

Publicar update:

1. `.\scripts\package-flow.ps1 -GestorUrl "..."`
2. SHA-256 do `dist\jiffy-flow.exe` (o script imprime).
3. Enviar o exe para o R2 e atualizar `docs/update-manifest.stable.json`.
4. Publicar o manifesto na URL estável.
