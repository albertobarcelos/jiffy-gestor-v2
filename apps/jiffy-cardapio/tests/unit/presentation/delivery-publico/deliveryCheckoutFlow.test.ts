import { describe, expect, it } from 'vitest'
import {
  entregaExigeEndereco,
  entregaExigeGeo,
  resolverAbrirFluxoEndereco,
  resolverAvancarAposIdentificacao,
  resolverCancelarEnderecoForm,
  resolverCancelarGeo,
  resolverFecharOuRevisao,
  resolverProximoAposEndereco,
  resolverSelecionarEndereco,
  resolverTrocarEndereco,
  calcularDirecaoSlide,
} from '@/src/presentation/components/features/delivery-publico/public/components/checkout/deliveryCheckoutFlow'

describe('deliveryCheckoutFlow', () => {
  describe('guards', () => {
    it('entrega exige endereço quando não há seleção', () => {
      expect(entregaExigeEndereco('entrega', null)).toBe(true)
      expect(entregaExigeEndereco('retirada', null)).toBe(false)
    })

    it('entrega exige geo quando endereço sem geolocalização', () => {
      expect(
        entregaExigeGeo('entrega', { id: '1', temGeolocalizacao: false })
      ).toBe(true)
      expect(
        entregaExigeGeo('entrega', { id: '1', temGeolocalizacao: true })
      ).toBe(false)
    })
  })

  describe('resolverAvancarAposIdentificacao', () => {
    it('abre fluxo de endereço se entrega sem endereço', () => {
      expect(
        resolverAvancarAposIdentificacao({
          tipoEntrega: 'entrega',
          enderecoSelecionado: null,
          voltarParaRevisao: false,
        })
      ).toEqual({ action: 'abrir_fluxo_endereco' })
    })

    it('vai para geo se entrega sem geo', () => {
      expect(
        resolverAvancarAposIdentificacao({
          tipoEntrega: 'entrega',
          enderecoSelecionado: { id: '1', temGeolocalizacao: false },
          voltarParaRevisao: false,
        })
      ).toEqual({ action: 'go', step: 'enderecoGeo' })
    })

    it('retirada vai para pagamento com cotação', () => {
      expect(
        resolverAvancarAposIdentificacao({
          tipoEntrega: 'retirada',
          enderecoSelecionado: null,
          voltarParaRevisao: false,
        })
      ).toEqual({ action: 'pagamento_com_cotacao' })
    })

    it('voltar para revisão tem prioridade após geo ok', () => {
      expect(
        resolverAvancarAposIdentificacao({
          tipoEntrega: 'entrega',
          enderecoSelecionado: { id: '1', temGeolocalizacao: true },
          voltarParaRevisao: true,
        })
      ).toEqual({ action: 'go', step: 'revisao' })
    })
  })

  describe('resolverSelecionarEndereco', () => {
    it('manda para geo se sem localização', () => {
      expect(
        resolverSelecionarEndereco({ id: '1', temGeolocalizacao: false })
      ).toEqual({ action: 'go', step: 'enderecoGeo' })
    })

    it('segue para próximo se tem geo', () => {
      expect(
        resolverSelecionarEndereco({ id: '1', temGeolocalizacao: true })
      ).toEqual({ action: 'proximo_apos_endereco' })
    })
  })

  describe('resolverAbrirFluxoEndereco / trocar', () => {
    it('lista endereços quando há cadastros', () => {
      expect(
        resolverAbrirFluxoEndereco({ quantidadeEnderecos: 2, podeCriarNovo: true })
      ).toEqual({ action: 'go', step: 'enderecos' })
    })

    it('form novo quando sem endereços', () => {
      expect(
        resolverAbrirFluxoEndereco({ quantidadeEnderecos: 0, podeCriarNovo: true })
      ).toEqual({ action: 'novo_form', origem: 'novo' })
    })

    it('bloqueia novo quando limite', () => {
      expect(
        resolverTrocarEndereco({
          quantidadeEnderecos: 0,
          podeCriarNovo: false,
          origem: 'identificacao',
        })
      ).toEqual({ action: 'bloqueado' })
    })
  })

  describe('resolverProximoAposEndereco', () => {
    it('prioriza revisão e identificação', () => {
      expect(
        resolverProximoAposEndereco({
          voltarParaRevisao: true,
          voltarParaIdentificacao: true,
          cotacaoValidaParaPagamento: true,
        })
      ).toEqual({ action: 'go', step: 'revisao' })

      expect(
        resolverProximoAposEndereco({
          voltarParaRevisao: false,
          voltarParaIdentificacao: true,
          cotacaoValidaParaPagamento: true,
        })
      ).toEqual({ action: 'go', step: 'telefone' })
    })

    it('usa cotação válida ou solicita recotar', () => {
      expect(
        resolverProximoAposEndereco({
          voltarParaRevisao: false,
          voltarParaIdentificacao: false,
          cotacaoValidaParaPagamento: true,
        })
      ).toEqual({ action: 'go', step: 'pagamento' })

      expect(
        resolverProximoAposEndereco({
          voltarParaRevisao: false,
          voltarParaIdentificacao: false,
          cotacaoValidaParaPagamento: false,
        })
      ).toEqual({ action: 'cotar_e_pagamento' })
    })
  })

  describe('resolverCancelarEnderecoForm', () => {
    it('volta para geo quando origem era geo e há seleção', () => {
      expect(
        resolverCancelarEnderecoForm({
          origemFormEndereco: 'geo',
          restauradoOuSelecionado: true,
          voltarParaIdentificacao: false,
          voltarParaRevisao: false,
          quantidadeEnderecos: 1,
        })
      ).toEqual({ step: 'enderecoGeo', limparOrigem: true })
    })

    it('volta para telefone a partir da identificação', () => {
      expect(
        resolverCancelarEnderecoForm({
          origemFormEndereco: 'identificacao',
          restauradoOuSelecionado: false,
          voltarParaIdentificacao: true,
          voltarParaRevisao: false,
          quantidadeEnderecos: 0,
        })
      ).toEqual({
        step: 'telefone',
        limparVoltarIdentificacao: true,
        limparOrigem: true,
      })
    })
  })

  describe('resolverFecharOuRevisao / cancelar geo', () => {
    it('fecha se já está na revisão com flag', () => {
      expect(
        resolverFecharOuRevisao({
          checkoutStep: 'revisao',
          voltarParaRevisao: true,
          voltarParaIdentificacao: false,
        })
      ).toEqual({ action: 'fechar_checkout' })
    })

    it('cancelar geo volta à lista ou identificação', () => {
      expect(
        resolverCancelarGeo({ quantidadeEnderecos: 1, voltarParaIdentificacao: false })
      ).toEqual({ action: 'go', step: 'enderecos' })
      expect(
        resolverCancelarGeo({ quantidadeEnderecos: 0, voltarParaIdentificacao: true })
      ).toEqual({ action: 'go', step: 'telefone' })
    })
  })

  describe('calcularDirecaoSlide', () => {
    it('frente e voltar', () => {
      expect(calcularDirecaoSlide('telefone', 'pagamento')).toBe(1)
      expect(calcularDirecaoSlide('pagamento', 'telefone')).toBe(-1)
    })
  })
})
