# Anotações — recriar persistência do Design do App Delivery

**Objetivo deste arquivo:** servir de referência prática para **recriar** o fluxo de persistência das preferências visuais do delivery (layout, cores, tipografias, cabeçalho/mídia, categorias, publish), **sem** trazer a branch antiga inteira para cima da `developer` / `dev`.

**Estratégia acordada**

| Repo | Base nova | Branch de referência (só consulta / adaptação) |
|------|-----------|--------------------------------------------------|
| `jiffy-gestor-v2` | `developer` | `feat/agendar-pedido-gestor` (e docs deste arquivo) |
| `jiffy-backend` | `dev` | `feat/design-delivery-persistencia` |

Não fazer merge/cherry-pick cego das branches de referência: a `dev` do backend divergiu bastante (catálogo, cobertura, WhatsApp, funcionamento, etc.). Recriar o **núcleo de Design** em cima da arquitetura atual.

**Docs irmãos (só na branch de referência `feat/agendar-pedido-gestor` — não existem nesta base `developer`):**

- `docs/DESIGN-DELIVERY-PUBLICO-PERSISTENCIA.md` — spec + fases (já feito na linha antiga)
- `docs/DESIGN-DELIVERY-PREFERENCIAS-PENDENTES.md` — lacunas de produto; **desatualizado** quanto ao gate (hoje tipografias/paletas/layouts já estão liberados no código de referência)

---

## 1. Problema que a persistência resolve

Na `developer` (gestor) hoje:

- A UI de Design **já existe** (`/configuracoes/empresa-delivery/design`, abas Cabeçalho / Modelos / Cores / Tipografias / Categorias).
- Draft/publish ficam só no **`localStorage`** (`jiffy:delivery-design:empresa:{id}` e `:slug:{slug}` via `designConfigStorage` + `useDeliveryDesignDraft`).
- Visitante em outro browser/dispositivo **não** vê layout/cores/tipografia escolhidos.
- Logo/capa (quando já existem fluxos de mídia) e demais dados de empresa podem vir da API; o **tema visual** some fora daquela máquina.

Meta: gravar no backend (`draft` + `published`) e o cardápio público consumir só o **published** enriquecido.

---

## 2. Estado atual (o que falta onde)

### 2.1 Gestor — `developer` vs referência

| Peça | `developer` | `feat/agendar-pedido-gestor` |
|------|-------------|------------------------------|
| Página + tabs Design + preview | Sim (local) | Sim |
| `useDeliveryDesignDraft` | **localStorage** | **API** (GET me + PUT draft debounce + POST publish) |
| BFF `app/api/delivery/empresas/me/design*` | Não | Sim |
| `deliveryDesignApi` + use-cases + DTO Zod | Não | Sim |
| `useDeliveryDesignMe` (React Query) | Não | Sim |
| `usePublishedDesignBySlug` lendo API/catálogo | Não (storage por slug) | Sim |
| Gate UX + validators de publish | Parcial (constants) | Completo + espelho BE |
| Migração one-shot local → API | Não | Sim (flag `NEXT_PUBLIC_DESIGN_MIGRATE_LOCAL`) |

### 2.2 Backend — `dev` vs referência

| Peça | `origin/dev` | `feat/design-delivery-persistencia` |
|------|--------------|-------------------------------------|
| Tabela/model `empresa_delivery_design` | Não | Sim |
| Entidade / validators / gate / defaults | Não | Sim |
| Rotas `GET/PUT/POST .../empresas/me/design*` | Não | Sim |
| `nomeExibicao` em `EmpresaDelivery` | Conferir na `dev` atual ao recriar | Sim na feature |
| Catálogo público expõe `empresa.design` (published) | Não (módulo Design ausente) | Sim |
| Clear logo/banner também limpa espelho no JSON | Depende da base `dev` | Sim na feature |

**Atenção:** entre `feat/design-delivery-persistencia` e a `dev` atual há divergência estrutural no módulo delivery (cobertura geo, WhatsApp, funcionamento, catálogo). Portar só o pacote Design, **adaptando** ports/repos/mídia/catálogo ao que existir na `dev`.

---

## 3. Contrato de dados (fonte da verdade do tema)

Tabela dedicada **1:1** com `empresa_delivery`:

