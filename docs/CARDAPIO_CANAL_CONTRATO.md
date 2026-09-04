# Cardápio — contrato de canal (alinhamento backend)

Documento para alinhar com o Wilcker **antes** de mesa/QR/comanda na UI.

> **Status:** proposta frontend  
> **App interno:** `apps/jiffy-cardapio` (mesmo Git do Gestor)  
> **Não** é outro repositório no dia 1.

## 1. Objetivo

O cliente abre **um** Cardápio. O que muda é o **canal** do pedido, não o catálogo.

| Canal | Uso | UI hoje |
|-------|-----|---------|
| `entrega` | Delivery com endereço | Sim (`tipoEntrega`) |
| `retirada` | Retirada na loja | Sim (`tipoEntrega`) |
| `mesa` | QR / tablet na mesa | Reservado |
| `comanda` | Conta aberta | Reservado |

## 2. Payload atual (create público)

`POST /api/v1/delivery/pedidos/publico` (via BFF `/api/public/delivery/pedidos`):

```json
{
  "slug": "minha-loja",
  "origem": "JIFFY_DELIVERY",
  "tokenCotacao": "...",
  "tipoEntrega": "entrega",
  "cliente": { "telefone": "65999999999", "enderecoIdEntrega": "..." },
  "produtos": [],
  "cobrancas": []
}
```

Hoje `origem` é literal `JIFFY_DELIVERY` e `tipoEntrega` só `entrega | retirada`.

## 3. Proposta estável (extensão, sem breaking)

Manter `tipoEntrega` para logística (entrega/retirada) e acrescentar **`canal`**:

```ts
type CanalPedidoCardapio = 'entrega' | 'retirada' | 'mesa' | 'comanda'
```

Exemplos:

```json
{ "canal": "entrega", "tipoEntrega": "entrega", "origem": "JIFFY_DELIVERY" }
{ "canal": "retirada", "tipoEntrega": "retirada", "origem": "JIFFY_DELIVERY" }
{ "canal": "mesa", "mesaId": "12", "origem": "JIFFY_DELIVERY" }
{ "canal": "comanda", "comandaCodigo": "A-42", "origem": "JIFFY_DELIVERY" }
```

Regras:

- Enquanto a UI não tiver mesa/comanda, o Cardápio envia `canal` espelhando `tipoEntrega` (`entrega` ou `retirada`).
- Backend pode ignorar `canal` até implementar; o campo já nasce no contrato do app.
- `origem: JIFFY_DELIVERY` continua = pedido pelo Cardápio Jiffy (não confundir com canal físico).

## 4. URLs alvo (produto)

| Superfície | Path |
|------------|------|
| Loja | `/{slug}` ou `cardapio.jiffy.run/{slug}` |
| Carrinho | `/{slug}/carrinho` |
| Mesa | `/{slug}/mesa/{mesaId}` |
| Comanda | `/{slug}/comanda/{codigo}` |

Legado no Gestor: `/delivery/{slug}` e `/cardapio/{slug}` → redirect para o host do Cardápio.

## 5. O que falta o backend confirmar

- [ ] Aceitar `canal` opcional no create/cotação públicos
- [ ] Campos `mesaId` / `comandaCodigo` quando canal for mesa/comanda
- [ ] Kanban: não tratar `mesa`/`comanda` como entrega (sem motoboy / cobertura)
