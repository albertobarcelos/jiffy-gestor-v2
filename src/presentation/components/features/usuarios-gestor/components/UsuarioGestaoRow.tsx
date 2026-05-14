'use client'

import { FormControl, MenuItem, Select } from '@mui/material'
import { UsuarioGestor } from '@/src/domain/entities/UsuarioGestor'
import { cn } from '@/src/shared/utils/cn'

/** Mesma família de colunas que `ConviteGestaoRow` / `ConvitesGestaoList` (minmax evita overflow). */
export const USUARIO_GESTAO_GRID_DESKTOP =
  'grid w-full min-w-0 grid-cols-[minmax(0,2.25fr)_minmax(0,2.25fr)_minmax(0,1.85fr)] items-center gap-[10px]'

type PerfilOption = { id: string; role: string }

export function UsuarioGestaoRow({
  usuario,
  perfilNome,
  allPerfis,
  updatingPerfil,
  onPerfilChange,
}: {
  usuario: UsuarioGestor
  perfilNome: string
  allPerfis: PerfilOption[]
  updatingPerfil: boolean
  onPerfilChange: (usuarioId: string, perfilId: string) => void
}) {
  const selectSx = {
    fontSize: '14px',
    height: '32px',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'transparent',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--color-primary)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'transparent',
    },
    '&.Mui-focused': {
      boxShadow: 'none',
    },
  } as const

  return (
    <div className="overflow-visible transition-colors hover:bg-gray-50/80">
      {/* Desktop — mesma grade do cabeçalho (sem cursor de link: edição por linha desativada temporariamente) */}
      <div
        className={cn(
          USUARIO_GESTAO_GRID_DESKTOP,
          'relative hidden min-h-[52px] cursor-default px-3 py-2 md:grid md:px-4'
        )}
      >
        <div className="min-w-0 text-left font-nunito text-sm text-primary-text">
          <span className="block truncate font-normal">
            {usuario.getNome()}
          </span>
        </div>
        <div className="min-w-0 font-nunito text-sm text-secondary-text">
          <span className="block truncate">
            {usuario.getUsername()}
          </span>
        </div>
        <div
          className="flex min-w-0 justify-center"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <FormControl size="small" sx={{ minWidth: 0, width: '100%', maxWidth: '220px' }}>
            <Select
              value={usuario.getPerfilGestorId() || ''}
              onChange={e => {
                e.stopPropagation()
                onPerfilChange(usuario.getId(), e.target.value as string)
              }}
              disabled={updatingPerfil || allPerfis.length === 0}
              displayEmpty
              sx={selectSx}
              onClick={e => e.stopPropagation()}
              renderValue={selected => {
                if (!selected) {
                  return <span className="text-secondary-text">-</span>
                }
                const perfil = allPerfis.find(p => p.id === selected)
                const texto = perfil ? perfil.role : perfilNome
                return (
                  <span className="truncate font-nunito">
                    {typeof texto === 'string' ? texto : String(texto)}
                  </span>
                )
              }}
            >
              {allPerfis.length === 0 ? (
                <MenuItem disabled value="">
                  <em>Carregando perfis...</em>
                </MenuItem>
              ) : (
                allPerfis.map(perfil => (
                  <MenuItem key={perfil.id} value={perfil.id}>
                    {perfil.role}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </div>
      </div>

      {/* Mobile — alinhado ao padrão da lista de convites */}
      <div className="md:hidden p-4">
        <div className="w-full cursor-default text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="break-words font-nunito text-sm font-normal text-primary-text">
                {usuario.getNome()}
              </p>
              <p className="mt-1 font-nunito text-xs text-secondary-text break-all">
                {usuario.getUsername()}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-nunito text-xs text-secondary-text">
                  Perfil:{' '}
                  <span className="font-semibold text-primary-text">{perfilNome}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div
          className="mt-3 max-w-full"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <FormControl size="small" sx={{ minWidth: 0, width: '100%' }}>
            <Select
              value={usuario.getPerfilGestorId() || ''}
              onChange={e => {
                e.stopPropagation()
                onPerfilChange(usuario.getId(), e.target.value as string)
              }}
              disabled={updatingPerfil || allPerfis.length === 0}
              displayEmpty
              sx={{
                ...selectSx,
                fontSize: '12px',
                height: '28px',
              }}
              onClick={e => e.stopPropagation()}
              renderValue={selected => {
                if (!selected) {
                  return <span className="text-xs text-secondary-text">-</span>
                }
                const perfil = allPerfis.find(p => p.id === selected)
                const texto = perfil ? perfil.role : perfilNome
                return (
                  <span className="text-xs">
                    {typeof texto === 'string' ? texto : String(texto)}
                  </span>
                )
              }}
            >
              {allPerfis.length === 0 ? (
                <MenuItem disabled value="">
                  <em>Carregando perfis...</em>
                </MenuItem>
              ) : (
                allPerfis.map(perfil => (
                  <MenuItem key={perfil.id} value={perfil.id}>
                    {perfil.role}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </div>
      </div>
    </div>
  )
}
