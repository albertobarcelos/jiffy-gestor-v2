# Preferências de Design — o que ainda falta para persistência / publicação



Documento de **lacunas** da página Design da Empresa Delivery (`/configuracoes/empresa-delivery/design`), em relação ao que já está no banco e ao que o visitante do cardápio público realmente recebe.



**Complementa:** [`DESIGN-DELIVERY-PUBLICO-PERSISTENCIA.md`](./DESIGN-DELIVERY-PUBLICO-PERSISTENCIA.md) (fluxo draft/publish já implementado).  

**Backend de referência:** tabela `empresa_delivery_design` + mídia / `nome_exibicao` em `empresa_delivery` / grupos de produto.  

**Abas atuais:** Cabeçalho · Modelos · Cores · Tipografias · Categorias · Relacionados.



---



## 1. O que já está persistido (não precisa reimplementar)



| Origem | Persistência | Abas / recursos |

|--------|--------------|-----------------|

| JSON `draft` / `published` em `EmpresaDeliveryDesign` | `GET/PUT/POST` `/api/v1/delivery/empresas/me/design` (+ draft / publish) | Modelos (`layoutId`), Cores (`paletaId` + `personalizadas`), Tipografias (`presetId`), Cabeçalho (`logoFormato`), Categorias (fundo da barra, cores, toggles de nome / Sugestões da Casa) |

| FKs de imagem na empresa delivery | Upload CDN → `logo_image_id` / `banner_image_id`; remoção via `DELETE .../logo` e `DELETE .../banner` | Logo e capa (Cabeçalho) |

| Nome de vitrine do delivery | Coluna `empresa_delivery.nome_exibicao` via `PATCH /empresas/me` (`nomeExibicao`); fallback = `empresa.nome_fantasia` | Nome do negócio (Cabeçalho) — **não** altera o nome fantasia do ERP |

| Cardápio / grupos | APIs de grupos-produto | Ordem (`reordena-grupo`), banner do grupo, ícone (`iconName`) — aba Categorias |

| Peça Também | `grupo_produto_relacionado_map` + GET/PUT `.../grupos-produtos/:id/relacionados` | Aba Relacionados (salva na hora, fora do publish do tema) |



O visitante público lê o **published** enriquecido (nome de vitrine + logo/capa via CDN) no catálogo / design publicado por slug.  

Respostas de `/me/design` também vêm enriquecidas (nome + URLs CDN).



### Cabeçalho — fechado



| Item | Status |

|------|--------|

| `logoFormato` no draft/publish | Feito |

| Logo/capa (FK + CDN) | Feito |

| Clear real de logo/capa | Feito |

| Nome de exibição do delivery (`nome_exibicao` + fallback fantasia) | Feito |

| Enrichment admin `/me/design` | Feito |



---



## 2. O que ainda falta (backlog)



### 2.1 Publicação de preferências já graváveis no draft



Hoje o draft aceita e persiste valores que o **gate de publish** do gestor ainda bloqueia (`designPublishRules` + flags `publicavel` nos constants). Ou seja: estão no banco como draft, mas **não vão para o cardápio público** até liberar o publish.



| Preferência | Aba | Situação no banco | Falta |

|-------------|-----|-------------------|--------|

| Layouts **Vitrine**, **Grade**, **Catálogo** | Modelos | Persistíveis no draft; **publicáveis** (FE + BE); homes com paridade mínima | Refino visual das homes (próxima iteração); smoke no `/delivery/{slug}` |

| Paletas **Pêssego, Canela, Cereja, Gergelim, Hortelã, Chocolate, Mostarda** | Cores | Persistíveis no draft | Marcar `publicavel: true` (produto) e validar contraste/tema no público |

| Tipografias **Moderna, Clássica, Elegante** | Tipografias | Persistíveis no draft | Liberar publish + fontes carregadas no cardápio público |

| Paleta **Personalizada** | Cores | JSON `cores.personalizadas` já no schema | Confirmar que publish + CSS vars no público cobrem os 4 tokens em todos os layouts |



**Já publicáveis hoje (referência):** layouts Básico, Vitrine, Grade e Catálogo (afetam só a home; carrinho/pagamento compartilhados); paletas Carvão, Lavanda, Mirtilo (+ personalizada); tipografia Urbana.



### 2.2 Preferências / UX ainda incompletas (não são “novo campo” no JSON)



| Item | Aba | Falta |

|------|-----|--------|

| `sugestoesDaCasaImagemUrl` no JSON de design | Categorias | Legado; fonte de verdade deve permanecer a imagem do grupo real “Sugestões da Casa” (CDN). Remover do fluxo de publish / migrar dados antigos se ainda existirem |

| Relacionados no botão Salvar/Publicar do Design | Relacionados | Não entra no JSON de tema; já tem API própria. Falta apenas UX clara (ex.: aviso “salva na hora”) se produto quiser unificar percepção |



### 2.3 O que **não** falta no banco (evitar retrabalho)



- Nova coluna/tabela só para “preferências de design” além de `empresa_delivery_design` + `nome_exibicao` — **desnecessário** para o shape atual.

- Persistir Relacionados dentro do JSON `draft`/`published` — **não recomendado**; já há mapa com `ordem`.

- Reimplementar logo/capa no JSON como fonte de verdade — FKs + CDN já são o canônico.

- Usar `empresa.nome_fantasia` como nome editável do cardápio — **evitado de propósito**; nome de vitrine é `empresa_delivery.nome_exibicao`.



---



## 3. Checklist sugerido de implementação



Use este checklist quando for liberar o restante das preferências no público:



- [ ] **Modelos:** `publicavel: true` em Vitrine / Grade / Catálogo (ou liberação gradual) + smoke no `/delivery/{slug}`

- [ ] **Cores:** liberar paletas restantes + regressão de tokens CSS no tema público

- [ ] **Tipografias:** liberar Moderna / Clássica / Elegante + garantir `@font-face` / variáveis no cardápio

- [ ] **Personalizada:** teste publish com os 4 hex e leitura no slug

- [ ] **Gates:** sincronizar regras front (`canPublishDesign`) com validação de publish no backend (se existir)

- [ ] **Legado:** limpar ou ignorar `sugestoesDaCasaImagemUrl` no merge de draft

- [ ] **Docs:** atualizar `DESIGN-DELIVERY-PUBLICO-PERSISTENCIA.md` § regras de publicação quando os flags mudarem



---



## 4. Resumo



| Camada | Status |

|--------|--------|

| Persistência draft/publish do tema no banco | **Feita** |

| Mídia (logo/capa) e dados de grupo | **Feita** (inclui clear) |

| Nome de vitrine do delivery (`nome_exibicao`) | **Feita** |

| Relacionados (Peça Também) | **Feita** (API/tabela próprias) |

| Liberar no **published** os layouts, paletas e tipografias ainda só de preview | **Pendente (produto + flags + QA público)** |



Em uma frase: a aba **Cabeçalho** está fechada; o que falta no restante do Design é **publicar** (e validar no app público) layouts/paletas/tipografias que hoje ficam só no draft/preview.


