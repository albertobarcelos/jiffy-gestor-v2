import { describe, expect, it } from 'vitest'
import {
  extrairCatalogoDeliveryDoPayload,
  mapearImagensComplementosDoCatalogo,
  mapearImagensGruposComplementoDoCatalogo,
} from '@/src/shared/utils/resolveDeliveryCatalogImagemUrl'

describe('extrairCatalogoDeliveryDoPayload', () => {
  it('lê catalogo na raiz', () => {
    const catalogo = extrairCatalogoDeliveryDoPayload({
      catalogo: { complementos: [{ id: 'c1' }] },
    })
    expect(catalogo?.complementos).toEqual([{ id: 'c1' }])
  })

  it('lê catalogo dentro de data', () => {
    const catalogo = extrairCatalogoDeliveryDoPayload({
      data: { catalogo: { complementos: [{ id: 'c2' }] } },
    })
    expect(catalogo?.complementos).toEqual([{ id: 'c2' }])
  })
})

describe('mapearImagensComplementosDoCatalogo', () => {
  it('lê imagemUrl solto', () => {
    expect(
      mapearImagensComplementosDoCatalogo(
        {
          complementos: [{ id: 'c1', imagemUrl: 'https://cdn/a.jpg' }],
        },
        ['c1', 'c2']
      )
    ).toEqual({
      c1: 'https://cdn/a.jpg',
      c2: null,
    })
  })

  it('lê image.imageUrl quando o catálogo não achata imagemUrl', () => {
    expect(
      mapearImagensComplementosDoCatalogo(
        {
          complementos: [
            {
              id: 'c1',
              image: { imageId: 'img-1', imageUrl: ' https://cdn/nested.jpg ' },
            },
          ],
        },
        ['c1']
      )
    ).toEqual({
      c1: 'https://cdn/nested.jpg',
    })
  })
})

describe('mapearImagensGruposComplementoDoCatalogo', () => {
  it('lê image.imageUrl do grupo', () => {
    expect(
      mapearImagensGruposComplementoDoCatalogo(
        {
          gruposComplementos: [
            { id: 'g1', image: { imageUrl: 'https://cdn/grupo.jpg' } },
          ],
        },
        ['g1']
      )
    ).toEqual({
      g1: 'https://cdn/grupo.jpg',
    })
  })
})
