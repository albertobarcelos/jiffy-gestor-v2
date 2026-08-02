'use client'

import type { ReactNode } from 'react'
import type { Impressora } from '@/src/domain/entities/Impressora'
import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import type { TabPainelLote } from '../types'
import type { useFiscalLote } from '../hooks/useFiscalLote'
import type { useGruposComplementosLote } from '../hooks/useGruposComplementosLote'
import type { useImpressorasLote } from '../hooks/useImpressorasLote'
import type { usePermissoesLote } from '../hooks/usePermissoesLote'
import type { usePrecoLote } from '../hooks/usePrecoLote'
import { LoteFiscalFalhasDialog } from './LoteFiscalFalhasDialog'
import { LotePainelFiscal } from './LotePainelFiscal'
import { LotePainelGruposComplementos } from './LotePainelGruposComplementos'
import { LotePainelImpressoras } from './LotePainelImpressoras'
import { LotePainelPermissoes } from './LotePainelPermissoes'
import { LotePainelPrecos } from './LotePainelPrecos'

type PrecoLote = ReturnType<typeof usePrecoLote>
type ImpressorasLote = ReturnType<typeof useImpressorasLote>
type GruposLote = ReturnType<typeof useGruposComplementosLote>
type PermissoesLote = ReturnType<typeof usePermissoesLote>
type FiscalLote = ReturnType<typeof useFiscalLote>

export interface LotePainelAcoesProps {
  activeTab: TabPainelLote
  isUpdating: boolean
  produtosSelecionadosCount: number
  precoLote: PrecoLote
  impressorasLote: ImpressorasLote
  impressorasDisponiveis: Impressora[]
  isLoadingImpressoras: boolean
  gruposLote: GruposLote
  gruposComplementos: GrupoComplemento[]
  isLoadingGruposComplementos: boolean
  permissoesLote: PermissoesLote
  fiscalLote: FiscalLote
}

export function LotePainelAcoes({
  activeTab,
  isUpdating,
  produtosSelecionadosCount,
  precoLote,
  impressorasLote,
  impressorasDisponiveis,
  isLoadingImpressoras,
  gruposLote,
  gruposComplementos,
  isLoadingGruposComplementos,
  permissoesLote,
  fiscalLote,
}: LotePainelAcoesProps) {
  const busy = {
    isUpdating,
    isSalvandoPermissoes: permissoesLote.isSalvandoPermissoes,
    isSalvandoFiscal: fiscalLote.isSalvandoFiscal,
    produtosSelecionadosCount,
  }

  let painel: ReactNode = null

  switch (activeTab) {
    case 'precos':
      painel = (
        <LotePainelPrecos
          adjustMode={precoLote.adjustMode}
          setAdjustMode={precoLote.setAdjustMode}
          adjustAmount={precoLote.adjustAmount}
          setAdjustAmount={precoLote.setAdjustAmount}
          adjustDirection={precoLote.adjustDirection}
          setAdjustDirection={precoLote.setAdjustDirection}
          onAplicar={precoLote.atualizarPrecos}
          {...busy}
        />
      )
      break
    case 'impressoras':
      painel = (
        <LotePainelImpressoras
          modoImpressora={impressorasLote.modoImpressora}
          setModoImpressora={impressorasLote.setModoImpressora}
          impressorasSelecionadas={impressorasLote.impressorasSelecionadas}
          impressorasDisponiveis={impressorasDisponiveis}
          isLoadingImpressoras={isLoadingImpressoras}
          todasImpressorasSelecionadas={impressorasLote.todasImpressorasSelecionadas}
          onToggleImpressora={impressorasLote.toggleImpressora}
          onToggleSelecionarTodas={impressorasLote.handleToggleSelecionarTodasImpressoras}
          onLimparSelecao={impressorasLote.limparSelecaoImpressoras}
          onAplicar={impressorasLote.atualizarImpressoras}
          {...busy}
        />
      )
      break
    case 'gruposComplementos':
      painel = (
        <LotePainelGruposComplementos
          modoGrupoComplemento={gruposLote.modoGrupoComplemento}
          setModoGrupoComplemento={gruposLote.setModoGrupoComplemento}
          gruposComplementosSelecionados={gruposLote.gruposComplementosSelecionados}
          gruposComplementos={gruposComplementos}
          isLoadingGruposComplementos={isLoadingGruposComplementos}
          todosGruposComplementosSelecionados={gruposLote.todosGruposComplementosSelecionados}
          onToggleGrupo={gruposLote.toggleGrupoComplemento}
          onToggleSelecionarTodos={gruposLote.handleToggleSelecionarTodosGrupos}
          onLimparSelecao={gruposLote.limparSelecaoGrupos}
          onAplicar={gruposLote.atualizarGruposComplementos}
          {...busy}
        />
      )
      break
    case 'permissoes':
      painel = (
        <LotePainelPermissoes
          modoPermissao={permissoesLote.modoPermissao}
          setModoPermissao={permissoesLote.setModoPermissao}
          permissoesCamposSelecionados={permissoesLote.permissoesCamposSelecionados}
          todasPermissoesSelecionadas={permissoesLote.todasPermissoesSelecionadas}
          onTogglePermissao={permissoesLote.togglePermissaoCampo}
          onToggleSelecionarTodas={permissoesLote.handleToggleSelecionarTodasPermissoes}
          onLimparSelecao={permissoesLote.limparSelecaoPermissoes}
          onAplicar={permissoesLote.vincularPermissoesEmLote}
          {...busy}
        />
      )
      break
    case 'fiscal':
      painel = (
        <LotePainelFiscal
          modoFiscal={fiscalLote.modoFiscal}
          setModoFiscal={fiscalLote.setModoFiscal}
          fiscalLoteDraft={fiscalLote.fiscalLoteDraft}
          setFiscalLoteDraft={fiscalLote.setFiscalLoteDraft}
          fiscalCamposLimparSelecionados={fiscalLote.fiscalCamposLimparSelecionados}
          todasFiscaisLimparSelecionadas={fiscalLote.todasFiscaisLimparSelecionadas}
          onToggleFiscalCampoLimpar={fiscalLote.toggleFiscalCampoLimpar}
          onToggleSelecionarTodasLimpar={fiscalLote.handleToggleSelecionarTodasFiscalLimpar}
          podeAplicarEditar={fiscalLote.podeAplicarEditar}
          podeAplicarLimpar={fiscalLote.podeAplicarLimpar}
          ncmValidation={fiscalLote.ncmValidation}
          isValidatingNcm={fiscalLote.isValidatingNcm}
          cestsDisponiveis={fiscalLote.cestsDisponiveis}
          isLoadingCests={fiscalLote.isLoadingCests}
          cestValidation={fiscalLote.cestValidation}
          isValidatingCest={fiscalLote.isValidatingCest}
          isNcmValidFiscal={fiscalLote.isNcmValidFiscal}
          hasCestsDisponiveisFiscal={fiscalLote.hasCestsDisponiveisFiscal}
          onAplicar={fiscalLote.aplicarFiscalEmLote}
          onLimparInputs={fiscalLote.limparInputsFormulario}
          formularioFiscalTemConteudo={fiscalLote.formularioFiscalTemConteudo}
          {...busy}
        />
      )
      break
    default:
      painel = null
  }

  return (
    <>
      {painel}
      <LoteFiscalFalhasDialog
        falhas={fiscalLote.falhasFiscalLote}
        onClose={fiscalLote.fecharFalhasFiscalLote}
      />
    </>
  )
}
