'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { buildAuthFromAccessToken, isEmailSessaoPlaceholder } from '@/src/shared/utils/buildAuthFromAccessToken'
import {
  consumeTabSession,
  getTabTenantToken,
  bootstrapTabSessionManually,
  clearTabSession,
  getEmpresaSlugParam,
} from '@/src/shared/utils/tabSession'
import {
  parseEmpresaSlugFromPath,
  parseEmpresaSlugFromSearch,
  stripGestaoEmpresaSlugFromPath,
} from '@/src/shared/utils/gestaoRoutes'
import {
  SESSION_STORAGE_EMPRESA_SLUG,
  SESSION_STORAGE_EMPRESA_ID,
  SESSION_STORAGE_TENANT_TOKEN,
} from '@/src/shared/constants/sessionCoordinator'
import {
  irParaLoginDaSessaoAtual,
  lerSinalGestorDoBrowser,
  pathEscolherEmpresaKiosk,
  pathPedidosGestor,
  urlHubDaSessaoAtual,
} from '@/src/presentation/gestor-pedidos/sessao/pathsGestorSessao'
import { PEDIDOS_PATH } from '@/src/presentation/gestor-pedidos/constantes'
import { HUB_PATH } from '@/src/shared/constants/hubRoutes'
import { isSinalKioskGestorPedidos } from '@/src/presentation/gestor-pedidos/kiosk/isKioskGestorPedidos'
import { lerUltimaEmpresaKiosk } from '@/src/presentation/gestor-pedidos/kiosk/ultimaEmpresaKiosk'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import { decideTabSessionBootstrap } from '@/src/presentation/utils/decideTabSessionBootstrap'

type RebindPending = { empresaId: string; empParam: string }

const ROTAS_PUBLICAS_PREFIXO = [
  '/login',
  '/registro',
  '/confirmar-email',
  '/esqueci-senha',
  '/redefinir-senha',
  '/notas-fiscais',
  '/cardapio',
  '/delivery',
]

function isRotaPublicaBootstrap(pathname: string): boolean {
  return ROTAS_PUBLICAS_PREFIXO.some(r => pathname === r || pathname.startsWith(`${r}/`))
}

function getEmpParam(): string | null {
  try {
    const fromPath = parseEmpresaSlugFromPath(window.location.pathname)
    if (fromPath) return fromPath
    return parseEmpresaSlugFromSearch(window.location.search)
  } catch {
    return null
  }
}

function activateTenantToken(
  token: string,
  setTenantAuth: ReturnType<typeof useAuthStore.getState>['setTenantAuth'],
  setTabVerified: ReturnType<typeof useAuthStore.getState>['setTabVerified']
): void {
  const prev = useAuthStore.getState().getUser()
  if (!prev || isEmailSessaoPlaceholder(prev.getEmail())) {
    throw new Error('Sessão sem usuário válido')
  }
  const auth = buildAuthFromAccessToken(token, {
    id: prev.getId(),
    email: prev.getEmail(),
    name: prev.getName(),
  })
  setTenantAuth(auth)
  setTabVerified(true)
}

async function rebindViaEscolherEmpresa(
  pending: RebindPending,
  handlers: {
    setTenantAuth: ReturnType<typeof useAuthStore.getState>['setTenantAuth']
    setTabVerified: ReturnType<typeof useAuthStore.getState>['setTabVerified']
  }
): Promise<void> {
  const { setTenantAuth, setTabVerified } = handlers
  try {
    const res = await fetch('/api/auth/escolher-empresa', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId: pending.empresaId }),
    })

    if (!res.ok) throw new Error('escolher-empresa failed')

    const data = (await res.json()) as { accessToken?: string }
    if (!data.accessToken) throw new Error('no accessToken')

    bootstrapTabSessionManually(data.accessToken, pending.empParam, pending.empresaId)
    activateTenantToken(data.accessToken, setTenantAuth, setTabVerified)
  } catch {
    clearTabSession()
    irParaLoginDaSessaoAtual()
  }
}

/**
 * Restaura a sessão per-tab (URL canônica + mint/`escolher-empresa`).
 *
 * Decisão: {@link decideTabSessionBootstrap}.
 * `isTabVerified` fica false só durante rebind assíncrono (bloqueia queries).
 */