- `draft` (jsonb)
- `published` (jsonb)
- `schema_version` (int, default 1)
- `published_at` (timestamptz nullable)
- FK `empresa_delivery_id` unique + cascade

Shape canônico (`schemaVersion: 1`) — manter **igual** entre BE validators e FE Zod:

```
schemaVersion: 1
layoutId: 'basico' | 'vitrine' | 'grade' | 'catalogo'
cabecalho: {
  logoFormato: 'circular' | 'quadrada'     // único campo de cabeçalho “dentro” do draft/publish
  nomeExibicao?: string                     // espelho opcional
  logoUrl?: string | null                   // espelho opcional (nunca blob:/data:)
  capaUrl?: string | null                   // espelho opcional
}
cores: {
  paletaId: pessego|canela|cereja|gergelim|mirtilo|lavanda|hortela|chocolate|mostarda|carvao|personalizada
  personalizadas?: { primary, primaryDark, surface, text }  // hex #RRGGBB; obrigatório se personalizada
}
tipografia: { presetId: 'urbana' | 'moderna' | 'classica' | 'elegante' }
categorias: {
  tituloGrupoFundo: 'cor' | 'imagem'
  corBarraTitulo: string | null
  corTextoTitulo: string | null
  mostrarNomeTitulo: boolean
  mostrarSugestoesDaCasa: boolean
  sugestoesDaCasaImagemUrl?: string | null  // legado; preferir imagem do grupo real
}
```

**Defaults alinhados FE/BE** (espelhar nos dois lados):

- `layoutId: basico`
- `cabecalho.logoFormato: circular`
- `cores.paletaId: carvao`
- `tipografia.presetId: urbana`
- `categorias`: fundo imagem, cores null, mostrar nome e sugestões = true

### Fora do JSON (persistência paralela — não misturar no publish do tema)

| Dado | Onde | Como |
|------|------|------|
| Nome de vitrine | `empresa_delivery.nome_exibicao` | `PATCH /empresas/me` (blur no Cabeçalho); fallback = fantasia; max 20 |
| Logo / capa | FKs + CDN (`logo_image_id` / `banner_image_id`) | upload-intent + DELETE logo/banner; clear também zera espelho no design |
| Ordem / banner / ícone de grupo | APIs de grupos-produto | aba Categorias |
| Peça Também / relacionados | mapa de relacionados | aba própria; grava na hora |

Enrichment: nas respostas admin e no catálogo público, **nome + URLs CDN reais** sobrescrevem/espelham o JSON (prioridade FK/CDN > published > draft no público).

---

## 4. API a recriar

Prefixo típico: `/api/v1/delivery/...` (gestor BFF espelha sob `/api/delivery/...`).

| Método | Path | Auth | Comportamento |
|--------|------|------|----------------|
| `GET` | `/empresas/me/design` | JWT gestor | Retorna `{ draft, published, publishedAt, schemaVersion }`; lazy-cria com defaults se não existir; enriquece mídia/nome |
| `PUT` | `/empresas/me/design/draft` | JWT gestor | Substitui draft completo (shape estrito); promove URLs HTTP de mídia do draft→published quando fizer sentido |
| `POST` | `/empresas/me/design/publish` | JWT gestor | Gate de publicação → copia draft→published + `publishedAt`; 400 `DESIGN_NAO_PUBLICAVEL` se falhar |
| `GET` | `/catalogo/:slug` (público) | Sem auth | Inclui `empresa.design` = **somente published** enriquecido (nunca draft) |

Rotas correlatas a garantir/alinhar na base nova: logo/banner upload + clear; `PATCH /empresas/me` com `nomeExibicao`.

---

## 5. Gate de publicação

Backend é a **fonte da verdade** (`ValidarPublicacaoDesignDelivery`); front só antecipa UX (`designPublishRules` + flags `publicavel` em layout/paleta/tipografia).

**Estado final na referência (já liberado tudo):**

- Layouts: basico, vitrine, grade, catalogo
- Paletas: todas as do enum + personalizada
- Tipografias: urbana, moderna, classica, elegante

Ao recriar: pode começar mais restrito (só `basico`/`carvao`/`urbana`) e liberar depois — mas **manter as três camadas sincronizadas** (constants UI, validator app FE, domain BE). O doc de pendências antigo ainda fala em bloqueio; **ignorar** esse trecho se o código de referência já liberou.

---

## 6. Checklist — Backend (`dev`)

