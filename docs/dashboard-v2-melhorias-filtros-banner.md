# Melhorias: Filtros, Banner de Faturamento e Comparação

Este documento detalha as sugestões de refatoração e migração de responsabilidades para o backend, focando na primeira parte do Dashboard V2: Filtros de período, Banner de Faturamento e a Comparação com o período anterior.

## 1. Filtro de Período e Cálculo de Datas

### Como funciona atualmente (Frontend)
O frontend gerencia o estado do filtro selecionado (`hoje`, `ontem`, `semana`, `30dias`, `personalizado`). Com base na opção selecionada e no timezone da empresa (`timezoneAgregacao`), o frontend utiliza várias funções utilitárias (`calcularPeriodoNoFusoEmpresa`, `deslocarPeriodoEmDiasCorridosUtc`, etc.) para calcular as datas exatas de início e fim (em UTC) do **período atual** e do **período anterior** correspondente.

### O que pode ser melhorado no Frontend (Separação de Responsabilidades)
- **Extração de Componente:** Criar um componente isolado `DashboardFiltros.tsx` para gerenciar a UI do select de período, botão de atualizar e modal de datas personalizadas.
- **Extração de Hook:** Criar um hook `useDashboardPeriodo.ts` para encapsular a lógica de estado do período (`periodoData`, `periodoPersonalizadoInicio`, `periodoPersonalizadoFim`) e expor apenas os valores finais prontos para uso.

### O que passar para o Backend
O cálculo das datas do período anterior pode ser transferido para o backend. O frontend não deveria precisar calcular qual foi o "período anterior" para enviar em uma segunda requisição. 

### Instruções para o Backend
- **Nova funcionalidade na API:** A API de resumo (`/api/dashboard/resumo`) e evolução devem ser capazes de receber o período desejado e calcular automaticamente o período anterior.
- **Parâmetros sugeridos:** A API pode receber o alias do período (ex: `periodo=hoje&timezone=America/Sao_Paulo`) ou as datas explícitas (`dataInicial` e `dataFinal`). Se receber datas explícitas, o backend calcula o delta de dias e subtrai esse delta para encontrar o período anterior, garantindo que a comparação seja sempre precisa.

---

## 2. Banner de Faturamento e Comparação

### Como funciona atualmente (Frontend)
O frontend faz **duas requisições separadas** para `/api/dashboard/resumo`: uma com as datas do período atual e outra com as datas do período anterior. Quando ambas retornam, um `useMemo` (`comparacaoPeriodoAnterior`) calcula a diferença percentual matematicamente `((atual - anterior) / anterior) * 100` e define o status (`ok`, `semBase`, `carregando`, `erro`). Além disso, existem várias funções no mesmo arquivo para gerar os textos dinâmicos ("Hoje você faturou", "vs. ontem", etc.).

### O que pode ser melhorado no Frontend (Separação de Responsabilidades)
- **Extração de Componente:** Criar o componente `FaturamentoBanner.tsx` que recebe apenas os dados prontos (valor atual, valor anterior, percentual, textos) e renderiza a UI.
- **Extração de Textos:** Mover as funções de geração de texto (`tituloFaturamentoBanner`, `textosComparacaoPeriodoAnterior`, `prefixoSemFaturamentoNaBase`, etc.) para um arquivo de utilitários de apresentação, como `dashboardTextHelpers.ts`.

### O que passar para o Backend
A responsabilidade de consolidar os dados do período atual e anterior, bem como calcular a variação percentual, deve ser do backend. Isso reduz o número de requisições pela metade e remove a lógica matemática de negócios do frontend.

### Instruções para o Backend
- **Consolidação de Resposta:** A rota de resumo (`/api/dashboard/resumo`) deve retornar, em uma única chamada, os dados do período atual, do período anterior e as métricas de comparação já calculadas.
- **Exemplo de Payload Esperado:**
  ```json
  {
    "atual": {
      "totalFaturado": 5000.00,
      "countVendasEfetivadas": 120
      // ... outras métricas
    },
    "anterior": {
      "totalFaturado": 4000.00,
      "countVendasEfetivadas": 100
      // ... outras métricas
    },
    "comparacao": {
      "totalFaturado": {
        "percentual": 25.0,
        "status": "positivo" // ou "negativo", "neutro", "sem_base"
      },
      "countVendasEfetivadas": {
        "percentual": 20.0,
        "status": "positivo"
      }
    }
  }
  ```
- **Lógica de "Sem Base":** O backend deve identificar quando o período anterior é zero e o atual é maior que zero, retornando um status específico (ex: `sem_base`) para que o frontend saiba como exibir a mensagem correta (ex: "Ontem não houve faturamento").
