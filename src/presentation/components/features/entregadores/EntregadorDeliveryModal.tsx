'use client'

import { useCallback, useEffect, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'

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
        setForm({
          nome: data.nome != null ? String(data.nome) : '',
          telefone:
            data.telefone != null
              ? String(data.telefone)
              : data.telefoneFormatado != null
                ? String(data.telefoneFormatado)
                : '',
          cpf:
            data.cpf != null
              ? String(data.cpf)
              : data.cpfFormatado != null
                ? String(data.cpfFormatado)
                : '',
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
    }
    if (isEdicao) {
      payload.ativo = form.ativo
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

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title={isEdicao ? 'Editar entregador' : 'Novo entregador'}
      subtitle="Entregadores do módulo delivery (vinculação em pedidos e Kanban)."
      panelClassName="w-[min(28rem,95vw)]"
      footerVariant="bar"
      footerActions={{
        barActionOrder: ['cancel', 'saveAndClose'],
        showCancel: true,
        cancelLabel: 'Cancelar',
        onCancel: onClose,
        showSaveAndClose: true,
        saveAndCloseLabel: isEdicao ? 'Salvar' : 'Cadastrar',
        onSaveAndClose: () => void salvar(),
        saveAndCloseLoading: salvando,
        saveAndCloseDisabled: carregando,
      }}
    >
      {carregando ? (
        <p className="text-sm text-secondary-text py-6">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-4 px-1">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-primary-text">Nome *</span>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              maxLength={255}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-primary-text">Telefone</span>
            <input
              type="text"
              value={form.telefone}
              onChange={e => setForm(prev => ({ ...prev, telefone: e.target.value }))}
              placeholder="(65) 99999-9999"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-primary-text">CPF</span>
            <input
              type="text"
              value={form.cpf}
              onChange={e => setForm(prev => ({ ...prev, cpf: e.target.value }))}
              placeholder="Somente números (11 dígitos)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              maxLength={14}
            />
          </label>
          {isEdicao && (
            <label className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-sm font-medium text-primary-text">Ativo</span>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={e => setForm(prev => ({ ...prev, ativo: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 accent-secondary"
              />
            </label>
          )}
        </div>
      )}
    </JiffySidePanelModal>
  )
}
