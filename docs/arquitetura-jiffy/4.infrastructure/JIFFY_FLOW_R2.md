# Fredy — storage R2

Infraestrutura de distribuição do **Fredy** (gestor de pedidos Windows). **Não** é regra de pedido. O bucket `jiffy-flow` é só deste produto (nome interno do storage).

## Buckets

| Bucket | Produto | Não misturar |
|--------|---------|--------------|
| `jiffy-print` | Jiffy Print | `agent.exe`, `JiffyPrint-setup.exe` |
| `jiffy-flow` | Fredy | setup, releases, marca |

O nome do bucket já identifica o casco Windows. **Não** criar pasta `jiffy-flow/` dentro deste bucket.

## Árvore (nomes estáveis)

```text
brand/
  logo.png                         # mascote Fredy
  icon.png                         # mascote 512 (bolha / favicon)
stable/
  FredySetup.exe                   # nome fixo — botão no Gestor
  update-manifest.stable.json      # contrato schemaVersion 1
releases/
  0.1.1/
    Fredy.exe                      # binário do update (SHA-256 no manifesto)
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
{base}/stable/FredySetup.exe
{base}/stable/update-manifest.stable.json
{base}/releases/0.1.1/Fredy.exe
{base}/brand/logo.png
```

## Código

- Paths e URL: `src/infrastructure/windows/jiffyFlowR2.ts`
- Presentation só consome (`gestor-pedidos/constantes.ts`)
- Pacote: `apps/jiffy-flow/scripts/package-flow.ps1`
