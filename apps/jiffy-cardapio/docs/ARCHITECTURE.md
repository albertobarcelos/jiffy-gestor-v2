# Arquitetura — Jiffy Cardápio

## Posição no monorepo

O Cardápio vive em `apps/jiffy-cardapio/` dentro do repositório Git principal do Gestor (`JIFFY-GESTOR-OFICIAL`). São dois apps Next.js independentes no mesmo repo — não um monorepo Turborepo/Nx formal.

```
JIFFY-GESTOR-OFICIAL/          ← raiz do Git
├── app/                       ← Gestor ERP (Next.js, porta 3000)
├── src/                       ← código compartilhado (DTOs, utils, hooks)
├── apps/
│   ├── jiffy-flow/            ← app Tauri (desktop)
│   └── jiffy-cardapio/        ← Cardápio público (Next.js, porta 5001)  ← você está aqui
├── package.json               ← Gestor
└── ...
```

## Responsabilidades

| Componente | Responsabilidade |
|------------|-----------------|
| **jiffy-cardapio** | Storefront público: catálogo, carrinho, checkout, geolocalização |
| **jiffy-gestor (ERP)** | Painel admin: pedidos, delivery design, kanban, fiscal |
| **Backend Node.js** | Orquestrador: API REST/MQTT, persistência, regras de negócio |
| **Go Agent** | Impressão local (Edge Print Gateway) |

## Tipos de entrega

O checkout usa apenas `tipoEntrega`: `'entrega' | 'retirada'`.

| Tipo | Path | Status |
|------|------|--------|
| entrega / retirada | `/{slug}` (+ carrinho) | Ativo |

## Fluxo de dados (storefront)

```
Browser → app/[slug]/page.tsx
        → DeliveryPublicoHomeScreen
        → usePublicDeliveryCatalog
        → /api/public/delivery/catalogo/[slug]   (BFF proxy)
        → Backend: GET /api/v1/delivery/catalogo/:slug

Checkout:
        → useDeliveryCheckout
        → /api/public/delivery/cotacao (frete)
        → /api/public/delivery/pedidos (criação)
        → /api/public/delivery/clientes (identificação)

Geolocalização:
        → /api/geolocalizacao/places/autocomplete
        → /api/geolocalizacao/places/details
        → /api/geolocalizacao/forward
        → /api/geolocalizacao/reverso
```

## BFF (Backend for Frontend)

Todas as chamadas ao backend passam por rotas `app/api/...` deste app. O cliente nunca chama o backend diretamente. Isso:

1. Esconde a URL e credenciais do backend do browser
2. Permite rate-limit e validação de entrada
3. Facilita migração de URL sem mudar o frontend
4. Encaminha o IP do celular (`X-Forwarded-For`) para o backend — o 10/min de cotação/pedido é por cliente, não por egress da Vercel

## Cache multi-empresa (por slug)

Há ~200 lojas. Nenhum cache é global.

| Superfície | Chave | TTL |
|------------|--------|-----|
| HTML/RSC `/{slug}` e `/{slug}/carrinho` | path (ISR on-demand, `generateStaticParams = []`) | 30s |
| Prefetch RSC do catálogo | URL + tag `catalogo-publico:{slug}` | 30s |
| BFF `GET /api/public/delivery/catalogo/{slug}` | URL | `s-maxage=30, swr=60` |
| React Query no browser | `['public-delivery', slug, ...]` | 5 min stale |

POST cotação/pedido/cliente: `no-store`.

Publicar design/cardápio no Gestor pode levar até 30s para aparecer no celular. Aberto/fechado idem.

## Imagens (mobile first)

`next/image` recorta capa, logo e cards. Só a **capa** leva `priority` (LCP no 4G). Logo e produtos entram lazy para não competir com a capa. Hosts conhecidos (S3, CloudFront, R2) passam pelo otimizador; CDN próprio da loja cai no original (`unoptimized`).

## Estado local

| Store | Propósito |
|-------|-----------|
| `deliveryCarrinhoStore` | Itens do carrinho (Zustand + localStorage) |
| `deliveryPreferenciaEntregaStore` | Preferência entrega/retirada (Zustand) |
| `usePublicDeliveryComplementosStore` | Cache de complementos (Zustand + sessionStorage) |

## Design/Tema

O design do cardápio é configurado pelo gestor via painel admin e publicado em CSS custom properties:

```css
--delivery-primary, --delivery-secondary, --delivery-bg,
--delivery-font-heading, --delivery-font-body, etc.
```

Aplicados por `applyDesignPreviewTheme.ts` e `delivery-publico-theme.css`.

## Deploy separado (roadmap Fase 2)

- Deploy em domínio próprio: `cardapio.jiffy.app` (Vercel/Railway)
- O Gestor ERP ficará em `gestor.jiffy.app`
- As rotas `/delivery/...` do Gestor serão removidas após a migração
- Os módulos compartilhados em `src/` serão extraídos para um pacote interno se necessário
