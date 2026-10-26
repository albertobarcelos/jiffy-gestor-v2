import type { ComissaoEntregadorApp } from '@/src/application/expedicao/app/montarComissaoEntregadorApp'
import {
  chaveDiaLocalComissao,
  chaveDiaLocalDeIso,
  type IntervaloComissao,
} from '@/src/application/expedicao/app/periodoComissaoEntregador'

export type PontoSerieDiariaComissao = {
  dia: string
  total: number
  quantidade: number
  destaque: boolean
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}

function cadaDiaLocal(inicio: Date, fim: Date): Date[] {
  const dias: Date[] = []
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 12, 0, 0, 0)
  const limite = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 12, 0, 0, 0)
  while (cursor.getTime() <= limite.getTime()) {
    dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

export function recortarComissaoNoDia(
  comissao: ComissaoEntregadorApp,
  dia: string
): ComissaoEntregadorApp {
  const itens = comissao.itens.filter(item => chaveDiaLocalDeIso(item.dataFinalizacao) === dia)
  const totalTaxas = arredondar(itens.reduce((soma, item) => soma + (item.taxaEntrega ?? 0), 0))
  return {
    itens,
    quantidade: itens.length,
    totalTaxas,
  }
}

export function serieDiariaComissaoEntregador(input: {
  itens: ComissaoEntregadorApp['itens']
  intervalo: IntervaloComissao
  destaqueDia: string
}): PontoSerieDiariaComissao[] {
  const dias = cadaDiaLocal(input.intervalo.inicio, input.intervalo.fim)
  const porDia = new Map<string, { total: number; quantidade: number }>()
  for (const item of input.itens) {
    const chave = chaveDiaLocalDeIso(item.dataFinalizacao)
    if (!chave) continue
    const atual = porDia.get(chave) ?? { total: 0, quantidade: 0 }
    atual.total = arredondar(atual.total + (item.taxaEntrega ?? 0))
    atual.quantidade += 1
    porDia.set(chave, atual)
  }
  return dias.map(data => {
    const dia = chaveDiaLocalComissao(data)
    const ponto = porDia.get(dia)
    return {
      dia,
      total: ponto?.total ?? 0,
      quantidade: ponto?.quantidade ?? 0,
      destaque: dia === input.destaqueDia,
    }
  })
}
