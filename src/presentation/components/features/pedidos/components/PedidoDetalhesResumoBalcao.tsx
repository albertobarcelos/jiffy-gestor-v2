'use client'

import type { ReactNode } from 'react'
import { rotuloOrigemExibicao } from '@/src/application/mappers/PedidoDisplayMapper'
import { temSeloCanalMarketplace } from '@/src/domain/policies/pedido/origemCanalMarketplace'
import { OrigemCanalMark } from '@/src/presentation/components/features/origem/OrigemCanalMark'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoDetalheContext'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { PedidoDetalhesInfo } from './PedidoDetalhesInfo'
import { PedidoDetalhesObservacoesSection } from './PedidoDetalhesObservacoesSection'

function Linha({
  label,
  value,
  destaque,
  perigo,
}: {
  label: string
  value: ReactNode
  destaque?: boolean
  perigo?: boolean
}) {
  return (
    <div className={`flex justify-between px-1 ${destaque ? 'rounded-lg bg-white' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${perigo ? 'text-red-600' : ''}`}>{value}</span>
    </div>
  )
}

/** Resumo de venda de balcão — sem trilha operacional de delivery. */
export function PedidoDetalhesResumoBalcao() {
  const { detalhesPedidoMeta, detalhesEntregaPedido } = useNovoPedidoDetalheContext()
  const {
    clienteNome,
    dataVenda,
    formatarDataDetalhePedido,
    formatarUsuarioPorId,
    observacaoPedido,
    origem,
    rotuloStatusResumoModal,
    totalItensPedido,
  } = useNovoPedidoFormContext()

  const dataExibicao = (dataVenda ? new Date(dataVenda) : new Date()).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <PedidoDetalhesInfo role="tabpanel" aria-labelledby="tab-detalhes-info-pedido">
      <h3 className="text-lg font-semibold">Informações do Pedido</h3>
      <div className="flex flex-col gap-3 text-sm">
        <Linha label="Data:" value={dataExibicao} destaque />
        <Linha
          label="Origem:"
          value={
            temSeloCanalMarketplace(origem) ? (
              <OrigemCanalMark origem={origem} size={24} />
            ) : (
              rotuloOrigemExibicao(origem)
            )
          }
        />
        <Linha label="Status:" value={rotuloStatusResumoModal} destaque />
        {clienteNome ? <Linha label="Cliente:" value={clienteNome} /> : null}
        <Linha
          label="Total de Itens:"
          value={`${totalItensPedido} ${totalItensPedido === 1 ? 'produto' : 'produtos'}`}
          destaque
        />
        <Linha
          label="Aberto por:"
          value={formatarUsuarioPorId(detalhesPedidoMeta?.abertoPorId)}
        />
        {detalhesPedidoMeta?.ultimoResponsavelId ? (
          <Linha
            label="Última alteração por:"
            value={formatarUsuarioPorId(detalhesPedidoMeta.ultimoResponsavelId)}
            destaque
          />
        ) : null}
        {detalhesPedidoMeta?.canceladoPorId ? (
          <Linha
            label="Cancelado por:"
            value={formatarUsuarioPorId(detalhesPedidoMeta.canceladoPorId)}
            perigo
          />
        ) : null}
        {detalhesPedidoMeta?.codigoTerminal ? (
          <Linha
            label="Código do terminal:"
            value={detalhesPedidoMeta.codigoTerminal}
            destaque
          />
        ) : null}
        {detalhesPedidoMeta?.identificacao ? (
          <Linha label="Identificação:" value={detalhesPedidoMeta.identificacao} />
        ) : null}
        <Linha
          label="Solicitar emissão fiscal:"
          value={detalhesPedidoMeta?.solicitarEmissaoFiscal ? 'Sim' : 'Não'}
          destaque
        />
        {detalhesPedidoMeta?.dataUltimaModificacao ? (
          <Linha
            label="Última modificação:"
            value={formatarDataDetalhePedido(detalhesPedidoMeta.dataUltimaModificacao)}
          />
        ) : null}
        {detalhesPedidoMeta?.dataUltimoProdutoLancado ? (
          <Linha
            label="Último produto lançado:"
            value={formatarDataDetalhePedido(detalhesPedidoMeta.dataUltimoProdutoLancado)}
            destaque
          />
        ) : null}
        {detalhesPedidoMeta?.dataFinalizacao ? (
          <Linha
            label="Data finalização:"
            value={formatarDataDetalhePedido(detalhesPedidoMeta.dataFinalizacao)}
          />
        ) : null}
        {detalhesPedidoMeta?.dataCancelamento ? (
          <Linha
            label="Data cancelamento:"
            value={formatarDataDetalhePedido(detalhesPedidoMeta.dataCancelamento)}
            destaque
            perigo
          />
        ) : null}
        <PedidoDetalhesObservacoesSection
          observacaoPedido={observacaoPedido}
          observacaoPedidoEntrega={detalhesEntregaPedido?.observacaoPedido}
          incluirObservacoesItens={false}
          exibirTituloSecao={false}
          className="border-t border-gray-200 pt-3"
        />
      </div>
    </PedidoDetalhesInfo>
  )
}
