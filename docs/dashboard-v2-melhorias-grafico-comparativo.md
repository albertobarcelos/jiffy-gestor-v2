# Melhorias no Gráfico Comparativo de Vendas

Este documento descreve as alterações realizadas na seção do Gráfico Comparativo de Vendas do Dashboard V2, bem como sugestões de melhorias para a API externa.

## 1. O que foi feito no BFF (Backend For Frontend) e Frontend

Anteriormente, o frontend (`dashboardV2.tsx`) era responsável por:
- Fazer duas requisições separadas para o BFF (`/api/dashboard/evolucao`), uma para o período atual e outra para o período anterior.
- Calcular as datas exatas do período anterior no lado do cliente.
- Fazer o "merge" (mesclagem) dos pontos de evolução do período atual e anterior, alinhando-os por dia ou por hora (`mergePontosEvolucaoComparacao`).

**Mudanças Realizadas:**
1. **Novo Endpoint no BFF:** Criamos a rota `/api/dashboard/evolucao-comparativo`. Este novo endpoint recebe apenas o `periodo` (ex: 'hoje', 'semana') e o `timezone`. Ele mesmo calcula as datas do período atual e anterior, busca os dados de ambos e faz o agrupamento e mesclagem (merge) no servidor.
2. **Redução de Requisições:** O frontend agora faz apenas **uma** requisição para buscar todos os dados do gráfico, economizando banda e tempo de processamento no navegador.
3. **Componentização:** Toda a lógica visual do gráfico (Recharts, tooltips, eixos, botões de filtro de métrica) foi extraída para um novo componente isolado chamado `DashboardGraficoComparativo.tsx`. O arquivo principal `dashboardV2.tsx` ficou muito mais limpo.
4. **Reutilização de Código:** A lógica complexa de agrupamento por fuso horário que existia no BFF antigo foi extraída para um serviço compartilhado (`evolucaoService.ts`), evitando duplicação de código.

## 2. Sugestões de Melhoria para a API Externa (Backend Principal)

Atualmente, o BFF precisa buscar **todas as vendas paginadas** (de 100 em 100) do período solicitado para poder agrupá-las por dia ou por hora. Isso é extremamente ineficiente para períodos longos (ex: 30 dias com milhares de vendas).

Para resolver isso de forma definitiva e melhorar a performance, sugerimos as seguintes melhorias na API principal (`/api/v1/operacao-pdv/vendas` ou em um novo endpoint de relatórios):

### A. Endpoint de Evolução/Histograma Nativo
A API principal deveria fornecer um endpoint específico para evolução de vendas (histograma), onde o banco de dados já faz o agrupamento (GROUP BY) por dia ou por hora.

**Sugestão de Payload (API Principal):**
```json
{
  "agregacao": "dia", // ou "hora"
  "pontos": [
    {
      "data": "2026-05-13",
      "totalFaturado": 1500.00,
      "countVendasEfetivadas": 45,
      "totalCancelado": 100.00,
      "countVendasCanceladas": 2
    },
    // ...
  ]
}
```

### B. Suporte a Timezone no Banco de Dados
Para que o agrupamento por dia/hora seja preciso, a API externa deve aceitar um parâmetro de `timezone` (ex: `America/Sao_Paulo`) na requisição, garantindo que o banco de dados faça o `GROUP BY` considerando o fuso horário da loja, e não o UTC padrão do servidor.

Com essas mudanças na API externa, o BFF não precisará mais baixar milhares de registros apenas para somá-los, reduzindo o tempo de resposta do gráfico de segundos para milissegundos.
