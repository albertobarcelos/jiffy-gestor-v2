# Impressão de cupom delivery (Gestor → Jiffy Print)

O Gestor **não imprime**. Ele monta um `PrintJob` (`jobId` + documento) e envia
ao agente local neste PC (`127.0.0.1:38471`). O **Jiffy Print** (Go) é a única
autoridade local: persiste, renderiza ESC/POS e manda ao spooler Windows ou
TCP 9100.

Fiscal, Flutter/PDV e o Print Orchestrator (Node) ficam de fora deste fluxo.

```
API tickets → planner (normal / agrupado / unidade / conferência)
           → layout 80 mm (um modelo de linhas)
           → produção: híbrido (pílula PNG + texto ESC/POS)
           → expedição: gráfico (foto do HTML) ou texto ESC/POS
           → POST /v1/jobs → Jiffy Print
```

Contrato do payload: `docs/DELIVERY_TICKETS_PAYLOAD.md`.

## Três caminhos de documento

| Via | Mapper | `modoPapel` (modelo visual) |
|---|---|---|
| Produção | `mapTicketToProducaoHibridoDocument` | Ignorado. Cozinha sempre híbrida. |
| Expedição gráfico | `mapTicketToGraphicPrintDocument` | `grafico` — raster do HTML |
| Expedição texto | `mapTicketToPrintDocument` | `texto` — ESC/POS nativo |

O toggle **texto / gráfico** vale só para expedição. Ligar “texto” não muda a
via de produção.

Preview HTML (`renderDeliveryCupomHtml`) e impressão de produção compartilham
`montarModeloProducao80mm`. Expedição gráfico e texto compartilham
`detalheLinhasItemPedido` (`2x NOME`, `+` / `-` / `*`, `Obs:`).

## Via de produção (híbrido)

Um único modelo 80 mm (`layoutProducao80mm.ts`) vira:

1. **Pílulas PNG** — senha, `PEDIDO codigo - i DE N` (unidade), identidade
   (tipo / código / cliente). Texto longo parte em duas pílulas para não
   encolher a fonte.
2. **Texto ESC/POS** — item Font A 2×2 (`double`), complemento Font B 2×2
   (`double-b`), resumo centralizado (`N ITENS • Impressora | HH:MM | Atend:`).
3. **Folga** — 4 linhas antes do corte.

Reimpressão: `** REIMPRESSAO **` no topo, negrito, tamanho normal (sem pílula).

O planner (`planejarTicketsProducaoImpressora`) decide as vias:

- `normal` / `agrupado` → uma via (`kind: single`)
- `porUnidade` → uma via por unidade + conferência se houver mais de uma
- `ficha` no delivery vira `normal`

## Expedição

Cupom de entrega/retirada/balcão com valores, endereço, QR WhatsApp e pagamento.
Itens no tamanho do cupom (não 2×2 da cozinha): nome à esquerda, preço à
direita; nome longo é cortado, valor não.

## Agente

Este PC precisa do Jiffy Print **1.1.3+** para `size: "double-b"` e imagem
sem pad extra da faca. Versão antiga trata `double-b` como texto normal e
pode “comer” pílula.

`jobId` é estável por venda + tipo + ticket. Reimpressão muda o id
(`-reprint-`) para não cair na idempotência.

## O que não entra aqui

- Emitir NF / NFC-e
- Flutter / PDV
- MQTT / orquestrador cloud
- Destino físico (Windows vs `tcp://IP:9100`) — fica no vínculo da estação
