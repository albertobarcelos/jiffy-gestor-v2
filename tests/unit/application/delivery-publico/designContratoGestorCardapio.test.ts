import { describe, expect, it } from 'vitest'
import { deliveryPublicoDesignConfigSchema as schemaGestor } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { deliveryPublicoDesignConfigSchema as schemaCardapio } from '@/apps/jiffy-cardapio/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'

const fixture = {
  schemaVersion: 1,
  layoutId: 'vitrine',
  cabecalho: {
    logoFormato: 'quadrada',
    nomeExibicao: 'Loja',
    logoUrl: 'https://cdn.example/logo.png',
    capaUrl: null,
  },
  cores: {
    paletaId: 'personalizada',
    personalizadas: {
      primary: '#525252',
      primaryDark: '#171717',
      surface: '#FFFFFF',
      text: '#171A1C',
    },
  },
  tipografia: { presetId: 'moderna' },
  categorias: {
    tituloGrupoFundo: 'imagem',
    corBarraTitulo: '#171717',
    corTextoTitulo: null,
    mostrarNomeTitulo: true,
    mostrarSugestoesDaCasa: false,
    sugestoesDaCasaImagemUrl: null,
  },
}

describe('contrato do design entre gestor e cardápio', () => {
  it('aceita o mesmo fixture nos dois schemas', () => {
    expect(schemaGestor.parse(fixture).categorias.mostrarSugestoesDaCasa).toBe(false)
    expect(schemaCardapio.parse(fixture).categorias.mostrarSugestoesDaCasa).toBe(false)
  })

  it('rejeita campo desconhecido nos dois schemas', () => {
    const extra = { ...fixture, campoInexistente: true }
    expect(schemaGestor.safeParse(extra).success).toBe(false)
    expect(schemaCardapio.safeParse(extra).success).toBe(false)
  })
})
