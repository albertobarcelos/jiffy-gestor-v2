'use client'

import {
  ProdutoNovoWizard,
  type ProdutoNovoWizardProps,
} from '@/src/presentation/components/features/produtos/ProdutoNovoWizard'

type MenuNovoProdutoWizardProps = Omit<ProdutoNovoWizardProps, 'origem'> & {
  menuId: string
}

/** Atalho do cardápio para `ProdutoNovoWizard` com `origem="menu"`. */
export function MenuNovoProdutoWizard({
  menuId,
  menuNome,
  open,
  onClose,
  initialCategoriaId,
  onSuccess,
}: MenuNovoProdutoWizardProps) {
  return (
    <ProdutoNovoWizard
      origem="menu"
      open={open}
      onClose={onClose}
      menuId={menuId}
      menuNome={menuNome}
      initialCategoriaId={initialCategoriaId}
      onSuccess={onSuccess}
    />
  )
}
