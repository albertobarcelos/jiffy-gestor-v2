'use client'

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'
import { MenuItem } from '@mui/material'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'

/** Labels outlined em preto — alinhado a NovoComplemento / NovoGrupo */
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
  '& .MuiFormLabel-asterisk': {
    color: 'var(--color-error)',
  },
} as const

/** Padding interno reduzido (menor que o padrão do MUI small) */
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

const sxEntradaCompactaMeioPagamento = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-input': entradaCompactaInput,
  '& .MuiSelect-select': entradaCompactaSelect,
} as const

/** Nome do meio de pagamento em maiúsculas. */
const maiusculasPt = (valor: string) => valor.toLocaleUpperCase('pt-BR')

interface NovoMeioPagamentoProps {
  meioPagamentoId?: string
  isEmbedded?: boolean
  /** Com `isEmbedded`, omite o título duplicado dentro do card — o shell do painel já exibe o título */
  hideEmbeddedHeader?: boolean
  /** `id` do `<form>` para o rodapé do painel usar `form="..."` no Salvar */
  embeddedFormId?: string
  onEmbedFormStateChange?: (state: { isSubmitting: boolean; canSubmit: boolean }) => void
  onSaved?: () => void
  /** Embutido: fechar o painel após “Salvar e fechar” com sucesso. */
  onCloseAfterSave?: () => void
}

/** API imperativa — confirmação ao fechar o painel (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
export interface NovoMeioPagamentoHandle {
  isDirty: () => boolean
  saveMeioPagamentoAndClose: () => void
}

/**
 * Componente para criar/editar meio de pagamento
 * Replica o design e funcionalidades do Flutter
 */
