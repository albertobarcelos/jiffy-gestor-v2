import type {
  MovimentacaoVendaPainelDTO,
  PizzaLancadaPainelDTO,
} from '@/src/application/dto/VendaPainelDetalheDTO'

export function nomeExibicaoUsuario(
  id: string | undefined,
  nomes: Record<string, string>
): string {
  if (!id) return '—'
  const nome = String(nomes[id] ?? '').trim()
  return nome || '—'
}

export function rotuloTipoComplemento(tipo: string | null | undefined): string | null {
  const normalizado = String(tipo ?? '')
    .trim()
    .toLowerCase()
  if (!normalizado || normalizado === 'padrao' || normalizado === 'padrão') return null
  return normalizado.charAt(0).toUpperCase() + normalizado.slice(1)
}

export function textoPizza(pizza: PizzaLancadaPainelDTO | null | undefined): string | null {
  if (!pizza) return null
  const partes: string[] = []
  if (pizza.nomeTamanho && pizza.nomeTamanho.trim()) partes.push(pizza.nomeTamanho.trim())
  const sabores = (pizza.sabores ?? [])
    .map(sabor => {
      const nome = sabor.nomeSabor?.trim()
      if (!nome) return ''
      if (sabor.quantidadePartes && pizza.totalPartes) {
        return `${sabor.quantidadePartes}/${pizza.totalPartes} ${nome}`
      }
      if (sabor.quantidadePartes) return `${sabor.quantidadePartes} ${nome}`
      return nome
    })
    .filter(Boolean)
  if (sabores.length > 0) partes.push(sabores.join(', '))
  return partes.length > 0 ? partes.join(' · ') : null
}

export function textoDocumentoCpfCnpj(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null
  const digits = valor.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return valor.trim() || null
}

export function linhasTransferencia(
  movimentacoes: MovimentacaoVendaPainelDTO[] | undefined
): string[] {
  if (!movimentacoes || movimentacoes.length === 0) return []
  return movimentacoes.flatMap(mov => {
    const tipo = String(mov.tipoMovimentacao ?? '').toLowerCase()
    const snapshots = mov.snapshotsVenda ?? []
    const mesas = Array.from(
      new Set(
        snapshots
          .map(snapshot => String(snapshot.numeroMesa ?? '').trim())
          .filter(mesa => mesa.length > 0)
      )
    )
    const pareceTransferencia = tipo.includes('transfer') || mesas.length >= 2
    if (!pareceTransferencia) return []
    const origem = snapshots.find(snapshot => /origem|source/i.test(snapshot.papel ?? ''))
    const destino = snapshots.find(snapshot => /destino|dest/i.test(snapshot.papel ?? ''))
    const produto = mov.snapshotProduto?.nomeProduto?.trim() || 'Item'
    if (origem?.numeroMesa && destino?.numeroMesa) {
      return [`${produto} da mesa ${origem.numeroMesa} para a mesa ${destino.numeroMesa}`]
    }
    if (mesas.length >= 2) {
      return [`${produto} entre a mesa ${mesas[0]} e a mesa ${mesas[1]}`]
    }
    return []
  })
}

export function formatCurrencyBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumberPtBr(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDateTimePtBr(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
