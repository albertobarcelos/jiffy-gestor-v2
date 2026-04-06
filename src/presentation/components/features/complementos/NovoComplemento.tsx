'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Complemento } from '@/src/domain/entities/Complemento'
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'

/** Labels outlined em preto (MUI usa cinza por padrão) */
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

/** Padding interno reduzido — base para TextField / Select deste formulário */
const entradaCompactaInput = {
  padding: '10px',
  fontSize: '0.875rem',
} as const

const entradaCompactaSelect = {
  padding: '10px',
  fontSize: '0.875rem',
  minHeight: '1.5em',
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'center',
} as const

const sxEntradaCompactaComplemento = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-input': entradaCompactaInput,
  '& .MuiSelect-select': entradaCompactaSelect,
} as const

/** Nome e descrição: exibição em maiúsculas + estado já normalizado no onChange */
const sxCampoTextoMaiusculo = {
  ...sxEntradaCompactaComplemento,
  '& .MuiOutlinedInput-input': {
    ...entradaCompactaInput,
    textTransform: 'uppercase' as const,
  },
} as const

interface NovoComplementoProps {
  complementoId?: string
  isEmbedded?: boolean
  /** Quando true com isEmbedded, omite o cabeçalho interno (título + Cancelar) — o shell do modal já fornece */
  hideEmbeddedHeader?: boolean
  /** `id` do `<form>` para o rodapé externo usar `form="..."` no botão Salvar */
  embeddedFormId?: string
  /** Omite a linha de Salvar dentro do formulário (ações ficam no rodapé do painel) */
  hideEmbeddedFormActions?: boolean
  /** Sincroniza estado com o rodapé do modal (loading / pode submeter) */
  onEmbedFormStateChange?: (state: {
    isSubmitting: boolean
    canSubmit: boolean
  }) => void
  onSaved?: () => void
  onCancel?: () => void
}

/**
 * Componente para criar/editar complemento
 * Replica o design e funcionalidades do Flutter
 */
