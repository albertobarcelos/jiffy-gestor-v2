import type { AreaEntregaDTO, RaioEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import { alcanceKmDaCobertura } from '@/src/application/dto/delivery/CoberturaEntregaDTO'

export type ResumoCoberturaHub = {
  qtdAreas: number
  raioMaximoKm: number | null
  taxaMinima: number | null
}

function taxasVisiveis(
  raios: Array<Pick<RaioEntregaDTO, 'ativo' | 'valorTaxa'>>,
  areas: Array<Pick<AreaEntregaDTO, 'ativo' | 'valorTaxa'>>
): number[] {
  const valores: number[] = []
  for (const raio of raios) {
    if (raio.ativo === false) continue
    if (Number.isFinite(raio.valorTaxa)) valores.push(raio.valorTaxa)
  }
  for (const area of areas) {
    if (area.ativo === false) continue
    if (Number.isFinite(area.valorTaxa)) valores.push(area.valorTaxa)
  }
  return valores
}

/** Só leitura para o cartão do hub — não altera cotação. */
export function resumirCoberturaHub(
  raios: Array<Pick<RaioEntregaDTO, 'ativo' | 'valorTaxa' | 'distanciaMaximaEmMetros'>>,
  areas: Array<Pick<AreaEntregaDTO, 'ativo' | 'valorTaxa'>>
): ResumoCoberturaHub {
  const raiosAtivos = raios.filter(raio => raio.ativo !== false)
  const areasAtivas = areas.filter(area => area.ativo !== false)
  const taxas = taxasVisiveis(raiosAtivos, areasAtivas)
  const alcance = alcanceKmDaCobertura(raiosAtivos)
  return {
    qtdAreas: areasAtivas.length,
    raioMaximoKm: alcance > 0 ? alcance : null,
    taxaMinima: taxas.length > 0 ? Math.min(...taxas) : null,
  }
}
