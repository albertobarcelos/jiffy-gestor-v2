'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, MenuItem } from '@mui/material'
import { MdExpandMore, MdStorefront } from 'react-icons/md'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchAccessTokenEscolherEmpresa } from '@/src/presentation/utils/escolherEmpresaApi'
import { ensureHubBearerToken } from '@/src/presentation/utils/ensureHubBearerToken'
import { entrarEmpresaGestorNaAba } from '@/src/presentation/gestor-pedidos/sessao/entrarEmpresaGestorNaAba'
import { estaNaMesmaRotaLocal } from '@/src/presentation/gestor-pedidos/sessao/pathsGestorSessao'
import { parseEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import { resolverEmpresaInicialKiosk } from './ultimaEmpresaKiosk'

/**
 * Só o casco Windows (`?gestor` / Tauri). O ERP web continua a escolher empresa no hub.
 * Troca é rara: mostra o nome, sem rótulo de formulário.
 */
export function GestorEmpresaSelectKiosk() {
  const router = useRouter()
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const userId = useAuthStore(s => s.identityAuth?.getUser().getId() ?? s.hubEmpresasUserId)
  const empresaId = useTenantEmpresaId()
  const autoSelecionouRef = useRef(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const opcoes = useMemo(
    () => (hubEmpresas ?? []).filter(e => Boolean(e.id) && !e.bloqueado),
    [hubEmpresas]
  )

  const selecionada = opcoes.find(e => e.id === empresaId)
  const rotulo = selecionada?.nomeFantasia?.trim() || (opcoes.length === 0 ? 'Sem empresas' : 'Empresa')
  const podeTrocar = opcoes.length > 1 && !busyId

  const selecionar = useCallback(
    async (empresa: LoginEmpresaSnapshot) => {
      if (empresa.id === empresaId || busyId) return
      setErro(null)
      setBusyId(empresa.id)
      try {
        const bearer = (await ensureHubBearerToken())?.token ?? null
        const token = await fetchAccessTokenEscolherEmpresa(empresa.id, bearer)
        const dest = entrarEmpresaGestorNaAba({
          accessToken: token,
          empresaNome: empresa.nomeFantasia,
          empresaId: empresa.id,
        })
        if (!estaNaMesmaRotaLocal(dest)) {
          router.replace(dest)
        }
      } catch (e) {
        autoSelecionouRef.current = false
        setErro(e instanceof Error ? e.message : 'Não foi possível abrir esta empresa')
      } finally {
        setBusyId(null)
      }
    },
    [busyId, empresaId, router]
  )

  useEffect(() => {
    if (autoSelecionouRef.current || busyId || empresaId || opcoes.length === 0) return
    try {
      if (parseEmpresaSlugFromPath(window.location.pathname)) return
    } catch {
      /* noop */
    }
    const alvo = resolverEmpresaInicialKiosk(opcoes, userId)
    if (!alvo) return
    autoSelecionouRef.current = true
    void selecionar(alvo)
  }, [busyId, empresaId, opcoes, selecionar, userId])

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={!podeTrocar}
        onClick={e => {
          if (!podeTrocar) return
          setAnchor(e.currentTarget)
        }}
        className="flex h-8 max-w-[11rem] items-center gap-1 rounded-lg px-1.5 text-left text-sm font-medium text-gray-800 transition-colors hover:bg-white/60 disabled:cursor-default disabled:hover:bg-transparent"
        title={rotulo}
        aria-label={podeTrocar ? `Empresa: ${rotulo}. Trocar empresa` : `Empresa: ${rotulo}`}
        aria-haspopup={podeTrocar ? 'menu' : undefined}
        aria-expanded={podeTrocar ? Boolean(anchor) : undefined}
      >
        <MdStorefront className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 truncate">{rotulo}</span>
        {podeTrocar ? <MdExpandMore className="h-4 w-4 shrink-0 text-gray-500" /> : null}
      </button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {opcoes.map(empresa => (
          <MenuItem
            key={empresa.id}
            selected={empresa.id === empresaId}
            onClick={() => {
              setAnchor(null)
              void selecionar(empresa)
            }}
          >
            {empresa.nomeFantasia}
          </MenuItem>
        ))}
      </Menu>
      {erro ? (
        <p className="max-w-[14rem] text-[11px] leading-tight text-red-700" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  )
}
