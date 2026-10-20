# Estudo autenticado — operação de caixa da estação

Data: 2026-09-22. Ambiente: `https://jiffy-backend-hom.nexsyn.com.br`. Tenant: Papaleguas (`cmc6u1efu0000jkwx0esa1opx`), usuário gestor Admin. Estações usadas: `ALBERTO - TESTE` (`cmtnenlhx00w4qy01ncqm8cfl`) e `FREDY` (`cmtmc0pr200tqqy01e06j9kre`).

**Este estudo vence o OpenAPI** quando os dois divergem.

Não existe `POST` de abrir caixa. Abertura é implícita (suprimento, sangria — mesmo quando a sangria depois falha — e venda balcão com `estacaoId`).

## Checklist

| # | Caso | Resultado ao vivo |
|---|------|-------------------|
| 1 | `GET current/{estacao}` sem caixa | **404** `RESOURCE_NOT_FOUND` — `Operação de caixa não encontrada` |
| 2 | `POST suprimento` fundo de troco | **201**. Cria operação. `GET current` passa a **200** `status: aberto` |
| 3a | `POST sangria` `descricao` < 5 | **400** `VALIDATION_ERROR` — `A descrição deve ter no mínimo 5 caracteres` |
| 3b | `POST sangria` `valor: 0` | **400** — `Valor do sangria deve ser maior que zero.` |
| 3c | `POST sangria` após fechar | Não devolve “caixa fechado”. **Abre operação nova vazia** e, se `valor` > 0, **400** `Valor da sangria não pode ser maior que o valor em caixa.` |
| 4a | `POST /gestor/vendas` **sem** `estacaoId` | **400** `VALIDATION_ERROR` — `estacaoId é um campo obrigatório` |
| 4b | `POST /gestor/vendas` **com** `estacaoId` | **201**. `operacaoCaixaId` da operação aberta. Sem caixa aberto, **a venda abre operação nova** |
| 5a | Pedido delivery gestor (create) | **201**, `operacaoCaixaId: null`. O vínculo no caixa da receptora ocorre no **FINALIZADO** |
| 5b | `estacaoId` no body de delivery | **400** — `Unrecognized key(s) in object: 'estacaoId'` |
| 5c | Pedido público (cardápio) | **201**. `GET` do pedido: `operacaoCaixaId: null`. Não entra no caixa |
| 6 | `GET current?tipoRetorno=detalhado` | 200 com `resumoOperacao`, `resumoCaixa`, `resumoPagamentos`, `totalProdutosVendidos`, `totalAdicionaisVendidos` |
| 7 | `POST fechamento` com `valorFornecido` ≠ esperado | **200** `{ operacaoCaixaId }`. Diferença gravada em `resumoFechamento.diferencaValorFornecidoEValorCaixa` |
| 8 | Lista + `GET {id}` após fechar | Lista item `status: fechado`. `GET {id}?tipoRetorno=detalhado` 200. `GET current` volta **404** |
| 9 | Id de terminal ou estação de outra empresa | **404** `Estação do gestor não encontrada`. Id de operação de terminal no path de estação: **404** `Operação de caixa não encontrada` |
| 10 | Duas estações da mesma empresa | Caixas independentes (`idsDiferentes: true`) |

## Contratos reais

### Erro padrão

```json
{
  "status": "error",
  "message": "Operação de caixa não encontrada",
  "type": "RESOURCE_NOT_FOUND",
  "path": "/api/v1/caixa/operacao-caixa-estacao/current/{id}",
  "method": "GET",
  "timestamp": "2026-09-22T20:42:26.345Z"
}
```

`type` visto: `RESOURCE_NOT_FOUND`, `VALIDATION_ERROR`. Validação traz `errors: [{ field, message }]`.

### `GET /caixa/operacao-caixa-estacao`

Query: `limit`, `offset`, `q` (nome da estação), `dataAberturaInicio`, `dataAberturaFim`, `estacaoGestorId`, `status` (`aberto` \| `fechado`).

