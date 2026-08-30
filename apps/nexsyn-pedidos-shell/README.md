# Gestor Pedidos — shell Windows

Casco Tauri 2. Abre o quadro do Gestor em `/pedidos?gestor`. Sem regra de negócio.

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

O menu **Vendas → Abrir no Windows** chama `gestor-pedidos://open`. Na primeira execução do `tauri:dev` o Windows passa a associar o protocolo a este exe.

## Updates (igual ao Jiffy Print)

Contrato: manifesto JSON `schemaVersion: 1` (os mesmos campos `version`, `url`, `sha256`, `notes`, `minAgentVersion`).

URL padrão:

`https://pub-f30dc155e8504591ac42219788281ee9.r2.dev/jiffy-flow-update-manifest.stable.json`

Override local: `$env:JIFFY_FLOW_UPDATE_MANIFEST_URL`.

No arranque, se o manifesto tiver versão mais nova, um popup obrigatório **Atualizar** baixa o `.exe`, verifica SHA-256, lança `apply-pending` e sai. O helper espera o processo terminar, troca o ficheiro e relança. Falha de rede não bloqueia o quadro. Sem update silencioso.

Publicar:

1. Gerar o exe (`npm run tauri:build`).
2. `.\scripts\hash-flow-exe.ps1 -Path caminho\nexsyn-pedidos-shell.exe`
3. Enviar o exe para o R2 e atualizar `docs/update-manifest.stable.json` (versão + sha256 + url).
4. Publicar o manifesto na URL estável.