export function TabSessionBootstrap() {
  const setTenantAuth = useAuthStore(s => s.setTenantAuth)
  const setTabVerified = useAuthStore(s => s.setTabVerified)
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const isRehydrated = useAuthStore(s => s.isRehydrated)

  const pathname = usePathname()
  const didRunRef = useRef(false)
  const rebindRef = useRef<RebindPending | null>(null)

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !isRehydrated) return

    if (isRotaPublicaBootstrap(pathname ?? window.location.pathname)) {
      return
    }

    if (didRunRef.current) return

    const emp = getEmpParam()

    /** Jiffy Flow sem slug: aba já aberta, ou lista de empresas — nunca Minhas Empresas. */
    if (!emp && isSinalKioskGestorPedidos(lerSinalGestorDoBrowser())) {
      const pathModulo = stripGestaoEmpresaSlugFromPath(window.location.pathname)
      /** Lista do Flow: o utilizador acabou de entrar — não saltar para a última empresa. */
      if (pathModulo === `${PEDIDOS_PATH}/empresas`) {
        didRunRef.current = true
        setTabVerified(true)
        return
      }

      const storedSlug = getEmpresaSlugParam()
      if (storedSlug) {
        didRunRef.current = true
        window.location.replace(pathPedidosGestor(storedSlug))
        return
      }
      const userId =
        useAuthStore.getState().identityAuth?.getUser().getId() ??
        useAuthStore.getState().hubEmpresasUserId
      const last = lerUltimaEmpresaKiosk()
      const lastDoUser = last?.empParam && (!userId || !last.userId || last.userId === userId)
      if (lastDoUser && getTabTenantToken()) {
        didRunRef.current = true
        window.location.replace(pathPedidosGestor(last.empParam))
        return
      }
      if (pathModulo === PEDIDOS_PATH || pathModulo === HUB_PATH) {
        didRunRef.current = true
        window.location.replace(pathEscolherEmpresaKiosk())
        return
      }
      didRunRef.current = true
      setTabVerified(true)
      return
    }

    const pendingToken = consumeTabSession(emp)
    const existingToken = pendingToken ? null : getTabTenantToken()

    let storedEmpresaId: string | null = null
    try {
      storedEmpresaId = sessionStorage.getItem(SESSION_STORAGE_EMPRESA_ID)
    } catch {
      /* ignore */
    }

    const decision = decideTabSessionBootstrap({
      empParam: emp,
      pendingToken,
      existingToken,
      hubEmpresas,
      storedEmpresaId,
    })

    if (decision.type === 'wait') {
      const identity = useAuthStore.getState().identityAuth
      if (!identity || identity.isExpired()) {
        didRunRef.current = true
        irParaLoginDaSessaoAtual()
      }
      return
    }

    didRunRef.current = true

    if (decision.type === 'activate') {
      try {
        if (emp) sessionStorage.setItem(SESSION_STORAGE_EMPRESA_SLUG, emp)
        const eid = extractTokenInfo(decision.token).empresaId
        if (eid) sessionStorage.setItem(SESSION_STORAGE_EMPRESA_ID, eid)
      } catch {
        /* ignore */
      }
      try {
        activateTenantToken(decision.token, setTenantAuth, setTabVerified)
      } catch {
        irParaLoginDaSessaoAtual()
      }
      return
    }

    if (decision.type === 'redirect-hub') {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_TENANT_TOKEN)
      } catch {
        /* ignore */
      }
      const identity = useAuthStore.getState().identityAuth
      if (identity && !identity.isExpired()) {
        window.location.replace(urlHubDaSessaoAtual())
      } else {
        irParaLoginDaSessaoAtual()
      }
      return
    }

    // rebind
    try {
      sessionStorage.removeItem(SESSION_STORAGE_TENANT_TOKEN)
      sessionStorage.setItem(SESSION_STORAGE_EMPRESA_SLUG, decision.empParam)
      sessionStorage.setItem(SESSION_STORAGE_EMPRESA_ID, decision.empresaId)
    } catch {
      /* ignore */
    }
    rebindRef.current = { empresaId: decision.empresaId, empParam: decision.empParam }
  }, [hubEmpresas, isRehydrated, pathname, setTabVerified, setTenantAuth])

  useEffect(() => {
    const pending = rebindRef.current
    if (!pending) return
    rebindRef.current = null
    void rebindViaEscolherEmpresa(pending, { setTenantAuth, setTabVerified })
  }, [isRehydrated, hubEmpresas, setTenantAuth, setTabVerified])

  return null
}
