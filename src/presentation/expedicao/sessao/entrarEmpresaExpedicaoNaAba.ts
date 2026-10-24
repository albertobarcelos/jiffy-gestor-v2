import type { User } from '@/src/domain/entities/User'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { gravarUltimaEmpresaApp } from '@/src/presentation/expedicao/app/sessao/ultimaEmpresaAppStorage'
import {
  buildAuthFromAccessToken,
  isEmailSessaoPlaceholder,
} from '@/src/shared/utils/buildAuthFromAccessToken'
import { bootstrapTabSessionManually, buildEmpresaUrlParam } from '@/src/shared/utils/tabSession'
import { pathExpedicaoDaSuperficie, type SuperficieExpedicao } from './pathsExpedicao'

/** Ativa a empresa nesta aba e devolve `/gestao/{slug}/expedicao?expedicao`. */
export function entrarEmpresaExpedicaoNaAba(input: {
  accessToken: string
  empresaNome: string
  empresaId: string
  superficie?: SuperficieExpedicao
  /** Usuário do login recém-feito — o store às vezes ainda não reidratou no primeiro Enter. */
  usuario?: User
}): string {
  const empParam = buildEmpresaUrlParam(input.empresaNome, input.empresaId)
  bootstrapTabSessionManually(input.accessToken, empParam, input.empresaId)

  const prev = input.usuario ?? useAuthStore.getState().getUser()
  if (!prev || isEmailSessaoPlaceholder(prev.getEmail())) {
    throw new Error('Sessão sem usuário válido. Faça login novamente.')
  }

  const auth = buildAuthFromAccessToken(input.accessToken, {
    id: prev.getId(),
    email: prev.getEmail(),
    name: prev.getName(),
  })
  useAuthStore.getState().setTenantAuth(auth)
  useAuthStore.getState().setTabVerified(true)

  if ((input.superficie ?? 'bancada') === 'app') {
    gravarUltimaEmpresaApp({
      userId: prev.getId(),
      empresaId: input.empresaId,
      empresaNome: input.empresaNome,
      empParam,
      userEmail: prev.getEmail(),
      userName: prev.getName(),
    })
  }

  return pathExpedicaoDaSuperficie(input.superficie ?? 'bancada', empParam)
}