export function NovoComplemento({
  complementoId,
  isEmbedded,
  hideEmbeddedHeader,
  embeddedFormId,
  hideEmbeddedFormActions,
  onEmbedFormStateChange,
  onSaved,
  onCancel,
}: NovoComplementoProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const accessToken = auth?.getAccessToken()
  const isEditing = !!complementoId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipoImpactoPreco, setTipoImpactoPreco] = useState<'nenhum' | 'aumenta' | 'diminui'>('nenhum')
  const [ativo, setAtivo] = useState(true)

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingComplemento, setIsLoadingComplemento] = useState(false)

  const emitEmbedFormState = useCallback(() => {
    onEmbedFormStateChange?.({
      isSubmitting: isLoading,
      canSubmit: nome.trim().length > 0,
    })
  }, [isLoading, nome, onEmbedFormStateChange])

  useEffect(() => {
    emitEmbedFormState()
  }, [emitEmbedFormState])

  // Carregar dados do complemento em modo edição (cancela se id mudar ou desmontar)
  useEffect(() => {
    if (!isEditing || !complementoId) {
      setIsLoadingComplemento(false)
      return
    }

    let cancelled = false
    if (!accessToken) {
      return
    }

    setIsLoadingComplemento(true)

    const loadComplemento = async () => {
      try {
        const response = await fetch(`/api/complementos/${complementoId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (cancelled) return

        if (response.ok) {
          const data = await response.json()
          const complemento = Complemento.fromJSON(data)

          setNome(complemento.getNome().toUpperCase())
          setDescricao((complemento.getDescricao() || '').toUpperCase())
          setValor(formatValorFromNumber(complemento.getValor()))
          const tipoBanco = (complemento.getTipoImpactoPreco() || 'nenhum').toLowerCase()
          const tipoNormalizado =
            tipoBanco === 'aumenta' || tipoBanco === 'diminui' ? tipoBanco : 'nenhum'
          setTipoImpactoPreco(tipoNormalizado)
          setAtivo(complemento.isAtivo())
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar complemento:', error)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingComplemento(false)
        }
      }
    }

    void loadComplemento()

    return () => {
      cancelled = true
    }
  }, [isEditing, complementoId, accessToken])

  // Formatação de valor monetário
  const formatValorInput = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return ''
    }
    const numberValue = parseInt(digits, 10)
    const formatted = (numberValue / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    return formatted
  }

  const formatValorFromNumber = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const parseValorToNumber = (value: string): number => {
    const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
    const parsed = parseFloat(normalized)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      alert('Token não encontrado')
      return
    }

    setIsLoading(true)

    try {
      const valorNumero = parseValorToNumber(valor)

      const nomeUpper = nome.trim().toUpperCase()
      const descUpper = descricao.trim().toUpperCase()

      const body: any = {
        nome: nomeUpper,
        descricao: descUpper || undefined,
        valor: valorNumero,
        ativo,
        tipoImpactoPreco,
      }

      const url = isEditing
        ? `/api/complementos/${complementoId}`
        : '/api/complementos'
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
        throw new Error(errorData.error || 'Erro ao salvar complemento')
      }

      showToast.success(isEditing ? 'Complemento atualizado com sucesso!' : 'Complemento criado com sucesso!')
      if (isEmbedded) {
        onSaved?.()
      } else {
        router.push('/cadastros/complementos')
      }
    } catch (error) {
      console.error('Erro ao salvar complemento:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar complemento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/complementos')
    }
  }

  if (isLoadingComplemento) {
    return (
      <div
        className={
          isEmbedded
            ? 'flex min-h-0 flex-1 flex-col items-center justify-center'
            : 'flex min-h-[40vh] flex-col items-center justify-center'
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
      {/* Header fixo — omitido quando o modal shell já exibe título e fechar */}
      {!(isEmbedded && hideEmbeddedHeader) ? (
        <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[20px] shadow-md md:px-[30px] px-2 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-primary md:text-lg text-sm font-semibold font-exo">
                {isEditing
                  ? `Editar Complemento: ${nome || ''}`
                  : `Novo Complemento: ${nome || ''}`}
              </h1>
            </div>
            <Button
              onClick={handleCancel}
              variant="outlined"
              className="h-8 px-[26px] rounded-lg border-primary/15 text-primary bg-primary/10 hover:bg-primary/20"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto md:px-[30px] px-1 py-[30px]">
        <form
          id={embeddedFormId}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Dados */}
          <div className="bg-info rounded-[10px] p-2">
            <div className="flex items-center gap-5 mb-2">
              <h2 className="text-primary text-xl font-semibold font-exo">
                Dados do Complemento
              </h2>
              <div className="flex-1 h-px bg-primary/70"></div>
            </div>

            <div className="space-y-6">
              <JiffyIconSwitch
                checked={ativo}
                onChange={e => setAtivo(e.target.checked)}
                label="Ativo"
                bordered={false}
                className="justify-end"
              />

              <Input
                label="Nome do Complemento"
                value={nome}
                onChange={e => setNome(e.target.value.toUpperCase())}
                required
                size="small"
                placeholder="Nome do complemento"
                className="bg-white"
                sx={sxCampoTextoMaiusculo}
                InputLabelProps={{ required: true }}
              />

              <Input
                label="Descrição"
                value={descricao}
                onChange={e => setDescricao(e.target.value.toUpperCase())}
                size="small"
                placeholder="Descrição do complemento"
                className="bg-white"
                sx={sxCampoTextoMaiusculo}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Valor (R$)"
                    value={valor}
                    onChange={(e) => setValor(formatValorInput(e.target.value))}
                    size="small"
                    placeholder="R$ 0,00"
                    className="bg-white"
                    sx={sxEntradaCompactaComplemento}
                    inputProps={{
                      inputMode: 'decimal',
                      autoComplete: 'off',
                    }}
                  />
                </div>

                <div>
                  <FormControl
                    fullWidth
                    size="small"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                      },
                      ...sxEntradaCompactaComplemento,
                      '& .MuiSelect-select': {
                        ...entradaCompactaSelect,
                        textTransform: 'uppercase',
                      },
                    }}
                  >
                    <InputLabel id="novo-complemento-tipo-impacto-label">
                      Tipo Impacto
                    </InputLabel>
                    <Select
                      labelId="novo-complemento-tipo-impacto-label"
                      id="novo-complemento-tipo-impacto"
                      label="Tipo Impacto"
                      size="small"
                      value={tipoImpactoPreco}
                      onChange={e => {
                        const value = String(e.target.value).toLowerCase()
                        setTipoImpactoPreco(
                          value === 'aumenta' || value === 'diminui' ? value : 'nenhum'
                        )
                      }}
                    >
                      <MenuItem value="nenhum" sx={{ textTransform: 'uppercase' }}>
                        Nenhum
                      </MenuItem>
                      <MenuItem value="aumenta" sx={{ textTransform: 'uppercase' }}>
                        Aumenta
                      </MenuItem>
                      <MenuItem value="diminui" sx={{ textTransform: 'uppercase' }}>
                        Diminui
                      </MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </div>
            </div>
          </div>

          {hideEmbeddedFormActions ? null : (
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isLoading || !nome.trim()}
                sx={{
                  backgroundColor: 'var(--color-primary)',
                }}
                className="h-8 w-32 text-white hover:bg-primary/80"
              >
                {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

