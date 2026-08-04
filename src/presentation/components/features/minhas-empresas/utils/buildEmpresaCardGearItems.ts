import type { CardGearMenuItemConfig } from '@/src/presentation/components/ui/CardGearMenu'

/**
 * Itens do menu da engrenagem no card de empresa vinculada (Meus Apps).
 */
export function buildEmpresaCardGearItems(
  appId: string,
  opts: {
    navDisabled: boolean
    onGerenciarConvites?: (id: string) => void
    onGerenciarPerfisGestor?: (id: string) => void
  }
): CardGearMenuItemConfig[] {
  const podeConvidar = !opts.navDisabled && Boolean(opts.onGerenciarConvites)
  const podePerfis = !opts.navDisabled && Boolean(opts.onGerenciarPerfisGestor)

  return [
    {
      id: 'gerenciar-usuarios',
      label: 'Gerenciar Usuários',
      onClick: () => opts.onGerenciarConvites?.(appId),
      disabled: !podeConvidar,
    },
    {
      id: 'perfis-gestor',
      label: 'Perfis Gestor',
      onClick: () => opts.onGerenciarPerfisGestor?.(appId),
      disabled: !podePerfis,
    },
  ]
}
