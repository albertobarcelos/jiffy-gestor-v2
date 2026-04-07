# Padrão do modal de cadastro — Complementos (referência para outros modais)

Documento de anotações sobre o fluxo **lista → modal lateral** usado em complementos, para replicar o mesmo padrão visual e de comportamento em outros cadastros.

**Arquivos principais de referência**

| Papel | Caminho |
|--------|---------|
| Shell do painel (slide, título, abas, rodapé) | `src/presentation/components/ui/jiffy-side-panel-modal/JiffySidePanelModal.tsx` |
| Modal com abas + wiring do formulário | `src/presentation/components/features/complementos/ComplementosTabsModal.tsx` |
| Formulário (campos, submit, embed) | `src/presentation/components/features/complementos/NovoComplemento.tsx` |
| Abertura a partir da lista | `src/presentation/components/features/complementos/ComplementosList.tsx` (estado `tabsModalState`) |
| Switch padrão (✓ / ✕) | `src/presentation/components/ui/JiffyIconSwitch.tsx` |
| Loading padrão | `src/presentation/components/ui/JiffyLoading.tsx` |

---

## 1. Efeito de abrir e fechar — painel deslizante

- **Componente base:** `JiffySidePanelModal`.
- **Entrada / saída:** MUI `Slide` com `direction="left"` (`PainelSlide`). O painel **entra vindo da direita** e, ao fechar, **desliza de volta para a direita**.
- **Duração:** constantes `PANEL_MS` — `enter: 420 ms`, `exit: 380 ms` (arquivo do modal).
- **Container:** MUI `Modal` com `closeAfterTransition`, backdrop customizado `PainelPedidoBackdrop` (sem fade de opacidade no overlay, conforme comentários no código).
- **Posicionamento do painel:** `absolute right-0 top-0`, altura `100dvh`, cantos arredondados à esquerda (`rounded-bl-xl rounded-tl-xl`).
- **Estado interno:** `internalOpen` + `onExited` do `Slide` chamam `onAfterClose` após a animação de saída.

**Checklist ao reutilizar:** manter o mesmo `JiffySidePanelModal` em vez de `Dialog` com Fade se o objetivo for o mesmo comportamento de slide e backdrop.

---

## 2. Tipos de input e padding interno reduzido

- **Texto:** componente `Input` (`src/presentation/components/ui/input.tsx`) = MUI `TextField` outlined, `fullWidth`, tipicamente com **`size="small"`**.
- **Dropdown:** MUI `FormControl` + `InputLabel` + `Select` + `MenuItem`, também **`size="small"`**, label no entalhe (outlined), alinhado aos `TextField`.
- **Fundo dos campos:** `className="bg-white"` nos inputs; no `Select`, `sx` em `& .MuiOutlinedInput-root` com `backgroundColor: '#fff'`.
- **Labels (cor):** objeto `sxOutlinedLabelTextoEscuro` — labels em `var(--color-primary-text)` nos estados normal, focado e encolhido; asterisco de obrigatório em `var(--color-error)`.
- **Padding compacto:** objetos `entradaCompactaInput` e `entradaCompactaSelect` (ex.: `padding: '10px'`, `fontSize: '0.875rem'`), aplicados via `sx` em `& .MuiOutlinedInput-input` e `& .MuiSelect-select` (com `minHeight` / `lineHeight` / `flex` no select para alinhar o texto).
- **Maiúsculas (complementos):** variante `sxCampoTextoMaiusculo` para nome/descrição (`textTransform: 'uppercase'` + `onChange` com `.toUpperCase()`); **não** aplicar em campo monetário. Select: `textTransform: 'uppercase'` na área exibida e nos `MenuItem`, mantendo `value` em minúsculas se a API exigir (`nenhum` / `aumenta` / `diminui`).

**Checklist:** extrair constantes `sx` compartilhadas por modal para não duplicar padding e cores de label.

---

## 3. Switch padrão — `JiffyIconSwitch`

- **Import:** `@/src/presentation/components/ui/JiffyIconSwitch`.
- **Comportamento:** trilho estilo “pill”; **✓** quando ligado, **✕** quando desligado; thumb branco com anel interno cuja borda acompanha as cores do estado (`accent1` / `error`, alinhado ao trilho).
- **Props úteis:** `checked`, `onChange`, `label`, `labelPosition`, `bordered` (borda primary em volta da linha inteira), `className` (ex.: `justify-end`), `disabled`, `inputProps` (ex.: `aria-label`).
- **Foco:** anel de foco apenas com **`has-[input:focus-visible]`** (teclado), evitando retângulo primary ao clicar com o mouse.
- **No complemento:** uso com `bordered={false}` e `className="justify-end"` conforme layout atual da linha “Ativo”.

