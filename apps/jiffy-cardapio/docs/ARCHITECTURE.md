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

## Canais de pedido

```
CanalPedidoCardapio = 'entrega' | 'retirada' | 'mesa' | 'comanda'
```

Definido em `src/shared/types/canalPedidoCardapio.ts`.

| Canal | Path | Status |
|-------|------|--------|
| entrega / retirada | `/{slug}` | Ativo (checkout) |
| mesa | `/{slug}/mesa/{mesaId}` | Rota + sessão reservadas; create no backend TBD |
| tablet | `/{slug}/mesa/{mesaId}?tablet=1` | Mesmo canal `mesa`, flag kiosk |
| comanda | `/{slug}/comanda/{codigo}` | Rota + sessão reservadas |

Store: `canalCardapioStore` (Zustand persist).

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
