# Desenvolvimento — Delivery Público

Documento vivo de planejamento e acompanhamento do novo fluxo público de delivery.

> **Status:** em planejamento  
> **Última atualização:** 2026-03-08 (abas Design documentadas)

---

## 1. Objetivo

Construir do zero o fluxo público de pedidos online (delivery), acessível via link com slug da empresa, sem login do cliente.

**URL pública atual:** `/cardapio/{slug}`

O lojista configura **qual layout visual** o app público usa; o cliente final vê o catálogo nesse layout.

---

## 2. Escopo e premissas

### Incluído neste fluxo

- Tela administrativa **Delivery Próprio** — customizador **Design** (6 abas) + preview mobile
- App público renderizado conforme layout publicado
- Modelos fictícios na primeira entrega (dados mock + renderer do layout **Básico** funcional)

### Fora de escopo (por enquanto)

- Fluxo legado em `cardapio-digital` (mantido apenas como referência)
- Cardápio de mesa / QR Code local
- Layouts premium com lógica real de plano/assinatura (badge **Mais+** apenas visual)
- Publicação real no backend (persistência mock/local na v1)

### Premissas técnicas

- Código da feature em: `src/presentation/components/features/delivery-publico/`
- Rotas públicas em: `app/cardapio/`
- APIs públicas existentes (BFF): `app/api/public/delivery/*`
- DTOs: `src/application/dto/delivery-publico/`
- **Mesmos dados, layouts diferentes:** empresa, grupos, produtos, carrinho, tipo de entrega e horário alimentam todos os modelos

---

## 3. Referências no projeto

| Recurso | Caminho |
|--------|---------|
| Feature nova | `src/presentation/components/features/delivery-publico/` |
| Referência visual/comportamental | `src/presentation/components/features/cardapio-digital/` |
| Config slug / link público (ERP) | `src/presentation/components/features/configuracoes/tabs/CardapioDigitalTab.tsx` |
| Hook catálogo público | `src/presentation/hooks/usePublicDeliveryCatalog.ts` |
| API client público | `src/infrastructure/api/publicDeliveryApi.ts` |
| DTOs catálogo | `src/application/dto/delivery-publico/DeliveryPublicoDTO.ts` |
| Tela placeholder atual | `DeliveryPublicoEmConstrucaoScreen.tsx` |

---

## 4. Modelo visual — Tela **Delivery Próprio** / **Design** (ERP)

> Tela administrativa onde o lojista personaliza o app público. Painel esquerdo = opções por aba; painel direito = **preview mobile em tempo real** (WYSIWYG).

