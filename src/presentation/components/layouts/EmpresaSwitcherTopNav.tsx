'use client'

import { useState } from 'react'
import { Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material'
import { MdPointOfSale, MdExpandMore, MdCheck } from 'react-icons/md'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useTrocarEmpresaGestor } from '@/src/presentation/hooks/useTrocarEmpresaGestor'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'

type EmpresaSwitcherTopNavProps = {
  /** Fecha drawer mobile após escolher empresa */
  onAfterSelect?: () => void
  /** `desktop`: barra superior; `mobile`: bloco no drawer */
  variant: 'desktop' | 'mobile'
}

function labelEmpresa(e: LoginEmpresaSnapshot): string {
  return e.nomeFantasia?.trim() || 'Empresa'
}

export function EmpresaSwitcherTopNav({ onAfterSelect, variant }: EmpresaSwitcherTopNavProps) {
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const { empresa: empresaLogada, isLoading: carregandoEmpresa } = useEmpresaMe()
  const { trocarEmpresa, busyEmpresaId, podeTrocar } = useTrocarEmpresaGestor()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  if (carregandoEmpresa || !empresaLogada) {
    return null
  }

  const lista = hubEmpresas ?? []
  const multi = lista.length > 1 && podeTrocar

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handlePick = async (e: LoginEmpresaSnapshot) => {
    handleClose()
    await trocarEmpresa(e)
    onAfterSelect?.()
  }

  if (!multi) {
    if (variant === 'mobile') {
      return (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-primary/10 bg-primary/5 px-4 py-2">
          <MdPointOfSale className="h-5 w-5 shrink-0 text-primary-text opacity-80" aria-hidden />
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-medium text-primary-text/70">Empresa logada</span>
            <span className="truncate text-sm font-semibold text-primary-text">{empresaLogada.nomeExibicao}</span>
          </div>
        </div>
      )
    }

    return (
      <div className="ml-auto mr-2 flex items-center">
        <span
          className="inline-flex items-center gap-1.5 border-l px-3 py-2 text-xs font-semibold text-primary-text"
          title="Empresa logada"
        >
          <MdPointOfSale className="h-5 w-5 text-primary-text opacity-80" aria-hidden />
          <span className="max-w-[150px] truncate text-base text-primary-text">{empresaLogada.nomeExibicao}</span>
        </span>
      </div>
    )
  }

  const triggerClass =
    variant === 'mobile'
      ? 'mt-2 flex w-full items-center gap-3 rounded-lg border border-primary/15 bg-primary/5 px-4 py-2 text-left transition hover:bg-primary/10'
      : 'ml-auto mr-2 inline-flex max-w-[min(100%,14rem)] items-center gap-1 rounded-lg border-l border-transparent py-1.5 pl-3 pr-2 text-primary-text transition hover:bg-gray-50'

  return (
    <>
      <button
        type="button"
        className={triggerClass}
        onClick={handleOpen}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Trocar de empresa"
      >
        <MdPointOfSale className="h-5 w-5 shrink-0 text-primary-text opacity-80" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-primary-text">
          {empresaLogada.nomeExibicao}
        </span>
        <MdExpandMore
          className={`h-4 w-4 shrink-0 text-primary-text opacity-90 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: variant === 'desktop' ? 'right' : 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: variant === 'desktop' ? 'right' : 'left' }}
        slotProps={{
          paper: {
            sx: { minWidth: variant === 'mobile' ? 260 : 220, maxWidth: 360 },
          },
        }}
      >
        {lista.map(e => {
          const ativa = e.id === empresaLogada.id
          const busy = busyEmpresaId === e.id
          const desabilitada = e.bloqueado || busy
          return (
            <MenuItem
              key={e.id}
              disabled={desabilitada || ativa}
              selected={ativa}
              onClick={() => void handlePick(e)}
              dense
            >
              {busy ? (
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CircularProgress size={18} sx={{ color: 'var(--color-primary-text)' }} />
                </ListItemIcon>
              ) : ativa ? (
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <MdCheck className="h-4 w-4 text-primary-text" aria-hidden />
                </ListItemIcon>
              ) : (
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <MdPointOfSale className="h-4 w-4 text-primary-text opacity-70" aria-hidden />
                </ListItemIcon>
              )}
              <ListItemText
                primary={labelEmpresa(e)}
                secondary={e.bloqueado ? 'Inativo' : undefined}
                primaryTypographyProps={{
                  className: 'truncate text-primary-text',
                  title: labelEmpresa(e),
                }}
                secondaryTypographyProps={{ className: 'text-primary-text/70' }}
              />
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
