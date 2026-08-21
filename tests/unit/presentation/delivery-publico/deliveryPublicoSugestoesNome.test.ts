import { describe, expect, it } from 'vitest'
import {
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
  isNomeGrupoSugestoesDaCasa,
} from '@/src/presentation/components/features/delivery-publico/shared/constants/deliveryPublicoSugestoes'

describe('isNomeGrupoSugestoesDaCasa', () => {
  it.each([
    DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
    'SUGESTÕES DA CASA',
    'SUGESTOES DA CASA',
    'sugestoes da casa',
    '  Sugestoes   da  Casa  ',
  ])('aceita variante %j', nome => {
    expect(isNomeGrupoSugestoesDaCasa(nome)).toBe(true)
  })

  it.each(['Sugestões', 'SUGESTOES', 'Outra categoria', ''])('rejeita %j', nome => {
    expect(isNomeGrupoSugestoesDaCasa(nome)).toBe(false)
  })
})