### 4.1 Visão geral da tela

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DELIVERY PRÓPRIO                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ ← Voltar                    [ Restaurar design ]  [ Publicar ]          │
├──────────────────────────────┬────────────────────────────────────────┤
│ Design                       │  ┌──────────────────┐                   │
│ [Cabeçalho|Modelos|Cores|…]  │  │  Preview mobile  │                   │
│                              │  │  (reflete aba +    │                   │
│  (conteúdo da aba ativa)     │  │   rascunho)        │                   │
│                              │  └──────────────────┘                   │
└──────────────────────────────┴────────────────────────────────────────┘
```

**Abas do customizador (ordem no mockup):**

| # | Aba | ID sugerido | Imagem ref. |
|---|-----|-------------|-------------|
| 1 | Cabeçalho | `cabecalho` | 02 |
| 2 | Modelos | `modelos` | 03 |
| 3 | Cores | `cores` | 04 |
| 4 | Tipografias | `tipografias` | 05 |
| 5 | Categorias | `categorias` | 06 |
| 6 | Elementos em destaque | `elementos-destaque` | 07 |

> As opções de **todas as abas** aplicam-se a **qualquer modelo** escolhido (Básico, Vitrine, etc.). O modelo define a **estrutura**; as abas definem **identidade visual e conteúdo de topo**.

### 4.2 Áreas da tela (admin)

| Área | Elementos | Comportamento |
|------|-----------|---------------|
| **Header** | Título "DELIVERY PRÓPRIO" | Contexto da feature no ERP |
| **Ações** | Voltar, Restaurar design, Publicar | Voltar sai sem salvar (confirmar se dirty); Restaurar recarrega último publicado; Publicar grava rascunho |
| **Painel esquerdo** | Abas + formulário da aba ativa | Alterações refletem no preview sem publicar |
| **Painel direito — Preview** | Moldura de celular + app renderizado | Usa rascunho (`draft`) + catálogo mock/real |

---

### 4.3 Aba **Cabeçalho** (Imagem 02)

Identidade visual da loja no topo do app.

| Opção | Tipo | Detalhes | Efeito no preview / app |
|-------|------|----------|-------------------------|
| **Nome do negócio** | Texto | Label "Nome do seu negócio"; contador de caracteres (ex.: `5/20`); máx. **20 caracteres** | Título exibido no header mobile ("ANDRE") |
| **Logo** | Upload imagem | Drag-and-drop ou "Selecionar arquivo"; máx. **2 MB**; formatos **PNG, JPG, JPEG, GIF** | Avatar/logo no canto do header |
| **Forma do logo** | Radio | **Circular** (padrão) \| **Quadrada** | `border-radius` do logo |
| **Capa** | Upload imagem | Mesmas regras do logo (2 MB; PNG/JPG/JPEG/GIF) | Banner/capa atrás do header *(posição depende do modelo)* |

**v1:** nome editável + preview com placeholder de logo/capa; upload real pode usar fluxo de mídia delivery existente na v2.

---

### 4.4 Aba **Modelos** (Imagem 03)

Escolha da **estrutura de layout** do catálogo (independente das cores/fontes).

| ID | Nome | Badge | Descrição | Status v1 |
|----|------|-------|-----------|-----------|
| `basico` | Básico | — | Design simples e funcional | **Implementar completo** |
| `vitrine` | Vitrine | Mais+ | Fotos grandes | Stub |
| `grade` | Grade | Mais+ | Estrutura em blocos | Stub |
| `catalogo` | Catálogo | Mais+ | Navegação fluida | Stub |

- Card selecionado: borda laranja + thumbnail wireframe simplificado.
- Um modelo ativo por vez; troca atualiza preview instantaneamente.

---

### 4.5 Aba **Cores** (Imagem 04)

Paleta de cores do tema (**Cores sugeridas**). Cada card exibe **4 swatches** (grade 2×2) que mapeiam para tokens CSS do app.

| ID paleta | Nome | Badge Mais+ | Status v1 |
|-----------|------|-------------|-----------|
| `lavanda` | Lavanda | — | **Padrão / gratuito** (`alternate` `#8338EC` + `secondary` `#530CA3`) |
| `pessego` | Pêssego | Mais+ | Stub ou bloqueado |
| `canela` | Canela | Mais+ | Stub ou bloqueado |
| `cereja` | Cereja | Mais+ | Stub ou bloqueado |
| `gergelim` | Gergelim | Mais+ | Stub ou bloqueado |
| `mirtilo` | Mirtilo | Mais+ | Stub ou bloqueado |
| `hortela` | Hortelã | Mais+ | Stub ou bloqueado |
| `chocolate` | Chocolate | Mais+ | Stub ou bloqueado |
| `mostarda` | Mostarda | Mais+ | Stub ou bloqueado |
| `carvao` | Carvão | Mais+ | Stub ou bloqueado |

**Tokens sugeridos por paleta (4 cores):**

| Token | Uso típico no app (observado no preview) |
|-------|------------------------------------------|
| `primary` | Botão footer "O meu pedido", ícones de categorias, destaques |
| `primaryDark` | Botão toggle "Delivery" ativo, textos de ênfase |
| `surface` | Fundos de cards / áreas claras |
| `text` | Texto principal e elementos escuros |

> Badge **Disponível** (verde) parece cor de **status**, não da paleta — tratar separado em `status.disponivel`.

---

### 4.6 Aba **Tipografias** (Imagem 05)

Par de fontes para **títulos** e **parágrafos**. Cada card mostra preview: título "Água mineral" + parágrafo "Garrafa de 500 ml".

| ID | Nome | Badge Mais+ | Estilo (mockup) | Status v1 |
|----|------|-------------|-----------------|-----------|
| `urbana` | Urbana | — | Sans-serif moderna | **Padrão / gratuito** |
| `moderna` | Moderna | Mais+ | Sans-serif alternativa | Stub |
| `classica` | Clássica | Mais+ | Serif tradicional | Stub |
| `elegante` | Elegante | Mais+ | Serif decorativa | Stub |

**Seção adicional (fora do escopo v1):**

