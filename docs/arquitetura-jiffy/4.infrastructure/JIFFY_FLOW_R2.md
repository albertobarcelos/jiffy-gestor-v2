# Jiffy Flow — storage R2

Infraestrutura de distribuição. **Não** é regra de pedido. O bucket é só do Flow.

## Buckets

| Bucket | Produto | Não misturar |
|--------|---------|--------------|
| `jiffy-print` | Jiffy Print | `agent.exe`, `JiffyPrint-setup.exe` |
| `jiffy-flow` | Jiffy Flow | setup, releases, marca |

O nome do bucket já é o produto. **Não** criar pasta `jiffy-flow/` dentro deste bucket.

## Árvore (nomes estáveis)

```text
brand/
  logo.png                         # wordmark do login (jiffy-login)
  icon.png                         # mascote 512 (favicon do Gestor)
stable/
  JiffyFlow-setup.exe              # nome fixo — botão no Gestor
  update-manifest.stable.json      # contrato schemaVersion 1
releases/
  0.1.0/
    jiffy-flow.exe                 # binário do update (SHA-256 no manifesto)
```

- `brand/` — identidade. Não muda com a versão.
- `stable/` — contrato corrente (porta pública).
- `releases/{semver}/` — artefacto versionado.

## URL pública

O host `pub-….r2.dev` do Print **não** serve este bucket.

Base pública (já ligada):

`https://pub-143026e1401641a5ad59a389410eed2a.r2.dev`

Override: `NEXT_PUBLIC_JIFFY_FLOW_R2_BASE` / `JIFFY_FLOW_R2_PUBLIC_BASE`.

Exemplos:

```text
{base}/stable/JiffyFlow-setup.exe
{base}/stable/update-manifest.stable.json
{base}/releases/0.1.0/jiffy-flow.exe
{base}/brand/logo.png
```

## Código

- Paths e URL: `src/infrastructure/windows/jiffyFlowR2.ts`
- Presentation só consome (`gestor-pedidos/constantes.ts`)
- Pacote: `apps/jiffy-flow/scripts/package-flow.ps1`
