'use client'

import { useMemo, useState } from 'react'
import { MdSearch } from 'react-icons/md'
import { Dialog, DialogContent, DialogTitle } from '@/src/presentation/components/ui/dialog'
import { Input } from '@/src/presentation/components/ui/input'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchProdutosPorNomeBusca } from '@/src/presentation/components/features/pedidos/novoPedidoProdutosApi'

type Props = {
  open: boolean
  onClose: () => void
}

/**
 * Consulta o mesmo catálogo do Novo Pedido. Só leitura — não cria venda.
 */
export function ConsultaCardapioWhatsAppDialog({ open, onClose }: Props) {
  const token = useAuthStore(s => s.tenantAuth?.getAccessToken())
  const [busca, setBusca] = useState('')
  const termo = busca.trim()

  const { data, isLoading } = useSecureTenantQuery(
    ['whatsapp-cardapio', termo],
    async ({ token: tenantToken }) => fetchProdutosPorNomeBusca(termo, tenantToken),
    { enabled: open && !!token && termo.length >= 2 }
  )

  const produtos = useMemo(
    () => (data ?? []).filter(p => p.isAtivo()).sort((a, b) => a.getNome().localeCompare(b.getNome())),
    [data]
  )

  return (
    <Dialog open={open} onOpenChange={v => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogTitle>Cardápio</DialogTitle>
        <label className="relative mt-2 block">
          <span className="sr-only">Pesquisar produto</span>
          <MdSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
            size={20}
            aria-hidden
          />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Nome do produto (mín. 2 letras)"
            className="pl-10"
            autoComplete="off"
          />
        </label>
        <div className="mt-3 max-h-72 overflow-y-auto">
          {!open ? null : termo.length < 2 ? (
            <p className="py-6 text-center text-sm text-secondary-text">Digite para pesquisar no cardápio.</p>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <JiffyLoading />
            </div>
          ) : produtos.length === 0 ? (
            <p className="py-6 text-center text-sm text-secondary-text">Nenhum produto encontrado.</p>
          ) : (
            <ul className="divide-y divide-primary-bg">
              {produtos.map(p => (
                <li key={p.getId()} className="px-1 py-2.5">
                  <p className="text-sm font-medium text-primary-text">{p.getNome()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
