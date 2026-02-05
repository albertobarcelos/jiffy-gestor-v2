'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Impressora } from '@/src/domain/entities/Impressora'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdSearch, MdPrint, MdDelete, MdContentCopy } from 'react-icons/md'
import {
  ImpressorasTabsModal,
  ImpressorasTabsModalState,
} from './ImpressorasTabsModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/src/presentation/components/ui/dialog'
import { showToast } from '@/src/shared/utils/toast'

interface ImpressorasListProps {
  onReload?: () => void
}

/**
 * Lista de impressoras carregando todos os itens de uma vez
 * Faz requisições sequenciais de 10 em 10 até carregar tudo
 */
export function ImpressorasList({ onReload }: ImpressorasListProps) {
  const [impressoras, setImpressoras] = useState<Impressora[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [totalImpressoras, setTotalImpressoras] = useState(0)
  const [modalState, setModalState] = useState<ImpressorasTabsModalState>({
    open: false,
    tab: 'impressora',
    mode: 'create',
  })
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [impressoraToDelete, setImpressoraToDelete] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const searchTextRef = useRef('')

  // Atualiza ref quando o valor muda
  useEffect(() => {
    searchTextRef.current = searchText
  }, [searchText])

  /**
   * Carrega todas as impressoras fazendo requisições sequenciais
   * Continua carregando páginas de 10 em 10 até não haver mais itens
   */
  const loadAllImpressoras = useCallback(
    async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        return
      }

      setIsLoading(true)

      try {
        const allImpressoras: Impressora[] = []
        let currentOffset = 0
        let hasMore = true
        let totalCount = 0

        // Loop para carregar todas as páginas
        while (hasMore) {
          const params = new URLSearchParams({
            limit: '10',
            offset: currentOffset.toString(),
          })

          if (searchTextRef.current) {
            params.append('q', searchTextRef.current)
          }

          const response = await fetch(`/api/impressoras?${params.toString()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`
            throw new Error(errorMessage)
          }

          const data = await response.json()

          const newImpressoras = (data.items || []).map((item: any) =>
            Impressora.fromJSON(item)
          )

          allImpressoras.push(...newImpressoras)

          // Atualiza o total apenas na primeira requisição
          if (currentOffset === 0) {
            totalCount = data.count || 0
          }

          // Verifica se há mais páginas
          // Se retornou menos de 10 itens, não há mais páginas
          hasMore = newImpressoras.length === 10
          currentOffset += newImpressoras.length
        }

        // Atualiza o estado com todos os itens carregados
        setImpressoras(allImpressoras)
        setTotalImpressoras(totalCount)
      } catch (error) {
        console.error('Erro ao carregar impressoras:', error)
        setImpressoras([])
        setTotalImpressoras(0)
      } finally {
        setIsLoading(false)
      }
    },
    [auth]
  )

  // Debounce da busca
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      loadAllImpressoras()
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText, auth, loadAllImpressoras])

  // Carrega impressoras iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadAllImpressoras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleEdit = useCallback((impressoraId: string) => {
    setModalState({
      open: true,
      tab: 'impressora',
      mode: 'edit',
      impressoraId,
    })
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.set('modalImpressoraOpen', 'true')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const handleCopy = useCallback((impressoraId: string) => {
    setModalState({
      open: true,
      tab: 'impressora',
      mode: 'copy',
      impressoraId,
    })
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.set('modalImpressoraOpen', 'true')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const handleAdd = useCallback(() => {
    setModalState({
      open: true,
      tab: 'impressora',
      mode: 'create',
    })
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.set('modalImpressoraOpen', 'true')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const handleCloseModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, open: false }))

    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalImpressoraOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    loadAllImpressoras() // Recarrega a lista de impressoras
    onReload?.()
  }, [router, searchParams, pathname, loadAllImpressoras, onReload])

  const handleTabChange = (tab: 'impressora') => {
    setModalState((prev) => ({ ...prev, tab }))
  }

  const handleModalReload = () => {
    loadAllImpressoras()
    onReload?.()
  }

  const handleDelete = useCallback((impressoraId: string) => {
    setImpressoraToDelete(impressoraId)
    setIsConfirmDeleteOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!impressoraToDelete) return

    setIsDeleting(true)

    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/impressoras/${impressoraToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Erro ao deletar impressora')
      }

      setIsConfirmDeleteOpen(false)
      setImpressoraToDelete(null)
      showToast.success('Impressora deletada com sucesso!')
      loadAllImpressoras()
      onReload?.()
    } catch (error) {
      console.error('Erro ao deletar impressora:', error)
      showToast.error(
        error instanceof Error ? error.message : 'Erro ao deletar impressora'
      )
    } finally {
      setIsDeleting(false)
    }
  }, [impressoraToDelete, auth, loadAllImpressoras, onReload])

  /**
   * Gera código abreviado do ID (primeiros 6 caracteres em maiúsculas)
   */
  const getCodigo = (id: string): string => {
    return id.substring(0, 6).toUpperCase()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="md:px-[30px] px-1 pt-2 pb-1 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className=" md:pl-5">
            <p className="text-primary md:text-lg text-sm font-semibold font-nunito">
              Impressoras Cadastradas
            </p>
            <p className="text-tertiary md:text-[22px] text-sm font-medium font-nunito">
              Total {impressoras.length} de {totalImpressoras}
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="h-8 md:px-[30px] px-2 bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {/* Divisor amarelo */}
        <div className="h-[4px] border-t-2 border-primary/70 flex-shrink-0"></div>
          {/* Barra de pesquisa */}
          <div className="flex gap-3 md:px-[20px] px-1 py-1 flex-shrink-0">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
            <label
              className="text-xs font-semibold text-secondary-text mb-1 block"
            >
              Buscar complemento...
            </label>
            <div className="relative h-8">
              <MdSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
                size={18}
              />
              <input
                type="text"
                placeholder="Pesquisar complemento..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
              />
            </div>
          </div>
          </div>

      {/* Cabeçalho da tabela */}
      <div className="md:px-[30px] mt-0 flex-shrink-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[1] w-16 font-nunito font-semibold text-sm text-primary-text text-left hidden md:flex">
            Ícone
          </div>
          <div className="flex-[2] font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Código
          </div>
          <div className="flex-[2] font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Impressora
          </div>
          
          <div className="flex-[1] text-right font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de impressoras com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto md:px-[30px] px-1 mt-1 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {impressoras.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhuma impressora encontrada.</p>
          </div>
        )}

        {impressoras.map((impressora, index) => {
          // Handler para abrir edição ao clicar na linha
          const handleRowClick = () => {
            handleEdit(impressora.getId())
          }

          const isZebraEven = index % 2 === 0
          const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'

          return (
          <div
            key={impressora.getId()}
            onClick={handleRowClick}
            className={`${bgClass} rounded-lg mb-2 overflow-hidden hover:bg-primary/10 transition-colors cursor-pointer`}
          >
            <div className="py-2 md:px-4 flex items-center md:gap-[10px]">
              {/* Icone */}
              <div className="flex-[1] w-16 justify-left hidden md:flex" onClick={(e) => e.stopPropagation()}>
                <span className="text-2xl text-primary"><MdPrint /></span>
              </div>
              
              {/* Código */}
              <div className="flex-[2] justify-start font-nunito font-semibold md:text-sm text-xs text-primary-text">
                #{getCodigo(impressora.getId())}
              </div>
              
              {/* Impressora (Nome) */}
              <div className="flex-[2] font-nunito font-semibold md:text-sm text-xs text-primary-text">
                {impressora.getNome()}
              </div>
              
              {/* Ações */}
              <div className="flex-[1] flex justify-end md:gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(impressora.getId())
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
                  aria-label="Copiar impressora"
                >
                  <span className="text-primary text-lg"><MdContentCopy /></span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(impressora.getId())
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors"
                  aria-label="Deletar impressora"
                >
                  <span className="text-error text-lg"><MdDelete /></span>
                </button>
              </div>
            </div>
          </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Modal de criação/edição */}
      <ImpressorasTabsModal
        state={modalState}
        onClose={handleCloseModal}
        onReload={handleModalReload}
        onTabChange={handleTabChange}
      />

      {/* Modal de confirmação de exclusão */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-primary-text">
              Confirmar exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-primary-text">
              Tem certeza que deseja deletar esta impressora?
            </p>
            <p className="text-sm text-secondary-text mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsConfirmDeleteOpen(false)
                setImpressoraToDelete(null)
              }}
              disabled={isDeleting}
              className="h-10 px-6 rounded-lg border border-gray-300 text-primary-text hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-10 px-6 rounded-lg bg-error text-white font-semibold hover:bg-error/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
