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
