# Persistência do Design do Delivery Público

Documento de especificação e plano de implementação para migrar as preferências visuais do cardápio digital (hoje só em `localStorage`) para o backend, com leitura pública por slug.

**Status:** planejamento  
**Branches sugeridas:** `feat/design-delivery-persistencia` (backend) · `feat/design-delivery-persistencia-gestor` (frontend)  
**Arquitetura:** seguir `docs/arquitetura-jiffy/` em **backend** e **frontend** (Clean Architecture, DDD, SOLID — dependências para dentro).

### Progresso das fases

| Fase | Escopo | Status |
|------|--------|--------|
| **0** | Inventário + decisões de produto/técnicas (este doc) | **Feita** |
| **1** | Backend: schema/migration + domain validators | Pendente |
| **2** | Backend: ports/repos + use cases + rotas + Swagger | Pendente |
| **3** | Frontend: DTOs/Zod + API infra + use cases | Pendente |
| **4** | Frontend: Design admin (draft/publish via API) | Pendente |
| **5** | Frontend: cardápio público lê design publicado da API | Pendente |
| **6** | Migração localStorage → backend + limpeza | Pendente |
| **7** | Testes + checklist arquitetura-jiffy | Pendente |

---

## 1. Objetivo

Permitir que as escolhas de **layout e design** feitas na página Design do gestor (`/configuracoes/empresa-delivery/design`) **persistam no servidor** e sejam aplicadas a **qualquer dispositivo/browser** que acesse `/delivery/{slug}`.

Hoje:

- Admin salva draft/published só no `localStorage` da máquina do operador.
- Visitante do cardápio público só vê layout/cores/tipografia se o **mesmo browser** tiver a chave publicada por slug.
- Logo/capa reais já vêm da API de mídia; o restante do visual “some” fora daquele browser.

---

## 2. Situação atual (baseline)

### 2.1 Onde fica a UI

| Papel | Caminho |
|-------|---------|
| Rota admin | `/configuracoes/empresa-delivery/design` |
| Screen | `DeliveryDesignCustomizerScreen.tsx` |
| Abas | Cabeçalho · Modelos · Cores · Tipografias · Categorias |
| Público | `DeliveryThemeScope` → `usePublishedDesignBySlug` → CSS vars |

### 2.2 O que é só localStorage

Prefixo: `jiffy:delivery-design`

| Chave | Conteúdo |
|-------|----------|
| `jiffy:delivery-design:empresa:{empresaId}` | `{ published, draft }` — ambos `DeliveryPublicoDesignConfig` |
| `jiffy:delivery-design:slug:{slug}` | Só o **publicado** (lido pelo cardápio público) |

Hook: `useDeliveryDesignDraft` (`updateDraft` / `publish` / `restore`).  
**Não há** Zustand de design nem endpoint de config visual.

### 2.3 Shape atual (`DeliveryPublicoDesignConfig`)

```ts
{
  layoutId: 'basico' | 'vitrine' | 'grade' | 'catalogo'
  cabecalho: {
    nomeExibicao: string        // espelho UX; fonte de verdade = cadastro empresa
    logoUrl: string | null      // espelho; fonte = Image/CDN
    logoFormato: 'circular' | 'quadrada'
    capaUrl: string | null      // espelho; fonte = Image/CDN
  }
  cores: {
    paletaId: ColorPaletteId    // inclui 'personalizada'
    personalizadas?: { primary, primaryDark, surface, text }
  }
  tipografia: { presetId: 'urbana' | 'moderna' | 'classica' | 'elegante' }
  categorias: {
    tituloGrupoFundo: 'cor' | 'imagem'
    corBarraTitulo: string | null
    corTextoTitulo: string | null
    mostrarNomeTitulo: boolean
    mostrarSugestoesDaCasa: boolean
    sugestoesDaCasaImagemUrl: string | null  // legado
  }
}
```

Defaults: `createDefaultDesignConfig` — layout `basico`, paleta `carvao`, tipografia `urbana`, `tituloGrupoFundo: 'imagem'`, etc.

### 2.4 Regras de publicação (front, hoje)

Só pode publicar (gate `designPublishRules`):

- Layout **Básico**
- Paletas publicáveis (ex.: carvão, lavanda, mirtilo, personalizada)
- Tipografia **urbana**

Modelos/paletas/tipografias “premium” existem na UI mas não entram no published.

