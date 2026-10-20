'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { MdMoreVert, MdSave } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  useFuncionamentoDelivery,
  useSubstituirAgendaFuncionamento,
} from '@/src/presentation/hooks/useFuncionamentoDelivery'
import { showToast } from '@/src/shared/utils/toast'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'
import type { DiaDaSemanaApi } from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'
import {
  agendaDtoParaForm,
  agruparDiasAgendaPorIntervalo,
  criarFormAgendaPadrao,
  formatarDiasGrupoCurto,
  formatarIntervaloGrupo,
  formAgendaParaRequest,
  intervaloAgendaEhValido,
  type DiaAgendaFormState,
  type GrupoHorarioAgenda,
} from '@/src/shared/utils/funcionamentoDelivery'
import {
  HorarioAgendaSidePanel,
  type HorarioAgendaComposerResult,
} from './HorarioAgendaSidePanel'

type FuncionamentoDeliverySectionProps = {
  empresaDeliveryConfigurada: boolean
  timezonePendente?: boolean
  /** Incrementa para abrir o modal de novo horário (botão no título da página). */
  adicionarHorarioRequestKey?: number
}

const AGENDA_CARD_CLASS =
  'flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5'

export function FuncionamentoDeliverySection({
  empresaDeliveryConfigurada,
  timezonePendente = false,
  adicionarHorarioRequestKey = 0,
}: FuncionamentoDeliverySectionProps) {
  const funcionamentoQuery = useFuncionamentoDelivery({
    enabled: empresaDeliveryConfigurada,
  })
  const substituirMutation = useSubstituirAgendaFuncionamento()

  const [dias, setDias] = useState<DiaAgendaFormState[]>(() => criarFormAgendaPadrao())
  const [abreAutomaticamente, setAbreAutomaticamente] = useState(true)
  const [fechaAutomaticamente, setFechaAutomaticamente] = useState(true)
  const [formHidratado, setFormHidratado] = useState(false)

  const [painelAberto, setPainelAberto] = useState(false)
  const [grupoEditando, setGrupoEditando] = useState<GrupoHorarioAgenda | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuGrupo, setMenuGrupo] = useState<GrupoHorarioAgenda | null>(null)

  const funcionamento = funcionamentoQuery.data

  const grupos = useMemo(() => agruparDiasAgendaPorIntervalo(dias), [dias])

  useEffect(() => {
    if (!funcionamento || formHidratado) return
    setDias(agendaDtoParaForm(funcionamento.agendaSemanal))
    setAbreAutomaticamente(funcionamento.abreAutomaticamente)
    setFechaAutomaticamente(funcionamento.fechaAutomaticamente)
    setFormHidratado(true)
  }, [formHidratado, funcionamento])

  const fecharPainel = useCallback(() => {
    setPainelAberto(false)
    setGrupoEditando(null)
  }, [])

  const abrirNovoHorario = useCallback(() => {
    setGrupoEditando(null)
    setPainelAberto(true)
  }, [])

  useEffect(() => {
    if (!adicionarHorarioRequestKey || !empresaDeliveryConfigurada) return
    abrirNovoHorario()
  }, [adicionarHorarioRequestKey, abrirNovoHorario, empresaDeliveryConfigurada])

  const abrirEditarHorario = useCallback((grupo: GrupoHorarioAgenda) => {
    setGrupoEditando(grupo)
    setPainelAberto(true)
  }, [])

  const fecharMenu = useCallback(() => {
    setMenuAnchor(null)
    setMenuGrupo(null)
  }, [])

  const aplicarComposer = useCallback((result: HorarioAgendaComposerResult) => {
    const selecionados = new Set(result.dias)
    const originais = result.diasOriginais ? new Set(result.diasOriginais) : null

    setDias(prev => {
      const manter = prev.filter(d => {
        if (selecionados.has(d.diaDaSemana)) return false
        if (originais?.has(d.diaDaSemana)) return false
        return true
      })
      const novos: DiaAgendaFormState[] = result.dias.map(diaDaSemana => ({
        diaDaSemana,
        aberto: true,
        abreEm: result.abreEm,
        fechaEm: result.fechaEm,
      }))
      return [...manter, ...novos]
    })

    fecharPainel()
    showToast.success(
      originais ? 'Horário atualizado.' : 'Horário adicionado à agenda.'
    )
  }, [fecharPainel])

  const removerGrupo = useCallback((grupo: GrupoHorarioAgenda) => {
    const remover = new Set(grupo.dias)
    setDias(prev => prev.filter(d => !remover.has(d.diaDaSemana)))
    showToast.success('Horário removido da agenda.')
  }, [])

  const handleSalvar = useCallback(async () => {
    const invalidos = dias.filter(d => !intervaloAgendaEhValido(d.abreEm, d.fechaEm))
    if (invalidos.length > 0) {
      showToast.error('Há dias com horário de abertura igual ao de fechamento.')
      return
    }

    const payload = formAgendaParaRequest(dias, {
      abreAutomaticamente,
      fechaAutomaticamente,
    })

    try {
      await substituirMutation.mutateAsync(payload)
      showToast.success('Agenda de funcionamento salva.')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível salvar a agenda.'
      showToast.error(msg)
    }
  }, [abreAutomaticamente, dias, fechaAutomaticamente, substituirMutation])

  const salvando = substituirMutation.isPending
  const carregando = funcionamentoQuery.isPending && empresaDeliveryConfigurada

  if (!empresaDeliveryConfigurada) {
    return (
      <section id="empresa-delivery-agenda" className={AGENDA_CARD_CLASS}>
        <p className="text-sm text-secondary-text">
          Ative o Delivery para configurar dias e horários de funcionamento.
        </p>
      </section>
    )
  }

  if (carregando) {
    return (
      <section
        id="empresa-delivery-agenda"
        className={`${AGENDA_CARD_CLASS} min-h-[200px] items-center justify-center`}
      >
        <JiffyLoading />
      </section>
    )
  }

  if (funcionamentoQuery.isError) {
    return (
      <section
        id="empresa-delivery-agenda"
        className={`${AGENDA_CARD_CLASS} border-red-200 bg-red-50`}
      >
        <p className="text-sm text-red-800">{funcionamentoQuery.error.message}</p>
        <button
          type="button"
          onClick={() => void funcionamentoQuery.refetch()}
          className="mt-3 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white"
        >
          Tentar novamente
        </button>
      </section>
    )
  }

  return (
    <>
      <section id="empresa-delivery-agenda" className={AGENDA_CARD_CLASS}>
        {timezonePendente ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-950">
            Configure o fuso horário na{' '}
            <Link
              href={configuracoesTabPath('empresa')}
              className="font-semibold underline underline-offset-2"
            >
              aba Empresa
            </Link>{' '}
            antes de salvar a agenda.
          </div>
        ) : null}

        <div>
          <p className="text-xs font-semibold text-primary-text">Dias da semana e horários</p>
          <p className="text-[11px] leading-tight text-secondary-text">
            Cadastre os períodos em que a loja recebe pedidos. Intervalos de 15 min.
          </p>

          {grupos.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-3 py-6 text-center text-xs text-secondary-text">
              Nenhum horário cadastrado. Clique em Adicionar Horário para começar.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {grupos.map(grupo => (
                <li
                  key={grupo.id}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary-text">
                      {formatarDiasGrupoCurto(grupo.dias)}
                    </p>
                    <p className="mt-0.5 text-sm text-secondary-text">
                      {formatarIntervaloGrupo(grupo.abreEm, grupo.fechaEm)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={salvando}
                    aria-label={`Opções do horário ${formatarIntervaloGrupo(grupo.abreEm, grupo.fechaEm)}`}
                    onClick={e => {
                      setMenuAnchor(e.currentTarget)
                      setMenuGrupo(grupo)
                    }}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary-text transition-colors hover:bg-gray-100 hover:text-primary-text disabled:opacity-50"
                  >
                    <MdMoreVert className="h-5 w-5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-primary-text">Configuração</p>
          <ul className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
            <li className="flex items-start gap-3 bg-white px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary-text">
                  Fechar loja automaticamente
                </p>
                <p className="mt-0.5 text-xs leading-snug text-secondary-text">
                  Ativando essa opção o fechamento da loja será automático conforme os horários
                  de atendimento definidos.
                </p>
              </div>
              <JiffyIconSwitch
                checked={fechaAutomaticamente}
                onChange={e => setFechaAutomaticamente(e.target.checked)}
                disabled={salvando}
                size="xs"
                inputProps={{ 'aria-label': 'Fechar loja automaticamente' }}
              />
            </li>
            <li className="flex items-start gap-3 bg-white px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary-text">
                  Abrir loja automaticamente
                </p>
                <p className="mt-0.5 text-xs leading-snug text-secondary-text">
                  Ativando essa opção a loja abre automaticamente no horário definido. Caso
                  contrário, use o controle manual na tela de pedidos.
                </p>
              </div>
              <JiffyIconSwitch
                checked={abreAutomaticamente}
                onChange={e => setAbreAutomaticamente(e.target.checked)}
                disabled={salvando}
                size="xs"
                inputProps={{ 'aria-label': 'Abrir loja automaticamente' }}
              />
            </li>
          </ul>
        </div>

        <div className="mt-auto flex justify-end pt-4">
          <button
            type="button"
            onClick={() => void handleSalvar()}
            disabled={salvando}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-secondary px-4 text-xs font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MdSave className="h-3.5 w-3.5" aria-hidden />
            {salvando ? 'Salvando...' : 'Salvar agenda'}
          </button>
        </div>
      </section>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor) && menuGrupo != null}
        onClose={fecharMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            if (!menuGrupo) return
            const grupo = menuGrupo
            fecharMenu()
            abrirEditarHorario(grupo)
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menuGrupo) return
            const grupo = menuGrupo
            fecharMenu()
            removerGrupo(grupo)
          }}
          sx={{ color: 'error.main' }}
        >
          Remover
        </MenuItem>
      </Menu>

      <HorarioAgendaSidePanel
        open={painelAberto}
        onClose={fecharPainel}
        grupoEditando={grupoEditando}
        disabled={salvando}
        onConfirm={aplicarComposer}
      />
    </>
  )
}