Ordem sugerida:

1. **Prisma**
   - Model `EmpresaDeliveryDesign` + migration (criar tabela + backfill defaults para empresas existentes).
   - Campo `nomeExibicao` em `EmpresaDelivery` se ainda não existir na `dev`.
2. **Domain**
   - Entidade `EmpresaDeliveryDesign` (`create` / `withDraft` / `publish` / promote/clear mídia).
   - Validators Zod do shape.
   - `createDefaultEmpresaDeliveryDesignConfig`.
   - `ValidarPublicacaoDesignDelivery`.
   - Utils: `resolveNomeExibicaoDelivery`, `resolvePublicMidiaUrl`.
   - Port `IEmpresaDeliveryDesignRepository`.
3. **Application**
   - Mapper `toMeDTO` / `toPublishedPublicDTO`.
   - `ResolveDesignEnrichmentMeService` (adaptar às ports de mídia/empresa da `dev`).
   - Use cases: GetMe, UpdateDraft, Publish.
   - Clear logo/banner: além de desvincular FK, limpar espelho no design.
4. **Infra + presentation**
   - Repository Prisma.
   - Controller + rotas autenticadas.
   - Swagger/schemas.
5. **Catálogo público**
   - Incluir `empresa.design` published enriquecido no GET por slug (adaptar ao use case/mapper atuais da `dev`).
6. **Testes**
   - Entidade + gate + mapper + utils (mínimo).
   - Ideal: smoke HTTP das 3 rotas.

Arquivos de referência (copiar/adaptar, não mergear módulo inteiro):

```
jiffy-backend (feat/design-delivery-persistencia)
  src/modules/delivery/domain/entities/EmpresaDeliveryDesign.ts
  src/modules/delivery/domain/services/ValidarPublicacaoDesignDelivery.ts
  src/modules/delivery/domain/utils/createDefaultEmpresaDeliveryDesignConfig.ts
  src/modules/delivery/domain/utils/resolveNomeExibicaoDelivery.ts
  src/modules/delivery/domain/utils/resolvePublicMidiaUrl.ts
  src/modules/delivery/domain/validators/empresaDeliveryDesignValidators.ts
  src/modules/delivery/domain/contracts/IEmpresaDeliveryDesignRepository.ts
  src/modules/delivery/application/mappers/EmpresaDeliveryDesignMapper.ts
  src/modules/delivery/application/services/ResolveDesignEnrichmentMeService.ts
  src/modules/delivery/application/use-cases/design/*
  src/modules/delivery/application/use-cases/empresa-delivery/ClearEmpresaDelivery{Logo,Banner}MeUseCase.ts
  src/modules/delivery/infra/EmpresaDeliveryDesignPrismaRepository.ts
  src/modules/delivery/presentation/controllers/EmpresaDeliveryDesignController.ts
  prisma/migrations/20260803140000_cria_empresa_delivery_design/
```

---

## 7. Checklist — Gestor (`developer`)

A UI já está; o trabalho é **trocar localStorage por API** e consumir design no público.

1. **Contrato FE**
   - DTO Zod `DeliveryPublicoDesignDTO` (+ defaults).
   - `validarDraftDesign` / `validarPublicacaoDesign`.
   - Mapper `apiDesignConfigToUi` / `uiDesignConfigToApi` (filtrar `blob:`/`data:`).
2. **Infra + application**
   - `deliveryDesignApi.ts`.
   - Use cases Buscar / SalvarDraft / Publicar.
3. **BFF Next**
   - `GET .../me/design`
   - `PUT .../me/design/draft`
   - `POST .../me/design/publish`
4. **Hooks**
   - `useDeliveryDesignMe` (+ mutations).
   - Reescrever `useDeliveryDesignDraft`: hidratar 1x da API, autosave draft ~700ms, publish = await draft + POST publish, restore = published → draft.
5. **Admin**
   - Manter tabs; garantir Cabeçalho (nome via PATCH empresa; logo/capa via mídia; só `logoFormato` no JSON).
   - Preview continua reativo ao draft local.
6. **Público**
   - Catálogo/BFF público devolve `empresa.design`.
   - `usePublishedDesignBySlug` + `mergeDesignConfigWithEmpresa` + `DeliveryThemeScope` / CSS vars.
   - Registry de layouts por `layoutId`.