export const NovoMeioPagamento = forwardRef<NovoMeioPagamentoHandle, NovoMeioPagamentoProps>(
  function NovoMeioPagamento(
    {
      meioPagamentoId,
      isEmbedded = false,
      hideEmbeddedHeader = false,
      embeddedFormId,
      onEmbedFormStateChange,
      onSaved,
      onCloseAfterSave,
    },
    ref
  ) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!meioPagamentoId
  const formId = embeddedFormId ?? 'novo-meio-pagamento-form'

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [tefAtivo, setTefAtivo] = useState(true)
  const [formaPagamentoFiscal, setFormaPagamentoFiscal] = useState('dinheiro')
  const [ativo, setAtivo] = useState(true)

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMeioPagamento, setIsLoadingMeioPagamento] = useState(false)
  const hasLoadedMeioPagamentoRef = useRef(false)
  const embeddedCloseAfterSaveRef = useRef(false)
  /** Evita regravar baseline a cada tecla no modo criação. */
  const createBaselineCommittedRef = useRef(false)

  const getFormSnapshot = useCallback(() => {
    return JSON.stringify({
      nome: (nome || '').trim(),
      tefAtivo,
      formaPagamentoFiscal: (formaPagamentoFiscal || '').toLowerCase(),
      ativo,
    })
  }, [nome, tefAtivo, formaPagamentoFiscal, ativo])

  const baselineSerializedRef = useRef('')

  const commitBaseline = useCallback(() => {
    baselineSerializedRef.current = getFormSnapshot()
  }, [getFormSnapshot])

  const commitBaselineLatestRef = useRef(commitBaseline)
  commitBaselineLatestRef.current = commitBaseline

  const emitEmbedFormState = useCallback(() => {
    onEmbedFormStateChange?.({
      isSubmitting: isLoading,
      canSubmit: nome.trim().length > 0,
    })
  }, [isLoading, nome, onEmbedFormStateChange])

  useEffect(() => {
    emitEmbedFormState()
  }, [emitEmbedFormState])

  // Mapeamento entre valores da API (lowercase) e labels para exibição (maiúsculas)
  const formasPagamentoFiscalMap: Record<string, string> = {
    dinheiro: 'DINHEIRO',
    pix: 'PIX',
    cartao_credito: 'CARTÃO DE CRÉDITO',
    cartao_debito: 'CARTÃO DE DÉBITO',
    vale_alimentacao: 'VALE ALIMENTAÇÃO',
    vale_refeicao: 'VALE REFEIÇÃO',
    vale_presente: 'VALE PRESENTE',
    vale_combustivel: 'VALE COMBUSTÍVEL',
  }

  // Opções de forma de pagamento fiscal (apenas as aceitas pela API)
  const formasPagamentoFiscal = Object.keys(formasPagamentoFiscalMap)

  // Carregar dados do meio de pagamento se estiver editando
  useEffect(() => {
    if (!isEditing) {
      // Reset quando não estiver editando
      hasLoadedMeioPagamentoRef.current = false
      setNome('')
      setTefAtivo(true)
      setFormaPagamentoFiscal('dinheiro')
      setAtivo(true)
      return
    }

    if (hasLoadedMeioPagamentoRef.current) return

    const loadMeioPagamento = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingMeioPagamento(true)
      hasLoadedMeioPagamentoRef.current = true

      try {
        const response = await fetch(`/api/meios-pagamentos/${meioPagamentoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const meioPagamento = MeioPagamento.fromJSON(data)

          setNome(maiusculasPt(meioPagamento.getNome() || ''))
          setTefAtivo(meioPagamento.isTefAtivo())
          // Garantir que o valor está em lowercase para corresponder às opções do select
          const formaFiscal = meioPagamento.getFormaPagamentoFiscal().toLowerCase()
          setFormaPagamentoFiscal(formaFiscal)
          setAtivo(meioPagamento.isAtivo())
        }
      } catch (error) {
        console.error('Erro ao carregar meio de pagamento:', error)
      } finally {
        setIsLoadingMeioPagamento(false)
        window.setTimeout(() => {
          commitBaselineLatestRef.current()
        }, 120)
      }
    }

    loadMeioPagamento()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, meioPagamentoId])

  /** Modo criação: baseline estável uma vez após estado inicial. */
  useEffect(() => {
    if (isEditing) {
      createBaselineCommittedRef.current = false
      return
    }
    if (!isLoadingMeioPagamento && !createBaselineCommittedRef.current) {
      createBaselineCommittedRef.current = true
      window.setTimeout(() => {
        commitBaselineLatestRef.current()
      }, 0)
    }
  }, [isEditing, isLoadingMeioPagamento])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const shouldClosePanel = embeddedCloseAfterSaveRef.current
    embeddedCloseAfterSaveRef.current = false

    const token = auth?.getAccessToken()
    if (!token) {
      alert('Token não encontrado')
      return
    }

    setIsLoading(true)

    try {
      const body: Record<string, unknown> = {
        nome,
        tefAtivo,
        // Garantir que o valor está em lowercase antes de enviar
        formaPagamentoFiscal: formaPagamentoFiscal.toLowerCase(),
        ativo,
      }

      const url = isEditing
        ? `/api/meios-pagamentos/${meioPagamentoId}`
        : '/api/meios-pagamentos'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao salvar meio de pagamento')
      }

      window.setTimeout(() => {
        commitBaselineLatestRef.current()
      }, 0)

      if (isEmbedded) {
        onSaved?.()
        if (shouldClosePanel) {
          onCloseAfterSave?.()
        }
      } else {
        alert(isEditing ? 'Meio de pagamento atualizado com sucesso!' : 'Meio de pagamento criado com sucesso!')
        router.push('/configuracoes?tab=meios-pagamentos')
      }
    } catch (error) {
      console.error('Erro ao salvar meio de pagamento:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar meio de pagamento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/configuracoes?tab=meios-pagamentos')
  }

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => {
        if (isLoadingMeioPagamento) return false
        return getFormSnapshot() !== baselineSerializedRef.current
      },
      saveMeioPagamentoAndClose: () => {
        embeddedCloseAfterSaveRef.current = true
        const el = document.getElementById(formId)
        if (el instanceof HTMLFormElement) {
          el.requestSubmit()
        }
      },
    }),
    [formId, getFormSnapshot, isLoadingMeioPagamento]
  )

  if (isLoadingMeioPagamento) {
    return (
      <div
        className={
          isEmbedded
            ? 'flex min-h-0 flex-1 flex-col items-center justify-center'
            : 'flex h-full min-h-[40vh] flex-col items-center justify-center'
        }
      >
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div
      className={
        isEmbedded && hideEmbeddedHeader
          ? 'flex min-h-0 flex-1 flex-col'
          : 'flex h-full flex-col'
      }
    >
      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto md:px-[30px] px-1 md:py-4 py-2">
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Dados — mesmo padrão de “Dados do Grupo de Complementos” */}
          <div className="rounded-[12px] bg-info md:p-5 p-2">
            <div className="flex items-center gap-5 mb-8">
              <h2 className="shrink-0 text-sm font-semibold text-primary md:text-xl">
                Dados do Meio de Pagamento
              </h2>
              <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
            </div>

            <div className="space-y-8">
              <Input
                label="Nome do Meio de Pagamento"
                value={nome}
                onChange={(e) => setNome(maiusculasPt(e.target.value))}
                required
                size="small"
                placeholder="Digite o nome do meio de pagamento"
                className="bg-info"
                sx={sxEntradaCompactaMeioPagamento}
                InputLabelProps={{ required: true }}
              />

              <Input
                select
                label="Forma de pagamento fiscal"
                value={formaPagamentoFiscal}
                onChange={(e) => setFormaPagamentoFiscal(e.target.value)}
                required
                size="small"
                className="bg-info"
                sx={sxEntradaCompactaMeioPagamento}
                InputLabelProps={{ required: true }}
                SelectProps={{ displayEmpty: false }}
              >
                {formasPagamentoFiscal.map((forma) => (
                  <MenuItem key={forma} value={forma}>
                    {formasPagamentoFiscalMap[forma]}
                  </MenuItem>
                ))}
              </Input>

              {/* TEF Ativo */}
              <div className="flex items-center justify-between gap-3 rounded-lg p-2">
                <JiffyIconSwitch
                  checked={tefAtivo}
                  onChange={(e) => setTefAtivo(e.target.checked)}
                  label="TEF Ativo"
                  size="sm"
                  className="w-full justify-end gap-3"
                  inputProps={{ 'aria-label': 'TEF Ativo' }}
                />
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between gap-3 rounded-lg p-2">
                <JiffyIconSwitch
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  label="Ativo"
                  size="sm"
                  className="w-full justify-end gap-3"
                  inputProps={{ 'aria-label': 'Meio de pagamento ativo' }}
                />
              </div>
            </div>
          </div>

          {/* Botões — fluxo em página cheia */}
          {!isEmbedded ? (
            <div className="flex justify-end gap-4 pr-2 pt-4">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outlined"
                className="h-8 rounded-lg px-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !nome}
                sx={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-info)',
                  '&:hover': {
                    backgroundColor: 'var(--color-primary)',
                    opacity: 0.9,
                  },
                }}
                className="h-8 rounded-lg px-8 text-white hover:bg-primary/90"
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  )
})

NovoMeioPagamento.displayName = 'NovoMeioPagamento'
