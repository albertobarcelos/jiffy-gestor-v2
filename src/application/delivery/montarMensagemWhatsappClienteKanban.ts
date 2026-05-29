import type { ColunaKanbanId } from '@/src/presentation/components/features/nfe/kanban/types'

function resolverLinhasCorpoMensagemCliente(coluna: ColunaKanbanId): string[] {
  switch (coluna) {
    case 'EM_ROTA':
      return ['Seu pedido saiu para entrega!', '*Obrigado pela paciência e preferência.*']
    case 'FINALIZADAS':
      return ['Seu pedido foi entregue. Obrigado!']
    case 'NOVOS_PEDIDOS':
    case 'EM_PREPARO':
    case 'PRONTO_ENTREGA':
    default:
      return ['Seu pedido está sendo preparado com muito carinho!']
  }
}

export function montarMensagemWhatsappClienteKanban(args: {
  clienteNome: string
  numeroVenda: number | null
  nomeEmpresa: string
  colunaAtual: ColunaKanbanId
}): string {
  const { clienteNome, numeroVenda, nomeEmpresa, colunaAtual } = args
  const nome =
    clienteNome.trim() === '' || clienteNome.trim() === '—'
      ? 'cliente'
      : clienteNome.trim()
  const numeroPedido = numeroVenda != null ? String(numeroVenda) : '—'
  const empresa = nomeEmpresa.trim() || 'Empresa'
  const corpoLinhas = resolverLinhasCorpoMensagemCliente(colunaAtual)

  return [
    `Olá, ${nome}!`,
    '',
    ...corpoLinhas,
    '',
    `Pedido #${numeroPedido}`,
    empresa,
  ].join('\n')
}