```json
{
  "count": 1,
  "limit": 10,
  "offset": 0,
  "totalPages": 1,
  "page": 1,
  "hasNext": false,
  "hasPrevious": false,
  "items": [
    {
      "id": "cmud54f3r0002pc01oazzp2pi",
      "status": "fechado",
      "empresaId": "cmc6u1efu0000jkwx0esa1opx",
      "abertoPorAtor": {
        "id": "migr_ator_usuario_gestor_cmc6u1ek90012jkwxoft21ykp",
        "type": "USUARIO_GESTOR",
        "sourceReference": "cmc6u1ek90012jkwxoft21ykp",
        "nome": "Admin Gestor"
      },
      "estacao": { "id": "cmtnenlhx00w4qy01ncqm8cfl", "nome": "ALBERTO - TESTE" },
      "dataAbertura": "2026-09-22T20:42:24.750Z",
      "dataFechamento": "2026-09-22T20:42:26.108Z",
      "fechadoPorAtor": { "id": "…", "type": "USUARIO_GESTOR", "sourceReference": "…", "nome": "Admin Gestor" }
    }
  ]
}
```

### `GET current/{estacaoGestorId}`

Não abre caixa. Sem operação: **404**. `tipoRetorno=resumido` (padrão) ou `detalhado`.

Resumido (aberto, após suprimento R$ 50 + venda R$ 5,90):

```json
{
  "id": "cmud54f3r0002pc01oazzp2pi",
  "status": "aberto",
  "empresaId": "cmc6u1efu0000jkwx0esa1opx",
  "abertoPorAtor": { "id": "…", "type": "USUARIO_GESTOR", "sourceReference": "…", "nome": "Admin Gestor" },
  "estacao": { "id": "cmtnenlhx00w4qy01ncqm8cfl", "nome": "ALBERTO - TESTE" },
  "nomeEmpresa": "GREGORIO FOOD COMERCE E SERVICE LTDA",
  "dataAbertura": "2026-09-22T20:42:24.750Z",
  "resumoOperacao": {
    "totalLiquido": 5.9,
    "totalProdutoBruto": 5.9,
    "countVendasEfetivadas": 1,
    "countProdutosVendidos": 1
  },
  "resumoCaixa": {
    "totalSuprimento": 50,
    "totalSangria": 0,
    "valorLiquidoDinheiroCaixa": 55.9
  },
  "resumoPagamentos": {
    "total": 5.9,
    "totalLiquido": 5.9,
    "totalDinheiro": 5.9,
    "totalTroco": 0,
    "meiosPagamento": [
      {
        "nomeMeioPagamento": "DINHEIRO",
        "nomeFormaPagamentoFiscal": "dinheiro",
        "meioPagamentoId": "cmc6u1egv000fjkwxgqepw7c4",
        "valorContabilizado": 5.9
      }
    ]
  },
  "resumoFechamento": null
}
```

Detalhado acrescenta:

```json
{
  "totalProdutosVendidos": [{ "nome": "SUCO LIFE 300ML", "quantidade": 1, "valorLiquidoFinal": 5.9 }],
  "totalAdicionaisVendidos": []
}
```

`status` real: `aberto` \| `fechado` (não `Aberto`). Ator no lugar de `abertoPorId`. Estação no lugar de terminal.

### Movimentações

`POST .../suprimentos` e `POST .../sangrias` — body `{ valor, descricao }`. `descricao` min 5. `valor` > 0. **201**.

```json
{
  "id": "cmud54f4t0003pc01fcd2n7li",
  "valor": 50,
  "descricao": "Fundo de troco estudo",
  "operacaoCaixaId": "cmud54f3r0002pc01oazzp2pi",
  "realizadoPorAtor": { "id": "…", "type": "USUARIO_GESTOR", "sourceReference": "…", "nome": "Admin Gestor" },
  "dataCriacao": "2026-09-22T20:42:24.794Z"
}
```

