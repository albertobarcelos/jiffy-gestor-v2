'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { Input } from '@/src/presentation/components/ui/input'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import {
  normalizarSenhaEntregadorDelivery,
  senhaEntregadorDeliveryValida,
} from '@/src/application/delivery/senhaEntregadorDelivery'

type EntregadorSenhaDialogProps = {
  open: boolean
  entregadorId: string | null
  entregadorNome: string | null
  onClose: () => void
  onSalvo: () => void
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

export function EntregadorSenhaDialog({
  open,
  entregadorId,
  entregadorNome,
  onClose,
  onSalvo,
}: EntregadorSenhaDialogProps) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) {
      setSenha('')
      setConfirmacao('')
    }
  }, [open])

  const podeSalvar =
    senhaEntregadorDeliveryValida(senha) && senha === confirmacao && Boolean(entregadorId) && !salvando

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!entregadorId) return
    const senhaDigits = normalizarSenhaEntregadorDelivery(senha)
    if (!senhaEntregadorDeliveryValida(senhaDigits)) {
      showToast.error('A senha deve ter 4 dígitos.')
      return
    }
    if (senhaDigits !== normalizarSenhaEntregadorDelivery(confirmacao)) {
      showToast.error('As senhas não coincidem.')
      return
    }

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada.')
      return
    }

    setSalvando(true)
    try {
      const res = await fetchGestorApi(`/api/delivery/entregadores/${encodeURIComponent(entregadorId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ senha: senhaDigits }),
      })
      if (!res.ok) {
        throw new Error(await mensagemErroHttp(res))
      }
      showToast.success('Senha de expedição atualizada.')
      onSalvo()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao alterar a senha')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={aberto => !aberto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha de expedição</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-text">
          {entregadorNome
            ? `Defina a senha de 4 dígitos de ${entregadorNome} para o app do entregador.`
            : 'Defina a senha de 4 dígitos para o app do entregador.'}
        </p>
        <form onSubmit={e => void salvar(e)} className="mt-3 space-y-3">
          <Input
            label="Nova senha"
            value={senha}
            onChange={e => setSenha(normalizarSenhaEntregadorDelivery(e.target.value))}
            placeholder="0000"
            type="password"
            inputProps={{ maxLength: 4, inputMode: 'numeric', autoComplete: 'new-password' }}
            required
            fullWidth
            size="small"
            disabled={salvando}
          />
          <Input
            label="Confirmar senha"
            value={confirmacao}
            onChange={e => setConfirmacao(normalizarSenhaEntregadorDelivery(e.target.value))}
            placeholder="0000"
            type="password"
            inputProps={{ maxLength: 4, inputMode: 'numeric', autoComplete: 'new-password' }}
            required
            fullWidth
            size="small"
            disabled={salvando}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!podeSalvar}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {salvando ? 'Salvando…' : 'Salvar senha'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