7. **Migração (opcional mas útil)**
   - One-shot localStorage → PUT draft (+ offer publish) se API ainda default e local tiver dados.
   - Feature flag; depois remover storage do caminho feliz.
8. **Testes**
   - Zod/defaults/mapper/gate; smoke do draft hook se fizer sentido.

Arquivos de referência no gestor (`feat/agendar-pedido-gestor`):

```
app/(erp)/configuracoes/empresa-delivery/design/page.tsx
app/api/delivery/empresas/me/design/route.ts
app/api/delivery/empresas/me/design/draft/route.ts
app/api/delivery/empresas/me/design/publish/route.ts
src/application/dto/delivery-publico/DeliveryPublicoDesignDTO.ts
src/application/use-cases/delivery-publico/design/*
src/application/services/delivery/validarDraftDesign.ts
src/application/services/delivery/validarPublicacaoDesign.ts
src/infrastructure/api/deliveryDesignApi.ts
src/presentation/hooks/useDeliveryDesignMe.ts
.../shared/hooks/useDeliveryDesignDraft.ts
.../shared/hooks/usePublishedDesignBySlug.ts
.../shared/utils/mapDeliveryDesignConfig.ts
.../shared/utils/mergeDesignConfigWithEmpresa.ts
.../shared/constants/{defaultDesignConfig,designPublishRules,layoutModels,colorPalettes,typographyPresets}.ts
.../shared/components/DeliveryThemeScope.tsx
```

---

## 8. Fluxo operacional (para validar depois de recriar)

```
Abrir Design
  → GET /me/design → hidrata draft + published

Editar (modelo/cor/tipografia/categorias/logoFormato)
  → state local imediato (preview)
  → debounce PUT /design/draft

Nome / logo / capa
  → gravam na hora (PATCH empresa / upload CDN) — independentes do botão Publicar

Publicar
  → gate UX → salva draft → POST /design/publish → gate BE
  → cardápio público passa a receber published

Restaurar
  → draft = published → PUT draft

Visitante /delivery/{slug}
  → catálogo com empresa.design (published) → theme scope → layout registry
```

---

## 9. Riscos e decisões ao recriar

1. **Não mergear** `feat/design-delivery-persistencia` / `feat/agendar-pedido-gestor` na base nova — só usar como blueprint.
2. **Adaptar** enrichment/mídia/catálogo à arquitetura atual da `dev` (ports e models mudaram).
3. **Paridade de shape** FE Zod ↔ BE Zod ↔ defaults — schema-on-read: JSON inválido quebra leitura.
4. **Gate triplicado** (UI constants + FE app + BE domain) — fácil divergir; alinhar testes/checklist.
5. **Autosave last-write-wins** — sem ETag/lock; aceitável no MVP.
6. **UX:** Publicar ≠ mídia/nome/grupos (já gravam na hora); documentar no produto.
7. **Payload do catálogo** engorda ~1–2 KB com `empresa.design` — ok no MVP.
8. Levar **este arquivo** (e, se útil, os dois docs irmãos) para a branch nova de trabalho assim que partir da `developer`, para não depender da branch antiga.

---

## 10. Definição de pronto (MVP de persistência)

- [ ] Migration aplicada; empresas antigas ganham row com defaults.
- [ ] Gestor: editar → draft no banco; publicar → published; outro browser vê o tema.
- [ ] Cardápio público: layout/cores/tipografia/categorias do published; sem vazar draft.
- [ ] Logo/capa/nome de vitrine corretos no admin e no público (enrichment).
- [ ] Clear de logo/capa remove arquivo/FK e espelho JSON.
- [ ] Gate BE rejeita config inválida; FE desabilita publish coerente.
- [ ] localStorage fora do caminho feliz (migração opcional feita ou documentada como follow-up).

---

## 11. Fora deste escopo (não confundir)

- Reimplementar do zero as **telas** de Design na `developer` (já existem).
- Refazer catálogo delivery / cobertura / WhatsApp / agendamento só para “carregar” a branch antiga.
- Features vizinhas da branch de referência (ex.: limite de pedidos por horário no agendamento) — só trazer se o produto pedir na mesma entrega.

---

*Gerado como anotações de recriação a partir da análise de `feat/agendar-pedido-gestor` (gestor) + `feat/design-delivery-persistencia` (backend). Não substitui a implementação — é o mapa do que falta na `developer`/`dev`.*