### 2.5 O que já persiste no backend

| Dado | Onde |
|------|------|
| Logo / banner (arquivos) | `empresa_delivery.logo_image_id` / `banner_image_id` + upload-intent CDN |
| Ordem / ícone / banner de grupo | APIs de grupos-produto |
| Nome fantasia, endereço, etc. | Cadastro empresa |
| Params operacionais / agendamento | `parametros_delivery` |

Catálogo público (`GET .../catalogo/{slug}`) já devolve `empresa.logoUrl` / `bannerUrl`.  
**Não** devolve objeto de design.

### 2.6 Problema de produto

| Cenário | Comportamento atual |
|---------|---------------------|
| Operador publica design no PC A | Visitante no celular vê **defaults** (ou só logo/capa da API) |
| Operador troca de browser | Draft/published “some” |
| Dois operadores na mesma empresa | Designs locais divergentes, sem fonte única |

---

## 3. Decisões de produto (fechadas)

| Tema | Decisão | Motivo |
|------|--------|--------|
| Persistência | **Tabela nova 1:1** `empresa_delivery_design` | Isola visual de slug/mídia/operacional (SRP); draft/publish limpos |
| Escopo persistido | Todo o `DeliveryPublicoDesignConfig` **sem** depender de data-URLs de mídia | URLs de logo/capa continuam resolvidas pela API de Image |
| Draft vs published | Manter os **dois** estados no backend (`draft` + `published` jsonb) | Espelha UX atual (editar sem ir ao ar) |
| Publicação | `POST .../publish` copia draft → published + regras de gate | Igual botão Publicar atual |
| Fonte de `nomeExibicao` | Cadastro empresa (readonly no Design); no payload pode ser omitido ou ignorado no servidor | Evita divergência |
| Logo/capa no JSON | Guardar só `logoFormato`; URLs **não** são fonte de verdade (merge na leitura) | Evita URL stale vs CDN |
| Gate premium | Replicar no **backend** as mesmas regras de publish do front | Segurança: front não é confiável |
| Visitante sem design | Defaults server-side = `createDefaultDesignConfig` | Comportamento previsível |
| Migração localStorage | No 1º load do admin após feature: se API vazia e local tem published/draft, oferecer “importar” ou import automático one-shot | Não perder trabalho já feito |
| `parametros_delivery` | **Não** usar | Domínio de impressão/agendamento — não misturar visual |
| Versionamento do JSON | Campo `schema_version` na tabela (+ `schemaVersion` no blob se útil) | Evolução segura do shape |
| Colunas JSON em `empresa_delivery` | **Rejeitado** | Preferência explícita por tabela dedicada |

---

## 4. Decisão de modelagem (backend) — **fechada**

### 4.1 Tabela 1:1 `empresa_delivery_design` (escolhida)

```text
empresa_delivery_design
  id                      text PK
  empresa_delivery_id     text UNIQUE FK → empresa_delivery (ON DELETE CASCADE)
  draft                   jsonb NOT NULL
  published               jsonb NOT NULL
  schema_version          int  NOT NULL DEFAULT 1
  published_at            timestamptz NULL
  created_at              timestamptz NOT NULL DEFAULT now()
  updated_at              timestamptz NOT NULL DEFAULT now()
```

**Por que tabela dedicada:**

- Separa slug/imagens/operacional do blob visual (SRP).
- Draft/publish limpos com `published_at`.
- Facilita índices/auditoria futura sem inchir `empresa_delivery`.
- Alinha a `arquitetura-jiffy` (entidade de domínio clara).

**Confirmado pelo time:** não usar colunas JSON em `empresa_delivery`; não usar `parametros_delivery`.

Backfill na migration: para cada `empresa_delivery` existente, inserir uma linha com **defaults** idênticos em `draft` e `published` (`published_at` null até o primeiro publish real, ou `now()` se preferirmos tratar default como já “ao ar”).

### 4.2 O que **não** vai no JSON

| Campo | Motivo |
|-------|--------|
| Bytes de imagem / data URL | Já há Image + CDN |
| Ordem dos grupos / ícones | Já em grupos-produto |
| `sugestoesDaCasaImagemUrl` legado | Preferir imagem do grupo real; pode omitir ou aceitar null sempre |

### 4.3 Payload canônico (Zod no backend = contrato)

Persistir e validar algo equivalente a:

