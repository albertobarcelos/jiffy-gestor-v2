import { textoEscPosProducao, textosIdentidadeProducao } from '@/src/application/delivery/layoutProducao80mm'
import type { DesenharMolduraIdentidade } from '@/src/application/ports/IDesenharPilulaProducao'
import type { PrintContentBlock } from '@/src/application/ports/printDocument'
import type { VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

export function headerEmpresaEscPos(empresa: string): PrintContentBlock[] {
  const texto = textoEscPosProducao(empresa)
  if (!texto) return []
  return [{ type: 'text', text: texto, align: 'center', bold: true, size: 'normal' }]
}

export function headerIdentidadeEscPos(identidade: string): PrintContentBlock[] {
  const texto = textoEscPosProducao(identidade)
  if (!texto) return []
  return [{ type: 'text', text: texto, align: 'center', bold: true, size: 'double' }]
}

export function headerIdentidadeComContorno(
  identidade: string,
  desenharMoldura?: DesenharMolduraIdentidade
): PrintContentBlock[] {
  const texto = headerIdentidadeEscPos(identidade)
  if (texto.length === 0) return []
  const topo = desenharMoldura?.('topo')
  const base = desenharMoldura?.('base')
  return [
    ...(topo ? [{ type: 'image' as const, data: topo, align: 'center' as const }] : []),
    ...texto,
    ...(base ? [{ type: 'image' as const, data: base, align: 'center' as const }] : []),
  ]
}

export function identidadeCabecalhoGrafico(root: VendaGestorTicketsResponse): string {
  return textosIdentidadeProducao({
    tipoVenda: root.tipoVenda,
    tipoEntrega: root.tipoEntrega,
    codigoVenda: root.codigoVenda || root.rastreamento?.codigoVenda,
    numeroVenda: root.numeroVenda,
  }).primaria
}
