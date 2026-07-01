'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import type {
  CestPorNcmItem,
  CestValidationResult,
  FiscalLoteDraft,
  ModoFiscalLote,
  NcmValidationResult,
  TabPainelLote,
} from '../types'

interface UseValidacaoFiscalLoteParams {
  activeTab: TabPainelLote
  modoFiscal: ModoFiscalLote
  fiscalLoteDraft: FiscalLoteDraft
  setFiscalLoteDraft: React.Dispatch<React.SetStateAction<FiscalLoteDraft>>
}

/**
 * Validação fiscal em lote (NCM, CESTs por NCM e CEST) com debounce — igual NovoProduto.
 * Só executa quando a aba Fiscal está ativa.
 */
export function useValidacaoFiscalLote({
  activeTab,
  modoFiscal,
  fiscalLoteDraft,
  setFiscalLoteDraft,
}: UseValidacaoFiscalLoteParams) {
  const { auth } = useAuthStore()

  const ncmValidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastValidatedNcmRef = useRef<string>('')
  const lastFetchedNcmForCestsRef = useRef<string>('')

  const [ncmValidation, setNcmValidation] = useState<NcmValidationResult | null>(null)
  const [isValidatingNcm, setIsValidatingNcm] = useState(false)
  const [cestsDisponiveis, setCestsDisponiveis] = useState<CestPorNcmItem[]>([])
  const [isLoadingCests, setIsLoadingCests] = useState(false)
  const [cestValidation, setCestValidation] = useState<CestValidationResult | null>(null)
  const [isValidatingCest, setIsValidatingCest] = useState(false)

  // Validação NCM (debounce 600ms)
  useEffect(() => {
    if (activeTab !== 'fiscal' || modoFiscal !== 'editar') return

    if (ncmValidationTimerRef.current) {
      clearTimeout(ncmValidationTimerRef.current)
    }

    const ncmTrimmed = fiscalLoteDraft.ncm.trim()

    if (!ncmTrimmed) {
      setNcmValidation(null)
      setIsValidatingNcm(false)
      lastValidatedNcmRef.current = ''
      return
    }

    if (!/^\d{8}$/.test(ncmTrimmed)) {
      setNcmValidation(null)
      setIsValidatingNcm(false)
      lastValidatedNcmRef.current = ''
      return
    }

    if (lastValidatedNcmRef.current === ncmTrimmed) {
      if (ncmValidation && ncmValidation.codigo !== ncmTrimmed) {
        setNcmValidation(null)
        lastValidatedNcmRef.current = ''
      } else if (ncmValidation && ncmValidation.codigo === ncmTrimmed) {
        return
      }
    }

    setIsValidatingNcm(true)
    ncmValidationTimerRef.current = setTimeout(async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        setIsValidatingNcm(false)
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`/api/v1/fiscal/configuracoes/ncms/validar/${ncmTrimmed}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const result = (await response.json()) as NcmValidationResult
          setNcmValidation(result)
          lastValidatedNcmRef.current = ncmTrimmed
        } else {
          setNcmValidation(null)
          lastValidatedNcmRef.current = ''
        }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.warn('Timeout ao validar NCM - microserviço fiscal pode estar indisponível')
        }
        setNcmValidation(null)
        lastValidatedNcmRef.current = ''
      } finally {
        setIsValidatingNcm(false)
      }
    }, 600)

    return () => {
      if (ncmValidationTimerRef.current) {
        clearTimeout(ncmValidationTimerRef.current)
      }
    }
  }, [fiscalLoteDraft.ncm, auth, activeTab, modoFiscal])

  // Lista de CESTs compatíveis com o NCM validado
  useEffect(() => {
    if (activeTab !== 'fiscal' || modoFiscal !== 'editar') return

    const ncmTrimmed = fiscalLoteDraft.ncm.trim()

    if (
      !ncmValidation ||
      !ncmValidation.valido ||
      ncmTrimmed.length !== 8 ||
      ncmValidation.codigo !== ncmTrimmed
    ) {
      setCestsDisponiveis([])
      setCestValidation(null)
      lastFetchedNcmForCestsRef.current = ''
      return
    }

    if (lastFetchedNcmForCestsRef.current === ncmTrimmed) {
      return
    }

    const fetchCests = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingCests(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(`/api/v1/fiscal/configuracoes/cests/por-ncm/${ncmTrimmed}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const result = await response.json()
          setCestsDisponiveis(Array.isArray(result) ? result : [])
          lastFetchedNcmForCestsRef.current = ncmTrimmed
        } else {
          setCestsDisponiveis([])
          lastFetchedNcmForCestsRef.current = ''
        }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.warn('Timeout ao buscar CESTs - microserviço fiscal pode estar indisponível')
        }
        setCestsDisponiveis([])
        lastFetchedNcmForCestsRef.current = ''
      } finally {
        setIsLoadingCests(false)
      }
    }

    void fetchCests()
  }, [ncmValidation, fiscalLoteDraft.ncm, auth, activeTab, modoFiscal])

  // Validação CEST (debounce 400ms)
  useEffect(() => {
    if (activeTab !== 'fiscal' || modoFiscal !== 'editar') return

    const cestTrimmed = fiscalLoteDraft.cest.trim()
    const ncmTrimmed = fiscalLoteDraft.ncm.trim()

    if (!cestTrimmed) {
      setCestValidation(null)
      setIsValidatingCest(false)
      return
    }

    if (!/^\d{7}$/.test(cestTrimmed)) {
      setCestValidation(null)
      setIsValidatingCest(false)
      return
    }

    const cestDisponivel = cestsDisponiveis.find((c) => c.codigo === cestTrimmed)
    if (cestDisponivel) {
      setCestValidation({
        codigo: cestTrimmed,
        valido: true,
        descricao: cestDisponivel.descricao,
        segmento: cestDisponivel.segmento,
        mensagem: 'CEST válido (compatível com o NCM informado)',
      })
      setIsValidatingCest(false)
      return
    }

    const abortController = new AbortController()
    setIsValidatingCest(true)

    const timer = setTimeout(async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        setIsValidatingCest(false)
        return
      }

      const timeoutId = setTimeout(() => abortController.abort(), 5000)

      try {
        const hasValidNcm = /^\d{8}$/.test(ncmTrimmed) && ncmValidation?.valido
        const url = hasValidNcm
          ? `/api/v1/fiscal/configuracoes/cests/validar/${cestTrimmed}/ncm/${ncmTrimmed}`
          : `/api/v1/fiscal/configuracoes/cests/validar/${cestTrimmed}`

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
        })

        clearTimeout(timeoutId)

        if (abortController.signal.aborted) return

        if (response.ok) {
          const result = await response.json()

          if (hasValidNcm) {
            setCestValidation({
              codigo: result.cestCodigo || cestTrimmed,
              valido: result.compativel ?? false,
              descricao: result.descricaoCest,
              mensagem:
                result.mensagem ||
                (result.compativel
                  ? 'CEST compatível com o NCM informado'
                  : 'CEST não é compatível com o NCM informado'),
            })
          } else {
            setCestValidation(result as CestValidationResult)
          }
        } else {
          setCestValidation(null)
        }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.warn('Timeout ao validar CEST - microserviço fiscal pode estar indisponível')
          return
        }
        setCestValidation(null)
      } finally {
        if (!abortController.signal.aborted) {
          setIsValidatingCest(false)
        }
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      abortController.abort()
    }
  }, [fiscalLoteDraft.cest, fiscalLoteDraft.ncm, ncmValidation, cestsDisponiveis, auth, activeTab, modoFiscal])

  // Com CEST preenchido, sugere indicador de escala (só reage ao CEST)
  useEffect(() => {
    if (activeTab !== 'fiscal' || modoFiscal !== 'editar') return
    setFiscalLoteDraft((d) => {
      if (d.cest.trim() !== '' && !d.indicadorProducaoEscala) {
        return { ...d, indicadorProducaoEscala: '1' }
      }
      return d
    })
  }, [fiscalLoteDraft.cest, activeTab, modoFiscal, setFiscalLoteDraft])

  const isNcmInvalidFiscal = ncmValidation != null && !ncmValidation.valido
  const isCestInvalidFiscal = cestValidation != null && !cestValidation.valido
  const isNcmValidFiscal = ncmValidation != null && ncmValidation.valido
  const hasCestsDisponiveisFiscal = cestsDisponiveis.length > 0

  return {
    ncmValidation,
    isValidatingNcm,
    cestsDisponiveis,
    isLoadingCests,
    cestValidation,
    isValidatingCest,
    isNcmInvalidFiscal,
    isCestInvalidFiscal,
    isNcmValidFiscal,
    hasCestsDisponiveisFiscal,
  }
}