```ts
{
  schemaVersion: 1
  layoutId: ...
  cabecalho: { logoFormato }           // sem logoUrl/capaUrl obrigatórios
  cores: { paletaId, personalizadas? }
  tipografia: { presetId }
  categorias: {
    tituloGrupoFundo,
    corBarraTitulo,
    corTextoTitulo,
    mostrarNomeTitulo,
    mostrarSugestoesDaCasa
  }
}
```

Na **leitura** (DTO de saída admin/público), o application layer pode **enriquecer** com:

- `cabecalho.nomeExibicao` ← empresa
- `cabecalho.logoUrl` / `capaUrl` ← CDN das FKs

Isso fica no **mapper**, não no domínio de persistência (conforme `MAPPERS.md`).

---

## 5. Arquitetura — Backend (`arquitetura-jiffy`)

### 5.1 Camadas

```
presentation/
  controllers/EmpresaDeliveryDesignController.ts
  routes (em delivery-routes.ts)
application/
  validators/empresaDeliveryDesignValidators.ts   // input borda
  use-cases/design/
    GetEmpresaDeliveryDesignMeUseCase.ts
    UpdateEmpresaDeliveryDesignDraftUseCase.ts
    PublishEmpresaDeliveryDesignUseCase.ts
  mappers/EmpresaDeliveryDesignMapper.ts          // entity/json → DTO
domain/
  entities/EmpresaDeliveryDesign.ts               // create / fromDatabase
  vos/ ou types do config (enums tipados)
  services/ValidarPublicacaoDesignDelivery.ts     // gate premium
  validators/empresaDeliveryDesignDomainValidators.ts
  contracts/IEmpresaDeliveryDesignRepository.ts
infrastructure/
  EmpresaDeliveryDesignPrismaRepository.ts
```

### 5.2 Regras por camada

| Camada | Responsabilidade |
|--------|------------------|
| Domain | Shape válido; enums; `ValidarPublicacaoDesign` (layout/paleta/tipografia publicáveis); defaults |
| Application | Orquestrar get/update/publish; tx se necessário; mapear DTO |
| Infra | Prisma jsonb; sem regra de publish |
| Presentation | Auth JWT nas rotas `/me`; parse Zod; `next(err)` |
| Público | Rate limit; só **published** (+ enrich mídia) |

### 5.3 Endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/delivery/empresas/me/design` | Gestor JWT | `{ draft, published, publishedAt }` |
| `PUT` | `/delivery/empresas/me/design/draft` | Gestor JWT | Substitui draft (body = config) |
| `POST` | `/delivery/empresas/me/design/publish` | Gestor JWT | Valida gate → copia draft→published |
| — | Catálogo público | Público | Incluir `empresa.design` = **published** enriquecido em `GET /delivery/catalogo/{slug}` |

Opcional (se quiser desacoplar catálogo): `GET /delivery/design/{slug}` só com published.

### 5.4 Swagger

- Reutilizar validators Zod em `docs/swagger` (padrão `DOCUMENTACAO_SWAGGER.md`).
- `security: [{ bearerAuth: [] }]` nas rotas `/me`.
- Documentar que `logoUrl`/`capaUrl` na resposta pública vêm das imagens da empresa.

### 5.5 Migration

1. Criar tabela (ou colunas).
2. Backfill: para cada `empresa_delivery` existente, inserir linha com **defaults** em draft e published.
3. Sem downtime: leitura pública com fallback default se null.

---

## 6. Arquitetura — Frontend (`arquitetura-jiffy` + pastas do gestor)

### 6.1 Camadas

```
application/
  dto/delivery-publico/DeliveryPublicoDesignDTO.ts   // Zod + z.infer
  mappers/ (se precisar normalizar resposta)
  use-cases/delivery-publico/design/
    BuscarDesignDeliveryMeUseCase.ts
    SalvarDraftDesignDeliveryUseCase.ts
    PublicarDesignDeliveryUseCase.ts
  services/delivery/validarPublicacaoDesign.ts       // espelho do gate (UX); BE é fonte da verdade
infrastructure/
  api/deliveryDesignApi.ts                           // GET/PUT/POST + parse Zod
presentation/
  hooks/useDeliveryDesignDraft.ts                    // passa a consumir use cases + React Query
  hooks/usePublishedDesignBySlug.ts                  // lê do catálogo/API, não localStorage
  admin Design*                                      // UI quase igual; dirty = draft ≠ published server
shared/utils/designConfigStorage.ts                  // só migração one-shot / cache opcional
```

