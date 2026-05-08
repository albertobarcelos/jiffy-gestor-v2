'use client'

import { useState } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { Settings } from 'lucide-react'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import { cn } from '@/src/shared/utils/cn'
import type { ConvitePendente } from '../types'

function formatarDataHora(expiraEm: string): string {
  const d = new Date(expiraEm)
  if (Number.isNaN(d.getTime())) return expiraEm
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Badge alinhado ao StatusBadge do AppCard (convite pendente). */
function ConvitePendenteBadge() {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold leading-none text-gray-700">
      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
      Convite pendente
    </span>
  )
}

/** Avatar circular igual ao AppCard (nome fantasia da empresa). */
function ConviteAvatar({ nome }: { nome: string }) {
  const fallback = nome.trim().slice(0, 2).toUpperCase()
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
      <span className="text-xs font-bold text-gray-700">{fallback}</span>
    </div>
  )
}

/**
 * Card de convite pendente — mesmo shell visual do AppCard (Meus aplicativos).
 * Não exibe IDs; dados conforme GET /convites/me (nome empresa, e-mail, expiração).
 */
export function ConviteCard({
  convite,
  onAceitar,
  onRecusar,
  loadingAction,
}: {
  convite: ConvitePendente
  onAceitar: (id: string) => void
  onRecusar: (id: string) => void
  loadingAction?: 'aceitar' | 'recusar' | null
}) {
  const isLoading = loadingAction != null
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const menuAberto = Boolean(menuAnchor)
  const [confirmRecusarAberto, setConfirmRecusarAberto] = useState(false)

  const fecharMenu = () => setMenuAnchor(null)

  /** Abre o modal de confirmação (recusar só após “Continuar”). */
  const handleAbrirConfirmacaoRecusar = () => {
    fecharMenu()
    setConfirmRecusarAberto(true)
  }

  const handleConfirmarRecusar = () => {
    setConfirmRecusarAberto(false)
    onRecusar(convite.id)
  }

  return (
    <div className="flex h-52 flex-col rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
      {/* Pai: justify-between — bloco de dados (scroll se precisar) + botão com mb-3 */}
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3">
            {/* Mesma linha e alinhamento vertical que AppCard: status + engrenagem */}
            <div className="flex min-h-9 w-full shrink-0 items-center justify-between gap-2">
              <div className="flex shrink-0 items-center">
                <ConvitePendenteBadge />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={e => {
                    e.stopPropagation()
                    setMenuAnchor(e.currentTarget)
                  }}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Opções do convite"
                  title="Opções do convite"
                  aria-haspopup="menu"
                  aria-expanded={menuAberto}
                >
                  <Settings className="h-4 w-4" aria-hidden />
                </button>
                <Menu
                  anchorEl={menuAnchor}
                  open={menuAberto}
                  onClose={fecharMenu}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{
                    paper: {
                      className: 'min-w-0 py-0.5',
                      elevation: 2,
                      sx: { '& .MuiList-root': { py: 0 } },
                    },
                  }}
                >
                  <MenuItem
                    dense
                    disabled={isLoading}
                    onClick={handleAbrirConfirmacaoRecusar}
                    className=""
                    sx={{
                      minHeight: 28,
                      py: 0.375,
                      px: 1.25,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: 'error.main',
                    }}
                  >
                    {loadingAction === 'recusar' ? 'Recusando…' : 'Recusar'}
                  </MenuItem>
                </Menu>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ConviteAvatar nome={convite.nomeEmpresa} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{convite.nomeEmpresa}</p>
                <p className="truncate text-xs font-medium text-gray-500">{convite.email}</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Expira em <span className="font-semibold">{formatarDataHora(convite.expiraEm)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onAceitar(convite.id)}
            className={cn(
              'inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition',
              isLoading && loadingAction !== 'aceitar'
                ? 'cursor-not-allowed bg-gray-400'
                : loadingAction === 'aceitar'
                  ? 'cursor-wait bg-gray-400'
                  : 'bg-secondary hover:bg-alternate'
            )}
          >
            {loadingAction === 'aceitar' ? 'Aceitando…' : 'Aceitar'}
          </button>
        </div>
      </div>

      <JiffyConfirmDialog
        open={confirmRecusarAberto}
        onOpenChange={setConfirmRecusarAberto}
        title="Recusar convite?"
        description={
          <>
            O convite para <strong>{convite.nomeEmpresa}</strong> será recusado e não poderá ser aceito
            depois. Deseja continuar?
          </>
        }
        cancelLabel="Cancelar"
        confirmLabel="Continuar"
        onConfirm={handleConfirmarRecusar}
        busy={loadingAction === 'recusar'}
        confirmDisabled={isLoading}
        titleSx={{ color: 'var(--color-alternate)' }}
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
      />
    </div>
  )
}