| Opção | Descrição | Status |
|-------|-----------|--------|
| ~~**Fontes personalizadas**~~ | Upload/seleção de fontes custom | ❌ não implementar por hora |

**Implementação:** aplicar `--font-title` e `--font-body` no container do app público; carregar via Google Fonts ou assets locais na v1.

---

### 4.7 Aba **Categorias** (Imagem 06)

Personalização da **barra horizontal de categorias** (grupos de produtos) no app.

| Opção | Tipo | Detalhes |
|-------|------|----------|
| **Mostrar** | Toggle | Liga/desliga exibição da navegação por categorias no app |
| **Lista de categorias** | Lista selecionável | Itens vindos do catálogo/grupos: Bebidas, Cafeteria, Pratos Principais, Sobremesas, Lanches… |
| **Ícone por categoria** | Picker | Ao selecionar categoria na lista, escolhe ícone à direita |
| **Buscar ícone** | Input | Placeholder "Buscar ícone…" |
| **Estilo do ícone** | Toggle segmentado | **Linha** (outline) \| **Preenchimento** (filled) — aplica a todos os ícones |
| **Biblioteca de ícones** | Grid agrupado | Grupos: **Básicos**, **Bebidas**, **Principais** (+ outros conforme catálogo de ícones) |

**Dados:** ícone escolhido persiste por `grupoProdutoId` (override visual; nome do grupo continua vindo do ERP).

**Referência no projeto:** reutilizar padrão de `IconPickerModal` / `DinamicIcon` de grupos de produtos onde fizer sentido.

---

### 4.8 Aba **Elementos em destaque** (Imagem 07)

Hero / destaque visual acima ou integrado ao catálogo.

| Opção | Tipo | Detalhes |
|-------|------|----------|
| **Cor de fundo** | Seleção | **Cor principal** (usa cor primária da paleta) \| **Cor personalizada** (color picker) |
| **Carrossel de imagens** | Toggle | Liga/desliga carrossel; badge **Mais** (premium) |
| **Imagens para computadores** | Upload ×3 | Tamanho recomendado **1920 × 900 px**; máx. **2 MB**; PNG/JPG/JPEG/GIF; drag-and-drop |
| **Imagens para celular** | Upload | Checkbox **"Carregar outras imagens para celular"**; tamanho recomendado **820 × 1000 px**; mesmas regras de arquivo |

**Comportamento esperado:**

- Desktop/tablet: exibe slides desktop; mobile: slides mobile (ou mesmos se checkbox desmarcado).
- Carrossel desligado: fundo usa apenas **cor de fundo** selecionada.
- v1: carrossel premium pode ficar desabilitado; cor de fundo + 1 imagem mock.

---

### 4.9 Matriz: o que cada aba altera no preview

| Aba | Elementos do preview afetados |
|-----|------------------------------|
| Cabeçalho | Nome loja, logo, capa/banner |
| Modelos | Disposição lista/grid/catálogo de produtos |
| Cores | Botões, footer, ícones categorias, fundos, textos |
| Tipografias | Títulos de produtos/grupos e textos secundários |
| Categorias | Visibilidade da barra; ícones e estilo linha/preenchimento |
| Elementos em destaque | Hero/carrossel/fundo atrás do header |

---

### 4.10 Objeto de configuração unificado (rascunho)

Proposta para persistir rascunho e versão publicada:

```typescript
type DeliveryPublicoDesignConfig = {
  layoutId: 'basico' | 'vitrine' | 'grade' | 'catalogo'

  cabecalho: {
    nomeExibicao: string          // max 20
    logoUrl: string | null
    logoFormato: 'circular' | 'quadrada'
    capaUrl: string | null
  }

  cores: {
    paletaId: 'lavanda' | 'pessego' | 'canela' | 'cereja' | 'gergelim' | 'mirtilo'
      | 'hortela' | 'chocolate' | 'mostarda' | 'carvao'
    // v2: cores custom se paleta permitir
  }

  tipografia: {
    presetId: 'urbana' | 'moderna' | 'classica' | 'elegante'
    // v2: fontesPersonalizadas
  }

  categorias: {
    mostrar: boolean
    estiloIcone: 'linha' | 'preenchimento'
    iconesPorGrupoId: Record<string, string>   // grupoProdutoId → iconName
  }

  elementosDestaque: {
    corFundoModo: 'principal' | 'personalizada'
    corFundoPersonalizada?: string            // hex
    carrosselAtivo: boolean
    imagensDesktop: string[]                  // urls, até 3
    imagensMobile: string[]                   // urls; vazio = reutiliza desktop
    usarImagensMobileDistintas: boolean
  }
}
```

