'use client'

import { useEffect } from 'react'

/**
 * Cadastro usado em operação (select de entregador, taxa, cliente, produto).
 *
 * O QueryClient global marca dados frescos por 5 min e não refaz ao focar a janela.
 * Ao abrir o painel/select, busca de novo para não esconder item cadastrado em outra aba.
 */
export function useRefetchCadastroAoAbrir(open: boolean, refetch: () => unknown) {
  useEffect(() => {
    if (!open) return
    void refetch()
  }, [open, refetch])
}
