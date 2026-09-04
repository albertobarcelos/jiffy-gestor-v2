# Jiffy Cardápio

**Jiffy Cardápio** é o storefront público voltado ao cliente final para pedidos de delivery.

## Visão geral

| App | Porta | Quem usa |
|-----|-------|----------|
| `jiffy-cardapio` (este) | **5001** | Cliente final — acessa `/{slug}` para ver o cardápio e fazer pedido |
| `jiffy-gestor-v2` (raiz) | 3000 | Operador/gestor — painel ERP com admin do delivery, design, kanban etc. |

O Cardápio e o Gestor **compartilham o mesmo repositório Git** mas são aplicações Next.js independentes e podem ser implantados separadamente.

## Rotas públicas

| URL | Descrição |
|-----|-----------|
| `/{slug}` | Cardápio da loja (home) |
| `/{slug}/carrinho` | Cardápio com carrinho aberto |
| `/{slug}/catalogo` | Redireciona para `/{slug}` (compatibilidade) |
| `/{slug}/mesa/{mesaId}` | QR na mesa (canal `mesa`; pedido mesa em evolução) |
| `/{slug}/mesa/{mesaId}?tablet=1` | Tablet / kiosk na mesa |
| `/{slug}/comanda/{codigo}` | Comanda (canal reservado) |
| `/instrucoes` | Instruções de acesso (sem slug) |

> O Gestor mantém as mesmas rotas com prefixo `/delivery/...` para backwards-compat durante a migração (Fase 2).

## Canais suportados

- `entrega` — endereço de entrega com cálculo de frete
- `retirada` — retirada no balcão
- `mesa` — pedido na mesa (QR code de mesa)
- `comanda` — comanda (QR code de comanda)

## Como rodar

```bash
# Na pasta apps/jiffy-cardapio
npm install
npm run dev         # → http://localhost:5001
```

Crie `.env.local` a partir de `.env.example` e preencha:
- `NEXT_PUBLIC_EXTERNAL_API_BASE_URL` — URL do backend principal
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — chave da Google Maps API

## Scripts disponíveis

```bash
npm run dev          # Servidor de desenvolvimento na porta 5001
npm run build        # Build de produção
npm run start        # Servidor de produção na porta 5001
npm run type-check   # Verificação TypeScript sem emitir arquivos
npm test             # Executa testes com Vitest
npm run test:watch   # Executa testes em modo watch
```

## Relação com o Gestor (admin)

O admin (design, agenda, cobertura, kanban) **permanece no Gestor**.
A loja e o BFF público **só** existem neste app (`apps/jiffy-cardapio`).

No Gestor:

```env
NEXT_PUBLIC_CARDAPIO_PUBLIC_URL=http://localhost:5001
# produção: https://cardapio.jiffy.run
# alias server opcional: CARDAPIO_PUBLIC_URL=...
```

`/delivery/{slug}` e `/cardapio/{slug}` no Gestor passam a redirecionar (308) para este app; o hub copia `{host}/{slug}`.
Detalhes: [`docs/DEPLOY.md`](docs/DEPLOY.md).