**Publicação:** botão **Publicar** grava `publishedConfig`; **Restaurar design** descarta rascunho e recarrega `publishedConfig`.

---

### 4.11 Preview mobile — Layout **Básico** (referência comum a todas as abas)

Todos os modelos compartilham a **mesma fonte de dados** (`DeliveryPublicoViewModel`) **e o mesmo `DeliveryPublicoDesignConfig`**. Só muda o componente de layout.

Blocos identificados no mockup (de cima para baixo):

| # | Bloco | Conteúdo | Dados |
|---|-------|----------|-------|
| 1 | **Header loja** | Nome da empresa, link "Ver mais", ícone perfil | `empresa.nomeFantasia` |
| 2 | **Tipo de entrega** | Toggle `Delivery` \| `Para retirar` | Estado local `tipoEntrega` |
| 3 | **Status / horário** | Badge "Disponível" + faixa de horário | Mock `00:00 às 23:59` (backend futuro) |
| 4 | **Busca** | Input "Pesquisar por produtos" | Filtro client-side no catálogo |
| 5 | **Navegação de grupos** | Chips horizontais com ícone + nome | `gruposProdutos[]` |
| 6 | **Lista de produtos** | Seções por grupo; card linha (nome, preço, thumb) | `gruposProdutos[].produtos[]` |
| 7 | **Footer fixo** | Botão "O meu pedido" + total | Carrinho mock (`total`, `qtdItens`) |

**Interações no preview (v1):** apenas visual — toggles e busca podem funcionar no preview para demonstrar o layout; sem checkout real.

### 4.12 Telas mapeadas

| # | Tela | Rota (proposta) | Público | Status |
|---|------|-----------------|---------|--------|
| 1 | Customizador Design (6 abas) | `/configuracoes/empresa-delivery/design` | Lojista (ERP) | 🚧 em implementação |
| 2 | App público — layout Básico | `/cardapio/{slug}` | Cliente final | 📋 planejado |
| 3 | Em construção (temporário) | `/cardapio/{slug}` | Cliente final | ✅ placeholder atual |

### 4.13 Fluxo do lojista (admin)

```
Configurações → Empresa Delivery (slug já configurado)
       │
       ▼
[Personalizar layout / Design]  →  Tela Delivery Próprio
       │
       ├─ Navega abas: Cabeçalho, Modelos, Cores, Tipografias, Categorias, Elementos em destaque
       │     └─ Preview atualiza instantaneamente (rascunho)
       │
       ├─ Seleciona modelo (Básico / Vitrine / …)
       │
       ├─ Restaurar design → reverte rascunho para último publicado
       │
       └─ Publicar → persiste `DeliveryPublicoDesignConfig` (mock local → API futura)
              └─ Link /cardapio/{slug} passa a usar design publicado
```

### 4.14 Fluxo do cliente (público)

```
Acessa /cardapio/{slug}
       │
       ▼
Carrega design publicado da empresa (layout + tema + cabeçalho + categorias…)
       │
       ▼
Busca catálogo (API pública existente)
       │
       ▼
Renderiza Home no layout escolhido
       │
       └─ (fases futuras) produto, carrinho, checkout…
```

### 4.15 Imagens / anexos

| # | Descrição | Aba / uso |
|---|-----------|-----------|
| 01 | Customizador ERP — visão geral com preview Básico | Referência geral da tela |
| 02 | Aba **Cabeçalho** — nome, logo, capa | § 4.3 |
| 03 | Aba **Modelos** — Básico, Vitrine, Grade, Catálogo | § 4.4 |
| 04 | Aba **Cores** — paletas sugeridas (Lavanda default = cores Jiffy) | § 4.5 |
| 05 | Aba **Tipografias** — Urbana, Moderna, Clássica, Elegante | § 4.6 |
| 06 | Aba **Categorias** — toggle, ícones, linha/preenchimento | § 4.7 |
| 07 | Aba **Elementos em destaque** — cor de fundo, carrossel, uploads | § 4.8 |

---

## 5. Arquitetura proposta

### 5.1 Princípio: dados compartilhados + layouts plugáveis

