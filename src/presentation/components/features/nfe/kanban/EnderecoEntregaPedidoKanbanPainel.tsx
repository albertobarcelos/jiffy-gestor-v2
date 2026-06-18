'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MdLocationOn } from 'react-icons/md'
import { atualizarEnderecoEntregaPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarEnderecoEntregaPedidoDeliveryUseCase'
import { formatarEnderecoEntregaMultilinha } from '@/src/application/mappers/PedidoDisplayMapper'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import {
  PainelPedidoBackdrop,
  JiffyPainelSlide,
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import {
  useMoradasPorTelefone,
  type MoradaTelefone,
} from '@/src/presentation/hooks/useMoradaTelefone'
import { formatarCepMascara, normalizarDigitosCep } from '@/src/shared/utils/consultaCep'
import { showToast } from '@/src/shared/utils/toast'
import { invalidateKanbanVendasListagens } from '@/src/presentation/hooks/kanbanListagemQueryCache'
import { invalidateVendaDetalheCarregadaCache } from '../novo-pedido/hooks/data/useVendaDetalheCarregadaQuery'
import { invalidarPedidoKanbanQuickViewCache } from './carregarPedidoKanbanQuickView'
import {
  extrairContextoEnderecoPedidoDeliveryApi,
  pedidoDeliveryPatchUrl,
  type ContextoEnderecoPedidoKanban,
} from './enderecoEntregaPedidoKanban'
import type { Venda } from './types'

type ModoAlteracaoEndereco = 'morada' | 'manual'

interface FormEnderecoManual {
  tipoEtiqueta: string
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  complemento: string
}

function textoEnderecoMaiusculo(valor: string): string {
  return valor.toLocaleUpperCase('pt-BR')
}

function formManualFromEnderecoAtual(
  endereco: ContextoEnderecoPedidoKanban['enderecoAtual']
): FormEnderecoManual {
  return {
    tipoEtiqueta: 'casa',
    cep: endereco?.cep ? formatarCepMascara(endereco.cep) : '',
    rua: textoEnderecoMaiusculo(endereco?.rua ?? ''),
    numero: textoEnderecoMaiusculo(endereco?.numero ?? ''),
    bairro: textoEnderecoMaiusculo(endereco?.bairro ?? ''),
    cidade: textoEnderecoMaiusculo(endereco?.cidade ?? ''),
    estado: textoEnderecoMaiusculo(endereco?.estado ?? '').slice(0, 2),
    complemento: textoEnderecoMaiusculo(endereco?.complemento ?? ''),
  }
}

function patchFormManualCampo(
  prev: FormEnderecoManual,
  campo: keyof FormEnderecoManual,
  valor: string
): FormEnderecoManual {
  if (campo === 'cep') {
    return { ...prev, cep: formatarCepMascara(valor) }
  }
  if (campo === 'estado') {
    return { ...prev, estado: textoEnderecoMaiusculo(valor).slice(0, 2) }
  }
  if (campo === 'tipoEtiqueta') {
    return { ...prev, tipoEtiqueta: valor }
  }
  return { ...prev, [campo]: textoEnderecoMaiusculo(valor) }
}

function enderecoManualValido(form: FormEnderecoManual): boolean {
  return Boolean(
    form.rua.trim() &&
      form.numero.trim() &&
      form.bairro.trim() &&
      normalizarDigitosCep(form.cep).length === 8
  )
}

interface EnderecoEntregaPedidoKanbanPainelProps {
  open: boolean
  venda: Venda | null
  onClose: () => void
  onSalvo?: (vendaId: string) => void
}

export function EnderecoEntregaPedidoKanbanPainel({
  open,
  venda,
  onClose,
  onSalvo,
}: EnderecoEntregaPedidoKanbanPainelProps) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const { auth } = useAuthStore()

  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [telefoneCliente, setTelefoneCliente] = useState<string | null>(null)
  const [enderecoDeliveryIdRef, setEnderecoDeliveryIdRef] = useState<string | null>(null)
  const [enderecoAtual, setEnderecoAtual] =
    useState<ContextoEnderecoPedidoKanban['enderecoAtual']>(null)
  const [modo, setModo] = useState<ModoAlteracaoEndereco>('morada')
  const [moradaSelecionadaId, setMoradaSelecionadaId] = useState<string | null>(null)
  const [formManual, setFormManual] = useState<FormEnderecoManual>(() =>
    formManualFromEnderecoAtual(null)
  )

  const moradasQuery = useMoradasPorTelefone(telefoneCliente, { usarModuloDelivery: true })
  const moradas = moradasQuery.data ?? []

  const enderecoAtualLinhas = useMemo(
    () => formatarEnderecoEntregaMultilinha(enderecoAtual),
    [enderecoAtual]
  )

  const carregarPedido = useCallback(async () => {
    if (!open || !venda) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setCarregando(true)
    try {
      const response = await fetch(pedidoDeliveryPatchUrl(venda.id), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message =
          typeof errorData.error === 'string'
            ? errorData.error
            : 'Não foi possível carregar o endereço do pedido.'
        showToast.error(message)
        return
      }

      const data = await response.json()
      const contexto = extrairContextoEnderecoPedidoDeliveryApi(data)

      setTelefoneCliente(contexto.telefone?.replace(/\D/g, '') || null)
      setEnderecoDeliveryIdRef(contexto.enderecoDeliveryIdRef)
      setEnderecoAtual(contexto.enderecoAtual)
      setFormManual(formManualFromEnderecoAtual(contexto.enderecoAtual))
      setMoradaSelecionadaId(contexto.enderecoDeliveryIdRef)
      setModo('morada')
    } catch {
      showToast.error('Erro ao carregar endereço do pedido.')
    } finally {
      setCarregando(false)
    }
  }, [auth, open, venda])

  useEffect(() => {
    if (open && venda) {
      void carregarPedido()
    } else if (!open) {
      setCarregando(false)
      setSalvando(false)
      setTelefoneCliente(null)
      setEnderecoDeliveryIdRef(null)
      setEnderecoAtual(null)
      setMoradaSelecionadaId(null)
      setModo('morada')
      setFormManual(formManualFromEnderecoAtual(null))
    }
  }, [open, venda, carregarPedido])

  useEffect(() => {
    if (!open || carregando || moradasQuery.isLoading) return
    if (modo !== 'morada') return
    if (moradaSelecionadaId && moradas.some(m => m.id === moradaSelecionadaId)) return
    if (enderecoDeliveryIdRef && moradas.some(m => m.id === enderecoDeliveryIdRef)) {
      setMoradaSelecionadaId(enderecoDeliveryIdRef)
      return
    }
    if (moradas.length === 0) {
      setModo('manual')
    } else if (moradas.length === 1) {
      setMoradaSelecionadaId(moradas[0].id)
    }
  }, [
    carregando,
    enderecoDeliveryIdRef,
    modo,
    moradaSelecionadaId,
    moradas,
    moradasQuery.isLoading,
    open,
  ])

  const temAlteracao = useMemo(() => {
    if (modo === 'morada') {
      return Boolean(moradaSelecionadaId && moradaSelecionadaId !== enderecoDeliveryIdRef)
    }
    if (!enderecoManualValido(formManual)) return false
    const atual = enderecoAtual
    const cep = normalizarDigitosCep(formManual.cep)
    const normalizar = (valor: string | null | undefined) =>
      textoEnderecoMaiusculo(valor ?? '').trim()
    return (
      normalizar(formManual.rua) !== normalizar(atual?.rua) ||
      normalizar(formManual.numero) !== normalizar(atual?.numero) ||
      normalizar(formManual.bairro) !== normalizar(atual?.bairro) ||
      cep !== normalizarDigitosCep(atual?.cep ?? '') ||
      normalizar(formManual.cidade) !== normalizar(atual?.cidade) ||
      normalizar(formManual.estado) !== normalizar(atual?.estado) ||
      normalizar(formManual.complemento) !== normalizar(atual?.complemento)
    )
  }, [enderecoAtual, enderecoDeliveryIdRef, formManual, modo, moradaSelecionadaId])

  const handleSalvar = async () => {
    if (!venda) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    if (modo === 'morada') {
      if (!moradaSelecionadaId) {
        showToast.error('Selecione uma morada salva do cliente.')
        return
      }
    } else if (!enderecoManualValido(formManual)) {
      showToast.error('Preencha rua, número, bairro e CEP válido.')
      return
    }

    setSalvando(true)
    try {
      if (modo === 'morada') {
        await atualizarEnderecoEntregaPedidoDeliveryUseCase.execute({
          pedidoId: venda.id,
          token,
          enderecoDeliveryId: moradaSelecionadaId,
        })
      } else {
        await atualizarEnderecoEntregaPedidoDeliveryUseCase.execute({
          pedidoId: venda.id,
          token,
          enderecoManual: {
            tipoEtiqueta: formManual.tipoEtiqueta,
            endereco: {
              rua: textoEnderecoMaiusculo(formManual.rua.trim()),
              numero: textoEnderecoMaiusculo(formManual.numero.trim()),
              bairro: textoEnderecoMaiusculo(formManual.bairro.trim()),
              cidade: textoEnderecoMaiusculo(formManual.cidade.trim()) || undefined,
              estado: textoEnderecoMaiusculo(formManual.estado.trim()).slice(0, 2) || undefined,
              cep: normalizarDigitosCep(formManual.cep),
              complemento: textoEnderecoMaiusculo(formManual.complemento.trim()) || undefined,
            },
          },
        })
      }

      showToast.success('Endereço de entrega atualizado.')
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      invalidateKanbanVendasListagens(queryClient)
      queryClient.invalidateQueries({ queryKey: ['venda', venda.id] })
      await invalidateVendaDetalheCarregadaCache(queryClient, empresaId, venda.id)
      invalidarPedidoKanbanQuickViewCache(venda.id)
      onSalvo?.(venda.id)
      onClose()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar endereço de entrega.'
      showToast.error(message)
    } finally {
      setSalvando(false)
    }
  }

  const rotuloPedido = venda
    ? `Pedido ${venda.numeroVenda}${venda.codigoVenda ? ` - #${venda.codigoVenda}` : ''}`
    : ''

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
      maxWidth={false}
      TransitionComponent={JiffyPainelSlide}
      transitionDuration={{ enter: 420, exit: 380 }}
      slots={{ backdrop: PainelPedidoBackdrop }}
      sx={{
        '& .MuiDialog-container': {
          zIndex: 1400,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-end',
        },
        '& .MuiBackdrop-root': {
          zIndex: 1400,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          transition: 'none',
        },
        '& .MuiDialog-paper': {
          zIndex: 1400,
          backgroundColor: '#ffffff',
          opacity: 1,
          height: '100vh',
          maxHeight: '100vh',
          margin: 0,
          marginLeft: 'auto',
          width: { xs: '95vw', sm: '90vw', md: 'min(480px, 40vw)' },
          maxWidth: '100vw',
          borderTopLeftRadius: '0.75rem',
          borderBottomLeftRadius: '0.75rem',
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent
        sx={{
          width: '100%',
          height: '100%',
          maxHeight: '100vh',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-6 py-4">
          <DialogTitle className="!p-0 text-lg font-semibold text-primary-text">
            Alterar endereço de entrega
          </DialogTitle>
          {rotuloPedido && (
            <p className="mt-1 text-sm text-secondary-text">{rotuloPedido}</p>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {carregando ? (
            <p className="text-sm text-secondary-text">Carregando...</p>
          ) : (
            <>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium text-secondary">Endereço atual no pedido</p>
                <div className="mt-1 space-y-0.5">
                  {enderecoAtualLinhas.map((linha, index) => (
                    <p key={`${linha}-${index}`} className="text-sm text-gray-800">
                      {linha}
                    </p>
                  ))}
                </div>
              </div>

              <div
                className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 pt-2"
                role="tablist"
                aria-label="Forma de alterar o endereço"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === 'morada'}
                  id="tab-endereco-morada-salva"
                  aria-controls="tabpanel-endereco-morada-salva"
                  disabled={moradas.length === 0 && moradasQuery.isLoading}
                  onClick={() => setModo('morada')}
                  className={`font-nunito rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    modo === 'morada'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                  }`}
                >
                  Morada salva
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === 'manual'}
                  id="tab-endereco-correcao-manual"
                  aria-controls="tabpanel-endereco-correcao-manual"
                  onClick={() => setModo('manual')}
                  className={`font-nunito rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    modo === 'manual'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                  }`}
                >
                  Correção manual
                </button>
              </div>

              {modo === 'morada' ? (
                <div
                  id="tabpanel-endereco-morada-salva"
                  role="tabpanel"
                  aria-labelledby="tab-endereco-morada-salva"
                  className="space-y-2 pt-1"
                >
                  {moradasQuery.isLoading ? (
                    <p className="text-sm text-secondary-text">Carregando moradas...</p>
                  ) : moradas.length === 0 ? (
                    <p className="text-sm text-secondary-text">
                      Nenhuma morada cadastrada para este telefone. Use a correção manual ou cadastre
                      uma morada no novo pedido.
                    </p>
                  ) : (
                    moradas.map((morada: MoradaTelefone) => {
                      const selecionada = morada.id === moradaSelecionadaId
                      const e = morada.endereco
                      const resumo = [e?.rua, e?.numero, e?.bairro].filter(Boolean).join(', ')
                      return (
                        <button
                          key={morada.id}
                          type="button"
                          onClick={() => setMoradaSelecionadaId(morada.id)}
                          className={`flex w-full items-start gap-2 rounded-md border p-3 text-left transition-colors ${
                            selecionada
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-primary/40'
                          }`}
                        >
                          <MdLocationOn
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              selecionada ? 'text-primary' : 'text-gray-500'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {morada.nomeMorada ?? morada.tipoEtiqueta ?? 'Morada'}
                            </p>
                            <p className="text-xs text-gray-600">{resumo || '—'}</p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : (
                <div
                  id="tabpanel-endereco-correcao-manual"
                  role="tabpanel"
                  aria-labelledby="tab-endereco-correcao-manual"
                  className="grid gap-3 pt-1 sm:grid-cols-2"
                >
                  <Input
                    label="CEP"
                    value={formManual.cep}
                    onChange={e => setFormManual(prev => patchFormManualCampo(prev, 'cep', e.target.value))}
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Rua"
                    value={formManual.rua}
                    onChange={e => setFormManual(prev => patchFormManualCampo(prev, 'rua', e.target.value))}
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Número"
                    value={formManual.numero}
                    onChange={e =>
                      setFormManual(prev => patchFormManualCampo(prev, 'numero', e.target.value))
                    }
                  />
                  <Input
                    label="Bairro"
                    value={formManual.bairro}
                    onChange={e =>
                      setFormManual(prev => patchFormManualCampo(prev, 'bairro', e.target.value))
                    }
                  />
                  <Input
                    label="Cidade"
                    value={formManual.cidade}
                    onChange={e =>
                      setFormManual(prev => patchFormManualCampo(prev, 'cidade', e.target.value))
                    }
                  />
                  <Input
                    label="UF"
                    value={formManual.estado}
                    onChange={e =>
                      setFormManual(prev => patchFormManualCampo(prev, 'estado', e.target.value))
                    }
                  />
                  <Input
                    label="Complemento"
                    value={formManual.complemento}
                    onChange={e =>
                      setFormManual(prev =>
                        patchFormManualCampo(prev, 'complemento', e.target.value)
                      )
                    }
                    className="sm:col-span-2"
                  />
                  <p className="text-xs text-gray-500 sm:col-span-2">
                    A correção manual altera apenas o endereço deste pedido, sem modificar o
                    cadastro do cliente.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="grid w-full shrink-0 border-t border-gray-200"
          style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
        >
          <div className="min-w-0 border-r border-gray-200">
            <Button
              type="button"
              variant="outlined"
              color="inherit"
              onClick={onClose}
              disabled={salvando}
              className="h-12 min-h-12 w-full font-semibold shadow-none"
              sx={footerBarPrimaryMutedSx(true)}
            >
              Cancelar
            </Button>
          </div>
          <div className="min-w-0">
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={() => void handleSalvar()}
              disabled={
                salvando ||
                carregando ||
                !temAlteracao ||
                (modo === 'morada' && !moradaSelecionadaId) ||
                (modo === 'manual' && !enderecoManualValido(formManual))
              }
              isLoading={salvando}
              className="h-12 min-h-12 w-full font-semibold shadow-none"
              sx={footerSavePrimaryBarSx(false)}
            >
              Salvar endereço
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
