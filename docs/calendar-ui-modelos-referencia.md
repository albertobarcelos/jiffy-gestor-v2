# Referência: três modelos de calendário (shadcn / react-day-picker)

Documento gerado para apoiar decisões de UI no dashboard e filtros por período. Os snippets originais usam `@/components/ui/...`; no Jiffy o equivalente costuma ser `src/presentation/components/ui/`.

---

## Modelo 1 — Calendário + horário no mesmo dia (`CalendarWithTime`)

- **Biblioteca:** `Calendar` (wrapper react-day-picker) + `Card` + `Field` / `InputGroup`.
- **Modo:** `mode="single"` — uma data.
- **Rodapé:** dois campos `type="time"` com `step="1"` (Start / End), ícone `Clock2Icon`, estilo que esconde o indicador nativo do picker (webkit).
- **Uso conceitual:** escolher **um dia** e faixa horária **nesse dia**; não cobre intervalo entre duas datas diferentes sem evoluir o estado.
- **Melhorias típicas:** estado controlado nos times (`value`/`onChange`); locale pt-BR; alinhar com tema claro/escuro do app.

---

## Modelo 2 — Células customizadas com valor por dia (`CalendarCustomDays`)

- **Modo:** `mode="range"` com `DateRange` (`from` / `to`).
- **Navegação:** `captionLayout="dropdown"` (mês/ano em dropdowns) + setas.
- **Layout:** `numberOfMonths={1}`; tamanho de célula via CSS `--cell-size` (ex. `spacing(10)` / `spacing(12)` em breakpoints).
- **Customização:** `components.DayButton` (ou `CalendarDayButton`) renderiza conteúdo extra sob o dia; exemplo usa valor fictício por fim de semana.
- **Outside days:** não mostrar extra quando `modifiers.outside` (dias fora do mês visível).
- **Ligação a dados reais:** um mapa `YYYY-MM-DD → faturamento` alimentado por **uma API agregada por período** (não uma query por célula). O projeto já tem agregação diária em `/api/dashboard/evolucao` quando não está em modo por hora.

---

## Modelo 3 — Intervalo em dois meses (`CalendarRange`)

- **Modo:** `mode="range"` — seleção de intervalo com “trilha” entre início e fim.
- **Visual:** dois meses lado a lado — `numberOfMonths={2}`.
- **Estado inicial:** `defaultMonth={dateRange?.from}` alinha o primeiro mês exibido ao início do range.
- **Container:** exemplo minimalista com `className="rounded-lg border"` direto no `Calendar` (sem `Card` no return; pode envolver depois).
- **Uso conceitual:** ideal para **período início–fim** no mesmo componente que o modelo 2, com UX melhor para ranges longos ou que cruzam mês.
- **Combinações possíveis:** juntar com horários (rodapé ou segundo passo) para espelhar `DateTimeRangePicker`; combinar com células customizadas (modelo 2) para faturamento por dia dentro do range visível.

---

## Panorama no repositório Jiffy (checklist técnico)

- Existem `Card` e outros primitives em `src/presentation/components/ui/`; o wrapper **`calendar.tsx`** segue o DayPicker oficial + CSS padrão (não é o bundle tailwind completo do shadcn).
- `react-day-picker` pode precisar estar como dependência **direta** no `package.json` (verificar lock / `npm ls`).
- Filtro atual do dashboard usa intervalo data+hora (`DateTimeRangePicker`); estes modelos substituem ou complementam a **parte visual** da escolha de datas, mantendo validação e contratos na borda (DTO, timezone).

### Implementação parcial (visual combinado)

- **`src/presentation/components/ui/calendar.tsx`** — `Calendar` + import de `react-day-picker/style.css` (react-day-picker v9).
- **`src/presentation/components/ui/FaturamentoRangeCalendar.tsx`** — intervalo com `numberOfMonths={2}`, células com faturamento **mock** (ou `faturamentoPorDia` opcional), rodapé com hora início/fim. Pronto para trocar o mock por fetch + mapa vindos da API.
- **Dashboard V2** (`dashboardV2.tsx`): modal “Por datas” usa este componente no lugar do antigo `DateTimeRangePicker`; rascunho + “Aplicar” combinam intervalo e horas com as mesmas regras de negócio (início/fim do dia quando aplicável).

---

## Resumo comparativo

| Aspecto              | Modelo 1 (time) | Modelo 2 (custom day) | Modelo 3 (range 2 meses) |
|----------------------|-----------------|------------------------|---------------------------|
| Modo principal       | single          | range                  | range                     |
| Horário no mesmo UI  | sim             | não no snippet         | não                       |
| Valor por célula     | não             | sim (exemplo mock)     | não no snippet            |
| Dois meses visíveis  | não             | não (1)                | sim (2)                   |

---

## Combinação proposta: 2 meses + faturamento na célula + horários no rodapé

**Sim, é viável** — tudo no mesmo `Calendar` (react-day-picker), misturando props e um `components.DayButton` customizado, com `Card` (ou painel) envolvendo **corpo + rodapé**.

### O que unir

| Peça | Origem | No componente combinado |
|------|--------|-------------------------|
| Dois meses + intervalo | Modelo 3 | `mode="range"`, `numberOfMonths={2}`, `selected` / `onSelect`, `defaultMonth` ou `month` controlado |
| Valor por dia | Modelo 2 | `components.DayButton` (ou `CalendarDayButton`) + lookup em `Map` ou objeto `YYYY-MM-DD → valor`; omitir ou esmaecer em `modifiers.outside` |
| Hora início/fim | Modelo 1 | `CardFooter` (ou seção fixa abaixo do grid) com dois `input type="time"` **controlados** (`value` + `onChange`) |

### Estado e semântica

- **Datas:** `DateRange` (`from`, `to`) — podem estar incompletas enquanto o usuário clica (só `from` até escolher o fim).
- **Horas:** strings `HH:mm` ou `HH:mm:ss`; ao confirmar, compor:
  - **Início do filtro** = `from` (data local) + hora início;
  - **Fim do filtro** = `to` + hora fim (regras atuais do `DateTimeRangePicker`: ex. 23:59:59 se fechamento do dia).
- **Navegação de mês:** em `onMonthChange`, buscar faturamento para o intervalo que **cobre os dois meses visíveis** (primeiro dia do mês esquerdo → último dia do mês direito), **uma requisição** (ex. reutilizar série diária de `/api/dashboard/evolucao`), não por célula.

### UX / layout

- Células ficam **mais altas** (dia + valor formatado); usar `--cell-size` maior (como no modelo 2) e tipografia menor para o valor (`tabular-nums`, `Intl` pt-BR).
- **Loading / erro:** skeleton nas células ou spinner discreto no cabeçalho do calendário enquanto o mapa não carrega.
- **Timezone:** mesma convenção de chave `YYYY-MM-DD` entre API e célula.

### Dependências no Jiffy

- Implementar ou copiar o primitive `Calendar` + `CalendarDayButton` (shadcn); alinhar imports ao alias do projeto.
- Manter validação e envio do período na borda (sem mudar regra de negócio só por trocar o visual).
