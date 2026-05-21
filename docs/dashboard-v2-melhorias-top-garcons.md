# Melhorias na Seção de Top Garçons do Dashboard V2

Este documento descreve as alterações realizadas na seção de Top Garçons do Dashboard V2 e sugere melhorias críticas para a API externa.

## 1. O que foi feito no BFF (Backend For Frontend) e Frontend

A rota do BFF (`app/api/dashboard/top-garcons/route.ts`) já estava fazendo o trabalho de agregar os dados dos garçons, mas a forma como as datas eram calculadas estava inconsistente com o resto do dashboard.

**Mudanças Realizadas:**
1. **Padronização de Fuso Horário no BFF:** Removemos a função interna `getPeriodoDates` (que utilizava o fuso horário local do servidor Node.js de forma hardcoded) e passamos a utilizar o parâmetro `timezone` em conjunto com a função `calcularPeriodoNoFusoEmpresa`. Isso garante que o período "hoje", "ontem", etc., seja calculado corretamente com base no fuso horário da empresa logada.
2. **Componentização no Frontend:** Toda a lógica visual, estados locais (`filtroTopGarcom`, `topGarconsListaCompleta`), cálculos de totais e o subcomponente `IconeColocacaoTopGarcom` foram extraídos do `dashboardV2.tsx` para um novo componente dedicado: `DashboardTopGarcons.tsx`.

## 2. Sugestões de Melhoria para a API Externa (Backend Principal)

O atual endpoint do BFF (`/api/dashboard/top-garcons`) sofre do mesmo problema grave de performance e excesso de requisições (N+1 problem) que a rota de Top Produtos.

**O Problema Atual:**
Para calcular o Top Garçons, o BFF precisa:
1. Buscar **todas** as vendas finalizadas do período (paginando de 100 em 100).
2. Fazer uma requisição `GET /api/v1/operacao-pdv/vendas/{id}` para **cada uma** das vendas encontradas, a fim de ler os campos `abertoPorId` ou `usuarioPdv` e `produtosLancados`.
3. Agregar as quantidades de vendas, produtos e valores em memória no servidor Node.js.
4. Fazer uma requisição `GET /api/v1/pessoas/usuarios-pdv/{id}` para **cada usuário diferente** encontrado, a fim de descobrir o nome do garçom.

Isso significa que para um dia com 500 vendas e 10 garçons, o BFF faz **510 requisições HTTP** para a API externa. Isso é insustentável para períodos longos (ex: 30 dias).

**Solução Definitiva:**
A API externa deve fornecer um endpoint nativo de relatório de performance de garçons. O banco de dados relacional é a ferramenta correta para fazer agregações (`GROUP BY usuario_id`, `COUNT(venda_id)`, `SUM(valor)`).

**Sugestão de Endpoint (API Principal):**
`GET /api/v1/relatorios/top-garcons`

**Parâmetros:**
- `dataFinalizacaoInicial`
- `dataFinalizacaoFinal`
- `status` (ex: FINALIZADA)
- `limit` (ex: 10, 500)

**Payload Ideal:**
```json
{
  "totalUsuariosComVendas": 12,
  "items": [
    {
      "usuarioId": "uuid-do-usuario-1",
      "nome": "João Silva",
      "qtdProdutos": 145,
      "qtdVendas": 45,
      "valorTotal": 870.00
    },
    {
      "usuarioId": "uuid-do-usuario-2",
      "nome": "Maria Souza",
      "qtdProdutos": 98,
      "qtdVendas": 30,
      "valorTotal": 2450.00
    }
  ]
}
```

Com esse endpoint, o BFF precisaria fazer apenas **uma** requisição para a API externa, eliminando a necessidade de buscar detalhes de vendas e nomes de usuários individualmente, reduzindo o tempo de resposta drasticamente.