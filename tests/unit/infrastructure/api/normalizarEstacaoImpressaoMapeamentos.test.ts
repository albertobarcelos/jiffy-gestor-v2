import { describe, expect, it } from 'vitest'
import {
  montarMapeamentosEstacaoParaSalvar,
  normalizarListaMapeamentosEstacao,
} from '@/src/infrastructure/api/normalizarEstacaoImpressaoMapeamentos'

describe('normalizarListaMapeamentosEstacao', () => {
  it('preserva modoImpressao da estação', () => {
    expect(
      normalizarListaMapeamentosEstacao([
        {
          impressoraId: 'imp-1',
          nomeImpressora: 'Cozinha',
          nomeImpressoraWindows: 'EPSON_COZ',
          modoImpressao: 'agrupado',
        },
      ])
    ).toEqual([
      {
        impressoraId: 'imp-1',
        nomeImpressora: 'Cozinha',
        nomeImpressoraWindows: 'EPSON_COZ',
        modoImpressao: 'agrupado',
      },
    ])
  })

  it('aceita snake_case e envelope data', () => {
    expect(
      normalizarListaMapeamentosEstacao({
        data: [
          {
            impressora_id: 'imp-2',
            nome_impressora: 'Bar',
            nome_impressora_windows: 'EPSON_BAR',
            modo_impressao: 'porUnidade',
          },
        ],
      })
    ).toEqual([
      {
        impressoraId: 'imp-2',
        nomeImpressora: 'Bar',
        nomeImpressoraWindows: 'EPSON_BAR',
        modoImpressao: 'porUnidade',
      },
    ])
  })

  it('omite modo quando o backend não enviou', () => {
    expect(
      normalizarListaMapeamentosEstacao([
        { impressoraId: 'imp-3', nomeImpressoraWindows: 'X' },
      ])
    ).toEqual([
      { impressoraId: 'imp-3', nomeImpressora: '', nomeImpressoraWindows: 'X' },
    ])
  })
})

describe('montarMapeamentosEstacaoParaSalvar', () => {
  it('grava o modo da estação junto com o vínculo físico', () => {
    expect(
      montarMapeamentosEstacaoParaSalvar(
        { 'imp-1': 'EPSON_COZ', 'imp-2': '  ' },
        { 'imp-1': 'agrupado' }
      )
    ).toEqual([
      {
        impressoraId: 'imp-1',
        nomeImpressoraWindows: 'EPSON_COZ',
        modoImpressao: 'agrupado',
        modo_impressao: 'agrupado',
        modoFicha: false,
      },
    ])
  })

  it('usa normal quando o modo não veio', () => {
    expect(
      montarMapeamentosEstacaoParaSalvar({ 'imp-1': 'EPSON_COZ' }, {})
    ).toEqual([
      {
        impressoraId: 'imp-1',
        nomeImpressoraWindows: 'EPSON_COZ',
        modoImpressao: 'normal',
        modo_impressao: 'normal',
        modoFicha: false,
      },
    ])
  })
})
