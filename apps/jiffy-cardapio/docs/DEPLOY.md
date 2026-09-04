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
CARDAPIO_PUBLIC_URL=https://cardapio.jiffy.run
```

Com isso, `/delivery/{slug}` e `/cardapio/{slug}` no Gestor fazem **308** para o Cardápio.

## 3. Variáveis do Cardápio

Ver [`.env.example`](../.env.example):

- `NEXT_PUBLIC_EXTERNAL_API_BASE_URL` — API Wilcker (pedidos públicos)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Places / mapa no checkout
- `PORT=5001` (container)

CORS: a API pública deve aceitar o origin do Cardápio (sem cookie de gestor).

## 4. Docker

Na pasta `apps/jiffy-cardapio`:

```bash
docker build -t jiffy-cardapio .
docker run --rm -p 5001:5001 \
  -e NEXT_PUBLIC_EXTERNAL_API_BASE_URL=https://api.exemplo \
  -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=... \
  jiffy-cardapio
```

`next.config.js` usa `output: 'standalone'`.

## 5. Checklist antes do cutover

- [ ] `npm run build` e `npm test` em `apps/jiffy-cardapio`
- [ ] Pedido teste entrega + retirada no host novo
- [ ] `CARDAPIO_PUBLIC_URL` no Gestor apontando para o host
- [ ] Link antigo `/delivery/{slug}` redireciona
- [ ] Design/admin continua no Gestor

## 6. Fora deste doc

- Criar o DNS no provedor (ação humana)
- Certificado OV / domínio custom da loja (`{slug}.jiffy.run`) — evolução futura
