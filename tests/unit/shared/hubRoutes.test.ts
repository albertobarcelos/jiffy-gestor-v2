import { describe, it, expect } from 'vitest'
import {
  HUB_PATH,
  HUB_ROUTES,
  hubGerenciarUsuariosPath,
  hubPerfisGestorPath,
  isHubPathname,
} from '@/src/shared/constants/hubRoutes'

describe('hubRoutes', () => {
  it('expõe path canônico e rotas filhas', () => {
    expect(HUB_PATH).toBe('/minhas-empresas')
    expect(HUB_ROUTES.root).toBe(HUB_PATH)
    expect(HUB_ROUTES.perfisGestor).toBe(`${HUB_PATH}/perfis-gestor`)
    expect(HUB_ROUTES.gerenciarUsuarios).toBe(`${HUB_PATH}/gerenciar-usuarios`)
  })

  it('isHubPathname reconhece raiz e subrotas', () => {
    expect(isHubPathname(HUB_PATH)).toBe(true)
    expect(isHubPathname(`${HUB_PATH}/treinamentos`)).toBe(true)
    expect(isHubPathname('/login')).toBe(false)
    expect(isHubPathname(null)).toBe(false)
  })

  it('monta paths com slug', () => {
    expect(hubPerfisGestorPath('acme')).toBe(`${HUB_PATH}/perfis-gestor/acme`)
    expect(hubGerenciarUsuariosPath()).toBe(HUB_ROUTES.gerenciarUsuarios)
  })
})
