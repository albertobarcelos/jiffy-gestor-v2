'use client'

import { MdPrint } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  formatarCelularExibicao,
  formatarCpfCnpjExibicao,
  formatarEnderecoEntregaMultilinha,
} from '../novo-pedido/novoPedidoDetalheHelpers'
import { PedidoKanbanProgressoEntrega } from './PedidoKanbanProgressoEntrega'
import type { PedidoKanbanQuickViewData } from './carregarPedidoKanbanQuickView'
import type { ColunaKanbanId } from './types'

interface PedidoKanbanQuickViewConteudoProps {
  dados: PedidoKanbanQuickViewData
  nomeEmpresa: string
  colunaAtual: ColunaKanbanId
  podeImprimir?: boolean
  onImprimir?: () => void
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

function LinhaTotal({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px] leading-tight">
      <span className="text-gray-700">{label}</span>
      <span className="shrink-0 font-semibold tabular-nums text-gray-900">{valor}</span>
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
  return fluxo === 'cobrar_entregador' ? 'Cobrar na entrega' : 'Pago'
}

export function PedidoKanbanQuickViewConteudo({
  dados,
  nomeEmpresa,
  colunaAtual,
  podeImprimir = false,
  onImprimir,
}: PedidoKanbanQuickViewConteudoProps) {
  const cpfCnpj = formatarCpfCnpjExibicao(dados.detalhesEntrega.clienteCpfCnpj)
  const cpfCnpjExibicao = cpfCnpj === '—' ? '' : cpfCnpj
  const enderecoLinhas = formatarEnderecoEntregaMultilinha(dados.detalhesEntrega.enderecoEntrega)

  return (
    <div className="space-y-1 text-[11px] leading-tight text-gray-800 border-2 border-secondary rounded-md p-2">
      <p className="text-sm font-semibold text-secondary text-center">Dados do Pedido</p>
      <LinhaCompacta value={nomeEmpresa || 'Empresa'} className="font-medium text-secondary text-center" />
      <Separador />
      <div className="flex items-baseline justify-between gap-2 text-[11px] leading-tight">
        <p>
          <span className="text-gray-600">Pedido:</span>{' '}
          {montarRotuloPedido(dados.numeroVenda, dados.codigoVenda)}
        </p>
        <span className="shrink-0 font-medium text-secondary">
          {rotuloPagamentoPedidoQuickView(dados.fluxoPagamentoEntrega)}
        </span>
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
        {dados.troco > 0 && (
          <LinhaTotal label="Levar Troco" valor={transformarParaReal(dados.troco)} />
        )}
      </div>

      {podeImprimir && onImprimir && (
        <div className="pt-1">
          <Button
            size="sm"
            variant="outlined"
            className="!min-h-0 w-full !py-1 !text-[11px]"
            sx={{
              borderColor: 'rgba(83, 12, 163, 0.35)',
              color: 'var(--color-secondary)',
              '&:hover': {
                borderColor: 'var(--color-secondary)',
                backgroundColor: 'rgba(83, 12, 163, 0.06)',
              },
              '& .MuiButton-startIcon': {
                color: 'inherit',
              },
            }}
            onClick={onImprimir}
            startIcon={<MdPrint size={14} />}
          >
            Imprimir pedido
          </Button>
        </div>
      )}
    </div>
  )
}
