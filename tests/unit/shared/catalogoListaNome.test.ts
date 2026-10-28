import { describe, expect, it } from 'vitest'
import { truncarNomeCatalogoLista } from '@/src/shared/utils/catalogoListaNome'

describe('truncarNomeCatalogoLista', () => {
  it('mantém nomes curtos', () => {
    expect(truncarNomeCatalogoLista('X-TUDO')).toEqual({
      exibicao: 'X-TUDO',
      truncado: false,
    })
  })

  it('corta em 34 caracteres e adiciona reticências', () => {
    const nome = 'CHOCOLATE BRANCO COM COCO E MORANGO'
    expect(truncarNomeCatalogoLista(nome)).toEqual({
      exibicao: `${nome.slice(0, 34)}…`,
      truncado: true,
    })
  })

  it('mantém CHOCOLATE BRANCO COM COCO sem cortar', () => {
    const nome = 'CHOCOLATE BRANCO COM COCO'
    expect(truncarNomeCatalogoLista(nome)).toEqual({
      exibicao: nome,
      truncado: false,
    })
  })
})
