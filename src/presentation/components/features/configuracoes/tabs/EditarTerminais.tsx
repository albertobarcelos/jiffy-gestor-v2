'use client'

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MdClose, MdPhone, MdPrint } from 'react-icons/md'
import { MenuItem, CircularProgress, Box } from '@mui/material'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'

/** Labels outlined — alinhado a NovoMeioPagamento / NovoComplemento */
const sxOutlinedLabelTextoEscuro = {
  '& .MuiInputLabel-root': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
  },
} as const

const entradaCompactaInput = {
  padding: '12px 10px',
  fontSize: '0.875rem',
} as const

const entradaCompactaSelect = {
  padding: '12px 10px',
  fontSize: '0.875rem',
  minHeight: '1.5em',
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'center',
} as const

/** Sem fundo cinza no campo — só borda */
const sxEntradaTerminal = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'transparent',
    borderRadius: '8px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
  '& .MuiOutlinedInput-input': entradaCompactaInput,
  '& .MuiOutlinedInput-input.Mui-disabled': {
    WebkitTextFillColor: 'var(--color-primary-text)',
    opacity: 0.85,
  },
  '& .MuiSelect-select': entradaCompactaSelect,
} as const

/** Nome do terminal digitado em maiúsculas. */
const maiusculasPt = (valor: string) => valor.toLocaleUpperCase('pt-BR')

interface EditarTerminaisProps {
  terminalId: string
  isEmbedded?: boolean
  /** `id` do `<form>` para o rodapé do `JiffySidePanelModal` (botão Salvar externo) */
  embeddedFormId?: string
  onEmbedFormStateChange?: (state: { isSubmitting: boolean; canSubmit: boolean }) => void
  onSaved?: () => void
  /** Embutido: fechar o painel após "Salvar e fechar" com sucesso. */
  onCloseAfterSave?: () => void
}

/** API imperativa — confirmação ao fechar o painel (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
export interface EditarTerminaisHandle {
  isDirty: () => boolean
  saveTerminalAndClose: () => void
}

interface Impressora {
  id: string
  nome: string
}

interface TerminalData {
  id: string
  nome: string
  modeloDispositivo: string
  versaoApk: string
  bloqueado: boolean
}

interface TerminalPreferences {
  terminalId: string
  empresaId: string
  impressoraFinalizacao?: {
    id: string
    name: string
  }
  compartilharMesas: boolean
  fiscalAtivo?: boolean
  leitorHabilitado?: boolean
}

/**
 * Componente para editar terminal
 * Replica o design e funcionalidades do Flutter
 */
