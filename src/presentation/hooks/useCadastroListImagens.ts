'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { ICadastroImagemMedia } from '@/src/application/ports/ICadastroImagemMedia'
import { aplicarImagensEmLista, urlImagemHttp } from '@/src/application/services/cadastroImagem'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useAuthStore } from '@/src/presentation/stores/authStore'

type PaginaComItens<TItem> = Record<string, unknown> & {
  [key: string]: TItem[] | unknown
}

export function useCadastroListImagens<TItem>(options: {
  media: ICadastroImagemMedia
  items: TItem[]
  getId: (item: TItem) => string
  getUrl: (item: TItem) => string | null | undefined
  withUrl: (item: TItem, url: string | null) => TItem
  queryKeyBase: readonly unknown[]
  pageItemsKey: string
}) {
  const { media, items, getId, getUrl, withUrl, queryKeyBase, pageItemsKey } = options
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const pendentesRef = useRef(new Set<string>())
  const concluidosRef = useRef(new Set<string>())
  const [urlsPorId, setUrlsPorId] = useState<Record<string, string>>({})
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const applyUrls = useCallback(
    (urls: Record<string, string | null>) => {
      const usable: Record<string, string | null> = {}
      for (const [id, url] of Object.entries(urls)) {
        const http = urlImagemHttp(url)
        if (!http) continue
        media.lembrar(id, http)
        usable[id] = http
      }
      if (Object.keys(usable).length === 0) return

      setUrlsPorId(prev => {
        let changed = false
        const next = { ...prev }
        for (const [id, url] of Object.entries(usable)) {
          if (!url || next[id] === url) continue
          next[id] = url
          changed = true
        }
        return changed ? next : prev
      })

      if (!empresaId) return

      queryClient.setQueriesData<InfiniteData<PaginaComItens<TItem>>>(
        { queryKey: buildTenantQueryKey(empresaId, queryKeyBase), exact: false },
        old => {
          if (!old?.pages) return old
          let changed = false
          const pages = old.pages.map(page => {
            const list = page[pageItemsKey]
            if (!Array.isArray(list)) return page
            const nextList = aplicarImagensEmLista(list as TItem[], usable, getId, withUrl)
            if (nextList === list) return page
            changed = true
            return { ...page, [pageItemsKey]: nextList }
          })
          return changed ? { ...old, pages } : old
        }
      )
    },
    [empresaId, getId, media, pageItemsKey, queryClient, queryKeyBase, withUrl]
  )

  useEffect(() => {
    const missing = items
      .filter(item => {
        const id = getId(item)
        if (!id || pendentesRef.current.has(id) || concluidosRef.current.has(id)) return false
        const jaNaEntidade = urlImagemHttp(getUrl(item))
        if (jaNaEntidade) {
          concluidosRef.current.add(id)
          return false
        }
        return true
      })
      .map(item => getId(item))

    if (missing.length === 0) return

    for (const id of missing) pendentesRef.current.add(id)

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      for (const id of missing) pendentesRef.current.delete(id)
      return
    }

    void (async () => {
      try {
        const resolved = await media.resolverLote(missing, token)
        applyUrls(resolved)

        const aindaSemUrl = missing.filter(id => !urlImagemHttp(resolved[id]) && !media.conhecida(id))
        if (aindaSemUrl.length > 0) {
          const filled = await media.resolverDoCadastro(aindaSemUrl, token)
          applyUrls(filled)
        }
      } catch {
        for (const id of missing) pendentesRef.current.delete(id)
        return
      }

      for (const id of missing) {
        pendentesRef.current.delete(id)
        concluidosRef.current.add(id)
      }
    })()
  }, [applyUrls, getId, getUrl, items, media])

  const applyAfterSave = useCallback(
    async (savedId?: string, imagemUrl?: string | null) => {
      const id = savedId?.trim()
      if (!id) return
      const imediata = urlImagemHttp(imagemUrl) ?? media.conhecida(id)
      if (imediata) {
        concluidosRef.current.add(id)
        applyUrls({ [id]: imediata })
      }
    },
    [applyUrls, media]
  )

  const refreshOne = useCallback(
    async (savedId?: string) => {
      const id = savedId?.trim()
      if (!id) return
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) return
      const persistida = await media.resolverUma(id, token)
      if (persistida) {
        concluidosRef.current.add(id)
        applyUrls({ [id]: persistida })
      }
    },
    [applyUrls, media]
  )

  const uploadFromList = useCallback(
    async (id: string, file: File) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }
      setUploadingId(id)
      try {
        const url = await media.enviar(id, file, token)
        if (url) {
          concluidosRef.current.add(id)
          applyUrls({ [id]: url })
        }
      } finally {
        setUploadingId(null)
      }
    },
    [applyUrls, media]
  )

  const urlDaLista = useCallback(
    (id: string, fallback?: string | null) =>
      urlsPorId[id] || urlImagemHttp(fallback) || media.conhecida(id) || null,
    [media, urlsPorId]
  )

  return { uploadingId, uploadFromList, applyAfterSave, refreshOne, urlDaLista }
}
