# Melhorias na Seção de Top Produtos do Dashboard V2

Este documento descreve as alterações realizadas na seção de Top Produtos do Dashboard V2 e sugere melhorias para a API externa.

## 1. O que foi feito no BFF (Backend For Frontend) e Frontend

A rota do BFF (`app/api/dashboard/top-produtos/route.ts`) já estava fazendo o trabalho de agregar os produtos, o que é bom para o frontend, mas a forma como as datas eram calculadas estava inconsistente com o resto do dashboard.

**Mudanças Realizadas:**
1. **Padronização de Fuso Horário no BFF:** Removemos a função interna `getPeriodoDates` (que utilizava o fuso horário local do servidor Node.js de forma hardcoded) e passamos a utilizar o parâmetro `timezone` em conjunto com a função `calcularPeriodoNoFusoEmpresa`. Isso garante que o período "hoje", "ontem", etc., seja calculado corretamente com base no fuso horário da empresa logada, alinhando o comportamento com as rotas `/resumo` e `/metodos-pagamento`.
2. **Componentização no Frontend:** Toda a lógica visual, estados locais (`modoTopProduto`, `filtroTopProduto`, `topProdutosListaCompleta`) e cálculos de porcentagem/barras foram extraídos do gigantesco `dashboardV2.tsx` para um novo componente dedicado: `DashboardTopProdutos.tsx`.

## 2. Sugestões de Melhoria para a API Externa (Backend Principal)

O atual endpoint do BFF (`/api/dashboard/top-produtos`) sofre de um grave problema de performance e excesso de requisições (N+1 problem) devido às limitações da API externa atual.

**O Problema Atual:**
Para calcular o Top Produtos, o BFF precisa:
1. Buscar **todas** as vendas finalizadas do período (paginando de 100 em 100).
2. Fazer uma requisição `GET /api/v1/operacao-pdv/vendas/{id}` para **cada uma** das vendas encontradas, a fim de ler o array `produtosLancados`.
3. Agregar as quantidades e valores em memória no servidor Node.js.
4. Fazer uma requisição `GET /api/v1/cardapio/produtos/{id}` para **cada produto diferente** encontrado, a fim de descobrir o nome do produto.

Isso significa que para um dia com 500 vendas e 50 produtos diferentes, o BFF faz mais de **550 requisições HTTP** para a API externa. Isso é insustentável para períodos longos (ex: 30 dias).

**Solução Definitiva:**
A API externa deve fornecer um endpoint nativo de relatório de produtos mais vendidos. O banco de dados relacional é a ferramenta correta para fazer agregações (`GROUP BY`, `SUM`, `JOIN`).

**Sugestão de Endpoint (API Principal):**
`GET /api/v1/relatorios/top-produtos`

**Parâmetros:**
- `dataFinalizacaoInicial`
- `dataFinalizacaoFinal`
- `status` (ex: FINALIZADA)
- `limit` (ex: 10, 500)

**Payload Ideal:**
```json
{
  "items": [
    {
      "produtoId": "uuid-do-produto-1",
      "produto": "Coca-Cola 350ml",
      "quantidade": 145,
      "valorTotal": 870.00
    },
    {
      "produtoId": "uuid-do-produto-2",
      "produto": "X-Burger",
      "quantidade": 98,
      "valorTotal": 2450.00
    }
  ]
}
```

Com esse endpoint, o BFF precisaria fazer apenas **uma** requisição para a API externa, eliminando a necessidade de buscar detalhes de vendas e nomes de produtos individualmente, reduzindo o tempo de resposta de vários segundos para milissegundos.