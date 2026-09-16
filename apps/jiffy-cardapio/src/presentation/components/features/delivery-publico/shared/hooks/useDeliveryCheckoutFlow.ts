'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { DeliveryCheckoutStep } from '../../public/components/checkout/deliveryCheckoutProgress'
import {
  calculateDeliveryCheckoutProgress,
  isIdentificacaoCheckoutCompleta,
} from '../../public/components/checkout/deliveryCheckoutProgress'
import {
  calcularDirecaoSlide,
  resolverAbrirFluxoEndereco,
  resolverAvancarAposIdentificacao,
  resolverCancelarEnderecoForm,
  resolverCancelarGeo,
  resolverFecharOuRevisao,
  resolverProximoAposEndereco,
  resolverSelecionarEndereco,
  resolverTrocarEndereco,
  type EnderecoFlowSnapshot,
  type OrigemFormEnderecoCheckout,
} from '../../public/components/checkout/deliveryCheckoutFlow'
import type { RecotarPedidoResult } from './checkout/types'

type UseDeliveryCheckoutFlowParams = {
  tipoEntrega: 'entrega' | 'retirada'
  enderecoSelecionado: EnderecoFlowSnapshot | null
  quantidadeEnderecos: number
  lookupStatus: Parameters<typeof isIdentificacaoCheckoutCompleta>[0]['lookupStatus']
  nomeCadastro: string | null | undefined
  nomeDigitado: string
  cotacaoValidaParaPagamento: boolean
  recotarPedido: () => Promise<RecotarPedidoResult>
  restaurarEnderecoSelecaoCancelada: () => boolean
  enderecoIdSelecionado: string
  podeCriarNovoEndereco: () => boolean
  usarNovoEndereco: () => void
  selecionarEnderecoExistente: (id: string) => void
  limparCotacao: () => void
}