---

## 4. Botão Salvar — formatação e uso no modal com formulário externo

- **Variante de rodapé:** `footerVariant="bar"` — faixa única em grid; com **somente Salvar**, o botão ocupa **100% da largura**; primeira coluna recebe canto inferior esquerdo alinhado ao painel (`rounded-xl` à esquerda).
- **Submit externo ao JSX do `<form>`:** definir um **`id` fixo** no `<form>` do conteúdo (ex.: `COMPLEMENTO_TABS_FORM_ID`) e passar em `footerActions.saveFormId`. O botão do rodapé vira `type="submit"` com `form={saveFormId}` (implementação em `FooterSaveButton` / `JiffyPanelFooterBar`).
- **Estado sincronizado:** o formulário embutido chama `onEmbedFormStateChange` com `{ isSubmitting, canSubmit }`; o modal repassa para `saveLoading` e `saveDisabled` (ex.: `!canSubmit || isSubmitting`).
- **Rótulo dinâmico:** `saveLabel`: “Salvar” em criação, “Atualizar” em edição.
- **Estilo do botão primary no rodapé:** `footerSavePrimarySx` / `footerSavePrimaryBarSx` — `var(--color-primary)`, texto branco, sem sombra, hover com `brightness`, estado disabled com fundo azul semitransparente.

**Checklist:** formulário com `hideEmbeddedFormActions` (ou equivalente) quando o Salvar existir só no rodapé; manter um único `id` de form documentado na constante do modal-tab.

---

## 5. Abas e títulos

### 5.1 Título do painel (header do `JiffySidePanelModal`)

- Prop **`title`** (ReactNode) — no complemento: `useMemo` retorna `"Novo Complemento"` ou `"Editar Complemento"` conforme `mode`.
- Renderização: `<h2 id="jiffy-side-panel-title">` com classes no estilo **maiúsculas, semibold, tracking wide** (no código atual ainda referem fontes legadas no className; o tema global pode usar General Sans — alinhar classes ao design system quando padronizar).
- **Subtítulo opcional:** prop `subtitle` com parágrafo em Nunito (no shell); complementos não usam.

### 5.2 Faixa de abas (`tabsSlot`)

- Bloco abaixo do header, com `border-b`, `px-2 pt-2 md:px-4`.
- **Complementos:** uma aba “Complemento” — `<button type="button">` com:
  - ativa: `rounded-t-lg px-4 py-2 text-sm font-semibold bg-primary text-white`;
  - inativa: `bg-gray-100 text-secondary-text hover:bg-gray-200`.
- Padrão extensível: mais botões no mesmo `flex flex-wrap gap-1`, mesma lógica de estado para `tab`.

### 5.3 Título da seção dentro do formulário (`NovoComplemento`)

- Bloco “Dados do Complemento”: `<h2>` com `text-primary text-xl font-semibold font-exo` + linha divisória (`flex-1 h-px bg-primary/70`).

---

## 6. Corpo do modal sem scroll externo + loading

- **`scrollableBody={false}`** no `JiffySidePanelModal` quando o formulário deve controlar o scroll internamente.
- **Filho direto:** wrapper `className="flex min-h-0 flex-1 flex-col"` envolvendo o conteúdo (ex.: `NovoComplemento`), para o flex preencher a altura e o **loading** (`JiffyLoading`) centralizar com `flex min-h-0 flex-1 flex-col items-center justify-center` no estado de carregamento em edição.

---

## 7. Resumo rápido para clonar em outro cadastro

1. Criar `*TabsModal.tsx` com `JiffySidePanelModal`, `title`/`subtitle`, `tabsSlot`, `footerVariant="bar"`, `saveFormId` + estado embed.
2. Reutilizar ou copiar o bloco de `sx` compacto + labels escuras (+ maiúsculas só onde o negócio pedir).
3. Formulário com props: `isEmbedded`, `hideEmbeddedHeader`, `embeddedFormId`, `hideEmbeddedFormActions`, `onEmbedFormStateChange`, `onSaved`, `onCancel`.
4. Switch booleano: `JiffyIconSwitch`.
5. Loading assíncrono: `JiffyLoading` com container `flex-1 min-h-0`.

---

*Documento gerado para padronização futura. Aguardar novos comandos para evolução deste padrão.*
