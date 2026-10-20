import { describe, expect, it } from 'vitest'
import {
  alteracaoComplementoRespeitaLimitesGrupo,
  alteracaoComplementoRespeitaMaximoGrupo,
  alteracaoComplementoRespeitaMinimoGrupo,
  grupoComplementoAtingiuMaximo,
  limiteMaximoEfetivoGrupo,
  parseQuantidadeLimiteGrupo,
  podeIncrementarComplementoNoGrupo,
  quantidadeSelecionadaNoGrupoCarrinho,
  somarQuantidadeComplementosNoGrupo,
  validarLimitesGruposComplementosLancamento,
} from '@/src/domain/policies/pedido/GrupoComplementoLimitesPolicy'

const doces = { id: 'g-doces', nome: 'Doces', qtdMinima: 0, qtdMaxima: 2 }
const add = { id: 'g-add', nome: 'ADD', qtdMinima: 1, qtdMaxima: 0 }

describe('GrupoComplementoLimitesPolicy', () => {
  it('parseia limite inteiro ≥ 0 e trata ausente como 0', () => {
    expect(parseQuantidadeLimiteGrupo(3)).toBe(3)
    expect(parseQuantidadeLimiteGrupo('2')).toBe(2)
    expect(parseQuantidadeLimiteGrupo(-1)).toBe(0)
    expect(parseQuantidadeLimiteGrupo(undefined)).toBe(0)
    expect(parseQuantidadeLimiteGrupo('')).toBe(0)
  })

  it('trata máxima 0 como sem teto', () => {
    expect(limiteMaximoEfetivoGrupo(0)).toBeNull()
    expect(limiteMaximoEfetivoGrupo(6)).toBe(6)
  })

  it('soma quantidades só do grupo (prefixo grupoId-)', () => {
    const quantidades = {
      'g-doces-c1': 1,
      'g-doces-c2': 1,
      'g-add-c3': 4,
    }
    expect(somarQuantidadeComplementosNoGrupo(quantidades, 'g-doces')).toBe(2)
    expect(
      somarQuantidadeComplementosNoGrupo(quantidades, 'g-doces', {
        key: 'g-doces-c2',
        quantidade: 2,
      })
    ).toBe(3)
  })

  it('bloqueia incremento acima do máximo do grupo; 0 = ilimitado', () => {
    expect(podeIncrementarComplementoNoGrupo(doces, 2)).toBe(true)
    expect(podeIncrementarComplementoNoGrupo(doces, 3)).toBe(false)
    expect(grupoComplementoAtingiuMaximo(doces, 2)).toBe(true)
    expect(podeIncrementarComplementoNoGrupo(add, 99)).toBe(true)
  })

  it('valida mínimo e máximo no lançamento', () => {
    expect(
      validarLimitesGruposComplementosLancamento([doces, add], {
        'g-doces-c1': 1,
        'g-add-c3': 1,
      })
    ).toEqual({ valido: true })

    expect(validarLimitesGruposComplementosLancamento([add], {})).toMatchObject({
      valido: false,
      mensagem: 'Selecione pelo menos 1 em "ADD"',
    })

    expect(
      validarLimitesGruposComplementosLancamento([doces], {
        'g-doces-c1': 2,
        'g-doces-c2': 1,
      })
    ).toMatchObject({ valido: false, mensagem: 'Máximo de 2 opção(ões) em "Doces"' })
  })

  it('bloqueia remoção/redução no carrinho abaixo do mínimo do grupo', () => {
    const complementos = [
      { grupoId: 'g-add', quantidade: 1 },
      { grupoId: 'g-doces', quantidade: 1 },
    ]
    expect(quantidadeSelecionadaNoGrupoCarrinho(complementos, 'g-add')).toBe(1)

    expect(alteracaoComplementoRespeitaMinimoGrupo(add, 0)).toMatchObject({
      permitido: false,
      mensagem: 'Selecione pelo menos 1 em "ADD"',
    })
    expect(alteracaoComplementoRespeitaMinimoGrupo(add, 1)).toEqual({ permitido: true })
    expect(alteracaoComplementoRespeitaMinimoGrupo(doces, 0)).toEqual({ permitido: true })
    expect(alteracaoComplementoRespeitaMinimoGrupo(null, 0)).toEqual({ permitido: true })
  })

  it('bloqueia aumento no carrinho acima do máximo do grupo', () => {
    expect(alteracaoComplementoRespeitaMaximoGrupo(doces, 3)).toMatchObject({
      permitido: false,
      mensagem: 'Máximo de 2 opção(ões) em "Doces"',
    })
    expect(alteracaoComplementoRespeitaMaximoGrupo(doces, 2)).toEqual({ permitido: true })
    expect(alteracaoComplementoRespeitaMaximoGrupo(add, 99)).toEqual({ permitido: true })

    expect(alteracaoComplementoRespeitaLimitesGrupo(doces, 3)).toMatchObject({ permitido: false })
    expect(alteracaoComplementoRespeitaLimitesGrupo(add, 0)).toMatchObject({ permitido: false })
  })
})
