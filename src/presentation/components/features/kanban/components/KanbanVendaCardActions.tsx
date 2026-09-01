'use client'

import {
  MdArrowForward,
  MdEditNote,
  MdLocationOn,
  MdPrint,
  MdSportsMotorsports,
  MdVisibility,
} from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import {
  COLUNAS_ENTREGA_OPERACIONAIS,
  deveExibirBotaoEmitirNotaNoKanban,
  rotuloBotaoAvancarEtapaKanban,
  rotuloBotaoEmissaoKanban,
  vendaBloqueadaParaEmissaoInterativa,
  kanbanVendaUsaCupomPublicoNfce,
} from '../rules/vendasKanban.rules'
import { KanbanCardAcaoButton } from './KanbanCardAcaoButton'
import type { ColunaKanbanId, KanbanColumn, Venda } from '../types'

const KANBAN_BUTTON_COLOR = '#530CA3'

const sxIconeAcao = {
  py: 0.5,
  minHeight: 32,
} as const

const classIconeAcao =
  '!min-w-0 !border-gray-300 !px-2 !text-gray-700 hover:!bg-gray-50'

export interface KanbanVendaCardActionsProps {
  venda: Venda
  column: KanbanColumn
  modoKanbanVendas: ModoKanbanVendas
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
  avancandoEtapaIds: Record<string, boolean>
  exibirAtribuirEntregador: boolean
  entregadorJaVinculado: boolean
  exibirQuickViewEntrega: boolean
  exibirBotaoObservacaoPedido: boolean
  exibirBotaoAlterarEndereco: boolean
  onAvancarEtapa: (venda: Venda, colunaAtual: ColunaKanbanId) => void
  onReimprimirCupomDelivery?: (venda: Venda, colunaAtual: ColunaKanbanId) => void
  onEmitirNfe: (venda: Venda) => void
  onAbrirEntregador: () => void
  onAbrirObservacao: () => void
  onAbrirEndereco: () => void
  onAbrirQuickView: (anchor: HTMLElement) => void
  onAbrirDocumentoVenda: (venda: Venda) => void
}

