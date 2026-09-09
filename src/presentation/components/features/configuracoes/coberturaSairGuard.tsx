'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'

const ReportarSujoContext = createContext<(sujo: boolean) => void>(() => undefined)
const PedirSaidaContext = createContext<(acao: () => void) => void>((acao: () => void) => acao())

export function CoberturaSairGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [sujo, setSujo] = useState(false)
  const [aberto, setAberto] = useState(false)
  const acaoRef = useRef<(() => void) | null>(null)
  const sujoRef = useRef(false)
  sujoRef.current = sujo

  const pedirSaida = useCallback((acao: () => void) => {
    if (!sujoRef.current) {
      acao()
      return
    }
    acaoRef.current = acao
    setAberto(true)
  }, [])

  useEffect(() => {
    if (!sujo) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [sujo])

  useEffect(() => {
    if (!sujo) return
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const ancora = event.target.closest('a[href]')
      if (!(ancora instanceof HTMLAnchorElement)) return
      const href = ancora.getAttribute('href')
      if (!href || href.startsWith('#') || ancora.target === '_blank') return
      if (ancora.origin && ancora.origin !== window.location.origin) return
      const url = new URL(ancora.href)
      const destino = `${url.pathname}${url.search}${url.hash}`
      if (destino === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      pedirSaida(() => router.push(destino))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pedirSaida, router, sujo])

  return (
    <ReportarSujoContext.Provider value={setSujo}>
      <PedirSaidaContext.Provider value={pedirSaida}>
        {children}
        <Dialog open={aberto} onOpenChange={open => !open && setAberto(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterações não salvas</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-secondary-text">
              Deseja sair sem salvar? As alterações de cobertura serão perdidas.
            </p>
            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  setAberto(false)
                  acaoRef.current = null
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-secondary-text"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => {
                  const acao = acaoRef.current
                  acaoRef.current = null
                  setAberto(false)
                  setSujo(false)
                  acao?.()
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Sair sem salvar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PedirSaidaContext.Provider>
    </ReportarSujoContext.Provider>
  )
}

export function useReportarCoberturaSuja(sujo: boolean) {
  const setSujo = useContext(ReportarSujoContext)
  useEffect(() => {
    setSujo(sujo)
    return () => setSujo(false)
  }, [setSujo, sujo])
}

export function usePedirSaidaCobertura() {
  return useContext(PedirSaidaContext)
}
