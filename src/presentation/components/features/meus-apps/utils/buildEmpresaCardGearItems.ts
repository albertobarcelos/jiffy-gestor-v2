import type { CardGearMenuItemConfig } from '@/src/presentation/components/ui/CardGearMenu'

/**
 * Itens do menu da engrenagem no card de empresa vinculada (Meus Apps).
 */
export function buildEmpresaCardGearItems(
  appId: string,
  opts: {
    navDisabled: boolean
    onGerenciarConvites?: (id: string) => void
    onGerenciarUsuariosGestor?: (id: string) => void
  }
): CardGearMenuItemConfig[] {
  const podeConvidar = !opts.navDisabled && Boolean(opts.onGerenciarConvites)
  const podeUsuariosGestor = !opts.navDisabled && Boolean(opts.onGerenciarUsuariosGestor)

  return [
    {
      id: 'convidar-usuarios',
      label: 'Convidar usuários',
      onClick: () => opts.onGerenciarConvites?.(appId),
      disabled: !podeConvidar,
    },
    {
      id: 'usuarios-gestor',
      label: 'Usuários gestor',
      onClick: () => opts.onGerenciarUsuariosGestor?.(appId),
      disabled: !podeUsuariosGestor,
    },
  ]
}