```
                    ┌─────────────────────────┐
                    │ DeliveryPublicoViewModel │
                    │ (empresa, grupos,        │
                    │  produtos, carrinho,     │
                    │  tipoEntrega, horario)   │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ DeliveryPublicoDesignConfig │
                    │ (layout, cabeçalho, cores,  │
                    │  tipografia, categorias,    │
                    │  elementos destaque)        │
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   BasicoLayout          VitrineLayout          GradeLayout …
   (implementado)        (stub)                 (stub)
          │                     │                     │
          └─────────────────────┴─────────────────────┘
                                │
                    Usado em: Preview (admin) e App (público)
```

### 5.2 Estrutura de pastas (feature)

```
src/presentation/components/features/delivery-publico/
├── admin/                          # ERP — customizador Design
│   ├── screens/
│   │   └── DeliveryDesignCustomizerScreen.tsx
│   └── components/
│       ├── DesignTabNav.tsx                    # Cabeçalho | Modelos | Cores | …
│       ├── tabs/
│       │   ├── DesignCabecalhoTab.tsx
│       │   ├── DesignModelosTab.tsx
│       │   ├── DesignCoresTab.tsx
│       │   ├── DesignTipografiasTab.tsx
│       │   ├── DesignCategoriasTab.tsx
│       │   └── DesignElementosDestaqueTab.tsx
│       ├── LayoutModelCard.tsx
│       ├── PalettePresetCard.tsx
│       ├── TypographyPresetCard.tsx
│       ├── CategoryIconPicker.tsx
│       └── DeliveryMobilePreviewFrame.tsx   # moldura do celular
│
├── public/                         # App do cliente final
│   ├── screens/
│   │   └── DeliveryPublicoHomeScreen.tsx    # substitui placeholder
│   ├── theme/
│   │   ├── applyDesignConfig.ts             # paleta + fontes → CSS vars
│   │   └── palettePresets.ts
│   └── layouts/
│       ├── types.ts
│       ├── DeliveryPublicoLayoutRegistry.tsx
│       ├── basico/
│       │   └── BasicoLayoutHome.tsx
│       ├── vitrine/
│       │   └── VitrineLayoutHome.tsx          # stub v1
│       ├── grade/
│       │   └── GradeLayoutHome.tsx            # stub v1
│       └── catalogo/
│           └── CatalogoLayoutHome.tsx         # stub v1
│
├── shared/                         # Admin + público
│   ├── types/
│   │   ├── deliveryLayoutId.ts
│   │   ├── deliveryPublicoDesignConfig.ts   # ver § 4.10
│   │   └── deliveryPublicoViewModel.ts
│   ├── constants/
│   │   ├── layoutModels.ts         # metadados dos 4 modelos
│   │   ├── colorPalettes.ts        # 10 paletas sugeridas
│   │   └── typographyPresets.ts    # 4 presets + futuro custom
│   ├── mocks/
│   │   └── previewCatalogMock.ts   # dados fictícios da imagem
│   └── components/                 # blocos reutilizáveis entre layouts
│       ├── DeliveryTipoEntregaToggle.tsx
│       ├── DeliveryGrupoChips.tsx
│       ├── DeliveryProdutoListItem.tsx
│       └── DeliveryPedidoFooter.tsx
│
└── DeliveryPublicoEmConstrucaoScreen.tsx   # remover após Fase 2
```

### 5.3 Tipos centrais (proposta)

```typescript
// deliveryLayoutId.ts
type DeliveryLayoutId = 'basico' | 'vitrine' | 'grade' | 'catalogo'

// layoutModels.ts — metadados para cards do admin
type LayoutModelDefinition = {
  id: DeliveryLayoutId
  nome: string
  descricao: string
  premium: boolean          // exibe badge "Mais+"
  disponivel: boolean       // v1: só basico=true
}

// deliveryPublicoViewModel.ts — payload comum a todos os layouts
type DeliveryPublicoViewModel = {
  empresa: EmpresaPublicaDTO
  grupos: CatalogoPublicoGrupoProdutoDTO[]
  tipoEntrega: 'entrega' | 'retirada'
  disponivel: boolean
  horarioTexto: string      // ex: "00:00 às 23:59"
  termoBusca: string
  carrinho: { total: number; quantidadeItens: number }
}

// deliveryPublicoDesignConfig.ts — ver § 4.10 (completo)
type DeliveryPublicoDesignConfig = { /* layoutId, cabecalho, cores, tipografia, categorias, elementosDestaque */ }
```

