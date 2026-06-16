'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { MdPerson } from 'react-icons/md'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Input } from '@/src/presentation/components/ui/input'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'

const ENTREGADOR_FORM_ID = 'entregador-delivery-form'

const INPUT_LABEL_PROPS = { shrink: true } as const

const INPUT_SX = {
  '& .MuiOutlinedInput-root': {
    height: '38px',
    backgroundColor: 'var(--color-primary-bg)',
    borderRadius: '8px',
  },
  '& .MuiInputBase-input': {
    padding: '8px 14px',
    fontSize: '14px',
  },
} as const

interface EntregadorDeliveryModalProps {
  open: boolean
  entregadorId: string | null
  onClose: () => void
  onSalvo: () => void
}

interface EntregadorFormState {
  nome: string
  telefone: string
  cpf: string
  ativo: boolean
}

const EMPTY_FORM: EntregadorFormState = {
  nome: '',
  telefone: '',
  cpf: '',
  ativo: true,
}

async function mensagemErroHttp(res: Response): Promise<string> {
  const raw: unknown = await res.json().catch(() => ({}))
  return (
    textoErroCorpoApi(raw) ||
    (raw &&
    typeof raw === 'object' &&
    'error' in raw &&
    typeof (raw as { error: unknown }).error === 'string'
      ? (raw as { error: string }).error
      : '') ||
    `Erro HTTP ${res.status}`
  )
}

function somenteDigitos(valor: string, max?: number): string {
  const digits = valor.replace(/\D/g, '')
  if (max != null) return digits.slice(0, max)
  return digits
}

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return value
}

export function EntregadorDeliveryModal({
  open,
  entregadorId,
  onClose,
  onSalvo,
}: EntregadorDeliveryModalProps) {
  const { auth } = useAuthStore()
  const [form, setForm] = useState<EntregadorFormState>(EMPTY_FORM)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const isEdicao = Boolean(entregadorId)
  const canSubmit = Boolean(form.nome.trim()) && !carregando

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      return
    }

    if (!entregadorId) {
      setForm(EMPTY_FORM)
      return
    }

    const token = auth?.getAccessToken()
    if (!token) return

    let cancelado = false
    setCarregando(true)

    void (async () => {
      try {
        const res = await fetch(`/api/delivery/entregadores/${encodeURIComponent(entregadorId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })
        if (!res.ok) {
          throw new Error(await mensagemErroHttp(res))
        }
        const data = (await res.json()) as Record<string, unknown>
        if (cancelado) return

        const cpfRaw =
          data.cpf != null
            ? String(data.cpf)
            : data.cpfFormatado != null
              ? String(data.cpfFormatado)
              : ''
        const telefoneRaw =
          data.telefone != null
            ? String(data.telefone)
            : data.telefoneFormatado != null
              ? String(data.telefoneFormatado)
              : ''

        setForm({
          nome: data.nome != null ? String(data.nome) : '',
          telefone: telefoneRaw ? formatarTelefoneBr(telefoneRaw) : '',
          cpf: cpfRaw ? formatCPF(cpfRaw) : '',
          ativo: typeof data.ativo === 'boolean' ? data.ativo : true,
        })
      } catch (error) {
        if (!cancelado) {
          showToast.error(error instanceof Error ? error.message : 'Erro ao carregar entregador')
          onClose()
        }
      } finally {
        if (!cancelado) setCarregando(false)
      }
    })()

    return () => {
      cancelado = true
    }
  }, [open, entregadorId, auth, onClose])

  const salvar = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada.')
      return
    }

    const nome = form.nome.trim()
    if (!nome) {
      showToast.error('Informe o nome do entregador.')
      return
    }

    const cpfDigits = somenteDigitos(form.cpf, 11)
    if (cpfDigits && cpfDigits.length !== 11) {
      showToast.error('CPF deve conter 11 dígitos.')
      return
    }

    const telefoneDigits = somenteDigitos(form.telefone)
    const payload: Record<string, unknown> = {
      nome,
      telefone: telefoneDigits || null,
      cpf: cpfDigits || null,
      ativo: form.ativo,
    }

    setSalvando(true)
    try {
      const url = isEdicao
        ? `/api/delivery/entregadores/${encodeURIComponent(entregadorId!)}`
        : '/api/delivery/entregadores'
      const res = await fetch(url, {
        method: isEdicao ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await mensagemErroHttp(res))
      }
      showToast.success(isEdicao ? 'Entregador atualizado.' : 'Entregador cadastrado.')
      onSalvo()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar entregador')
    } finally {
      setSalvando(false)
    }
  }, [auth, form, isEdicao, entregadorId, onSalvo])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void salvar()
  }

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    return {
      barActionOrder: ['cancel', 'save'],
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: onClose,
      showSave: true,
      saveLabel: salvando ? 'Salvando…' : 'Salvar',
      saveFormId: ENTREGADOR_FORM_ID,
      saveLoading: salvando,
      saveDisabled: !canSubmit || salvando,
    }
  }, [canSubmit, salvando, onClose])

  const title = isEdicao ? 'Editar Entregador' : 'Novo Entregador'

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title={title}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
      footerActions={footerActions}
    >
      <div className="flex h-full min-h-0 flex-col">
        {carregando ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <JiffyLoading />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-1 scrollbar-hide">
            <form id={ENTREGADOR_FORM_ID} onSubmit={handleSubmit} className="">
              <div className="bg-info px-1 py-3 md:px-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-primary">Dados do Entregador</h2>
                  <div className="flex-1 border-t border-primary/40" aria-hidden />
                </div>
              </div>

              <div className="space-y-4 rounded-lg bg-info py-2 md:px-5">
                <div className="flex items-center gap-1">
                  <MdPerson className="text-2xl text-primary" />
                  <h2 className="font-nunito text-base font-semibold text-primary">
                    Dados Pessoais
                  </h2>
                  <div className="flex-1" aria-hidden />
                  <div className="shrink-0">
                    <JiffyIconSwitch
                      checked={form.ativo}
                      onChange={e =>
                        setForm(prev => ({ ...prev, ativo: e.target.checked }))
                      }
                      disabled={salvando}
                      label="Ativo"
                      labelPosition="start"
                      bordered={false}
                      size="sm"
                      className="shrink-0"
                      inputProps={{
                        'aria-label': form.ativo
                          ? 'Desativar entregador'
                          : 'Ativar entregador',
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <Input
                    label="Nome"
                    value={form.nome}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        nome: e.target.value.toLocaleUpperCase('pt-BR'),
                      }))
                    }
                    required
                    placeholder="Nome completo"
                    fullWidth
                    size="small"
                    disabled={salvando}
                    InputLabelProps={INPUT_LABEL_PROPS}
                    sx={INPUT_SX}
                  />
                  <Input
                    label="Telefone"
                    value={form.telefone}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        telefone: formatarTelefoneBr(e.target.value),
                      }))
                    }
                    placeholder="(00) 00000-0000"
                    fullWidth
                    size="small"
                    disabled={salvando}
                    InputLabelProps={INPUT_LABEL_PROPS}
                    sx={INPUT_SX}
                  />
                  <Input
                    label="CPF"
                    value={form.cpf}
                    onChange={e =>
                      setForm(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))
                    }
                    placeholder="000.000.000-00"
                    inputProps={{ maxLength: 14 }}
                    fullWidth
                    size="small"
                    disabled={salvando}
                    InputLabelProps={INPUT_LABEL_PROPS}
                    sx={INPUT_SX}
                  />
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </JiffySidePanelModal>
  )
}
