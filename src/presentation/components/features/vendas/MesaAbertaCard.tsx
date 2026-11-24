'use client'

import { MdDeleteOutline, MdShare } from 'react-icons/md'
import type { MesaAbertaSummaryDTO } from '@/src/application/dto/MesasAbertasDTO'
import { TipoVendaIcon } from './TipoVendaIcon'
import { formatElapsedTime } from '@/src/shared/utils/formatters'
import {
  formatDiffTooltipMinutos,
  getCorMesaPorTempo,
  isMesaParada,
  MESA_API_DATE_PARSE,
  minutosDesdeApiDate,
  referenciaParadaMesa,
} from '@/src/shared/helpers/mesasAbertas'
import { formatCurrencyBrl } from '@/src/presentation/utils/vendas/detalhesVendaExibicao'

interface MesaAbertaCardProps {
  venda: MesaAbertaSummaryDTO
  usuarioNome: string
  onClick: () => void
}

export function MesaAbertaCard({ venda, usuarioNome, onClick }: MesaAbertaCardProps) {
  const clienteNome =
    typeof venda.clienteNome === 'string' && venda.clienteNome.trim() !== ''
      ? venda.clienteNome.trim()
      : null
  const identificacao =
    typeof venda.identificacao === 'string' && venda.identificacao.trim() !== ''
      ? venda.identificacao.trim()
      : null
  const nomesDiferentes = Boolean(
    identificacao && clienteNome && identificacao !== clienteNome
  )
  const nomePrincipal = nomesDiferentes ? identificacao : identificacao || clienteNome
  const nomeSecundario = nomesDiferentes ? clienteNome : null
  const compartilhada = venda.vendaCompartilhada === true
  const rodizioAberto = venda.rodizioAberto === true
  const senhaExibir =
    typeof venda.senha === 'string' && venda.senha.trim() !== '' ? venda.senha.trim() : null
  const codigoTerminalExibir =
    typeof venda.codigoTerminal === 'string' && venda.codigoTerminal.trim() !== ''
      ? venda.codigoTerminal.trim()
      : null
  const temDescontoVenda = venda.valorDesconto != null && Number(venda.valorDesconto) > 0
  const temAcrescimoVenda = venda.valorAcrescimo != null && Number(venda.valorAcrescimo) > 0
  const totalRemovidos = Number(venda.totalValorProdutosRemovidos ?? 0)
  const ultimoLancamentoRef =
    venda.dataUltimoProdutoLancado && venda.dataUltimoProdutoLancado.length > 0
      ? venda.dataUltimoProdutoLancado
      : venda.dataCriacao

  const refParada = referenciaParadaMesa(venda)
  const minutosAberta = minutosDesdeApiDate(venda.dataCriacao)
  const minutosUltimoProduto = minutosDesdeApiDate(ultimoLancamentoRef)
  const mesaParada = isMesaParada(venda)
  const rotuloTempo = mesaParada ? 'Parada há' : 'Aberta há'
  const tempoExibido = formatElapsedTime(
    mesaParada ? refParada : venda.dataCriacao,
    MESA_API_DATE_PARSE
  )
  const movimentoTooltip = `Aberta há ${formatDiffTooltipMinutos(minutosAberta)}\n\nÚltimo produto há ${formatDiffTooltipMinutos(minutosUltimoProduto)}`
  const innerCircleColor = getCorMesaPorTempo(refParada)

  return (
    <div
      onClick={onClick}
      className="relative flex min-h-[210px] cursor-pointer flex-col items-center justify-between rounded-lg bg-info px-1 shadow-sm shadow-primary-text/50 transition-all hover:bg-primary/5 md:w-[200px]"
    >
      {compartilhada ? (
        <span
          className="absolute left-1.5 top-1.5 z-[1] flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 text-primary/70"
          title="Compartilhamento ativo"
          aria-label="Compartilhamento ativo"
        >
          <MdShare
            size={12}
            className="relative -translate-x-[1px] shrink-0 leading-none"
          />
        </span>
      ) : null}
      {totalRemovidos > 0 ? (
        <span
          className="absolute right-1.5 top-1.5 z-[1] flex h-5 w-5 items-center justify-center rounded-full border border-error/50 text-error"
          title="Possui itens removidos"
          aria-label="Possui itens removidos"
        >
          <MdDeleteOutline size={12} className="shrink-0 leading-none" />
        </span>
      ) : null}
      <div className="flex w-full flex-grow flex-col items-center justify-center">
        <TipoVendaIcon
          tipoVenda={venda.tipoVenda}
          numeroMesa={venda.numeroMesa}
          size={96}
          containerScale={0.9}
          corTexto="var(--color-alternate)"
          corCirculoInterno={innerCircleColor}
          corBorda="var(--color-alternate)"
          className="mb-0 mt-0"
          title={movimentoTooltip}
        />
        {nomePrincipal ? (
          <span className="max-w-full truncate px-1 text-center text-xs font-semibold text-primary-text">
            {nomePrincipal}
          </span>
        ) : (
          <span className="text-xs text-info">-</span>
        )}
        {nomeSecundario ? (
          <span className="max-w-full truncate px-1 text-center text-[10px] text-secondary-text">
            {nomeSecundario}
          </span>
        ) : null}
        {senhaExibir ? (
          <span className="text-[10px] text-secondary-text">Senha: {senhaExibir}</span>
        ) : null}
        {codigoTerminalExibir ? (
          <span className="text-[10px] text-secondary-text">
            Terminal #{codigoTerminalExibir}
          </span>
        ) : null}
        {rodizioAberto ? (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
            <span className="rounded-full bg-warning/40 px-2 py-0.5 text-[10px] font-semibold text-primary-text">
              Rodízio
            </span>
          </div>
        ) : null}
      </div>

      <div className="mb-3 flex w-full flex-col items-start px-2">
        <div className="flex w-full flex-col items-start md:flex-row md:items-center">
          <span className="text-xs font-semibold text-primary-text">Usuário</span>{' '}
          <span className="max-w-full truncate text-xs font-normal">: {usuarioNome}</span>
        </div>
        <div className="mt-1 flex w-full justify-between text-xs text-primary-text">
          <div className="flex flex-col items-start">
            <span className="font-semibold">Valor atual</span>
            <span>{formatCurrencyBrl(venda.valorFinal)}</span>
            {(temDescontoVenda || temAcrescimoVenda) && (
              <span className="mt-0.5 flex flex-wrap gap-1 text-[10px] font-normal text-secondary-text">
                {temDescontoVenda ? <span>Desc.</span> : null}
                {temAcrescimoVenda ? <span>Acrésc.</span> : null}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="font-semibold">{rotuloTempo}</span>
            <span>{tempoExibido}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