### 6.2 Fluxo admin (alvo)

```
abrir Design
  → GET /me/design
  → preenche draft/published em memória
  → (opcional) se API defaults e localStorage antigo rico → importar 1x

editar aba
  → updateDraft local (debounce)
  → PUT /me/design/draft (debounce 400–800ms ou “Salvar rascunho”)

Publicar
  → POST /me/design/publish
  → se 400 (gate) → toast com mensagem do BE
  → atualiza published + invalida query pública

Restaurar
  → draft ← published (PUT draft ou só local até salvar)
```

**Recomendação de UX:** manter autosave do draft (como hoje no localStorage), com debounce para não spammar API.

### 6.3 Fluxo público (alvo)

```
/delivery/{slug}
  → catálogo já carrega empresa (+ design published)
  → DeliveryThemeScope aplica config (sem localStorage)
  → mergeDesignConfigWithEmpresa continua útil se design vier sem URLs
```

Remover dependência de `readPublishedDesignBySlug` no caminho feliz.  
Manter localStorage **apenas** como fallback temporário na fase 6 (feature flag).

### 6.4 O que permanece local (aceito)

| Item | Motivo |
|------|--------|
| Aba ativa do customizer | Preferência de UI da sessão |
| Estado do preview (scroll) | Efêmero |
| Cache React Query | Performance, com `staleTime` curto |

---

## 7. Contrato API (rascunho)

### `GET /delivery/empresas/me/design`

```json
{
  "draft": { "...DeliveryPublicoDesignConfig canônico..." },
  "published": { "..." },
  "publishedAt": "2026-08-03T12:00:00.000Z",
  "schemaVersion": 1
}
```

### `PUT /delivery/empresas/me/design/draft`

Body = config canônico (sem exigir logoUrl/capaUrl).  
Response = draft salvo + echo.

### `POST /delivery/empresas/me/design/publish`

Body vazio (usa draft atual) **ou** body = config a publicar.  
Erros:

- `400` `DESIGN_NAO_PUBLICAVEL` — gate premium
- `404` empresa delivery

### Catálogo público — trecho `empresa`

```json
{
  "empresa": {
    "slug": "...",
    "nomeFantasia": "...",
    "logoUrl": "...",
    "bannerUrl": "...",
    "design": {
      "layoutId": "basico",
      "cabecalho": { "logoFormato": "circular", "nomeExibicao": "...", "logoUrl": "...", "capaUrl": "..." },
      "cores": { "...": "..." },
      "tipografia": { "...": "..." },
      "categorias": { "...": "..." }
    }
  }
}
```

Se `design` ausente → front aplica defaults (compatibilidade).

---

## 8. Migração localStorage → backend

### Estratégia one-shot (fase 6)

1. Admin abre Design com feature ligada.
2. `GET /me/design` retorna defaults (ou `publishedAt == null` e configs iguais ao default).
3. Front lê `jiffy:delivery-design:empresa:{id}`.
4. Se local `published`/`draft` ≠ default:
   - **Opção A (recomendada):** modal “Encontramos um design salvo neste aparelho. Importar para a conta?”
   - **Opção B:** import automático silencioso 1x (flag `migratedAt` em localStorage).
5. `PUT draft` + opcional `POST publish` se o local published for publicável.
6. Marcar chave local `jiffy:delivery-design:migrated:{empresaId}=1`.
7. Após N releases: remover escrita contínua no localStorage; depois remover leitura.

### Cardápio público

Não migrar localStorage do visitante. Só API.

---

## 9. Fases de implementação (detalhe)

### Fase 1 — Backend schema
- Migration tabela/colunas + backfill defaults.
- Prisma models.
- Domain entity + Zod domain validators + `ValidarPublicacaoDesignDelivery`.

### Fase 2 — Backend API
- Port + Prisma repository.
- Use cases Get / UpdateDraft / Publish.
- Controller + rotas + rate limit público no catálogo.
- Incluir `design` no mapper do catálogo público.
- Swagger.

### Fase 3 — Frontend application/infra
- DTO Zod espelhando backend.
- `deliveryDesignApi.ts`.
- Use cases Buscar / SalvarDraft / Publicar.
- Testes unitários do gate e do parse.

