'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { identificarEntregadorPorSenha } from '@/src/presentation/expedicao/api/expedicaoApi'
import type { EntregadorIdentificado } from '@/src/presentation/expedicao/api/expedicaoApi'
import {
  pathEscolherEmpresaExpedicao,
  pathLoginExpedicao,
} from '@/src/presentation/expedicao/sessao/pathsExpedicao'
import { entrarEmpresaExpedicaoNaAba } from '@/src/presentation/expedicao/sessao/entrarEmpresaExpedicaoNaAba'
import {
  gravarEntregadorApp,
  lerEntregadorApp,
  limparEntregadorApp,
} from '@/src/presentation/expedicao/app/sessao/entregadorAppStorage'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { fetchAccessTokenEscolherEmpresa } from '@/src/presentation/utils/escolherEmpresaApi'
import { ensureHubBearerToken } from '@/src/presentation/utils/ensureHubBearerToken'
import { showToast } from '@/src/shared/utils/toast'

export function useSessaoEntregadorApp() {
  const [senha, setSenha] = useState('')
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const [entregador, setEntregador] = useState<EntregadorIdentificado | null>(null)
  const [autenticando, setAutenticando] = useState(false)
  const [trocandoLojaId, setTrocandoLojaId] = useState<string | null>(null)
  const [saindoLoja, setSaindoLoja] = useState(false)

  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const logoutHub = useAuthStore(s => s.logoutHub)
  const usuario = useAuthStore(s => s.getUser())
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const { empresa, isLoading: carregandoEmpresa, error: erroEmpresa } = useEmpresaMe()
  const tokenAtual = useCallback(
    () => useAuthStore.getState().tenantAuth?.getAccessToken() ?? null,
    []
  )
  const tenantValido = Boolean(tenantAuth && !tenantAuth.isExpired())

  useEffect(() => {
    if (!isRehydrated) return
    const tenant = useAuthStore.getState().tenantAuth
    const identity = useAuthStore.getState().identityAuth
    if (tenant && !tenant.isExpired()) return
    if (identity && !identity.isExpired()) {
      window.location.replace(pathEscolherEmpresaExpedicao('app'))
      return
    }
    window.location.replace(pathLoginExpedicao('app'))
  }, [isRehydrated])

  useEffect(() => {
    if (!empresa?.id) return
    setEntregador(lerEntregadorApp(empresa.id))
  }, [empresa?.id])

  const confirmarSenha = useCallback(
    async (digits: string) => {
      const token = tokenAtual()
      if (!token) {
        setErroSenha('Sessão da loja expirada. Entre novamente.')
        return
      }
      if (!/^\d{4}$/.test(digits)) return
      setAutenticando(true)
      setErroSenha(null)
      try {
        const identificado = await identificarEntregadorPorSenha(token, digits)
        gravarEntregadorApp(empresa?.id, identificado)
        setEntregador(identificado)
        setSenha('')
      } catch (error) {
        setErroSenha(error instanceof Error ? error.message : 'Senha não encontrada.')
        setSenha('')
      } finally {
        setAutenticando(false)
      }
    },
    [empresa?.id]
  )

  const sairEntregador = useCallback(() => {
    limparEntregadorApp(empresa?.id)
    setEntregador(null)
    setSenha('')
  }, [empresa?.id])

  const sairLoja = useCallback(() => {
    if (saindoLoja) return
    setSaindoLoja(true)
    limparEntregadorApp(empresa?.id)
    void logoutHub()
      .catch(() => undefined)
      .finally(() => {
        window.location.assign(pathLoginExpedicao('app'))
      })
  }, [empresa?.id, logoutHub, saindoLoja])

  const trocarLoja = useCallback(
    async (loja: LoginEmpresaSnapshot) => {
      if (trocandoLojaId) return
      setTrocandoLojaId(loja.id)
      try {
        const bearer = (await ensureHubBearerToken())?.token ?? null
        const token = await fetchAccessTokenEscolherEmpresa(loja.id, bearer)
        window.location.assign(
          entrarEmpresaExpedicaoNaAba({
            accessToken: token,
            empresaNome: loja.nomeFantasia,
            empresaId: loja.id,
            superficie: 'app',
          })
        )
      } catch (error) {
        setTrocandoLojaId(null)
        showToast.error(error instanceof Error ? error.message : 'Não foi possível trocar de loja.')
      }
    },
    [trocandoLojaId]
  )

  const aguardandoBootstrap =
    !isRehydrated || !tenantValido || (carregandoEmpresa && !empresa && !erroEmpresa)

  return {
    senha,
    setSenha,
    erroSenha,
    setErroSenha,
    entregador,
    autenticando,
    trocandoLojaId,
    saindoLoja,
    empresa,
    usuario,
    hubEmpresas,
    tokenAtual,
    aguardandoBootstrap,
    confirmarSenha,
    sairEntregador,
    sairLoja,
    trocarLoja,
  }
}