`GET` sangrias/suprimentos da operação **aberta**: array (vazio se não houver). Sem caixa aberto o OpenAPI promete lista vazia; não retestado isolado após 404.

### Fechamento

`POST .../fechamento` — body só `{ valorFornecido }`. Responsável = ator do JWT. **200** `{ "operacaoCaixaId": "…" }`.

Evidência (esperado 55,90; informado 59,40):

```json
{
  "resumoFechamento": {
    "valorFornecido": 59.4,
    "diferencaValorFornecidoEValorCaixa": 3.5,
    "fechadoPorAtor": { "nome": "Admin Gestor", "type": "USUARIO_GESTOR" },
    "tempoOperacaoInSeconds": 1.358,
    "dataFechamento": "2026-09-22T20:42:26.108Z"
  }
}
```

Diferença = `valorFornecido - valorLiquidoDinheiroCaixa` (positivo = sobra no contado).

## Venda e delivery — o que entra no caixa

| Canal | Endpoint | `estacaoId` | Abre caixa? | `operacaoCaixaId` |
|-------|----------|-------------|-------------|-------------------|
| Balcão Gestor | `POST /gestor/vendas` | **obrigatório** | Sim, se não houver aberta | id da operação da estação |
| Delivery Gestor (Kanban) | `POST /delivery/pedidos` | **proibido** | Não no create. No **FINALIZADO**, na estação `gestorDelivery` | `null` no create; id da operação da receptora ao finalizar |
| Delivery público | `POST /delivery/pedidos/publico` | não existe | Igual ao Kanban no **FINALIZADO** | `null` no create |

O mapper atual de `buildCriarVendaGestorPayload` **não envia** `estacaoId`. Sem isso o create de balcão falha e o caixa da estação fica vazio. **Passar a enviar `getEstacaoImpressaoId()`.** Delivery **não** deve enviar `estacaoId`.

Pedidos PDV / terminal não entram neste módulo (`GET` de id de terminal no path de estação = 404).

## Regras para o Gestor

1. `GET current` 404 = caixa fechado. Não é erro fatal de tela.
2. CTA “Abrir caixa” = primeiro **suprimento** (fundo). Não inventar endpoint de abertura.
3. Sangria/suprimento só com `estacaoGestorId` válido. Descrição ≥ 5. Valor > 0.
4. Fechar só com caixa aberto. Mostrar `valorLiquidoDinheiroCaixa`; o usuário informa `valorFornecido`; exibir diferença.
5. Após fechar, nova venda balcão ou novo suprimento abre **nova** operação.
6. `POST sangria` com caixa fechado **abre** operação vazia (efeito colateral). A UI não deve chamar sangria se `GET current` for 404 — o CTA de abrir é só suprimento.
7. Delivery **não** leva `estacaoId`. No create, `operacaoCaixaId` fica `null`. O lançamento no caixa ocorre no **FINALIZADO**, na única estação com `gestorDelivery: true` (`ResolveEstacaoGestorDeliveryPolicy`). Sem receptora, finalizar falha. Só uma estação pode ser gestora.
8. Balcão: um caixa **por estação** (`estacaoId`). Dois PCs no mesmo `gestor-estacao-impressao-id` = o mesmo caixa. Duas estações = dois caixas de balcão. Delivery sempre na receptora.
9. Estação de outra empresa ou id de terminal no path de estação = 404 de estação, não de operação.

## Implicações de implementação

- BFF em `/api/caixa/operacao-caixa-estacao/*` (não misturar com `operacao-caixa-terminal`).
- Domain/DTO: `status: aberto | fechado`, `abertoPorAtor`, `estacao`, resumos. Não reusar `Caixa`/`OperacaoCaixa` mockados (`Aberto`, sem ator).
- Hook de atual: 404 → `{ aberta: false }`.
- Histórico: `GET` lista com `estacaoGestorId` deste PC.
- Cupom: mesmo layout de `DetalhesFechamento`, campos `abertoPorAtor` / `estacao` no lugar de terminal.