### Fase 4 — Frontend admin Design
- Refatorar `useDeliveryDesignDraft` para React Query + use cases.
- Manter UX das 5 abas.
- Tratar erros de publish do BE.
- Loading/empty/error states.

### Fase 5 — Frontend público
- `useDeliveryPublicoTheme` / `usePublishedDesignBySlug` consomem `empresa.design` do catálogo.
- Remover path feliz localStorage.
- Garantir SSR/hydration sem flash errado (já há padrão “após mount”).

### Fase 6 — Migração
- Fluxo import localStorage.
- Feature flag `NEXT_PUBLIC_DESIGN_API=1` se quiser rollout gradual.
- Docs internas de QA.

### Fase 7 — Qualidade
- Testes BE: validators, publish gate, mapper.
- Testes FE: merge config, publish rules, use case save.
- Checklist PR `arquitetura-jiffy` (abaixo).

---

## 10. Checklist `arquitetura-jiffy` (aceite)

### Backend
- [ ] Regra de publish no **domain**, não no controller
- [ ] Validators de borda em `application/validators`; domínio em `domain/validators`
- [ ] Prisma só no repository
- [ ] Use cases com `execute` + DI por construtor
- [ ] Mapper entity/JSON → DTO; não vazar entidade
- [ ] Rotas `/me` com JWT middleware; público só published
- [ ] Swagger alinhado aos Zod schemas
- [ ] Erros de domínio mapeados (`AppValidationError` / `ValidationDomainError`)

### Frontend
- [ ] HTTP em `infrastructure`; hooks não montam `fetch` solto
- [ ] Use cases na `application` para get/save/publish
- [ ] DTO com Zod (`z.infer`), sem cast cego
- [ ] Presentation só orquestra UI + chama use cases/hooks
- [ ] Gate de publish no front é UX; BE rejeita se inválido
- [ ] Sem regra de negócio nova em componentes de aba

---

## 11. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Shape JSON evolui e quebra clientes | `schemaVersion` + merge com defaults no mapper |
| URLs de logo no JSON ficam stale | Não persistir URLs; enriquecer na leitura |
| Publish premium bypass no front | Validar no BE |
| Autosave draft gera race | Debounce + last-write-wins com `updatedAt` opcional |
| Catálogo fica payload maior | Design é pequeno (~1–2 KB); OK no MVP |
| Dois operadores editando draft | Last-write-wins MVP; lock otimista futuro |

---

## 12. Fora do escopo (MVP)

- Versionamento histórico (histórico de publishes)
- Temas por horário (happy hour visual)
- A/B de layout
- Design por canal (iFood vs próprio)
- Colunas tipadas por cor (manter JSON)
- Migrar ordem de grupos para o blob de design (continua em grupos-produto)

---

## 13. Referências de código

### Frontend
- Tipos: `src/presentation/.../shared/types/deliveryPublicoDesignConfig.ts`
- Storage: `.../shared/utils/designConfigStorage.ts`
- Draft hook: `.../shared/hooks/useDeliveryDesignDraft.ts`
- Publish rules: `.../shared/constants/designPublishRules.ts`
- Screen: `.../admin/screens/DeliveryDesignCustomizerScreen.tsx`
- Público: `DeliveryThemeScope` / `usePublishedDesignBySlug`

### Backend
- `EmpresaDelivery` + logo/banner: `prisma/schema/delivery.prisma`
- Catálogo público: use case/mapper de catálogo
- Upload: `CompanyLogoImageTargetBinder` / banner
- **Não** misturar com `ParametrosDelivery`

### Arquitetura
- Backend: `jiffy-backend/docs/arquitetura-jiffy/`
- Frontend: `jiffy-gestor-v2/docs/arquitetura-jiffy/`
- Precedente semelhante: agendamento (`GET/PUT .../me/agendamento` + exposição pública)

---

## 14. Próximo passo sugerido

1. ~~Fechar decisão tabela vs coluna~~ → **tabela `empresa_delivery_design` confirmada.**
2. (Opcional) Fechar detalhes restantes da §3: import automático vs modal; `published_at` no backfill de defaults.
3. Abrir branches e implementar **Fase 1 + 2** no backend (migration + entity + APIs).
4. Em paralelo, frontend **Fase 3** (contratos Zod + infra).
5. Só então ligar a UI (Fases 4–5) e migração (Fase 6).

Quando iniciar a implementação, atualizar o **Status** deste doc para “em implementação” e marcar as fases conforme o progresso.
