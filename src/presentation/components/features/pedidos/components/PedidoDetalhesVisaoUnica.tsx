'use client'

import { MdAccessTime, MdLocationOn, MdSportsMotorsports } from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
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
import { montarMensagemWhatsappClienteKanban } from '@/src/application/delivery/montarMensagemWhatsappClienteKanban'
import { montarMensagemWhatsappEntregadorKanban } from '@/src/application/delivery/montarMensagemWhatsappEntregadorKanban'
import { PedidoKanbanProgressoEntrega } from '@/src/presentation/components/features/delivery/kanban-panels/PedidoKanbanProgressoEntrega'
import type { PedidoKanbanQuickViewData } from '@/src/presentation/components/features/delivery/kanban-panels/carregarPedidoKanbanQuickView'
import { abrirWhatsapp, telefoneValidoParaWhatsapp } from '@/src/shared/utils/whatsappLink'
import { showToast } from '@/src/shared/utils/toast'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoDetalheContext'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../context/NovoPedidoUIContext'
import {
  resolverColunaDetalhePedido,
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

function enviarWhatsapp(telefone: string | null | undefined, mensagem: string, alvo: string) {
  if (!telefoneValidoParaWhatsapp(telefone)) {
    showToast.error(`Cadastre um celular válido para o ${alvo}.`)
    return
  }
  const abriu = abrirWhatsapp(telefone, mensagem)
  if (!abriu) {
    showToast.error(`Não foi possível abrir o WhatsApp para o ${alvo}.`)
  }
}

function BotaoWhatsappNumero({
  telefone,
  label,
  onClick,
}: {
  telefone: string | null | undefined
  label: string
  onClick: () => void
}) {
  const valido = telefoneValidoParaWhatsapp(telefone)
  const numero = formatarCelularExibicao(telefone)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!valido}
      className="inline-flex items-center gap-1 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      title={valido ? `Abrir WhatsApp do ${label}` : `${label} sem celular cadastrado`}
    >
      <FaWhatsapp className="h-4 w-4 shrink-0 text-[#25D366]" aria-hidden />
      <span>{numero !== '—' ? numero : 'sem celular'}</span>
    </button>
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
    entregadores,
    trocoLancamento,
  } = useNovoPedidoFormContext()
  const { empresa } = useNovoPedidoUIContext()

  const numero = detalhesPedidoMeta?.numeroVenda
  const codigo = detalhesPedidoMeta?.codigoVenda?.trim()
  const tipoVenda = detalhesPedidoMeta?.tipoVenda
  const coluna = resolverColunaDetalhePedido({
    statusEtapaOperacional: detalhesPedidoMeta?.statusEtapaOperacional,
    detalhesEntrega: detalhesEntregaPedido,
  })
  const etapa = rotuloEtapaDetalhePedido(coluna, tipoVenda)
  const horaCriacao = formatarHoraDetalhePedido(detalhesPedidoMeta?.dataCriacao)
  const previsao = formatarHoraPrevisaoEntrega(
    detalhesEntregaPedido?.previsaoEntrega,
    detalhesPedidoMeta?.dataCriacao
  )
  const celularCliente = detalhesEntregaPedido?.clienteCelular
  const celularExibicao = formatarCelularExibicao(celularCliente)
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
  const tipoAtendimento = String(tipoVenda ?? '').trim().toLowerCase()
  const pedidoEntrega = tipoAtendimento === 'entrega' || tipoAtendimento === 'delivery'
  const tipoWhatsapp = tipoAtendimento === 'retirada' ? 'retirada' : 'entrega'

  const entregadorDaLista = entregadores?.find(
    e => e.id === detalhesEntregaPedido?.entregadorId
  )
  const nomeEntregador =
    detalhesEntregaPedido?.entregadorNome?.trim() ||
    entregadorDaLista?.nome?.trim() ||
    ''
  const telefoneEntregador =
    detalhesEntregaPedido?.entregadorTelefone?.trim() ||
    entregadorDaLista?.telefone?.trim() ||
    ''
  const troco =
    detalhesEntregaPedido?.trocoApi != null && detalhesEntregaPedido.trocoApi > 0
      ? detalhesEntregaPedido.trocoApi
      : trocoLancamento > 0
        ? trocoLancamento
        : 0

  const dadosWhatsapp: PedidoKanbanQuickViewData = {
    numeroVenda: numero ?? null,
    codigoVenda: codigo || null,
    dataCriacao: detalhesPedidoMeta?.dataCriacao ?? null,
    detalhesEntrega: detalhesEntregaPedido ?? {},
    clienteNome: clienteNome?.trim() || 'SEM CLIENTE',
    nomeEntregador: nomeEntregador || '—',
    telefoneEntregador: telefoneEntregador || null,
    produtos: produtosAtivos.map(produto => ({
      nome: produto.nome,
      quantidade: produto.quantidade,
      observacao: produto.observacao?.trim() || undefined,
      complementos: produto.complementos.map(comp => ({
        nome: comp.nome,
        quantidade: comp.quantidade,
      })),
    })),
    totalItens: totalProdutos,
    taxaEntrega: taxa ?? 0,
    totalAReceber: fluxoPagamentoEntrega === 'ja_pago' ? 0 : total,
    troco,
    fluxoPagamentoEntrega,
    tipoPagamento,
    observacaoPedido: observacao || null,
  }

  const handleWhatsappCliente = () => {
    const mensagem = montarMensagemWhatsappClienteKanban({
      clienteNome: dadosWhatsapp.clienteNome,
      colunaAtual: coluna,
      tipoVenda: tipoWhatsapp,
      dados: dadosWhatsapp,
      enderecoEmpresa: empresa?.endereco,
      nomeEmpresa: empresa?.nomeExibicao ?? '',
    })
    enviarWhatsapp(celularCliente, mensagem, 'cliente')
  }

  const handleWhatsappEntregador = () => {
    const mensagem = montarMensagemWhatsappEntregadorKanban({
      dados: dadosWhatsapp,
      nomeEmpresa: empresa?.nomeExibicao ?? '',
    })
    enviarWhatsapp(telefoneEntregador, mensagem, 'entregador')
  }

  return (
    <div className="space-y-3 bg-gray-50 py-2" role="tabpanel" aria-labelledby="tab-detalhes-info-pedido">
      <Cartao>
        <div className="flex flex-wrap items-center justify-between gap-3 pr-5">
          {pedidoEntrega ? null : (
            <div className="rounded-lg border-2 border-gray-800 px-3 py-1 text-2xl font-bold tabular-nums text-gray-900">
              {numero != null ? String(numero).padStart(4, '0') : '—'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold leading-tight text-gray-900">
                {clienteNome?.trim() || 'SEM CLIENTE'}
              </p>
              {pedidoEntrega ? (
                <span className="rounded-md border-2 border-gray-800 px-2 py-0.5 text-base font-bold tabular-nums leading-none text-gray-900">
                  {numero != null ? String(numero).padStart(4, '0') : '—'}
                </span>
              ) : null}
              {celularExibicao !== '—' ? (
                <BotaoWhatsappNumero
                  telefone={celularCliente}
                  label="cliente"
                  onClick={handleWhatsappCliente}
                />
              ) : null}
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Feito às {horaCriacao}
              {codigo ? ` · #${codigo}` : ''}
              {origem ? ` · ${rotuloOrigemExibicao(origem)}` : ''}
              {' · '}
              {rotuloTipoAtendimento(tipoVenda)}
            </p>
            {previsao !== '—' ? (
              <span className="mt-2 inline-flex items-center gap-1 text-sm text-gray-700">
                <MdAccessTime className="h-4 w-4 text-primary" aria-hidden />
                Entrega prevista: {previsao}
              </span>
            ) : null}
          </div>
          {pedidoEntrega ? (
            <div className="ml-auto min-w-[8.5rem] max-w-[11rem] shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-right">
              <p className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Entregador
                <MdSportsMotorsports className="h-3.5 w-3.5 text-primary" aria-hidden />
              </p>
              <p className="mt-0.5 text-sm font-bold leading-tight text-gray-900">
                {nomeEntregador || 'Sem entregador'}
              </p>
              {telefoneEntregador ? (
                <div className="mt-1 flex justify-end">
                  <BotaoWhatsappNumero
                    telefone={telefoneEntregador}
                    label="entregador"
                    onClick={handleWhatsappEntregador}
                  />
                </div>
              ) : null}
            </div>
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
