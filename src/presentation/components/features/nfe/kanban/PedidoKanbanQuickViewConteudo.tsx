'use client'

import { useDragScroll } from '@/src/presentation/hooks/useDragScroll'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { cn } from '@/src/shared/utils/cn'
import {
  formatarCelularExibicao,
  formatarCpfCnpjExibicao,
  formatarEnderecoEntregaMultilinha,
} from '../novo-pedido/novoPedidoDetalheHelpers'
import { PedidoKanbanProgressoEntrega } from './PedidoKanbanProgressoEntrega'
import { PedidoKanbanQuickViewWhatsappAcoes } from './PedidoKanbanQuickViewWhatsappAcoes'
import type { PedidoKanbanQuickViewData } from './carregarPedidoKanbanQuickView'
import type { ColunaKanbanId } from './types'

interface PedidoKanbanQuickViewConteudoProps {
  dados: PedidoKanbanQuickViewData
  nomeEmpresa: string
  colunaAtual: ColunaKanbanId
  tipoVenda: 'entrega' | 'retirada'
}

function Separador() {
  return <div className="my-1 border-t border-dashed border-gray-300" />
}

function LinhaCompacta({
  label,
  value,
  className = '',
}: {
  label?: string
  value: string
  className?: string
}) {
  if (label) {
    return (
      <p className={`text-[11px] leading-tight text-gray-800 ${className}`.trim()}>
        <span className="text-gray-600">{label}</span> {value}
      </p>
    )
  }
  return (
    <p className={`text-[11px] leading-tight text-gray-800 ${className}`.trim()}>{value}</p>
  )
}

function LinhaTotal({
  label,
  valor,
  destaque = false,
}: {
  label: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-2 text-[11px] leading-tight ${
        destaque ? 'rounded bg-secondary px-2 py-1 text-white' : ''
      }`.trim()}
    >
      <span className={destaque ? 'font-medium text-white' : 'text-gray-700'}>{label}</span>
      <span
        className={`shrink-0 font-semibold tabular-nums ${
          destaque ? 'text-white' : 'text-gray-900'
        }`.trim()}
      >
        {valor}
      </span>
    </div>
  )
}

function montarRotuloPedido(numeroVenda: number | null, codigoVenda: string | null): string {
  if (numeroVenda == null && !codigoVenda) return '—'
  const numero = numeroVenda != null ? String(numeroVenda) : '—'
  const codigo = codigoVenda ? ` - #${codigoVenda}` : ''
  return `${numero}${codigo}`
}

function rotuloPagamentoPedidoQuickView(
  fluxo: PedidoKanbanQuickViewData['fluxoPagamentoEntrega']
): string {
  return fluxo === 'cobrar_entregador' ? 'COBRAR NA ENTREGA' : 'PAGO'
}

export function PedidoKanbanQuickViewConteudo({
  dados,
  nomeEmpresa,
  colunaAtual,
  tipoVenda,
}: PedidoKanbanQuickViewConteudoProps) {
  const { ref: scrollRef, isDragging, dragScrollProps } = useDragScroll()
  const cpfCnpj = formatarCpfCnpjExibicao(dados.detalhesEntrega.clienteCpfCnpj)
  const cpfCnpjExibicao = cpfCnpj === '—' ? '' : cpfCnpj
  const enderecoLinhas = formatarEnderecoEntregaMultilinha(dados.detalhesEntrega.enderecoEntrega)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border-2 border-secondary">
      <div
        ref={scrollRef}
        {...dragScrollProps}
        className={cn(
          'scrollbar-hide min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2 text-[11px] leading-tight text-gray-800',
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        )}
      >
        <p className="text-sm font-semibold text-secondary text-center">Dados do Pedido</p>
        <LinhaCompacta value={nomeEmpresa || 'Empresa'} className="font-medium text-secondary text-center" />
        <Separador />
        <div className="text-[11px] leading-tight">
          <span className="text-gray-600">Pedido:</span>{' '}
          {montarRotuloPedido(dados.numeroVenda, dados.codigoVenda)}
        </div>
        <LinhaCompacta label="Cliente:" value={dados.clienteNome} className="font-medium text-secondary" />
        <LinhaCompacta
          label="Celular:"
          value={formatarCelularExibicao(dados.detalhesEntrega.clienteCelular)}
        />
        {cpfCnpjExibicao && (
          <LinhaCompacta label="CPF/CNPJ:" value={cpfCnpjExibicao} />
        )}

        <Separador />

        <PedidoKanbanProgressoEntrega
          colunaAtual={colunaAtual}
          dataCriacao={dados.dataCriacao}
          detalhesEntrega={dados.detalhesEntrega}
        />
        <Separador />

        <LinhaCompacta label="Entregador:" value={dados.nomeEntregador} className="text-secondary pt-2" />
        {dados.telefoneEntregador && (
          <LinhaCompacta
            label="Celular:"
            value={formatarCelularExibicao(dados.telefoneEntregador)}
          />
        )}
        <LinhaCompacta
          label="Pagamento:"
          value={rotuloPagamentoPedidoQuickView(dados.fluxoPagamentoEntrega)}
          className="text-secondary pt-1"
        />
        <LinhaCompacta
          label="Tipo Pagamento:"
          value={dados.tipoPagamento ?? '—'}
          className="text-secondary"
        />

        <Separador />

        <p className="text-md pt-2 font-medium leading-tight text-secondary">Endereço para entrega</p>
        <div className="space-y-0.5 pl-0">
          {enderecoLinhas.map((linha, index) => (
            <p key={`${linha}-${index}`} className="text-[11px] leading-tight text-gray-800">
              {linha}
            </p>
          ))}
        </div>

        <Separador />

        <p className="text-[11px] font-semibold text-secondary">Pedido:</p>
        {dados.produtos.length === 0 ? (
          <p className="text-[11px] text-gray-500">Nenhum produto</p>
        ) : (
          <div className="space-y-1">
            {dados.produtos.map((produto, index) => (
              <div key={`${produto.nome}-${index}`}>
                <p className="text-[11px] leading-tight text-gray-800">
                  {produto.quantidade}x {produto.nome}
                </p>
                {produto.complementos.map((comp, compIndex) => (
                  <p
                    key={`${comp.nome}-${compIndex}`}
                    className="pl-3 text-[11px] leading-tight text-gray-700"
                  >
                    {comp.quantidade}x {comp.nome}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-0.5 pt-1">
          <LinhaTotal label="Total do Pedido" valor={transformarParaReal(dados.totalItens)} />
          {dados.taxaEntrega > 0 && (
            <LinhaTotal label="Taxa de Entrega" valor={transformarParaReal(dados.taxaEntrega)} />
          )}
          <Separador />
          {dados.totalAReceber > 0 && (
            <LinhaTotal
              label="Total a Receber"
              valor={transformarParaReal(dados.totalAReceber)}
              destaque
            />
          )}
          {dados.troco > 0 && (
            <LinhaTotal label="Levar Troco" valor={transformarParaReal(dados.troco)} />
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-dashed border-gray-300 p-2">
        <PedidoKanbanQuickViewWhatsappAcoes
          dados={dados}
          nomeEmpresa={nomeEmpresa}
          colunaAtual={colunaAtual}
          tipoVenda={tipoVenda}
        />
      </div>
    </div>
  )
}
