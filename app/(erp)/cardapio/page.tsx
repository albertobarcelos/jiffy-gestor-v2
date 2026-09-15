'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { gravarMenuCardapioSessao, resolverMenuCardapioInicial } from '@/src/shared/utils/menuCardapioSessao'
import Link from 'next/link'

export default function CardapioPage() {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const empresaId = useTenantEmpresaId()
  const { data, isPending } = useMenus({ limit: 100 })

  const menus = data?.items ?? []
  const menuId = resolverMenuCardapioInicial({ empresaId, menus })

  useEffect(() => {
    if (isPending) return
    if (!menuId) return
    if (empresaId) gravarMenuCardapioSessao(empresaId, menuId)
    router.replace(toGestao(`/menus/${menuId}`))
  }, [empresaId, isPending, menuId, router, toGestao])

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  if (!menuId) {
    return (
      <div className="p-6">
        <p className="text-sm text-secondary-text">Nenhum cardápio cadastrado nesta empresa.</p>
        <Link
          href={toGestao('/menus')}
          className="mt-2 inline-block text-sm font-semibold text-primary"
        >
          Cadastrar menu
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center">
      <JiffyLoading />
    </div>
  )
}
