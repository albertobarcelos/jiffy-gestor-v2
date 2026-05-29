'use client'

import { useMemo, type ReactNode } from 'react'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  formatarCelularExibicao,
  formatarCpfCnpjExibicao,
  formatarDataDetalhePedido,
  formatarEnderecoEntregaCompleto,
  formatarPrevisaoEntregaExibicao,
  formatarTaxaEntregaDetalheExibicao,
  formatarTipoPagamentoDetalhe,
  rotuloCobrancaEntrega,
  taxaEntregaTemValor,
} from '../novoPedidoDetalheHelpers'
import type { DetalhesEntregaPedido, FluxoPagamentoEntrega, PagamentoSelecionado } from '../types'

function LinhaDetalhe({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-1">
      <span className="shrink-0 text-gray-600">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export interface PedidoEntregaDetalheConteudoProps {
  detalhesEntrega: DetalhesEntregaPedido | null | undefined
  clienteNome?: string | null
  fluxoPagamentoEntrega?: FluxoPagamentoEntrega | null
  pagamentos?: PagamentoSelecionado[]
  nomesMeiosPagamento?: Record<string, string>
  valorPedido?: number | null
  nomeEntregador?: string | null
  trocoExibicao?: number | null
  exibirTitulo?: boolean
  className?: string
}

export function PedidoEntregaDetalheConteudo({
  detalhesEntrega,
  clienteNome,
  fluxoPagamentoEntrega = 'cobrar_entregador',
  pagamentos = [],
  nomesMeiosPagamento = {},
  valorPedido,
  nomeEntregador,
  trocoExibicao,
  exibirTitulo = true,
  className = '',
}: PedidoEntregaDetalheConteudoProps) {
  const nomeCliente = detalhesEntrega?.clienteNome || clienteNome || '—'

  const troco =
    trocoExibicao != null && trocoExibicao > 0
      ? trocoExibicao
      : detalhesEntrega?.trocoApi != null && detalhesEntrega.trocoApi > 0
        ? detalhesEntrega.trocoApi
        : 0

  const valorExibicao =
    valorPedido != null && !Number.isNaN(Number(valorPedido)) ? Number(valorPedido) : null

  const tipoPagamentoExibicao = useMemo(
    () => formatarTipoPagamentoDetalhe(pagamentos, [], nomesMeiosPagamento),
    [pagamentos, nomesMeiosPagamento]
  )

  const entregadorExibicao = nomeEntregador?.trim() || '—'

  return (
    <div className={`flex flex-col gap-3 text-sm ${className}`.trim()}>
      {exibirTitulo && <h3 className="text-base font-semibold text-gray-900">Dados da Entrega</h3>}
      <LinhaDetalhe
        label="Pagamento:"
        value={rotuloCobrancaEntrega(fluxoPagamentoEntrega)}
      />
      <LinhaDetalhe label="Tipo Pagamento:" value={tipoPagamentoExibicao} />
      <LinhaDetalhe
        label="Valor:"
        value={valorExibicao != null ? transformarParaReal(valorExibicao) : '—'}
      />
      <LinhaDetalhe
        label="Troco:"
        value={troco > 0 ? transformarParaReal(troco) : '—'}
      />
      {taxaEntregaTemValor(detalhesEntrega?.taxaEntrega) && (
        <LinhaDetalhe
          label="Taxa de entrega (já cobrada no valor):"
          value={formatarTaxaEntregaDetalheExibicao(
            detalhesEntrega?.taxaEntrega,
            transformarParaReal
          )}
        />
      )}
      <LinhaDetalhe label="Entregador:" value={entregadorExibicao} />
      <LinhaDetalhe label="Cliente:" value={nomeCliente} />
      <LinhaDetalhe
        label="CPF/CNPJ:"
        value={formatarCpfCnpjExibicao(detalhesEntrega?.clienteCpfCnpj)}
      />
      <LinhaDetalhe
        label="Celular:"
        value={formatarCelularExibicao(detalhesEntrega?.clienteCelular)}
      />
      <div className="flex flex-col gap-1 px-1">
        <span className="text-gray-600">Endereço de Entrega:</span>
        <span className="font-medium leading-snug">
          {formatarEnderecoEntregaCompleto(detalhesEntrega?.enderecoEntrega)}
        </span>
      </div>
      <LinhaDetalhe
        label="Previsão de Entrega:"
        value={formatarPrevisaoEntregaExibicao(
          detalhesEntrega?.previsaoEntrega,
          formatarDataDetalhePedido
        )}
      />
      <div className="flex flex-col gap-1 px-1">
        <span className="text-gray-600">Observação do Pedido:</span>
        <span className="font-medium leading-snug">
          {detalhesEntrega?.observacaoPedido?.trim() || '—'}
        </span>
      </div>
      <LinhaDetalhe
        label="Data Início Preparo:"
        value={formatarDataDetalhePedido(detalhesEntrega?.dataInicioPreparo)}
      />
      <LinhaDetalhe
        label="Data Pronto:"
        value={formatarDataDetalhePedido(detalhesEntrega?.dataPronto)}
      />
      <LinhaDetalhe
        label="Data da Saída (entrega):"
        value={formatarDataDetalhePedido(detalhesEntrega?.dataSaidaEntrega)}
      />
    </div>
  )
}
