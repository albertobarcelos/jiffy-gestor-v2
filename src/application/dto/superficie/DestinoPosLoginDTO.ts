import type { CodigoSuperficie } from '@/src/domain/superficie/Superficie'

export type DestinoPosLoginDTO = {
  superficie: CodigoSuperficie
  pathModulo: string
}

export type AutorizacaoRotaSuperficieDTO = {
  permitido: boolean
  pathModulo: string
  destinoSeNegado: string
  superficie: CodigoSuperficie
}
