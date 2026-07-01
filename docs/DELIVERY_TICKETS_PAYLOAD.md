# Payload de Venda Gestor e Tickets Delivery

## Criação/Edição da Venda Gestor

Na criação/edição da venda, o frontend pode enviar:

```json
{
  "tipoVenda": "entrega",
  "tempoPrevistoMinutos": 45,
  "entregadorId": "usuario-pdv-id"
}
```

Regras:

- `tipoVenda` é a fonte da verdade: `entrega`, `retirada`, `balcao`.
- Não existe `metodologiaEntrega`.
- Se enviar `previsaoEntrega`, ela tem prioridade.
- Se não enviar `previsaoEntrega`, o backend calcula usando `dataCriacao + tempoPrevistoMinutos`.
- Se não enviar nenhum dos dois na criação, o backend usa 30 minutos.
- `entregadorId` deve ser um `UsuarioPdv` ativo com `tipoUsuarioPdv = "entregador"`.

## Tickets

O BFF `GET /api/vendas/gestor/:id/tickets` apenas repassa a resposta da API
`GET /api/v1/gestor/vendas/{id}/tickets?estacaoImpressaoId=...`. Para preencher
os modelos de produção e expedição, a API deve enviar os campos abaixo. Este
contrato é exclusivo de impressão e não deve alterar a lógica fiscal/montagem da
venda.

```json
{
  "vendaId": "uuid",
  "numeroVenda": 22,
  "codigoVenda": "TBIMLFJA",
  "tipoVenda": "entrega",
  "dataPedido": "2026-05-02T15:18:00.000Z",
  "dataPrevista": "2026-05-02T16:03:00.000Z",
  "tiradoPor": {
    "id": "uuid",
    "usuarioId": "uuid",
    "nome": "Maria Operadora",
    "tipoUsuario": "gestor"
  },
  "entregador": {
    "id": "uuid",
    "usuarioId": "uuid",
    "nome": "Thauan Barcelos",
    "telefone": "(65) 99999-9999",
    "tipoUsuario": "entregador"
  },
  "cliente": {
    "id": "uuid",
    "nome": "Alberto Barcelos",
    "telefone": "(65) 9 9293-4536",
    "celular": "(65) 9 9293-4536"
  },
  "enderecoEntrega": {
    "rua": "Rua Teste",
    "numero": "123",
    "complemento": "Casa",
    "bairro": "Bairro",
    "cidade": "Cidade",
    "uf": "MT",
    "cep": "12345678",
    "referencia": "Proximo ao mercado"
  },
  "resumoPedido": {
    "valorItens": 20,
    "valorAdicionais": 2,
    "taxaEntrega": 8,
    "valorTotal": 30
  },
  "pagamento": {
    "status": "pendente",
    "cobrarCliente": true,
    "meioPagamento": "dinheiro",
    "valorReceber": 30,
    "valorRecebido": 0,
    "valorFaltante": 30,
    "meios": []
  },
  "empresa": {
    "nomeExibicao": "Espeto do Joaquim",
    "cnpj": "12.345.678/0001-90",
    "telefone": "(65) 3000-0000"
  },
  "tickets": [
    {
      "tipoCupom": "producao",
      "itens": []
    },
    {
      "tipoCupom": "expedicao",
      "itens": []
    }
  ]
}
```

Regras importantes:

- Nao criar `metodologiaEntrega`. O campo `tipoVenda` e a fonte da verdade para
  o topo do cupom, normalizado no frontend para `Balcao`, `Retirada` ou
  `Entrega`.
- `dataPedido` e obrigatorio e deve representar a data/hora real de criacao do
  pedido.
- `dataPrevista` e obrigatorio. Deve ser calculado pelo backend a partir das
  configuracoes da empresa:
  - tempo previsto para entrega;
  - tempo previsto para retirada.
- `entregador` deve referenciar um usuario PDV do tipo `entregador`. Se a tabela
  atual de usuarios nao diferencia entregadores, evoluir o schema para permitir
  essa classificacao/relacionamento antes de popular o campo.
- Nao alterar a estrutura fiscal dos complementos nem a forma como a venda e
  montada. Qualquer dado extra para impressao deve ser calculado somente no
  payload de tickets.
- Para resolver `nomeImpressoraWindows`, o frontend passa `estacaoImpressaoId`
  no `/tickets`. Sem esse parâmetro, o backend ainda retorna tickets, mas pode
  retornar sem o nome Windows/QZ.

Exemplo de complemento com dado extra apenas para impressao:

```json
{
  "nome": "Limao e gelo",
  "quantidade": 1,
  "impressao": {
    "valorFinal": 2
  }
}
```
