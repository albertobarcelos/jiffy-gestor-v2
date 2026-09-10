# Cobertura de entrega — espelho Delivery Legal / Delivery VIP

Documento de implementação da aba **Configurações → Delivery → Cobertura** do Gestor.

URL canônica: `/gestao/{loja}/config/delivery/cobertura` (hub: `/config/delivery`).

Objetivo: o operador deve configurar cobertura **como no Delivery Legal** — mapa em tela cheia, painel flutuante, km, hover que acende a faixa/área, e ferramentas de desenho/edição (polígono, círculo, arraste, recorte, apagar).

Referência inspecionada em 2026-09-05, loja **WEB BARRA DO BUGRES**, sessão autenticada em:

- [Áreas de Entrega](https://app.deliverylegal.com.br/panel/company_15a805a8-bc43-4156-a6d2-1cfe73fd2da7/settings/delivery_areas)

Este documento **não autoriza** copiar marca, CSS, Leaflet/OSM nem o bundle JS do parceiro. Espelhamos **layout, interação e lógica**. O mapa do Gestor permanece **Google Maps** (já usado em Empresa e cobertura). Tokens visuais Jiffy (`primary`, `secondary`, `alternate`).

Protocolo: uma fase por vez. Validação humana entre fases. Não alterar Cardápio nesta iniciativa.

---

## 1. O que o parceiro faz (fonte da verdade)

### 1.1 Um modelo de taxa por vez

Modal **Taxas de entrega** grava `company[delivery_system]`:

| Valor | UI | Lógica |
|-------|----|--------|
| `radius` | Taxa por Raio | Desenha **onde** atende. O sistema **gera sozinho** faixas *Até 1 km, 2 km…* até o alcance. Operador só preenche a taxa. |
| `area` | Taxa por Área | Preço por polígono/bairro, **independente** da distância da loja. |
| `negotiable` | Taxa a combinar | Cobertura no mapa; valor combinado com o cliente. |

Nesta loja o ativo era **Taxa por Raio**. Resumo do card: **5 áreas criadas** + **4 km alcance**.

### 1.2 Dois recursos, papéis distintos

**Áreas (polígonos)** — `GET …/settings/delivery_areas.json`:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "…",
      "geometry": { "type": "Polygon", "coordinates": [[[lng, lat], …]] },
      "properties": { "name": "Centro", "paused": false, "price": "7.0" }
    }
  ]
}
```

No modo raio, o polígono define **cobertura** (pode entregar ali). A cotação usa as faixas em km.

**Taxas por km** — formulário `PATCH …/settings/delivery_prices` com um UUID por faixa:

- UI: *Até 1 Km* … *Até N Km* + campo de taxa (ex.: `4,00`).
- Hover: `mouseenter → highlightCircle` com `data-panel--delivery-area-radius-param={n}`.
- Conversão interna: **`n * 1000` metros**. `circleBandHighlight(metros)` acende a **faixa** daquele km (não o planeta).

**Alcance (N km)** no card: `Math.ceil` da distância máxima do pin da loja até o desenho (polígonos + círculos persistidos), em km.

### 1.3 Mapa e ferramentas (leaflet-geoman)

Toolbar vertical à direita:

| Ícone | Ação | Interação |
|-------|------|-----------|
| Satélite / mapa | Troca tiles | Clique |
| + / − | Zoom | Clique |
| Polígono | Nova área | Cliques nos vértices; **Finalizar** / **Remover último vértice** / **Cancelar** |
| Círculo | Nova área circular | Clique no centro, move o mouse (linha tracejada do raio), clique para finalizar |
| Arrastar | Mover forma | Arrasta polígono/círculo inteiro |
| Recortar | Cortar / furo | Tesoura (geoman cut) |
| Apagar | Excluir forma | Seleciona e remove |

Pin da loja é **arrastável** no próprio mapa de áreas, com popup *“Você está aqui? Ajuste a localização”*. Arrastar só cria rascunho: os raios continuam no ponto gravado até o operador clicar **Salvar localização** no card.

Hover na lista de km: linha `hover:bg-gray-100` **e** destaque da faixa no mapa. Hover no resumo de áreas: `highlightAllPolygons` + `highlightAllCircles`.

Painel esquerdo **flutua sobre o mapa** (não empilha mapa + lista em colunas iguais):

- Aba **Minhas Áreas** — tiles Cobertura Área e Cobertura Raio.
- Aba **Taxas e Entrega** — lista Alcance / Taxa + **Salvar**.

### 1.4 O que não vamos clonar

- Leaflet + OpenStreetMap (Gestor = Google Maps).
- Cor roxa / tipografia / sidebar do Delivery Legal.
- Endpoints e cookies do parceiro.
- Bundle `leaflet-geoman` se der para reproduzir as mesmas ações na API do Google Maps (preferência). Só considerar Geoman/Leaflet se uma fase falhar na fidelidade do desenho.

---

## 2. Estado atual do Gestor

Arquivos centrais:

| Peça | Onde |
|------|------|
| URL | `/config/delivery` (hub) · `/config/delivery/cobertura` |
| Aba | `src/presentation/components/features/configuracoes/tabs/CoberturaDeliveryTab.tsx` |
| Mapa | `src/presentation/components/features/configuracoes/CoberturaDeliveryMap.tsx` |
| DTO | `src/application/dto/delivery/CoberturaEntregaDTO.ts` |
| Cotação preview | `src/shared/utils/calcularTaxaCoberturaPonto.ts` |
| BFF raios | `app/api/delivery/empresas/me/raios-entrega/` |
| BFF áreas | `app/api/delivery/empresas/me/areas-entrega/` |

Contrato backend (não mudar na fase de UI):

- Raio: `distanciaMaximaEmMetros` (inteiro), `valorTaxa`, `tempoEntregaInMinutes`, `ativo`, `nome`.
- Área: GeoJSON `Polygon` ou `MultiPolygon`, `valorTaxa`, `tempoEntregaInMinutes`, `ativo`, `nome`.
- Origem dos círculos: `endereco.enderecoLocalizacao` da empresa (aba Empresa).

Cotação atual (`PreferenciaCoberturaEntregaPolicy`): **área que contém o ponto ganha**; senão o **menor raio** que cobre. Os dois existem **ao mesmo tempo** — este é o modelo do Gestor (não haverá `delivery_system`).

Gaps em relação ao espelho:

| Parceiro | Gestor hoje |
|----------|-------------|
| Distância em **km** | Modal **metros** (`1000` m) |
| Lista *Até N km* + taxa | Um modal por raio (nome, m, tempo, taxa) |
| Hover lista ↔ mapa | Círculos `clickable: false`; destaque só na edição da forma |
| Painel flutuante no mapa | Grid mapa + coluna direita |
| Toolbar polígono / círculo / arraste / recorte / apagar | Só “Desenhar área” (cliques) + editar vértices; **sem** círculo no mapa, recorte, arraste da forma, apagar no mapa |
| Pin ajustável na cobertura | Pin fixo; ajuste só na aba Empresa |
| Um `delivery_system` | Área e raio misturados na cotação |
| Faixas geradas pelo desenho | Operador cria cada raio na mão |
| Círculo de 2 cliques | Inexistente |
| Holes / cut | Tipo Polygon aceita anéis, mas `geoJsonToLatLngRings` **descarta furos** na renderização |

---

## 3. Mapeamento parceiro → Jiffy

| Conceito Delivery Legal | Jiffy | Conversão |
|-------------------------|-------|-----------|
| Pin da loja | `enderecoLocalizacao` GeoJSON Point | Arrastar no mapa é rascunho; **Salvar localização** faz PATCH empresa. Os raios recentram depois do save. |
| Feature Polygon | `POST/PATCH …/areas-entrega` `{ area, valorTaxa, … }` | GeoJSON `[lng, lat]` |
| Círculo desenhado (geoman) | Área: poligonizar o círculo (~64 vértices) **ou** raio se o centro for o pin | API de área não tem `Circle`; não inventar tipo |
| *Até N km* + preço | `raios-entrega` com `distanciaMaximaEmMetros = N * 1000` | UI só fala km; BFF/API só metros |
| `paused` | `ativo: false` | |
| `price` na feature | `valorTaxa` da área | Usado no modo **Taxa por Área** |
| `delivery_prices[id][price]` | `valorTaxa` do raio cujo metros = faixa | Upsert por distância, não obrigar UUID do parceiro |
| `delivery_system=radius` | Só raios cotam; polígonos = **máscara de cobertura** (ponto tem de cair numa área **ou** política a confirmar no backend) | Hoje área já cota sozinha — ver fase 5 |
| `delivery_system=area` | Só áreas cotam; raios ocultos/inativos | |
| `negotiable` | Sem campo na API Jiffy | Fase posterior; não improvisar no Cardápio |

Regra de ouro: **a API continua em metros**. Qualquer input “1,5 km” vira `1500` m (inteiro). Exibir `1,5 km` ou só inteiros (parceiro usa inteiro). **Padrão de produto: km inteiros**, igual à lista *Até 1 Km*.

---

## 4. Espelho visual (o que mudar deve parecer com eles)

Prioridade de fidelidade, nesta ordem:

1. **Mapa é o fundo** da tela de cobertura (full bleed na área útil da aba).
2. **Card flutuante à esquerda** sobre o mapa (abas + conteúdo). Sem rodapé de modelo de taxa — o Gestor não tem essa opção.
3. Abas **Minhas Áreas** | **Taxas e Entrega** (underline do `primary` Jiffy).
4. Minhas Áreas: dois tiles — *Cobertura Área* e *Cobertura Raio*.
5. Definir/Atualizar alcance: spinner no botão e overlay no card até o refetch das faixas.
6. Taxas: colunas *Alcance* | *Taxa* | *Prazo* (minutos) + interruptor; botão **Salvar**.
7. Hover da linha: fundo cinza claro **e** highlight no mapa.
8. **Toolbar vertical à direita** do mapa (zoom, polígono, círculo, mover, recortar, apagar, satélite).
9. Pin vermelho em gota (estilo Google) + balão *Você está aqui?*. Pin só existe na cobertura. A aba Empresa não tem mais mapa de pinagem. Arrastar o pin **não** grava sozinho: aparece **Salvar localização** no card; só então os raios recentram. O pin só pode ser ajustado até **1 km do endereço geocodificado** da empresa (não do último pin), para não “andar” a loja até outro bairro.
10. **Endereço da empresa obrigatório** (rua, número, cidade, estado) para abrir a cobertura. Com endereço, o pin é geocodificado e gravado (primeira pinagem).
11. Círculos concêntricos semitransparentes no modo raio; polígonos azuis no modo área.
12. Tooltip de desenho (*Clique para finalizar o círculo*).

Não copiar o sidebar preto do parceiro. O chrome do Gestor (menu Configurações) permanece.

Mapa oculto por padrão (economia Google) **deixa de ser o padrão desta aba**: a referência é mapa sempre visível depois que a geo da empresa existe. Se a chave Maps faltar, estado de erro no lugar do mapa — não voltar ao layout de duas colunas.

---

## 5. Ferramentas e lógica de criação / edição

Implementar na `CoberturaDeliveryMap` (Google Maps Drawing / overlays imperativos). Uma ferramenta ativa por vez.

### 5.1 Polígono (já existe, alinhar UX)

Espelhar geoman:

1. Ativar ferramenta.
2. Clique = vértice.
3. Preview da linha; com ≥ 3 pontos, preenche.
4. Ações: **Finalizar**, **Remover último vértice**, **Cancelar**.
5. Após finalizar: abre ficha da área (nome, taxa, tempo, ativo) **ou** no modo raio só pede nome/ativo (taxa vem das faixas).
6. Vértices **arrastáveis** antes e depois de salvar (`editable` no polygon).

Hoje o banner de desenho é uma faixa no topo do mapa — mover para tooltip + ações da toolbar, como o parceiro.

### 5.2 Círculo (dois cliques)

1. Clique 1 = centro (dot).
2. Move o mouse = círculo preview + linha tracejada centro→borda.
3. Clique 2 = confirma.
4. Tooltip *Clique para finalizar o círculo*.
5. Persistência: converter para `Polygon` (anel fechado) e `POST areas-entrega`, **salvo** se o produto decidir que círculo centrado no pin da loja vira **raio** (`distanciaMaximaEmMetros`).  
   **Decisão padrão:** círculo no mapa = **área** (forma livre, como geoman). Raios nascem das faixas em km, não do desenho circular avulso.

### 5.3 Arrastar forma

- Polígono/círculo já persistido: `draggable: true` no overlay (hoje está `false`).
- Ao soltar: `PATCH` da geometria (`area` GeoJSON).
- Não arrastar o mapa quando a ferramenta “mover” está ativa.

### 5.4 Recortar (cut)

- Fase própria: furo (`Polygon` com segundo anel) ou split.
- Só depois de polígono + arraste estáveis.
- Corrigir `geoJsonToLatLngRings` para **renderizar holes** (hoje ignora anéis internos).

### 5.5 Apagar

- Ferramenta: clique na forma → confirma exclusão → `DELETE` área (ou raio, se for círculo-faixa visual).
- Não apagar o pin da loja.

### 5.6 Pin da loja

- Marker arrastável na cobertura.
- Popup igual à referência.
- `dragend` → PATCH `endereco.enderecoLocalizacao` da empresa + invalidar query `['empresa', 'endereco-geo']`.
- Recentrar círculos dos raios no novo ponto.
- **Não** reescrever rua/número (mesmo princípio da aba Empresa).

### 5.7 Hover e seleção

Estado `destaque: { tipo: 'raio' | 'area' | 'todos'; id?: string; metros?: number }`.

| Origem | Mapa |
|--------|------|
| Mouse na linha *Até N km* | `circleBandHighlight(N * 1000)` — só a coroa entre `(N-1)*1000` e `N*1000` (ou o disco de N km se N=1) |
| Mouseleave | remove highlight |
| Mouse no tile “N áreas” | destaca todos os polígonos |
| Mouse numa área da lista (quando houver lista) | destaca aquele polígono |
| Clique no polígono | entra em edição de vértices (já existe) |

Círculos de raio passam a ser `clickable` só para hover/seleção, sem interceptar o desenho.

---

## 6. Cobertura Área e Cobertura Raio

Produto atual (validação 2026-09-05):

1. **Cobertura Raio** — o operador informa o **alcance máximo em km inteiros**. O Gestor sincroniza faixas **1…N km** (`1000, 2000, … N×1000` m) para precificar em Taxas e Entrega. Sem alcance, não há círculo.
2. **Reduzir o alcance** (ex.: 10 → 4) **exclui** as faixas acima (`Até 5 km` …). **Ampliar** cria só as que faltam. Não faz PATCH da distância de um raio existente para um km que já existe (isso gerava o erro de duplicidade).
3. **Cobertura Área** — polígonos pelos atalhos laterais, nome e taxa próprios, podem ficar **fora** do raio.
4. Sem hover, o mapa empilha os km no **mesmo azul claro** (anéis concêntricos). Hover em *Até N km* acende só a **coroa** daquele km (do km anterior até N), em roxo Jiffy.
5. O aviso de cobertura vazia fica **no card**, com ícone de exclamação.
6. Reduzir o alcance continua excluindo as faixas acima (Até 5 km…), sem botão de “excluir todos”.
7. Em **Taxas e Entrega**, cada faixa tem taxa (R$), prazo (min) e interruptor. Clique no valor já seleciona o texto. Botão **Salvar** só fica azul com alteração; senão cinza **Tudo certo**.

O tile **Cobertura Raio** exibe `Até N km`.

Cotação (`calcularTaxaCoberturaPonto`) **não muda nesta fase**: área que contém o ponto ganha com o preço da área; senão o menor raio que cobre.

---

## 7. Modelo de taxa no Gestor

**Não haverá** modal de um sistema só (raio *ou* área *ou* a combinar). O produto do Gestor é **híbrido**:

- **Cobertura Área** e **Cobertura Raio** existem juntos.
- Cotação (`calcularTaxaCoberturaPonto`): área ativa que contém o ponto ganha com a taxa/prazo da área; senão o **menor raio ativo** que cobre.

Não implementar `delivery_system`. Não mudar a policy de cotação para máscara de polígono.

---

## 8. Fases de implementação

Cada fase: implementar → `gofmt`/lint/testes do Gestor → atualizar este doc (status) → **parar**.

| Fase | Nome | Entrega | Fora |
|------|------|---------|------|
| **0** | Este documento | Consenso de espelho | Código |
| **1** | km na UI | **Concluída** — campo/lista em km; `× 1000` no mapper; `formatDistanciaRaio` → `1 km`; default 1 km | Layout do mapa |
| **2** | Hover lista ↔ mapa | **Concluída** — `areaDestacadaId` / destaque de raio; mouseenter nas linhas e no mapa | Toolbar nova |
| **3** | Layout espelho | **Concluída** — mapa full bleed + card flutuante + abas Minhas Áreas / Taxas | Cut, círculo 2 cliques |
| **4** | Taxas e Entrega | **Concluída** — lista *Até N km* + Salvar em lote | `delivery_system` no backend |
| **5** | Toolbar + círculo + arraste | **Concluída** — polígono, círculo 2 cliques, mover, apagar área, pin arrastável | Recorte |
| **5b** | Círculo único / 4 km auto | **Substituída** — 4 km automático foi revertido | — |
| **5c** | Área × Raio + alcance | **Concluída** — tiles Área/Raio; alcance em km | — |
| **5d** | Faixas 1 km + encolher | **Concluída** — 1…N km para taxa; reduzir alcance exclui faixas acima; tile `Até N km` | Recorte |
| **5e** | Pin + limpeza | **Concluída** — balão no pin; sem exclusão temporária; sem modal de raio | — |
| **5f** | Salvar pin explícito | **Concluída** — arrastar é rascunho; Salvar localização PATCH + recentra raios | Recorte |
| **5g** | Pin até 1 km do endereço | **Concluída** — ajuste fino limitado a 1 km do geocode do endereço | Recorte |
| **5h** | Limpeza do caminho | **Concluída** — removidos restos do modal de raio, 4 km automático e alcance derivado de polígono | Recorte |
| **6** | Recorte / holes | Cut + render de furos | Leaflet |
| **7** | Um modelo de taxa | **Cancelada** — o Gestor permanece híbrido (área + raio) | — |

Status: **modelo híbrido Área + Raio estável.** Recorte (fase 6) fica opcional, só com validação humana. Fase 7 **não será feita**.

Sobreposição do layout da fase 3: o banner de desenho em faixa cheia foi removido. Ações de desenho/edição ficam **dentro do card** à esquerda; a toolbar vertical fica **à direita no mapa**.

---

## 9. Arquivos previstos (quando implementar)

Criar/alterar só na fase correspondente:

**Fase 1**

- `src/application/dto/delivery/CoberturaEntregaDTO.ts` — conversão km ↔ metros; `formatDistanciaRaio`
- `src/presentation/components/features/configuracoes/tabs/CoberturaDeliveryTab.tsx` — label da lista
- Testes do DTO / `formatDistanciaRaio`

**Fase 2+**

- `CoberturaDeliveryMap.tsx` — highlight, toolbar, drawing, pin draggable
- `CoberturaDeliveryTab.tsx` — layout, abas, painel
- `src/shared/utils/geoJsonCircle.ts` (novo) — poligonizar círculo
- `src/shared/types/geoJsonPolygon.ts` — holes na conversão para o mapa
- `src/shared/utils/alcanceCoberturaKm.ts` (novo) — `ceil` do alcance
- Testes de mapper km, highlight, alcance, `calcularTaxaCoberturaPonto` quando a policy mudar

Não commitar `.env.local` nem chaves Maps.

---

## 10. Testes e aceite manual

Automatizado por fase: unitários de conversão km↔m, alcance, cotação.

Manual (loja de homolog, geo da empresa já setada):

- [ ] Loja sem raio → mapa sem círculo; aviso no card com ícone de exclamação.
- [ ] Definir alcance N km → faixas Até 1…N km e anéis concêntricos.
- [ ] Hover em *Até N km* acende só a coroa daquela faixa.
- [ ] Desenhar área fora do raio: nome + taxa próprios; o raio não cresce.
- [ ] Tiles: Cobertura Área | Cobertura Raio.
- [ ] Taxas: coluna Prazo; Salvar cinza **Tudo certo** sem alteração.
- [ ] Pin com balão *Você está aqui? Ajuste a localização*; X fecha; clique no pin reabre.
- [ ] Arrastar o pin **não** chama o backend; aparece **Salvar localização**; após salvar, os raios nascem do novo ponto. Cancelar devolve o pin.
- [ ] Pin não sai de 1 km do endereço da empresa; arraste além da borda volta para o raio; anel navy no mapa marca o limite.
- [ ] Lixeira só em área. Wizard gestor: taxa ainda bate com a policy vigente.

---

## 11. Riscos

- **Policy híbrida:** permanente. Área que contém o ponto ganha; senão o menor raio. Não haverá um modelo só.
- **Sobreposição de áreas:** API Jiffy já rejeita overlap; o recorte precisa respeitar isso.
- **Custo Google Maps:** mapa always-on nesta aba; Drawing Library se for usada.
- **Tempo obrigatório no raio:** o parceiro não pede; nós sim. Default estável evita PATCH inválido.
- **Furos:** render atual achata Polygon para o anel externo — recorte invisível até a fase 6.

---

## 12. Próximo passo autorizado

Somente após validação humana. Recorte (fase 6) é opcional. Não implementar um modelo único de taxa.