export const EditarTerminais = forwardRef<EditarTerminaisHandle, EditarTerminaisProps>(
  function EditarTerminais(
    {
      terminalId,
      isEmbedded = false,
      embeddedFormId,
      onEmbedFormStateChange,
      onSaved,
      onCloseAfterSave,
    },
    ref
  ) {
  const { auth } = useAuthStore()
  const formId = embeddedFormId ?? 'editar-terminal-form'

  // Estados do formulário
  const [nomeTerminal, setNomeTerminal] = useState('')
  const [modeloDispositivo, setModeloDispositivo] = useState('')
  const [versaoApk, setVersaoApk] = useState('')
  const [compartilhaValue, setCompartilhaValue] = useState(false)
  const [fiscalAtivoValue, setFiscalAtivoValue] = useState(false)
  const [leitorCodigoBarrasValue, setLeitorCodigoBarrasValue] = useState(false)
  const [impressoraSelecionadaId, setImpressoraSelecionadaId] = useState<string>('')

  // Estados de UI
  const [loadingImpressoras, setLoadingImpressoras] = useState(true)
  const [impressoras, setImpressoras] = useState<Impressora[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTerminal, setIsLoadingTerminal] = useState(false)

  const getFormSnapshot = useCallback(() => {
    return JSON.stringify({
      nomeTerminal: (nomeTerminal || '').trim(),
      modeloDispositivo: (modeloDispositivo || '').trim(),
      versaoApk: (versaoApk || '').trim(),
      compartilhaValue,
      fiscalAtivoValue,
      leitorCodigoBarrasValue,
      impressoraSelecionadaId: impressoraSelecionadaId || '',
    })
  }, [
    nomeTerminal,
    modeloDispositivo,
    versaoApk,
    compartilhaValue,
    fiscalAtivoValue,
    leitorCodigoBarrasValue,
    impressoraSelecionadaId,
  ])

  const baselineSerializedRef = useRef('')
  const embeddedCloseAfterSaveRef = useRef(false)

  const commitBaseline = useCallback(() => {
    baselineSerializedRef.current = getFormSnapshot()
  }, [getFormSnapshot])

  const commitBaselineLatestRef = useRef(commitBaseline)
  commitBaselineLatestRef.current = commitBaseline

  /**
   * Carrega todas as impressoras com paginação completa
   */
  const loadAllImpressoras = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      return
    }

    setLoadingImpressoras(true)

    try {
      const allImpressoras: Impressora[] = []
      let currentOffset = 0
      let hasMore = true
      const limit = 50

      // Loop para carregar todas as páginas
      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/impressoras?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao buscar impressoras')
        }

        const data = await response.json()
        const newImpressoras = (data.items || []).map(
          (i: { id: string; nome?: string | null }) => ({
            id: i.id,
            nome: i.nome || 'Sem nome',
          })
        )

        allImpressoras.push(...newImpressoras)

        // Verifica se há mais páginas
        hasMore = newImpressoras.length === limit
        currentOffset += newImpressoras.length
      }

      setImpressoras(allImpressoras)
    } catch (error) {
      console.error('Erro ao carregar impressoras:', error)
      showToast.error('Erro ao carregar impressoras')
    } finally {
      setLoadingImpressoras(false)
    }
  }, [auth])

  /**
   * Carrega detalhes do terminal
   */
  const loadTerminalDetails = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token || !terminalId) {
      return
    }

    setIsLoadingTerminal(true)

    try {
      const response = await fetch(`/api/terminais/${terminalId}/detalhes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao buscar terminal')
      }

      const data: TerminalData = await response.json()

      // Preenche campos do formulário
      setNomeTerminal(maiusculasPt(data.nome || ''))
      setModeloDispositivo(data.modeloDispositivo || '')
      setVersaoApk(data.versaoApk || '')
    } catch (error) {
      console.error('Erro ao carregar terminal:', error)
      showToast.error('Erro ao carregar dados do terminal')
    } finally {
      setIsLoadingTerminal(false)
      window.setTimeout(() => {
        commitBaselineLatestRef.current()
      }, 120)
    }
  }, [auth, terminalId])

  /**
   * Carrega preferências do terminal
   */
  const loadTerminalPreferences = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token || !terminalId) {
      return
    }

    try {
      const response = await fetch(`/api/preferencias-terminal/${terminalId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao buscar preferências')
      }

      const data: TerminalPreferences = await response.json()

      // Preenche preferências
      setCompartilhaValue(data.compartilharMesas || false)
      setFiscalAtivoValue(!!data.fiscalAtivo)
      setLeitorCodigoBarrasValue(!!data.leitorHabilitado)
      if (data.impressoraFinalizacao?.id) {
        setImpressoraSelecionadaId(data.impressoraFinalizacao.id)
      }
      window.setTimeout(() => {
        commitBaselineLatestRef.current()
      }, 120)
    } catch (error) {
      console.error('Erro ao carregar preferências:', error)
      showToast.error('Erro ao carregar preferências do terminal')
    }
  }, [auth, terminalId])

  // Carrega dados quando o componente monta
  useEffect(() => {
    loadAllImpressoras()
    loadTerminalDetails()
    loadTerminalPreferences()
  }, [loadAllImpressoras, loadTerminalDetails, loadTerminalPreferences])

  const emitEmbedFormState = useCallback(() => {
    onEmbedFormStateChange?.({
      isSubmitting: isSubmitting,
      canSubmit: nomeTerminal.trim().length > 0 && !isLoadingTerminal,
    })
  }, [isSubmitting, nomeTerminal, isLoadingTerminal, onEmbedFormStateChange])

  useEffect(() => {
    emitEmbedFormState()
  }, [emitEmbedFormState])

  /**
   * Valida o formulário
   */
  const validateForm = (): boolean => {
    if (!nomeTerminal.trim()) {
      showToast.error('Nome do terminal é obrigatório')
      return false
    }
    return true
  }

  /**
   * Submete o formulário
   */
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const shouldClosePanel = embeddedCloseAfterSaveRef.current
    embeddedCloseAfterSaveRef.current = false

    if (!validateForm()) {
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Atualizar terminal primeiro
      const terminalResponse = await fetch(`/api/terminais/${terminalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: nomeTerminal,
          modeloDispositivo,
          versaoApk,
          bloqueado: false, // Sempre false pois não temos switch de status aqui
        }),
      })

      if (!terminalResponse.ok) {
        const errorData = await terminalResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao atualizar terminal')
      }

      // 2. Atualizar preferências
      const fields: Record<string, unknown> = {
        compartilharMesas: compartilhaValue,
        fiscalAtivo: fiscalAtivoValue,
        leitorHabilitado: leitorCodigoBarrasValue,
      }
      if (impressoraSelecionadaId) {
        fields.impressoraFinalizacaoId = impressoraSelecionadaId
      }

      const preferencesResponse = await fetch(`/api/preferencias-terminal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          terminaisId: terminalId,
          fields,
        }),
      })

      if (!preferencesResponse.ok) {
        const errorData = await preferencesResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao atualizar preferências')
      }

      showToast.success('Terminal atualizado com sucesso!')

      window.setTimeout(() => {
        commitBaselineLatestRef.current()
      }, 0)

      if (isEmbedded) {
        onSaved?.()
        if (shouldClosePanel) {
          onCloseAfterSave?.()
        }
      } else {
        onSaved?.()
      }
    } catch (error: unknown) {
      console.error('Erro ao atualizar terminal:', error)
      const msg = error instanceof Error ? error.message : 'Erro ao atualizar terminal'
      showToast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => {
        if (isLoadingTerminal) return false
        return getFormSnapshot() !== baselineSerializedRef.current
      },
      saveTerminalAndClose: () => {
        embeddedCloseAfterSaveRef.current = true
        const el = document.getElementById(formId)
        if (el instanceof HTMLFormElement) {
          el.requestSubmit()
        }
      },
    }),
    [formId, getFormSnapshot, isLoadingTerminal]
  )

  return (
    <div
      className={
        isEmbedded
          ? 'flex min-h-0 flex-1 flex-col bg-info'
          : 'flex h-[calc(95vh-80px)] flex-col bg-info'
      }
    >
      {/* Cabeçalho — fluxo em página cheia */}
      {!isEmbedded && (
        <div className="flex items-start justify-between border-b border-[#B9CCD8] px-[30px] pb-4 pt-[30px]">
          
        </div>
      )}

      {isLoadingTerminal ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center py-6">
          <JiffyLoading />
        </div>
      ) : (
        <form
          id={formId}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={e => void handleSubmit(e)}
        >
          {/* Conteúdo com scroll */}
          <div className="flex-1 overflow-y-auto px-[20px]">
            {/* Informações gerais — título com linha à direita (padrão NovoMeioPagamento) */}
            <div className="mb-2 rounded-[12px] bg-info px-2 md:p-5">
              <div className="mb-2 flex items-center gap-5">
                <h2 className="shrink-0 text-sm font-semibold text-primary md:text-xl">
                  Informações Gerais
                </h2>
                <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-custom-2">
                  <MdPhone className="text-primary" size={20} />
                </div>
                <span className="font-nunito text-base font-semibold text-primary-text">
                  {nomeTerminal || 'Nome do Terminal'}
                </span>
              </div>

              <div className="space-y-5">
                <Input
                  label="Nome do Terminal"
                  value={nomeTerminal}
                  onChange={e => setNomeTerminal(maiusculasPt(e.target.value))}
                  placeholder="Digite o nome do Terminal"
                  size="small"
                  required
                  className="bg-info"
                  sx={sxEntradaTerminal}
                  InputLabelProps={{ required: true }}
                />

                <div className="flex flex-col gap-6 md:flex-row">
                  <Input
                    label="Modelo do Dispositivo"
                    value={modeloDispositivo}
                    disabled
                    placeholder="—"
                    size="small"
                    className="bg-info flex-1"
                    sx={sxEntradaTerminal}
                  />
                  <Input
                    label="Versão APK"
                    value={versaoApk}
                    disabled
                    placeholder="—"
                    size="small"
                    className="bg-info flex-1"
                    sx={sxEntradaTerminal}
                  />
                </div>
              </div>
            </div>

            {/* Preferências — mesmo padrão de título + linha */}
            <div className="mb-2 rounded-[12px] bg-info p-2 md:px-5">
              <div className="mb-2 flex items-center gap-5">
                <h2 className="shrink-0 text-sm font-semibold text-primary md:text-xl">
                  Preferências do Terminal
                </h2>
                <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-start">
                <div className="flex-1 space-y-2">
                  <div className="rounded-lg p-2">
                    <JiffyIconSwitch
                      checked={compartilhaValue}
                      onChange={e => setCompartilhaValue(e.target.checked)}
                      label={
                        <span className="flex max-w-[min(100%,20rem)] flex-col gap-0.5 text-left">
                          <span className="font-exo text-sm font-semibold text-primary-text">
                            Compartilhamento
                          </span>
                          <span className="font-nunito text-xs font-normal text-secondary-text">
                            Habilita o compartilhamento de mesas
                          </span>
                        </span>
                      }
                      size="sm"
                      className="w-full flex-row items-start justify-between gap-3"
                      inputProps={{ 'aria-label': 'Compartilhamento de mesas' }}
                    />
                  </div>
                  {compartilhaValue ? (
                    <Box
                      sx={{
                        backgroundColor: '#FFF9C4',
                        border: '1px solid #FFD54F',
                        borderRadius: '8px',
                        p: 1.5,
                      }}
                    >
                      <p className="font-nunito text-xs font-medium text-warning">
                        O compartilhamento de mesas só funcionará com internet.
                      </p>
                    </Box>
                  ) : null}
                </div>

                <div className="flex-1 rounded-lg p-2">
                  <JiffyIconSwitch
                    checked={fiscalAtivoValue}
                    onChange={e => setFiscalAtivoValue(e.target.checked)}
                    label={
                      <span className="flex max-w-[min(100%,20rem)] flex-col gap-0.5 text-left">
                        <span className="font-exo text-sm font-semibold text-primary-text">
                          Fiscal ativo
                        </span>
                        <span className="font-nunito text-xs font-normal text-secondary-text">
                          Habilita operações fiscais neste terminal PDV
                        </span>
                      </span>
                    }
                    size="sm"
                    className="w-full flex-row items-start justify-between gap-3"
                    inputProps={{ 'aria-label': 'Fiscal ativo no terminal PDV' }}
                  />
                </div>

                <div className="flex-1 rounded-lg p-2">
                  <JiffyIconSwitch
                    checked={leitorCodigoBarrasValue}
                    onChange={e => setLeitorCodigoBarrasValue(e.target.checked)}
                    label={
                      <span className="flex max-w-[min(100%,20rem)] flex-col gap-0.5 text-left">
                        <span className="font-exo text-sm font-semibold text-primary-text">
                          Leitor Código de Barras
                        </span>
                        <span className="font-nunito text-xs font-normal text-secondary-text">
                          Habilita o leitor de código de barras neste terminal
                        </span>
                      </span>
                    }
                    size="sm"
                    className="w-full flex-row items-start justify-between gap-3"
                    inputProps={{ 'aria-label': 'Leitor de código de barras no terminal' }}
                  />
                </div>
              </div>

              <div className="mt-6 w-full">
                {loadingImpressoras ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Input
                    select
                    label="Impressora de Finalização"
                    value={impressoraSelecionadaId}
                    onChange={e => setImpressoraSelecionadaId(e.target.value)}
                    size="small"
                    className="bg-info"
                    sx={sxEntradaTerminal}
                    /* Com `value=""` + `displayEmpty`, o MUI não encolhe o label — sobrepõe ao texto */
                    InputLabelProps={{ shrink: true }}
                    SelectProps={{
                      displayEmpty: true,
                      MenuProps: {
                        PaperProps: {
                          sx: { maxHeight: '250px' },
                        },
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Nenhuma</em>
                    </MenuItem>
                    {impressoras.map(impressora => (
                      <MenuItem key={impressora.id} value={impressora.id}>
                        <div className="flex items-center gap-2">
                          <MdPrint className="text-primary" size={18} />
                          <span>{impressora.nome}</span>
                        </div>
                      </MenuItem>
                    ))}
                  </Input>
                )}
              </div>
            </div>
          </div>

          {/* Rodapé — só Salvar; no painel lateral o shell fornece o botão */}
          {!isEmbedded ? (
            <div className="flex flex-shrink-0 justify-end border-t border-[#B9CCD8] px-[30px] py-3">
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || isLoadingTerminal}
                className="h-8 rounded-lg px-[26px] hover:bg-primary/90"
                sx={{
                  textTransform: 'none',
                  fontFamily: 'Nunito, sans-serif',
                  color: 'var(--color-info)',
                  borderColor: 'var(--color-primary)',
                  backgroundColor: 'var(--color-primary)',
                }}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  )
})

EditarTerminais.displayName = 'EditarTerminais'

