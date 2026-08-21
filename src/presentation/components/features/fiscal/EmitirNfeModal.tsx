'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { useEmitirNfe, useEmitirNfeGestor, useEmitirNfeDelivery, deveUsarModuloDeliveryParaEmissaoFiscal } from '@/src/presentation/hooks/useVendas'
import { showToast } from '@/src/shared/utils/toast'
import { MdClose, MdEdit } from 'react-icons/md'
import {
  ClientesTabsModal,
  type ClientesTabsModalState,
} from '@/src/presentation/components/features/clientes/ClientesTabsModal'
import { AlertaCbenefEmissaoDialog } from '@/src/presentation/components/features/fiscal/AlertaCbenefEmissaoDialog'
import { ConfigurarNcmModal } from '@/src/presentation/components/features/painel-contador/ConfigurarNcmModal'
import { useVerificarCbenefEmissao } from '@/src/presentation/hooks/painel-contador/useCbenef'
import { useConfiguracoesNcm } from '@/src/presentation/hooks/painel-contador/useConfiguracoesNcm'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { PORTAL_CONTADOR_PATH } from '@/src/presentation/components/features/painel-contador/painelContadorEtapas'
import type { ItemVendaCbenef } from '@/src/domain/entities/painel-contador/cbenefRegras'
import {
  INFORMACOES_ADICIONAIS_NOTA_MAX,
  obterRascunhoInformacoesAdicionais,
  salvarRascunhoInformacoesAdicionais,
} from '@/src/shared/helpers/informacoesAdicionaisNota'

/** Aplica máscara de CPF (000.000.000-00) durante a digitação — apenas UI. */
function formatarCpfMascara(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 3) return digitos
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`
  if (digitos.length <= 9) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`
  }
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

interface EmitirNfeModalProps {
  open: boolean
  onClose: () => void
  vendaId: string
  vendaNumero?: string
  /** Origem comercial da venda (ex.: PDV, GESTOR) — exibida antes do código */
  origemVenda?: string | null
  codigoVenda?: string
  /** Nome do cliente para exibição */
  clienteNome?: string | null
  /** ID do cliente vinculado — NF-e (modelo 55) exige cliente cadastrado */
  clienteId?: string | null
  tabelaOrigem?: 'venda' | 'venda_gestor'
  tipoVenda?: string | null
  /** Chamado após salvar o cadastro do cliente no modal de edição (ex.: refetch da lista). */
  onClienteSalvo?: () => void
}

