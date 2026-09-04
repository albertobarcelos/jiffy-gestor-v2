# Deploy — Jiffy Cardápio

Preparação de deploy/DNS do `apps/jiffy-cardapio`. **Não** é outro repositório Git.

## 1. Host alvo

| Ambiente | URL sugerida |
|----------|----------------|
| Dev local | `http://localhost:5001` |
| Homolog | `https://cardapio.homolog.jiffy.run` |
| Produção | `https://cardapio.jiffy.run` |

Cliente acessa `https://cardapio.jiffy.run/{slug}` (logo da loja; não “Jiffy” no título).

## 2. DNS

1. Criar CNAME (ou A) `cardapio` → host do provedor (Railway / Vercel / etc.).
2. TLS no provedor.
3. No Gestor (produção/homolog), setar:

```env
NEXT_PUBLIC_CARDAPIO_PUBLIC_URL=https://cardapio.jiffy.run
# opcional (alias server): CARDAPIO_PUBLIC_URL=https://cardapio.jiffy.run
```

Com isso, `/delivery/{slug}` e `/cardapio/{slug}` no Gestor fazem **308** para o Cardápio, e o hub copia `https://cardapio.jiffy.run/{slug}`.

## 3. Variáveis do Cardápio

Ver [`.env.example`](../.env.example):

- `NEXT_PUBLIC_EXTERNAL_API_BASE_URL` — API Wilcker (pedidos públicos)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — mapa/pin no checkout
- `GOOGLE_MAPS_API_KEY` — BFF (`/api/geolocalizacao/*`); precisa de Places API (New)
- `PORT=5001` (container)

CORS: a API Wilcker deve aceitar o origin do Cardápio. O BFF `/api/public/delivery/*` do Cardápio expõe `Access-Control-Allow-Origin: *` para o Design do Gestor (outro host) ler logo/capa via catálogo.

## 4. Docker

Na pasta `apps/jiffy-cardapio`:

```bash
docker build -t jiffy-cardapio .
docker run --rm -p 5001:5001 \
  -e NEXT_PUBLIC_EXTERNAL_API_BASE_URL=https://api.exemplo \
  -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=... \
  -e GOOGLE_MAPS_API_KEY=... \
  jiffy-cardapio
```

`next.config.js` usa `output: 'standalone'`.

## 5. Smoke (sem browser)

Com Cardápio no ar:

```bash
# na raiz do monorepo
CARDAPIO_PUBLIC_URL=http://localhost:5001 SLUG=minha-loja npm run cardapio:smoke

# opcional: valida 308 do Gestor
GESTOR_URL=http://localhost:5000 CARDAPIO_PUBLIC_URL=http://localhost:5001 SLUG=minha-loja npm run cardapio:smoke
```

## 6. Checklist antes do cutover

- [ ] `npm run build` e `npm test` em `apps/jiffy-cardapio`
- [ ] `npm run cardapio:smoke` com slug real
- [ ] Pedido teste entrega + retirada no host novo
- [ ] `NEXT_PUBLIC_CARDAPIO_PUBLIC_URL` no Gestor apontando para o host
- [ ] Link antigo `/delivery/{slug}` redireciona
- [ ] Design no Gestor hidrata logo/capa (via BFF do Cardápio)

## 7. Fora deste doc

- Criar o DNS no provedor (ação humana)
- Domínio custom da loja (`{slug}.jiffy.run`) — evolução futura