export function KanbanVendaCardActions(props: KanbanVendaCardActionsProps) {
  const {
    venda,
    column,
    modoKanbanVendas,
    acaoFiscalEmAndamentoPorVenda,
    avancandoEtapaIds,
    exibirAtribuirEntregador,
    entregadorJaVinculado,
    exibirQuickViewEntrega,
    exibirBotaoObservacaoPedido,
    exibirBotaoAlterarEndereco,
    onAvancarEtapa,
    onReimprimirCupomDelivery,
    onEmitirNfe,
    onAbrirEntregador,
    onAbrirObservacao,
    onAbrirEndereco,
    onAbrirQuickView,
    onAbrirDocumentoVenda,
  } = props

  const colunaAtual = column.id as ColunaKanbanId
  const mostrarAvancarEtapa =
    venda.isPedidoEntregaGestor() &&
    COLUNAS_ENTREGA_OPERACIONAIS.includes(colunaAtual) &&
    column.id !== 'COM_ENTREGADOR'
  const mostrarReimprimir =
    modoKanbanVendas === 'delivery' &&
    Boolean(onReimprimirCupomDelivery) &&
    venda.isPedidoEntregaGestor() &&
    colunaAtual !== 'NOVOS_PEDIDOS' &&
    COLUNAS_ENTREGA_OPERACIONAIS.includes(colunaAtual)
  const mostrarEmitirNota = deveExibirBotaoEmitirNotaNoKanban(
    colunaAtual,
    venda,
    acaoFiscalEmAndamentoPorVenda
  )
  const mostrarInutilizada =
    column.id === 'COM_FISCAL' && venda.statusFiscal === 'INUTILIZADA'
  const mostrarVerDocumento =
    column.id === 'COM_FISCAL' &&
    !acaoFiscalEmAndamentoPorVenda[venda.id] &&
    Boolean(venda.documentoFiscalId) &&
    (venda.statusFiscal === 'EMITIDA' || venda.statusFiscal === 'CANCELADA')
  const temIcones =
    exibirBotaoAlterarEndereco ||
    exibirBotaoObservacaoPedido ||
    exibirAtribuirEntregador ||
    exibirQuickViewEntrega
  const temAcoesTexto =
    mostrarAvancarEtapa ||
    mostrarReimprimir ||
    mostrarEmitirNota ||
    mostrarInutilizada ||
    mostrarVerDocumento
  const rotuloAvancar = rotuloBotaoAvancarEtapaKanban(colunaAtual, venda.tipoVenda)

  return (
    <div
      className="mt-0.5 flex flex-col gap-1"
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
    >
      {temIcones ? (
        <div className="flex justify-end gap-1">
          {exibirBotaoAlterarEndereco ? (
            <Button
              size="sm"
              variant="outlined"
              className={classIconeAcao}
              sx={sxIconeAcao}
              title="Alterar endereço de entrega"
              aria-label="Alterar endereço de entrega"
              onClick={e => {
                e.stopPropagation()
                onAbrirEndereco()
              }}
            >
              <MdLocationOn size={16} />
            </Button>
          ) : null}

          {exibirBotaoObservacaoPedido ? (
            <Button
              size="sm"
              variant="outlined"
              className={classIconeAcao}
              sx={sxIconeAcao}
              title="Adicionar observação ao pedido"
              aria-label="Adicionar observação ao pedido"
              onClick={e => {
                e.stopPropagation()
                onAbrirObservacao()
              }}
            >
              <MdEditNote size={16} />
            </Button>
          ) : null}

          {exibirAtribuirEntregador && (
            <Button
              size="sm"
              variant="outlined"
              className={`!min-w-0 !px-2 hover:!bg-gray-50 ${
                entregadorJaVinculado
                  ? '!border-secondary !text-secondary'
                  : '!border-gray-300 !text-gray-700'
              }`}
              sx={sxIconeAcao}
              title={entregadorJaVinculado ? 'Alterar entregador' : 'Entregador/Taxa'}
              aria-label={entregadorJaVinculado ? 'Alterar entregador' : 'Entregador/Taxa'}
              onClick={e => {
                e.stopPropagation()
                onAbrirEntregador()
              }}
            >
              <MdSportsMotorsports size={16} style={{ transform: 'scaleX(-1)' }} />
            </Button>
          )}

          {exibirQuickViewEntrega && (
            <Button
              size="sm"
              variant="outlined"
              className={classIconeAcao}
              sx={sxIconeAcao}
              title="Ver dados da entrega"
              aria-label="Ver dados da entrega"
              onClick={e => {
                e.stopPropagation()
                onAbrirQuickView(e.currentTarget)
              }}
            >
              <MdVisibility size={16} />
            </Button>
          )}
        </div>
      ) : null}

      {temAcoesTexto ? (
        <div className="flex items-stretch gap-1">
          {mostrarReimprimir ? (
            <Button
              size="sm"
              variant="outlined"
              className={`${classIconeAcao} !self-stretch`}
              sx={{ ...sxIconeAcao, minHeight: 36, py: 0.75 }}
              onClick={() => onReimprimirCupomDelivery?.(venda, colunaAtual)}
              title="Reimprimir"
              aria-label="Reimprimir"
            >
              <MdPrint size={16} />
            </Button>
          ) : null}

          {mostrarAvancarEtapa ? (
            <KanbanCardAcaoButton
              startIcon={!avancandoEtapaIds[venda.id] ? <MdArrowForward size={14} /> : undefined}
              onClick={() => onAvancarEtapa(venda, colunaAtual)}
              disabled={!!avancandoEtapaIds[venda.id]}
            >
              {avancandoEtapaIds[venda.id] ? rotuloAvancar.loading : rotuloAvancar.label}
            </KanbanCardAcaoButton>
          ) : null}

          {mostrarEmitirNota ? (
            <KanbanCardAcaoButton
              onClick={() => onEmitirNfe(venda)}
              disabled={vendaBloqueadaParaEmissaoInterativa(venda, acaoFiscalEmAndamentoPorVenda)}
              loading={Boolean(acaoFiscalEmAndamentoPorVenda[venda.id])}
            >
              {rotuloBotaoEmissaoKanban(venda, acaoFiscalEmAndamentoPorVenda)}
            </KanbanCardAcaoButton>
          ) : null}

          {mostrarInutilizada ? (
            <div className="flex flex-1 items-center justify-center rounded border border-gray-200 bg-gray-50 px-2 py-2 text-center text-xs text-gray-500">
              Venda com Nota Inutilizada
            </div>
          ) : null}

          {mostrarVerDocumento ? (
            <Button
              size="sm"
              variant="outlined"
              title={
                venda.statusFiscal === 'CANCELADA'
                  ? kanbanVendaUsaCupomPublicoNfce(venda)
                    ? 'Abrir cupom público da NFC-e (cancelada na SEFAZ)'
                    : 'Abrir PDF da nota (cancelada na SEFAZ)'
                  : kanbanVendaUsaCupomPublicoNfce(venda)
                    ? 'Abrir cupom público da NFC-e'
                    : undefined
              }
              className="flex-1"
              sx={{
                py: 0.75,
                px: 1,
                minHeight: 36,
                borderColor: KANBAN_BUTTON_COLOR,
                color: KANBAN_BUTTON_COLOR,
                '&:hover': {
                  borderColor: KANBAN_BUTTON_COLOR,
                  backgroundColor: 'rgba(83, 12, 163, 0.06)',
                },
              }}
              onClick={() => onAbrirDocumentoVenda(venda)}
            >
              Ver {venda.tipoDocFiscal === 'NFE' ? 'NFe' : 'NFCe'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
