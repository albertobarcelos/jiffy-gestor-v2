import type { CardGearMenuItemConfig } from '@/src/presentation/components/ui/CardGearMenu'

/**
 * Itens do menu da engrenagem no card de empresa vinculada (Meus Apps).
 * “Convidar usuários” abre o fluxo de convites gestor; demais entradas são placeholders.
 */
export function buildEmpresaCardGearItems(
  appId: string,
  opts: {
    navDisabled: boolean
    onGerenciarConvites?: (id: string) => void
  }
): CardGearMenuItemConfig[] {
  const podeConvidar = !opts.navDisabled && Boolean(opts.onGerenciarConvites)

  return [
    {
      id: 'convidar-usuarios',
      label: 'Convidar usuários',
      onClick: () => opts.onGerenciarConvites?.(appId),
      disabled: !podeConvidar,
    },
    {
      id: 'placeholder-relatorios',
      label: 'Relatórios (em breve)',
      onClick: () => {},
      disabled: true,
    },
    {
      id: 'placeholder-integracoes',
      label: 'Integrações (em breve)',
      onClick: () => {},
      disabled: true,
    },
  ]
}
