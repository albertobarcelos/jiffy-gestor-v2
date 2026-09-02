import type { AreaEntregaDTO, RaioEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import { temAreaEntregaAtiva } from '@/src/application/mappers/AreaEntregaMapper'
import { temRaioEntregaAtivo } from '@/src/application/mappers/RaioEntregaMapper'

export function temCoberturaEntregaAtiva(
  raios: RaioEntregaDTO[],
  areas: AreaEntregaDTO[]
): boolean {
  return temRaioEntregaAtivo(raios) || temAreaEntregaAtiva(areas)
}
