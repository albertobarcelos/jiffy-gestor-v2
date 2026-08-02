'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
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
  /**
   * NCM comum dos produtos selecionados (8 dígitos), quando o formulário não informa NCM.
   * Permite validar/listar CEST em alteração parcial.
   */
  ncmContextoSelecao?: string | null
}

export function useValidacaoFiscalLote({
  activeTab,
  modoFiscal,
  fiscalLoteDraft,
  setFiscalLoteDraft,
  ncmContextoSelecao = null,
}: UseValidacaoFiscalLoteParams) {
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isRehydrated = useAuthStore(s => s.isRehydrated)

  const sessaoTenantOk = useMemo(() => {
    const token = tenantAuth?.getAccessToken()
    return (
      isRehydrated &&
      isAuthenticated &&
      !!token &&
      !(tenantAuth?.isExpired() ?? true)
    )
  }, [isAuthenticated, isRehydrated, tenantAuth])

  const ncmValidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastValidatedNcmRef = useRef<string>('')
  const lastFetchedNcmForCestsRef = useRef<string>('')

  const [ncmValidation, setNcmValidation] = useState<NcmValidationResult | null>(null)
  const [isValidatingNcm, setIsValidatingNcm] = useState(false)
  const [cestsDisponiveis, setCestsDisponiveis] = useState<CestPorNcmItem[]>([])
  const [isLoadingCests, setIsLoadingCests] = useState(false)
  const [cestValidation, setCestValidation] = useState<CestValidationResult | null>(null)
  const [isValidatingCest, setIsValidatingCest] = useState(false)

  useEffect(() => {
    if (activeTab !== 'fiscal' || modoFiscal !== 'editar' || !sessaoTenantOk) return

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
      const token = tenantAuth?.getAccessToken()
      if (!token || tenantAuth?.isExpired()) {
        setIsValidatingNcm(false)
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetchGestorApi(`/api/v1/fiscal/configuracoes/ncms/validar/${ncmTrimmed}`, {
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
  }, [fiscalLoteDraft.ncm, tenantAuth, activeTab, modoFiscal, sessaoTenantOk])

  const ncmParaCest = useMemo(() => {
    const draftNcm = fiscalLoteDraft.ncm.replace(/\D/g, '').slice(0, 8)
    if (
      draftNcm.length === 8 &&
      ncmValidation?.valido &&
      ncmValidation.codigo === draftNcm
    ) {
      return draftNcm
    }
    const contexto = (ncmContextoSelecao ?? '').replace(/\D/g, '').slice(0, 8)
    return contexto.length === 8 ? contexto : ''
  }, [fiscalLoteDraft.ncm, ncmContextoSelecao, ncmValidation])

  useEffect(() => {
    if (activeTab !== 'fiscal' || modoFiscal !== 'editar' || !sessaoTenantOk) return

    if (ncmParaCest.length !== 8) {
      setCestsDisponiveis([])
      lastFetchedNcmForCestsRef.current = ''
      return
    }

    if (lastFetchedNcmForCestsRef.current === ncmParaCest) {
      return
    }

    const fetchCests = async () => {
      const token = tenantAuth?.getAccessToken()
      if (!token || tenantAuth?.isExpired()) return

      setIsLoadingCests(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetchGestorApi(
          `/api/v1/fiscal/configuracoes/cests/por-ncm/${ncmParaCest}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          }
        )

        clearTimeout(timeoutId)

        if (response.ok) {
          const result = await response.json()
          setCestsDisponiveis(Array.isArray(result) ? result : [])
          lastFetchedNcmForCestsRef.current = ncmParaCest
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
  }, [ncmParaCest, tenantAuth, activeTab, modoFiscal, sessaoTenantOk])

  useEffect(() => {
    if (activeTab !== 'fiscal' || modoFiscal !== 'editar' || !sessaoTenantOk) return

    const cestTrimmed = fiscalLoteDraft.cest.trim()

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

    const cestDisponivel = cestsDisponiveis.find(c => c.codigo === cestTrimmed)
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
      const token = tenantAuth?.getAccessToken()
      if (!token || tenantAuth?.isExpired()) {
        setIsValidatingCest(false)
        return
      }

      const timeoutId = setTimeout(() => abortController.abort(), 5000)
      const hasNcmParaCest = ncmParaCest.length === 8
      const url = hasNcmParaCest
        ? `/api/v1/fiscal/configuracoes/cests/validar/${cestTrimmed}/ncm/${ncmParaCest}`
        : `/api/v1/fiscal/configuracoes/cests/validar/${cestTrimmed}`

      try {
        const response = await fetchGestorApi(url, {
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

          if (hasNcmParaCest) {
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
            const generico = result as CestValidationResult
            setCestValidation({
              ...generico,
              valido: generico.valido ?? Boolean(result.valido ?? result.codigo),
            })
          }
        } else {
          setCestValidation(null)
        }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setCestValidation(null)
      } finally {
        setIsValidatingCest(false)
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      abortController.abort()
      setIsValidatingCest(false)
    }
  }, [
    fiscalLoteDraft.cest,
    ncmParaCest,
    cestsDisponiveis,
    tenantAuth,
    activeTab,
    modoFiscal,
    sessaoTenantOk,
  ])

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
  const isNcmValidFiscal =
    (ncmValidation != null && ncmValidation.valido) || ncmParaCest.length === 8
  const hasCestsDisponiveisFiscal = cestsDisponiveis.length > 0

  return {
    ncmValidation,
    isValidatingNcm,
    cestsDisponiveis,
    isLoadingCests,
    cestValidation,
    ncmParaCest,
    isValidatingCest,
    isNcmInvalidFiscal,
    isCestInvalidFiscal,
    isNcmValidFiscal,
    hasCestsDisponiveisFiscal,
  }
}
