'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useEstacaoDestePc } from '@/src/presentation/hooks/caixa-estacao/useEstacaoDestePc'
import { useCaixaEstacaoAtual } from '@/src/presentation/hooks/caixa-estacao/useCaixaEstacaoAtual'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { invalidateCaixaEstacaoAtualQueries } from '@/src/presentation/hooks/caixa-estacao/caixaEstacaoCache'
import { CaixaPanelHeader } from './CaixaPanelHeader'
import { MeuCaixaView } from './MeuCaixaView'
import { FechamentosList } from './FechamentosList'
import { CaixaSuporteRodape } from './CaixaSuporteRodape'

export function MeuCaixaSidePanel({
  open,
  onClose,
  onAbrirConfiguracaoEstacao,
}: {
  open: boolean
  onClose: () => void
  onAbrirConfiguracaoEstacao?: () => void
}) {
  const [aba, setAba] = useState<'atual' | 'recentes'>('atual')
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const { estacaoId, estacaoNome } = useEstacaoDestePc()
  const atual = useCaixaEstacaoAtual(estacaoId)
  const aberta = atual.data?.aberta === true

  useEffect(() => {
    if (!open || !estacaoId?.trim() || !empresaId) return
    void invalidateCaixaEstacaoAtualQueries(queryClient, empresaId, estacaoId)
  }, [open, estacaoId, empresaId, queryClient])

  useEffect(() => {
    if (aba !== 'recentes' || !open || !estacaoId?.trim() || !empresaId) return
    void queryClient.invalidateQueries({
      queryKey: ['tenant', empresaId, 'caixa-estacao', 'historico', estacaoId.trim()],
    })
  }, [aba, open, estacaoId, empresaId, queryClient])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={() => {
        setAba('atual')
        onClose()
      }}
      onAfterClose={() => setAba('atual')}
      title="Meu Caixa"
      minimalHeader
      showCloseButton={false}
      panelClassName="w-[min(22rem,96vw)] max-w-[100vw]"
      scrollableBody={false}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <CaixaPanelHeader
          aba={aba}
          aberta={aberta}
          loading={atual.isLoading}
          onVoltar={aba === 'recentes' ? () => setAba('atual') : undefined}
          onClose={() => {
            setAba('atual')
            onClose()
          }}
        />

        <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#f9fafb] px-4 py-5 pb-8 [-webkit-overflow-scrolling:touch]">
          {aba === 'recentes' ? (
            <FechamentosList onAbrirConfiguracaoEstacao={onAbrirConfiguracaoEstacao} />
          ) : (
            <MeuCaixaView
              onVerRecentes={() => setAba('recentes')}
              onAbrirConfiguracaoEstacao={onAbrirConfiguracaoEstacao}
            />
          )}
        </div>

        <CaixaSuporteRodape estacaoId={estacaoId} estacaoNome={estacaoNome} />
      </div>
    </JiffySidePanelModal>
  )
}