### 5.4 Registry de layouts

```typescript
// DeliveryPublicoLayoutRegistry.tsx
const LAYOUT_REGISTRY: Record<DeliveryLayoutId, ComponentType<LayoutHomeProps>> = {
  basico: BasicoLayoutHome,
  vitrine: VitrineLayoutHome,
  grade: GradeLayoutHome,
  catalogo: CatalogoLayoutHome,
}

function renderDeliveryLayout(id: DeliveryLayoutId, props: LayoutHomeProps) {
  return LAYOUT_REGISTRY[id](props)
}
```

### 5.5 Estado do layout (publicação)

| Camada | v1 (fictício) | v2 (produção) |
|--------|---------------|---------------|
| Rascunho | `useState` na tela admin | idem + dirty tracking |
| Publicado | `localStorage` por `empresaId` (`designConfig`) | Campo JSON em `EmpresaDelivery` / API PATCH |
| Público lê | Default (basico + lavanda + urbana) + override localStorage em dev | GET empresa delivery ou endpoint dedicado |

**Campo sugerido no backend (futuro):** `parametroDelivery.designConfig: DeliveryPublicoDesignConfig` (ou campos normalizados)

### 5.6 Rotas

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/cardapio/{slug}` | `DeliveryPublicoHomeScreen` | App público (layout dinâmico) |
| `/configuracoes/empresa-delivery/design` | `DeliveryDesignCustomizerScreen` | Customizador Design (6 abas) |
| `/cardapio/{slug}/catalogo` | redirect → home | Legado |
| `/cardapio/{slug}/carrinho` | redirect → home | Legado |

### 5.7 Integrações backend

| Endpoint BFF | Backend | Uso |
|--------------|---------|-----|
| `GET /api/public/delivery/catalogo/{slug}` | `GET /api/v1/delivery/catalogo/:slug` | Catálogo público |
| `GET /api/delivery/empresas/me` | `GET /api/v1/delivery/empresas/me` | Slug + params admin |
| `PATCH /api/delivery/empresas/me` | `PATCH …` | Publicar `designConfig` *(futuro)* |

**Preview v1:** usar `previewCatalogMock.ts` (dados da imagem: ANDRE, Bebidas, Suco, Água Mineral, R$80 carrinho).

**Preview v2 / App público:** `usePublicDeliveryCatalog` + mapper para `DeliveryPublicoViewModel`.

---

## 6. Fases de implementação

### Fase 0 — Setup ✅

- [x] Pasta `delivery-publico` criada
- [x] Página placeholder “em construção”
- [x] Rota `/cardapio/{slug}` apontando para o novo fluxo
- [x] Rotas legadas redirecionando para home do slug

### Fase 1 — Planejamento ✅ (parcial)

- [x] Analisar imagem 01 — customizador + preview Básico
- [x] Documentar abas Design (02–07): Cabeçalho, Modelos, Cores, Tipografias, Categorias, Elementos em destaque
- [x] Definir arquitetura dados compartilhados + layouts plugáveis + `DeliveryPublicoDesignConfig`
- [x] Listar modelos fictícios e escopo v1
- [ ] Revisar demais imagens do fluxo (checkout, carrinho, produto, etc.)

### Fase 2 — Fundação compartilhada ✅

- [x] Criar `deliveryLayoutId`, `layoutModels`, `colorPalettes`, `typographyPresets`, `previewCatalogMock`
- [x] Criar `DeliveryPublicoDesignConfig` + hook `useDeliveryDesignDraft`
- [x] Criar `applyDesignConfig` (paleta/fontes → CSS variables)
- [x] Criar `DeliveryPublicoViewModel` + mapper a partir do DTO ou mock
- [x] Criar componentes shared (toggle entrega, chips grupos, item produto, footer pedido)
- [x] Persistência por slug no `publish()` (`jiffy:delivery-design:slug:{slug}`)
- [x] Refatorar `DeliveryMobilePreviewFrame` para usar registry (WYSIWYG)

### Fase 3 — Layout Básico (público + preview) ✅

- [x] Implementar `BasicoLayoutHome` fiel ao mockup
- [x] Implementar `DeliveryPublicoLayoutRegistry`
- [x] Substituir placeholder por `DeliveryPublicoHomeScreen` em `/cardapio/{slug}`
- [x] Stubs visuais para Vitrine, Grade, Catálogo (card "em breve" no preview)

### Fase 4 — Tela admin Delivery Próprio (Design) ✅

- [x] `DeliveryDesignCustomizerScreen` (split view + 6 abas)
- [x] Tabs: Cabeçalho, Modelos, Cores, Tipografias, Categorias, Elementos em destaque
- [x] Preview ao vivo consumindo `draft` + registry de layouts
- [x] Botões Restaurar / Publicar (persistência local v1 + slug)
- [x] Entrada a partir de `CardapioDigitalTab` ("Design")
- [x] Rota ERP dedicada `/configuracoes/empresa-delivery/design`

### Fase 5 — Integração real (em andamento)

- [x] App público consome catálogo real (`usePublicDeliveryCatalogInfinite` + mapper)
- [x] Mesclar `designConfig` com dados da empresa da API (nome/logo/capa)
- [x] Carrinho real no footer (`cardapioCarrinhoStore`)
- [ ] Persistir `designConfig` via API empresa delivery
- [ ] Implementar layouts premium (Vitrine, Grade, Catálogo)
- [x] Modal de produto + adicionar ao carrinho (reutiliza `ProdutoConfiguracaoModalPublico`)
- [x] Rota `/cardapio/{slug}/carrinho` com checkout (`CarrinhoPublicoScreen`)
- [ ] Migrar visual do carrinho/checkout para tema delivery-publico

---

## 7. Checklist de componentes — Layout Básico

Componentes a extrair do mockup (reutilizáveis em outros layouts):

- [x] `DeliveryLojaHeader` — nome, "Ver mais", avatar
- [x] `DeliveryTipoEntregaToggle` — Delivery | Para retirar
- [x] `DeliveryStatusHorario` — badge Disponível + texto horário
- [x] `DeliveryBuscaProdutos` — input com ícone lupa
- [x] `DeliveryGrupoChips` — scroll horizontal categorias
- [x] `DeliverySecaoGrupo` — título do grupo + lista
- [x] `DeliveryProdutoListItem` — linha nome/preço/thumbnail
- [x] `DeliveryPedidoFooter` — barra fixa "O meu pedido" + total

---

## 8. Decisões registradas

| Data | Decisão | Motivo |
|------|---------|--------|
| 2026-03-08 | Novo fluxo em `delivery-publico`; `cardapio-digital` só como referência | Recomeço limpo |
| 2026-03-08 | Manter URL `/cardapio/{slug}` | Links já compartilhados |
| 2026-03-08 | Mesmos dados para todos os layouts; diferença só na apresentação | Requisito do produto |
| 2026-03-08 | v1 com modelos fictícios; só **Básico** funcional | Backend de layout ainda não existe |
| 2026-03-08 | Preview admin e app público usam o mesmo registry + mesmo `DesignConfig` | WYSIWYG real, sem duplicar UI |
| 2026-03-08 | Customizador com 6 abas Design; v1 gratuito: Básico + Lavanda + Urbana | Lavanda usa secondary/alternate do tema |
| 2026-03-08 | Persistência v1 em `localStorage`; API na v2 | Desbloquear UI antes do backend |

---

## 9. Pendências / dúvidas

- [ ] Rota exata do customizador no ERP: sub-rota de configurações ou menu próprio "Delivery Próprio"?
- [ ] Paletas **Mais+**, tipografias premium, carrossel — bloqueados na v1 ou apenas badge visual?
- [ ] Catálogo completo de ícones por grupo (Básicos, Bebidas, Principais…) — lista fechada ou extensível?
- [ ] Horário "Disponível" vem de onde? (empresa, parametroDelivery, mock)
- [ ] "Ver mais" abre qual tela? (sobre a loja — imagem futura?)
- [ ] Ícone perfil no header — login cliente ou decorativo na v1?

---

## 10. Log de alterações

| Data | Alteração |
|------|-----------|
| 2026-03-08 | Criação do documento e setup inicial da feature |
| 2026-03-08 | Imagem 01: customizador de layout + arquitetura plugável + fases 2–5 |
| 2026-03-08 | Imagens 02–07: documentadas as 6 abas Design + `DeliveryPublicoDesignConfig` |
| 2026-03-08 | Implementadas abas Design no ERP (`/configuracoes/empresa-delivery/design`); fontes personalizadas fora do escopo |