export function EmitirNfeModal({
  open,
  onClose,
  vendaId,
  vendaNumero,
  origemVenda,
  codigoVenda,
  clienteNome,
  clienteId,
  tabelaOrigem = 'venda',
  tipoVenda,
  onClienteSalvo,
}: EmitirNfeModalProps) {
  const emitirNfePdv = useEmitirNfe()
  const emitirNfeGestor = useEmitirNfeGestor()
  const emitirNfeDelivery = useEmitirNfeDelivery()

  const usarModuloDelivery = deveUsarModuloDeliveryParaEmissaoFiscal(tabelaOrigem, tipoVenda)
  const emitirNfe =
    usarModuloDelivery ? emitirNfeDelivery
    : tabelaOrigem === 'venda_gestor' ? emitirNfeGestor
    : emitirNfePdv
  const verificarCbenef = useVerificarCbenefEmissao()
  const { ncmsQuery } = useConfiguracoesNcm()
  const addTab = useTabsStore(s => s.addTab)
  const [emissaoEmProcessamento, setEmissaoEmProcessamento] = useState(false)
  const [modeloEmitindo, setModeloEmitindo] = useState<55 | 65 | null>(null)
  const [itensSemCbenef, setItensSemCbenef] = useState<ItemVendaCbenef[]>([])
  const [modeloPendenteCbenef, setModeloPendenteCbenef] = useState<55 | 65 | null>(null)
  const [ncmParaConfigurar, setNcmParaConfigurar] = useState<string | null>(null)
  const [cpfNfce, setCpfNfce] = useState('')
  const [informacoesAdicionais, setInformacoesAdicionais] = useState('')
  const [clientesTabsState, setClientesTabsState] = useState<ClientesTabsModalState>({
    open: false,
    tab: 'cliente',
    mode: 'edit',
    clienteId: undefined,
  })

  useEffect(() => {
    if (!open) {
      setCpfNfce('')
      setInformacoesAdicionais('')
      setItensSemCbenef([])
      setModeloPendenteCbenef(null)
      setNcmParaConfigurar(null)
      setClientesTabsState({
        open: false,
        tab: 'cliente',
        mode: 'edit',
        clienteId: undefined,
      })
      return
    }
    setInformacoesAdicionais(obterRascunhoInformacoesAdicionais(vendaId) ?? '')
  }, [open, vendaId])

  const temClienteCadastrado = useMemo(
    () => Boolean(clienteId && String(clienteId).trim() !== ''),
    [clienteId]
  )

  const nomeClienteExibicao = clienteNome?.trim() || 'Sem cliente'

  const handleFecharEdicaoCliente = useCallback(() => {
    setClientesTabsState(prev => (prev.open ? { ...prev, open: false } : prev))
  }, [])

  const handleAbrirEdicaoCliente = useCallback((id: string) => {
    setClientesTabsState({
      open: true,
      tab: 'cliente',
      mode: 'edit',
      clienteId: id,
    })
  }, [])

  const executarEmissao = useCallback(
    async (modelo: 55 | 65) => {
      setEmissaoEmProcessamento(true)
      setModeloEmitindo(modelo)

      try {
        await emitirNfe.mutateAsync({
          id: vendaId,
          modelo,
          informacoesAdicionais,
        })
        onClose()
      } catch (error) {
        console.error('Erro ao emitir NFe:', error)
      } finally {
        setEmissaoEmProcessamento(false)
        setModeloEmitindo(null)
        setItensSemCbenef([])
        setModeloPendenteCbenef(null)
      }
    },
    [emitirNfe, informacoesAdicionais, onClose, vendaId]
  )

  const emitirPorModelo = useCallback(
    async (modelo: 55 | 65) => {
      if (emissaoEmProcessamento || emitirNfe.isPending || verificarCbenef.isPending) return

      if (modelo === 55 && !temClienteCadastrado) {
        showToast.error(
          'Para emitir NF-e (modelo 55) é obrigatório que a venda tenha um cliente cadastrado. Vincule o cliente na origem do pedido e tente novamente.'
        )
        return
      }

      try {
        const itens = await verificarCbenef.mutateAsync({
          vendaId,
          tabelaOrigem,
          tipoVenda,
        })
        if (itens.length > 0) {
          setItensSemCbenef(itens)
          setModeloPendenteCbenef(modelo)
          return
        }
      } catch (error) {
        console.error('Erro ao verificar cBenef antes da emissão:', error)
      }

      await executarEmissao(modelo)
    },
    [
      emissaoEmProcessamento,
      emitirNfe.isPending,
      executarEmissao,
      tabelaOrigem,
      temClienteCadastrado,
      tipoVenda,
      vendaId,
      verificarCbenef,
    ]
  )

  const bloqueado = emissaoEmProcessamento || emitirNfe.isPending || verificarCbenef.isPending

  const configuracaoNcmEdicao = useMemo(() => {
    if (!ncmParaConfigurar) return null
    const entity = ncmsQuery.data?.ncms.find((ncm) => ncm.codigo === ncmParaConfigurar)
    if (!entity) {
      return { ncm: { codigo: ncmParaConfigurar } }
    }
    return {
      ncm: { codigo: entity.codigo, descricao: entity.descricao },
      cfop: entity.impostos.cfop,
      csosn: entity.impostos.csosn,
      codigoBeneficioFiscal: entity.impostos.codigoBeneficioFiscal,
      icms: entity.impostos.icms,
      pis: entity.impostos.pis,
      cofins: entity.impostos.cofins,
    }
  }, [ncmParaConfigurar, ncmsQuery.data?.ncms])

  return (
    <>
      <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
        <DialogContent sx={{ maxWidth: 520, padding: '0px 24px 24px 24px' }}>
          <div className="flex items-center justify-between">
            <h1 className="text-primary py-4 text-lg font-semibold sm:text-2xl">Emitir Nota</h1>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
              }}
            >
              <MdClose size={20} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-800">
                {vendaNumero != null && vendaNumero !== '' && (
                  <span>
                    <span className="font-medium text-gray-600">Nº da venda:</span> {vendaNumero}
                  </span>
                )}
                {origemVenda != null && String(origemVenda).trim() !== '' && (
                  <span>
                    <span className="font-medium text-gray-600">Origem:</span> {origemVenda}
                  </span>
                )}
                {codigoVenda != null && codigoVenda !== '' && (
                  <span>
                    <span className="font-medium text-gray-600">Código:</span> #{codigoVenda}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex min-h-[160px] flex-col rounded-xl border-2 border-primary bg-primary p-2 text-center shadow-sm sm:p-3">
                <div className="flex flex-1 flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold tracking-tight text-info sm:text-4xl">
                    NF-e
                  </span>
                  <span className="mt-2 max-w-[12rem] text-xs font-medium leading-snug text-gray-200 sm:text-sm">
                    Nota Fiscal eletrônica
                  </span>
                </div>
                {temClienteCadastrado && clienteId ? (
                  <div className="mt-2 w-full text-left border rounded-lg border-gray-200 p-1">
                    <div className="flex items-center justify-start gap-1 text-gray-100">
                      <span className="text-sm font-semibold">Cliente</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          handleAbrirEdicaoCliente(clienteId)
                        }}
                        className="flex-shrink-0 rounded p-1 text-gray-100 transition-colors hover:bg-primary/10"
                        title="Editar dados do cliente"
                        aria-label="Editar dados do cliente"
                      >
                        <MdEdit className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <p className="mb-0 break-words text-sm leading-snug text-gray-100">
                      {nomeClienteExibicao}
                    </p>
                  </div>
                ) : null}
                {!temClienteCadastrado && (
                  <div className="mt-4 w-full text-left">
                    <p className="mb-0 text-center text-xs leading-relaxed text-gray-200">
                      A NF-e exige um <strong className="text-gray-100">cliente vinculado</strong> à
                      venda. Ajuste o pedido na origem (ex.: cadastro do pedido) antes de emitir.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  disabled={bloqueado || !temClienteCadastrado}
                  onClick={() => void emitirPorModelo(55)}
                  title={
                    !temClienteCadastrado
                      ? 'É necessário um cliente vinculado à venda para emitir NF-e'
                      : 'Emitir NF-e'
                  }
                  className="mt-4 w-full rounded-lg border-2 border-white/50 bg-white/10 py-2.5 text-sm font-semibold text-info shadow-sm transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bloqueado && modeloEmitindo === 55 ? 'Emitindo...' : 'Emitir NF-e'}
                </button>
              </div>
              <div className="flex min-h-[160px] flex-col rounded-xl border-2 border-primary bg-white p-2 text-center shadow-sm sm:p-3">
                <div className="flex flex-1 flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                    NFC-e
                  </span>
                  <span className="mt-2 max-w-[14rem] text-xs font-medium leading-snug text-gray-600 sm:text-sm">
                    Nota Fiscal de Consumidor Eletrônica
                  </span>
                </div>
                <div className="mt-2 w-full text-left">
                  {temClienteCadastrado && clienteId ? (
                    <div className="text-primary border rounded-lg border-primary p-1">
                      <div className="flex items-center justify-start gap-1">
                        <span className="text-sm font-semibold text-primary">Cliente</span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            handleAbrirEdicaoCliente(clienteId)
                          }}
                          className="flex-shrink-0 rounded p-1 text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Editar dados do cliente"
                          aria-label="Editar dados do cliente"
                          disabled={bloqueado}
                        >
                          <MdEdit className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <p className="mb-0 break-words text-sm leading-snug">
                        {nomeClienteExibicao}
                      </p>
                    </div>
                  ) : (
                    <Input
                      label="CPF do consumidor"
                      placeholder="000.000.000-00"
                      size="small"
                      value={cpfNfce}
                      onChange={e => setCpfNfce(formatarCpfMascara(e.target.value))}
                      inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
                      disabled={bloqueado}
                    />
                  )}
                </div>
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => void emitirPorModelo(65)}
                  title="Emitir NFC-e"
                  className="mt-4 w-full rounded-lg border-2 border-primary bg-primary py-2.5 text-sm font-semibold text-info shadow-sm transition-all hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bloqueado && modeloEmitindo === 65 ? 'Emitindo...' : 'Emitir NFC-e'}
                </button>
              </div>
            </div>

            <Input
              label="Observação da nota (opcional)"
              value={informacoesAdicionais}
              onChange={e => {
                const texto = e.target.value
                setInformacoesAdicionais(texto)
                salvarRascunhoInformacoesAdicionais(vendaId, texto)
              }}
              placeholder="Ex: Informações complementares para a NFC-e/NF-e..."
              helperText="Enviado na emissão como informações complementares (máx. 3500). O rodapé da empresa é concatenado depois."
              multiline
              minRows={2}
              inputProps={{ maxLength: INFORMACOES_ADICIONAIS_NOTA_MAX }}
              size="small"
              disabled={bloqueado}
            />
          </div>

          <DialogFooter sx={{ mt: 2, justifyContent: 'flex-end' }}>
            <Button type="button" variant="outlined" onClick={onClose} disabled={bloqueado}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientesTabsModal
        state={clientesTabsState}
        onClose={handleFecharEdicaoCliente}
        onReload={onClienteSalvo}
        onTabChange={tab => setClientesTabsState(prev => ({ ...prev, tab }))}
      />

      <AlertaCbenefEmissaoDialog
        open={itensSemCbenef.length > 0 && modeloPendenteCbenef != null && !ncmParaConfigurar}
        itens={itensSemCbenef}
        busy={bloqueado}
        onCancelar={() => {
          setItensSemCbenef([])
          setModeloPendenteCbenef(null)
        }}
        onConfigurar={() => {
          const ncm = itensSemCbenef[0]?.ncm
          if (ncm) {
            setNcmParaConfigurar(ncm)
            addTab({
              id: 'etapa-3-cenario-fiscal',
              label: 'Cenário Fiscal (NCMs)',
              path: PORTAL_CONTADOR_PATH,
            })
            return
          }
          addTab({
            id: 'etapa-3-cenario-fiscal',
            label: 'Cenário Fiscal (NCMs)',
            path: PORTAL_CONTADOR_PATH,
          })
        }}
        onContinuar={() => {
          if (modeloPendenteCbenef) {
            void executarEmissao(modeloPendenteCbenef)
          }
        }}
      />

      <ConfigurarNcmModal
        open={Boolean(ncmParaConfigurar)}
        configuracaoImposto={configuracaoNcmEdicao}
        onClose={() => setNcmParaConfigurar(null)}
        onSuccess={() => {
          setNcmParaConfigurar(null)
          setItensSemCbenef([])
          setModeloPendenteCbenef(null)
          void ncmsQuery.refetch()
          showToast.success('cBenef salvo. Tente emitir novamente.')
        }}
      />
    </>
  )
}
