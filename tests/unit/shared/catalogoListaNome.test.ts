import { describe, expect, it } from 'vitest'
import { truncarNomeCatalogoLista } from '@/src/shared/utils/catalogoListaNome'

describe('truncarNomeCatalogoLista', () => {
  it('mantém nomes curtos', () => {
    expect(truncarNomeCatalogoLista('X-TUDO')).toEqual({
      exibicao: 'X-TUDO',
      truncado: false,
    })
  })

  it('corta em 25 caracteres e adiciona reticências', () => {
    const nome = 'CHEDDAR GOURMET EXTRA ESPECIAL'
    expect(truncarNomeCatalogoLista(nome)).toEqual({
      exibicao: `${nome.slice(0, 25)}…`,
      truncado: true,
    })
  })
})
