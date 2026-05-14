# Sugestões de Melhorias para a API Externa (Backend) - Dashboard V2

Este documento consolida todas as sugestões de melhorias identificadas durante a refatoração do Dashboard V2. O objetivo principal destas sugestões é transferir a responsabilidade de cálculos pesados, agregações e comparações de datas do Frontend/BFF (Backend For Frontend) diretamente para a API Externa (Backend Principal e Banco de Dados).

Atualmente, o BFF do Next.js está fazendo o "heavy lifting" (trabalho pesado) para evitar que o navegador do usuário trave, mas isso resulta em centenas de requisições HTTP entre o BFF e a API externa (Problema N+1). Implementar essas melhorias na API nativa reduzirá o tempo de carregamento de segundos para milissegundos.

---

## 1. Filtros de Período e Resumo de Faturamento

### O Problema Atual
O BFF precisa calcular manualmente qual é o "período anterior" com base no período atual selecionado e fazer duas requisições separadas para a API externa para depois calcular a variação percentual.

### O que precisa ser feito na API Externa
A rota de resumo de vendas (ou uma nova rota específica para o dashboard) deve ser capaz de receber o período desejado, calcular automaticamente o período anterior, e retornar os dados consolidados.

**Sugestão de Parâmetros:**
- Aceitar alias de período (ex: `periodo=hoje`, `periodo=semana`) juntamente com o `timezone` (ex: `America/Sao_Paulo`).
- Ou aceitar datas explícitas e, internamente, calcular o delta de dias para gerar a comparação.

**Sugestão de Payload de Resposta:**
```json
{
  "atual": {
    "totalFaturado": 5000.00,
    "countVendasEfetivadas": 120
  },
  "anterior": {
    "totalFaturado": 4000.00,
    "countVendasEfetivadas": 100
  },
  "comparacao": {
    "totalFaturado": {
      "percentual": 25.0,
      "status": "positivo" // "negativo", "neutro", "sem_base"
    }
  }
}
```
*Nota: O status `sem_base` ocorre quando o período anterior é zero e o atual é maior que zero.*

---

## 2. Barra de Métricas (Ticket Médio, Itens por Pedido e Cancelamentos)

### O Problema Atual
O BFF precisa fazer paginação para somar manualmente o valor das vendas canceladas (pois a API não retorna o total cancelado no nó `metricas`) e precisa calcular matematicamente o Ticket Médio e Itens por Pedido.

### O que precisa ser feito na API Externa
A API principal (`/api/v1/operacao-pdv/vendas`) deve retornar essas médias e totais de cancelamento diretamente no objeto `metricas`, eliminando a necessidade de paginação no BFF apenas para somar valores.

**Sugestão de Payload de Resposta (Nó Metricas):**
```json
{
  "metricas": {
    "totalFaturado": 15000.00,
    "countVendasEfetivadas": 150,
    "countProdutosVendidos": 450,
    "totalCancelado": 500.00, // NOVO
    "countVendasCanceladas": 5, // NOVO
    "ticketMedio": 100.00, // NOVO
    "itensPorPedido": 3.0 // NOVO
  }
}
```

---

## 3. Gráfico Comparativo de Vendas (Evolução)

### O Problema Atual
Para montar o gráfico, o BFF busca **todas as vendas paginadas** (de 100 em 100) do período solicitado para poder agrupá-las por dia ou por hora em memória. Para 30 dias, isso significa processar milhares de vendas no Node.js.

### O que precisa ser feito na API Externa
Criar um endpoint específico para evolução de vendas (histograma), onde o banco de dados já faz o agrupamento (`GROUP BY`) por dia ou por hora, respeitando o fuso horário da loja.

**Sugestão de Endpoint:** `GET /api/v1/relatorios/evolucao-vendas`

**Sugestão de Payload de Resposta:**
```json
{
  "agregacao": "dia", // ou "hora"
  "pontos": [
    {
      "data": "2026-05-13", // ou "2026-05-13 14:00"
      "totalFaturado": 1500.00,
      "countVendasEfetivadas": 45,
      "totalCancelado": 100.00,
      "countVendasCanceladas": 2
    }
  ]
}
```
*Crucial: A API deve aceitar um parâmetro `timezone` para que o `GROUP BY` no banco de dados considere o fuso horário correto da empresa, não o UTC do servidor.*

---

## 4. Formas de Pagamento (Problema N+1 Severo)

### O Problema Atual
O BFF busca todas as vendas do período e faz uma requisição `GET /api/v1/operacao-pdv/vendas/{id}` para **cada uma** das vendas para ler os detalhes de pagamento. Isso gera centenas de requisições HTTP internas.

### O que precisa ser feito na API Externa
Criar um endpoint nativo de relatório de pagamentos. O banco de dados deve fazer o `GROUP BY` por meio de pagamento.

**Sugestão de Endpoint:** `GET /api/v1/relatorios/metodos-pagamento`

**Sugestão de Payload de Resposta:**
```json
{
  "metodos": [
    {
      "meioPagamentoId": "uuid-do-meio",
      "nome": "Pix",
      "formaPagamentoFiscal": "pix",
      "valorTotal": 5400.00,
      "quantidadeTransacoes": 120
    }
  ],
  "totalGeral": 8600.00
}
```

---

## 5. Top Produtos (Problema N+1 Severo)

### O Problema Atual
Semelhante às formas de pagamento, o BFF busca todas as vendas, depois busca os detalhes de **cada venda** para ler o array `produtosLancados`, agrega em memória, e depois faz **outra requisição para cada produto diferente** para descobrir o nome dele (`/api/v1/cardapio/produtos/{id}`).

### O que precisa ser feito na API Externa
Criar um endpoint nativo de relatório de produtos mais vendidos (`GROUP BY produto_id`, `SUM`, `JOIN` com a tabela de produtos).

**Sugestão de Endpoint:** `GET /api/v1/relatorios/top-produtos`

**Sugestão de Payload de Resposta:**
```json
{
  "items": [
    {
      "produtoId": "uuid-do-produto-1",
      "produto": "Coca-Cola 350ml",
      "quantidade": 145,
      "valorTotal": 870.00
    }
  ]
}
```

---

## 6. Top Garçons (Problema N+1 Severo)

### O Problema Atual
O BFF busca todas as vendas, busca os detalhes de **cada venda** para ler quem abriu o pedido (`abertoPorId` ou `usuarioPdv`), agrega em memória, e depois faz **outra requisição para cada usuário diferente** para descobrir o nome do garçom (`/api/v1/pessoas/usuarios-pdv/{id}`).

### O que precisa ser feito na API Externa
Criar um endpoint nativo de relatório de performance de garçons (`GROUP BY usuario_id`, `COUNT`, `SUM`, `JOIN` com a tabela de usuários).

**Sugestão de Endpoint:** `GET /api/v1/relatorios/top-garcons`

**Sugestão de Payload de Resposta:**
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
    }
  ]
}
```

---

## Resumo Executivo para o Time de Backend

A atual arquitetura do Dashboard V2 depende de o BFF (Node.js/Next.js) baixar milhares de registros brutos via paginação e fazer centenas de requisições individuais (`vendas/{id}`, `produtos/{id}`, `usuarios/{id}`) para agregar dados em memória. 

**Ação Principal:** Criar endpoints de `/relatorios/` na API principal que utilizem o poder do banco de dados relacional (`GROUP BY`, `SUM`, `COUNT`, `JOIN`) para entregar os dados já agregados. Isso eliminará o problema de N+1 requisições e reduzirá o tráfego de rede e uso de CPU de forma drástica.