export function useDeliveryCheckoutFlow({
  tipoEntrega,
  enderecoSelecionado,
  quantidadeEnderecos,
  lookupStatus,
  nomeCadastro,
  nomeDigitado,
  cotacaoValidaParaPagamento,
  recotarPedido,
  restaurarEnderecoSelecaoCancelada,
  enderecoIdSelecionado,
  podeCriarNovoEndereco,
  usarNovoEndereco,
  selecionarEnderecoExistente,
  limparCotacao,
}: UseDeliveryCheckoutFlowParams) {
  const [checkoutStep, setCheckoutStep] = useState<DeliveryCheckoutStep>(null)
  const [checkoutDirection, setCheckoutDirection] = useState<1 | -1>(1)
  const prevCheckoutStepRef = useRef<DeliveryCheckoutStep>(null)
  const [highestCheckoutPercentage, setHighestCheckoutPercentage] = useState(0)
  const [voltarParaRevisao, setVoltarParaRevisao] = useState(false)
  const [voltarParaIdentificacao, setVoltarParaIdentificacao] = useState(false)
  const [origemFormEndereco, setOrigemFormEndereco] =
    useState<OrigemFormEnderecoCheckout>(null)

  const goToCheckoutStep = useCallback((next: DeliveryCheckoutStep) => {
    setCheckoutDirection(calcularDirecaoSlide(prevCheckoutStepRef.current, next))
    prevCheckoutStepRef.current = next
    setCheckoutStep(next)
  }, [])

  const identificacaoCompleta = useMemo(
    () =>
      isIdentificacaoCheckoutCompleta({
        lookupStatus,
        nomeCadastro,
        nomeDigitado,
      }),
    [lookupStatus, nomeCadastro, nomeDigitado]
  )

  const currentCheckoutProgress = useMemo(
    () =>
      calculateDeliveryCheckoutProgress({
        checkoutStep,
        tipoEntrega,
        preserveCompleted: voltarParaRevisao,
        identificacaoCompleta,
      }),
    [checkoutStep, tipoEntrega, voltarParaRevisao, identificacaoCompleta]
  )

  const bumpProgressFromCurrent = useCallback(() => {
    if (!currentCheckoutProgress) return
    if (checkoutStep === 'telefone') {
      setHighestCheckoutPercentage(currentCheckoutProgress.percentage)
      return
    }
    setHighestCheckoutPercentage(current =>
      Math.max(current, currentCheckoutProgress.percentage)
    )
  }, [currentCheckoutProgress, checkoutStep])

  const checkoutProgress = useMemo(() => {
    if (!currentCheckoutProgress) return null
    const percentage =
      checkoutStep === 'telefone'
        ? currentCheckoutProgress.percentage
        : Math.max(currentCheckoutProgress.percentage, highestCheckoutPercentage)
    return {
      ...currentCheckoutProgress,
      percentage,
      label:
        percentage === 100
          ? 'Etapas do pedido concluídas'
          : `${percentage}% das etapas concluídas`,
    }
  }, [currentCheckoutProgress, highestCheckoutPercentage, checkoutStep])

  const fecharCheckout = useCallback(() => {
    setHighestCheckoutPercentage(0)
    setVoltarParaRevisao(false)
    setVoltarParaIdentificacao(false)
    setOrigemFormEndereco(null)
    prevCheckoutStepRef.current = null
    setCheckoutStep(null)
  }, [])

  const irParaPagamentoComCotacao = useCallback(async () => {
    if (cotacaoValidaParaPagamento) {
      goToCheckoutStep('pagamento')
      return
    }
    const result = await recotarPedido()
    if (result.ok) goToCheckoutStep('pagamento')
  }, [cotacaoValidaParaPagamento, recotarPedido, goToCheckoutStep])

  const irParaProximoPassoAposEndereco = useCallback(async (): Promise<
    boolean | 'fora_cobertura'
  > => {
    const resolved = resolverProximoAposEndereco({
      voltarParaRevisao,
      voltarParaIdentificacao,
      cotacaoValidaParaPagamento,
    })
    if (resolved.action === 'go') {
      if (resolved.step === 'telefone') setVoltarParaIdentificacao(false)
      goToCheckoutStep(resolved.step)
      return true
    }
    const result = await recotarPedido()
    if (result.ok) {
      goToCheckoutStep('pagamento')
      return true
    }
    if (result.reason === 'fora_cobertura') return 'fora_cobertura'
    return false
  }, [
    voltarParaRevisao,
    voltarParaIdentificacao,
    cotacaoValidaParaPagamento,
    goToCheckoutStep,
    recotarPedido,
  ])

  const abrirFluxoEndereco = useCallback(() => {
    const resolved = resolverAbrirFluxoEndereco({
      quantidadeEnderecos,
      podeCriarNovo: podeCriarNovoEndereco(),
    })
    if (resolved.action === 'go') {
      goToCheckoutStep(resolved.step)
      return
    }
    if (resolved.action === 'bloqueado') return
    usarNovoEndereco()
    setOrigemFormEndereco(resolved.origem)
    goToCheckoutStep('enderecoForm')
  }, [quantidadeEnderecos, podeCriarNovoEndereco, usarNovoEndereco, goToCheckoutStep])

  const avancarAposIdentificacao = useCallback(() => {
    const resolved = resolverAvancarAposIdentificacao({
      tipoEntrega,
      enderecoSelecionado,
      voltarParaRevisao,
    })
    if (resolved.action === 'abrir_fluxo_endereco') {
      setVoltarParaIdentificacao(false)
      setVoltarParaRevisao(false)
      abrirFluxoEndereco()
      return
    }
    if (resolved.action === 'go') {
      goToCheckoutStep(resolved.step)
      return
    }
    void irParaPagamentoComCotacao()
  }, [
    tipoEntrega,
    enderecoSelecionado,
    voltarParaRevisao,
    abrirFluxoEndereco,
    goToCheckoutStep,
    irParaPagamentoComCotacao,
  ])

  const fecharOuRevisao = useCallback(() => {
    const saindoDeFluxoEndereco =
      checkoutStep === 'enderecoForm' ||
      checkoutStep === 'enderecos' ||
      checkoutStep === 'enderecoGeo'

    if (saindoDeFluxoEndereco) {
      restaurarEnderecoSelecaoCancelada()
      setOrigemFormEndereco(null)
    }

    const resolved = resolverFecharOuRevisao({
      checkoutStep,
      voltarParaRevisao,
      voltarParaIdentificacao,
    })

    if (resolved.action === 'fechar_checkout' || resolved.action === 'fechar_checkout_apos_restore') {
      fecharCheckout()
      return
    }
    if (resolved.action === 'go') {
      if (resolved.step === 'telefone') setVoltarParaIdentificacao(false)
      goToCheckoutStep(resolved.step)
    }
  }, [
    checkoutStep,
    voltarParaRevisao,
    voltarParaIdentificacao,
    restaurarEnderecoSelecaoCancelada,
    fecharCheckout,
    goToCheckoutStep,
  ])

  const voltarDoPagamento = useCallback(() => {
    if (voltarParaRevisao) {
      goToCheckoutStep('revisao')
      return
    }
    goToCheckoutStep('telefone')
  }, [voltarParaRevisao, goToCheckoutStep])

  const abrirStepDaRevisao = useCallback(
    (step: DeliveryCheckoutStep) => {
      setVoltarParaRevisao(true)
      setVoltarParaIdentificacao(false)
      goToCheckoutStep(step)
    },
    [goToCheckoutStep]
  )

  const handleSelecionarEndereco = useCallback(
    (enderecoId: string, endereco: EnderecoFlowSnapshot | null | undefined) => {
      selecionarEnderecoExistente(enderecoId)
      const resolved = resolverSelecionarEndereco(endereco)
      if (resolved.action === 'go') {
        goToCheckoutStep(resolved.step)
        return
      }
      void irParaProximoPassoAposEndereco()
    },
    [selecionarEnderecoExistente, goToCheckoutStep, irParaProximoPassoAposEndereco]
  )

  const handleUsarNovoEndereco = useCallback(() => {
    if (!podeCriarNovoEndereco()) return
    setOrigemFormEndereco('lista')
    usarNovoEndereco()
    goToCheckoutStep('enderecoForm')
  }, [podeCriarNovoEndereco, usarNovoEndereco, goToCheckoutStep])

  const handleTrocarEndereco = useCallback(
    (origem: 'identificacao' | 'revisao' = 'identificacao') => {
      if (origem === 'revisao') {
        setVoltarParaRevisao(true)
        setVoltarParaIdentificacao(false)
      } else {
        setVoltarParaIdentificacao(true)
        setVoltarParaRevisao(false)
      }
      const resolved = resolverTrocarEndereco({
        quantidadeEnderecos,
        podeCriarNovo: podeCriarNovoEndereco(),
        origem,
      })
      if (resolved.action === 'go') {
        goToCheckoutStep(resolved.step)
        return
      }
      if (resolved.action === 'bloqueado') return
      setOrigemFormEndereco(resolved.origem)
      usarNovoEndereco()
      goToCheckoutStep('enderecoForm')
    },
    [quantidadeEnderecos, podeCriarNovoEndereco, usarNovoEndereco, goToCheckoutStep]
  )

  const handleNovoEnderecoDesdeIdentificacao = useCallback(
    (origem: 'identificacao' | 'revisao' = 'identificacao') => {
      if (!podeCriarNovoEndereco()) return
      if (origem === 'revisao') {
        setVoltarParaRevisao(true)
        setVoltarParaIdentificacao(false)
      } else {
        setVoltarParaIdentificacao(true)
        setVoltarParaRevisao(false)
      }
      setOrigemFormEndereco(origem === 'identificacao' ? 'identificacao' : 'novo')
      usarNovoEndereco()
      goToCheckoutStep('enderecoForm')
    },
    [podeCriarNovoEndereco, usarNovoEndereco, goToCheckoutStep]
  )

  const handleContinuarCheckout = useCallback(() => {
    setHighestCheckoutPercentage(0)
    setVoltarParaRevisao(false)
    setVoltarParaIdentificacao(false)
    prevCheckoutStepRef.current = null
    limparCotacao()
    goToCheckoutStep('telefone')
  }, [limparCotacao, goToCheckoutStep])

  const handlePagamentoContinuar = useCallback(() => {
    setVoltarParaRevisao(false)
    goToCheckoutStep('revisao')
  }, [goToCheckoutStep])

  const handleCancelarEnderecoForm = useCallback(() => {
    const restaurado = restaurarEnderecoSelecaoCancelada()
    const resolved = resolverCancelarEnderecoForm({
      origemFormEndereco,
      restauradoOuSelecionado: restaurado || Boolean(enderecoIdSelecionado.trim()),
      voltarParaIdentificacao,
      voltarParaRevisao,
      quantidadeEnderecos,
    })
    if (resolved.limparOrigem) setOrigemFormEndereco(null)
    if (resolved.limparVoltarIdentificacao) setVoltarParaIdentificacao(false)
    goToCheckoutStep(resolved.step)
  }, [
    restaurarEnderecoSelecaoCancelada,
    origemFormEndereco,
    enderecoIdSelecionado,
    voltarParaIdentificacao,
    voltarParaRevisao,
    quantidadeEnderecos,
    goToCheckoutStep,
  ])

  const handleCancelarGeoEndereco = useCallback(() => {
    const resolved = resolverCancelarGeo({
      quantidadeEnderecos,
      voltarParaIdentificacao,
    })
    if (resolved.action === 'go') {
      goToCheckoutStep(resolved.step)
      return
    }
    fecharOuRevisao()
  }, [quantidadeEnderecos, voltarParaIdentificacao, goToCheckoutStep, fecharOuRevisao])

  const marcarSucesso = useCallback(() => {
    setVoltarParaRevisao(false)
    setVoltarParaIdentificacao(false)
    goToCheckoutStep('sucesso')
  }, [goToCheckoutStep])

  const setOrigemFormGeo = useCallback(() => setOrigemFormEndereco('geo'), [])

  return {
    checkoutStep,
    checkoutDirection,
    checkoutProgress,
    currentCheckoutProgress,
    bumpProgressFromCurrent,
    origemFormEndereco,
    setOrigemFormEndereco,
    setOrigemFormGeo,
    voltarParaRevisao,
    voltarParaIdentificacao,
    goToCheckoutStep,
    fecharCheckout,
    fecharOuRevisao,
    voltarDoPagamento,
    abrirStepDaRevisao,
    irParaPagamentoComCotacao,
    irParaProximoPassoAposEndereco,
    avancarAposIdentificacao,
    handleSelecionarEndereco,
    handleUsarNovoEndereco,
    handleTrocarEndereco,
    handleNovoEnderecoDesdeIdentificacao,
    handleContinuarCheckout,
    handlePagamentoContinuar,
    handleCancelarEnderecoForm,
    handleCancelarGeoEndereco,
    marcarSucesso,
    identificacaoCompleta,
  }
}
