import type { IRelatorioEntregadoresFonteRepository } from '@/src/domain/repositories/IRelatorioEntregadoresFonteRepository'
import { AgregarRelatorioEntregadoresService } from '@/src/domain/services/AgregarRelatorioEntregadoresService'
import type { LinhaRelatorioEntregadores } from '@/src/domain/relatorio-entregadores/tipos'
import {
  RelatorioEntregadoresFiltroError,
  filtroRelatorioEntregadoresValidator,
  type FiltroRelatorioEntregadoresDTO,
  type OrderByDirectionRelatorioEntregadores,
  type OrderByFieldRelatorioEntregadores,
  type RelatorioEntregadoresResponseDTO,
} from '@/src/application/dto/RelatorioEntregadoresDTO'

function parseIsoDate(value: string, fimDoDia: boolean): Date {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new RelatorioEntregadoresFiltroError('Período de finalização inválido.')
  }
  if (fimDoDia && !value.includes('T')) {
    d.setHours(23, 59, 59, 999)
  }
  return d
}

function montarOpcoesEntregadores(
  cadastro: { id: string; nome: string }[],
  pedidos: { entregadorId: string | null }[]
): { id: string; nome: string }[] {
  const porId = new Map<string, string>()
  for (const e of cadastro) {
    if (!e.id.trim()) continue
    porId.set(e.id, e.nome.trim() || '—')
  }
  for (const pedido of pedidos) {
    const id = pedido.entregadorId?.trim()
    if (!id || porId.has(id)) continue
    porId.set(id, '—')
  }
  return Array.from(porId.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
}

function ordenarLinhas(
  linhas: LinhaRelatorioEntregadores[],
  field: OrderByFieldRelatorioEntregadores,
  direction: OrderByDirectionRelatorioEntregadores
): LinhaRelatorioEntregadores[] {
  const m = direction === 'asc' ? 1 : -1
  return [...linhas].sort((a, b) => {
    let c = 0
    if (field === 'nome') {
      c = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    } else if (field === 'quantidadeEntregasFinalizadas') {
      c = a.quantidadeEntregasFinalizadas - b.quantidadeEntregasFinalizadas
    } else if (field === 'quantidadeEntregasPendentes') {
      c = a.quantidadeEntregasPendentes - b.quantidadeEntregasPendentes
    } else {
      c = a.valorAReceber - b.valorAReceber
    }
    return c * m
  })
}

export class ListarRelatorioEntregadoresUseCase {
  constructor(private readonly fonte: IRelatorioEntregadoresFonteRepository) {}

  async execute(input: {
    token: string
    filtro: FiltroRelatorioEntregadoresDTO
  }): Promise<RelatorioEntregadoresResponseDTO> {
    const parsed = filtroRelatorioEntregadoresValidator.safeParse(input.filtro)
    if (!parsed.success) {
      throw new RelatorioEntregadoresFiltroError(
        parsed.error.issues[0]?.message || 'Filtro inválido.'
      )
    }

    const filtro = parsed.data
    const inicio = parseIsoDate(filtro.dataFinalizacaoInicio, false)
    const fim = parseIsoDate(filtro.dataFinalizacaoFim, true)
    if (inicio.getTime() > fim.getTime()) {
      throw new RelatorioEntregadoresFiltroError(
        'A data inicial não pode ser posterior à data final.'
      )
    }

    const offset = filtro.offset ?? 0
    const limit = filtro.limit ?? 10
    const orderByField = filtro.orderByField ?? 'nome'
    const orderByDirection = filtro.orderByDirection ?? 'asc'

    const fonte = await this.fonte.carregar({
      token: input.token,
      periodo: { inicio, fim },
    })

    const agregado = AgregarRelatorioEntregadoresService.agregar({
      pedidos: fonte.pedidos,
      entregadores: fonte.entregadores,
      coberturas: fonte.coberturas,
      periodo: { inicio, fim },
      coberturaId: filtro.coberturaId,
      entregadorId: filtro.entregadorId,
      q: filtro.q,
    })

    const ordenadas = ordenarLinhas(agregado.linhas, orderByField, orderByDirection)
    const items = ordenadas.slice(offset, offset + limit)

    return {
      items,
      totais: agregado.totais,
      coberturas: fonte.coberturas.map(c => ({
        id: c.id,
        tipo: c.tipo,
        nome: c.nome,
        valorTaxa: c.valorTaxa,
      })),
      entregadores: montarOpcoesEntregadores(fonte.entregadores, fonte.pedidos),
      count: ordenadas.length,
      hasNext: offset + limit < ordenadas.length,
      hasPrevious: offset > 0,
      truncado: fonte.truncado,
    }
  }
}
