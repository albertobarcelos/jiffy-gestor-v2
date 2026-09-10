'use client'

import { MdAccessTime, MdLocationOn, MdPhone } from 'react-icons/md'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  formatarCelularExibicao,
  formatarEnderecoEntregaMultilinha,
  formatarHoraDetalhePedido,
  formatarHoraPrevisaoEntrega,
  formatarTipoPagamentoDetalhe,
  rotuloCobrancaEntrega,
  rotuloOrigemExibicao,
} from '@/src/application/mappers/PedidoDisplayMapper'
import { PedidoKanbanProgressoEntrega } from '@/src/presentation/components/features/delivery/kanban-panels/PedidoKanbanProgressoEntrega'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoDetalheContext'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import {
  colunaKanbanDeStatusEtapa,
  rotuloEtapaDetalhePedido,
  rotuloTipoAtendimento,
} from '../utils/detalheVisaoUnica'

function Cartao({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      {children}
    </section>
  )
}

export function PedidoDetalhesVisaoUnica() {
  const { detalhesPedidoMeta, detalhesEntregaPedido } = useNovoPedidoDetalheContext()
  const {
    clienteNome,
    origem,
    produtos,
    pagamentos,
    meiosPagamento,
    nomesMeiosPagamentoPedido,
    fluxoPagamentoEntrega,
    totalProdutos,
    valorFinalVenda,
    observacaoPedido,
  } = useNovoPedidoFormContext()

  const numero = detalhesPedidoMeta?.numeroVenda
  const codigo = detalhesPedidoMeta?.codigoVenda?.trim()
  const tipoVenda = detalhesPedidoMeta?.tipoVenda
  const coluna = colunaKanbanDeStatusEtapa(detalhesPedidoMeta?.statusEtapaOperacional)
  const etapa = rotuloEtapaDetalhePedido(coluna, tipoVenda)
  const horaCriacao = formatarHoraDetalhePedido(detalhesPedidoMeta?.dataCriacao)
  const previsao = formatarHoraPrevisaoEntrega(
    detalhesEntregaPedido?.previsaoEntrega,
    detalhesPedidoMeta?.dataCriacao
  )
  const celular = formatarCelularExibicao(detalhesEntregaPedido?.clienteCelular)
  const enderecoLinhas = formatarEnderecoEntregaMultilinha(
    detalhesEntregaPedido?.enderecoEntrega
  )
  const produtosAtivos = produtos.filter(p => !p.removido)
  const tipoPagamento = formatarTipoPagamentoDetalhe(
    pagamentos,
    meiosPagamento ?? [],
    nomesMeiosPagamentoPedido ?? {}
  )
  const total =
    valorFinalVenda != null && !Number.isNaN(Number(valorFinalVenda))
      ? Number(valorFinalVenda)
      : totalProdutos
  const taxa = detalhesEntregaPedido?.taxaEntrega?.valor
  const observacao = (
    observacaoPedido ||
    detalhesEntregaPedido?.observacaoPedido ||
    ''
  ).trim()

  return (
    <div className="space-y-3 bg-gray-50 py-2" role="tabpanel" aria-labelledby="tab-detalhes-info-pedido">
      <Cartao>
        <div className="flex flex-wrap items-start gap-3">
          <div className="rounded-lg border-2 border-gray-800 px-3 py-1 text-2xl font-bold tabular-nums text-gray-900">
            {numero != null ? String(numero).padStart(4, '0') : '—'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight text-gray-900">
              {clienteNome?.trim() || 'SEM CLIENTE'}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Feito às {horaCriacao}
              {codigo ? ` · #${codigo}` : ''}
              {origem ? ` · ${rotuloOrigemExibicao(origem)}` : ''}
              {' · '}
              {rotuloTipoAtendimento(tipoVenda)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
          {previsao !== '—' ? (
            <span className="inline-flex items-center gap-1">
              <MdAccessTime className="h-4 w-4 text-primary" aria-hidden />
              Entrega prevista: {previsao}
            </span>
          ) : null}
          {celular !== '—' ? (
            <span className="inline-flex items-center gap-1">
              <MdPhone className="h-4 w-4 text-primary" aria-hidden />
              {celular}
            </span>
          ) : null}
        </div>
      </Cartao>

      <Cartao>
        <p className="text-base font-bold text-emerald-600">{etapa}</p>
        <div className="mt-2">
          <PedidoKanbanProgressoEntrega
            colunaAtual={coluna}
            dataCriacao={detalhesPedidoMeta?.dataCriacao}
            detalhesEntrega={detalhesEntregaPedido}
          />
        </div>
      </Cartao>

      {enderecoLinhas.length > 0 && enderecoLinhas[0] !== '—' ? (
        <Cartao>
          <div className="flex items-start gap-2">
            <MdLocationOn className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Endereço
              </p>
              {enderecoLinhas.map((linha, index) => (
                <p key={`${linha}-${index}`} className="text-sm text-gray-900">
                  {linha}
                </p>
              ))}
            </div>
          </div>
        </Cartao>
      ) : null}

      <Cartao>
        <p className="mb-2 text-sm font-semibold text-gray-900">Itens no pedido</p>
        {produtosAtivos.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum produto</p>
        ) : (
          <ul className="space-y-2">
            {produtosAtivos.map(produto => (
              <li
                key={produto.produtoLancadoId ?? `${produto.produtoId}-${produto.nome}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-gray-900">
                    <span className="font-semibold">{produto.quantidade}x</span> {produto.nome}
                  </p>
                  {produto.observacao?.trim() ? (
                    <p className="text-xs text-gray-500">Obs: {produto.observacao.trim()}</p>
                  ) : null}
                  {produto.complementos.map(comp => (
                    <p key={`${comp.id}-${comp.nome}`} className="pl-3 text-xs text-gray-600">
                      {comp.quantidade}x {comp.nome}
                    </p>
                  ))}
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-gray-900">
                  {transformarParaReal(produto.valorFinal ?? produto.valorUnitario)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {observacao ? (
          <p className="mt-3 border-t border-gray-100 pt-2 text-sm text-gray-700">
            <span className="font-semibold">Obs:</span> {observacao}
          </p>
        ) : null}

        <div className="mt-3 space-y-1 border-t border-gray-100 pt-2 text-sm">
          {taxa != null && taxa > 0 ? (
            <div className="flex justify-between text-gray-700">
              <span>Taxa de entrega</span>
              <span className="tabular-nums">{transformarParaReal(taxa)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span className="tabular-nums">{transformarParaReal(total)}</span>
          </div>
          <p className="pt-1 text-xs text-gray-600">
            {rotuloCobrancaEntrega(fluxoPagamentoEntrega)}
            {tipoPagamento !== '—' ? ` · ${tipoPagamento}` : ''}
          </p>
        </div>
      </Cartao>
    </div>
  )
}
