'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  buscarClienteDeliveryPublico,
  criarPedidoPublico,
} from '@/src/infrastructure/api/publicDeliveryApi'
import { usePublicDeliveryMeiosPagamento } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { showToast } from '@/src/shared/utils/toast'
import {
  useDeliveryCarrinhoStore,
  useDeliveryCarrinhoItens,
  useDeliveryCarrinhoTotal,
} from '../stores/deliveryCarrinhoStore'
import {
  useDeliveryPreferenciaEntregaStore,
  type DeliveryTipoEntrega,
} from '../stores/deliveryPreferenciaEntregaStore'
import {
  garantirEnderecoEntregaPublico,
  normalizarClienteDeliveryPublico,
} from '../utils/garantirEnderecoClientePublico'
import { comporTelefoneApi } from '../utils/deliveryTelefonePais'
import {
  montarPedidoPublico,
  type CheckoutFormData,
} from '../utils/montarPedidoPublico'
import { deliveryPublicoHomePath } from '../utils/deliveryPublicoRoutes'

export type ClienteLookupStatus =
  | 'idle'
  | 'loading'
  | 'encontrado'
  | 'nao_encontrado'
  | 'erro'

export type ClienteLookupState = {
  status: ClienteLookupStatus
  telefoneConsultado: string | null
  cliente: ClienteDeliveryPublicoDTO | null
  mensagemErro: string | null
}

function createInitialForm(tipoEntrega: DeliveryTipoEntrega): CheckoutFormData {
  return {
    tipoEntrega,
    telefone: '',
    telefonePaisIso2: 'BR',
    nome: '',
    modoEndereco: 'novo',
    enderecoIdSelecionado: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    complemento: '',
    pontoReferencia: '',
    etiquetaEndereco: 'casa',
    apelidoEndereco: 'Casa',
    modoTempo: '',
    slotInicio: '',
    slotFim: '',
    slotLabel: '',
    meioPagamentoId: '',
    trocoPara: null,
    observacaoPedido: '',
  }
}

function createInitialLookup(): ClienteLookupState {
  return {
    status: 'idle',
    telefoneConsultado: null,
    cliente: null,
    mensagemErro: null,
  }
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

const LOOKUP_DEBOUNCE_MS = 450

export function useDeliveryCheckout(slug: string) {
  const router = useRouter()
  const itens = useDeliveryCarrinhoItens(slug)
  const total = useDeliveryCarrinhoTotal(slug)
  const limpar = useDeliveryCarrinhoStore(s => s.limpar)
  const setTipoEntregaPreferencia = useDeliveryPreferenciaEntregaStore(s => s.setTipoEntrega)

  const { data: meiosData, isLoading: loadingMeios } = usePublicDeliveryMeiosPagamento(slug)

  const [form, setForm] = useState<CheckoutFormData>(() =>
    createInitialForm(
      useDeliveryPreferenciaEntregaStore.getState().getTipoEntrega(slug)
    )
  )
  const [clienteLookup, setClienteLookup] = useState<ClienteLookupState>(createInitialLookup)
  const [enviando, setEnviando] = useState(false)

  const lookupSeqRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const telefoneDigitsRef = useRef('')
  /** Escolha explícita do usuário; não pode ser sobrescrita pelo lookup. */
  const preferirNovoEnderecoRef = useRef(false)
  const formRef = useRef(form)
  formRef.current = form
  const clienteLookupRef = useRef(clienteLookup)
  clienteLookupRef.current = clienteLookup

  useEffect(() => {
    const syncTipoEntregaFromStore = () => {
      setForm(prev => ({
        ...prev,
        tipoEntrega: useDeliveryPreferenciaEntregaStore.getState().getTipoEntrega(slug),
      }))
    }

    if (useDeliveryPreferenciaEntregaStore.persist.hasHydrated()) {
      syncTipoEntregaFromStore()
      return
    }

    return useDeliveryPreferenciaEntregaStore.persist.onFinishHydration(syncTipoEntregaFromStore)
  }, [slug])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const aplicarClienteNoForm = useCallback((cliente: ClienteDeliveryPublicoDTO | null) => {
    setForm(prev => {
      const enderecos = cliente?.enderecos ?? []
      const primeiro = enderecos[0]
      const nomeApi = cliente?.nome?.trim() ?? ''
      const nome = nomeApi || prev.nome.trim() || ''

      // Só atualiza nome; modo de endereço fica com a escolha do usuário.
      if (preferirNovoEnderecoRef.current) {
        return {
          ...prev,
          nome,
          modoEndereco: 'novo',
          enderecoIdSelecionado: '',
        }
      }

      if (enderecos.length > 0 && primeiro) {
        // Mantém endereço já escolhido se ainda existir no cadastro.
        const idAtual = prev.enderecoIdSelecionado.trim()
        const idValido =
          idAtual && enderecos.some(e => e.id === idAtual) ? idAtual : primeiro.id

        return {
          ...prev,
          nome,
          modoEndereco: 'existente',
          enderecoIdSelecionado: idValido,
        }
      }

      return {
        ...prev,
        nome,
        modoEndereco: 'novo',
        enderecoIdSelecionado: '',
      }
    })
  }, [])

  useEffect(() => {
    if (clienteLookup.status !== 'encontrado') return
    const nomeApi = clienteLookup.cliente?.nome?.trim()
    if (!nomeApi) return
    const telConsultado = clienteLookup.telefoneConsultado
    if (!telConsultado) return
    const telForm = comporTelefoneApi(
      formRef.current.telefone,
      formRef.current.telefonePaisIso2
    )
    if (telForm !== telConsultado && telefoneDigitsRef.current !== telConsultado) {
      return
    }

    setForm(prev => {
      if (prev.nome.trim()) return prev
      return { ...prev, nome: nomeApi }
    })
  }, [
    clienteLookup.status,
    clienteLookup.cliente,
    clienteLookup.telefoneConsultado,
  ])

  const consultarClientePorTelefone = useCallback(
    async (
      telefoneDigits: string
    ): Promise<{
      status: 'idle' | 'encontrado' | 'nao_encontrado' | 'erro' | 'invalido'
      cliente: ClienteDeliveryPublicoDTO | null
    }> => {
      const tel = onlyDigits(telefoneDigits)
      telefoneDigitsRef.current = tel

      if (tel.length < 8) {
        preferirNovoEnderecoRef.current = false
        setClienteLookup(createInitialLookup())
        setForm(prev => ({
          ...prev,
          modoEndereco: 'novo',
          enderecoIdSelecionado: '',
        }))
        return { status: 'invalido', cliente: null }
      }

      const lookupAtual = clienteLookupRef.current
      if (
        lookupAtual.telefoneConsultado === tel &&
        (lookupAtual.status === 'encontrado' ||
          lookupAtual.status === 'nao_encontrado')
      ) {
        return { status: lookupAtual.status, cliente: lookupAtual.cliente }
      }

      const seq = ++lookupSeqRef.current
      setClienteLookup(prev => {
        if (prev.cliente && prev.telefoneConsultado === tel) {
          return { ...prev, mensagemErro: null }
        }
        return {
          ...prev,
          status: 'loading',
          mensagemErro: null,
        }
      })

      try {
        const raw = await buscarClienteDeliveryPublico(tel)
        if (seq !== lookupSeqRef.current) return { status: 'idle', cliente: null }

        if (!raw) {
          preferirNovoEnderecoRef.current = false
          setClienteLookup({
            status: 'nao_encontrado',
            telefoneConsultado: tel,
            cliente: null,
            mensagemErro: null,
          })
          aplicarClienteNoForm(null)
          return { status: 'nao_encontrado', cliente: null }
        }

        const cliente = normalizarClienteDeliveryPublico(raw)
        if (!cliente) {
          setClienteLookup({
            status: 'erro',
            telefoneConsultado: tel,
            cliente: null,
            mensagemErro: 'Resposta inválida ao buscar cliente',
          })
          return { status: 'erro', cliente: null }
        }

        setClienteLookup({
          status: 'encontrado',
          telefoneConsultado: tel,
          cliente,
          mensagemErro: null,
        })
        aplicarClienteNoForm(cliente)
        return { status: 'encontrado', cliente }
      } catch (error) {
        if (seq !== lookupSeqRef.current) return { status: 'idle', cliente: null }
        const message =
          error instanceof Error ? error.message : 'Erro ao consultar cadastro'
        setClienteLookup({
          status: 'erro',
          telefoneConsultado: tel,
          cliente: null,
          mensagemErro: message,
        })
        return { status: 'erro', cliente: null }
      }
    },
    [aplicarClienteNoForm]
  )

  const resolveTelefoneApi = useCallback((formData: CheckoutFormData) => {
    return (
      telefoneDigitsRef.current ||
      comporTelefoneApi(formData.telefone, formData.telefonePaisIso2)
    )
  }, [])

  const agendarConsultaTelefone = useCallback(
    (telefoneMasked: string, paisIso2: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const tel = comporTelefoneApi(telefoneMasked, paisIso2)
      telefoneDigitsRef.current = tel

      if (tel.length < 8) {
        lookupSeqRef.current += 1
        preferirNovoEnderecoRef.current = false
        setClienteLookup(createInitialLookup())
        setForm(prev => ({
          ...prev,
          modoEndereco: 'novo',
          enderecoIdSelecionado: '',
        }))
        return
      }

      if (clienteLookupRef.current.telefoneConsultado !== tel) {
        preferirNovoEnderecoRef.current = false
      }

      debounceRef.current = setTimeout(() => {
        void consultarClientePorTelefone(tel)
      }, LOOKUP_DEBOUNCE_MS)
    },
    [consultarClientePorTelefone]
  )

  const updateForm = useCallback(
    <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => {
      const next: CheckoutFormData = { ...formRef.current, [key]: value }
      if (key === 'telefone' || key === 'telefonePaisIso2') {
        telefoneDigitsRef.current = comporTelefoneApi(
          next.telefone,
          next.telefonePaisIso2
        )
      }
      if (key === 'tipoEntrega') {
        setTipoEntregaPreferencia(slug, value as DeliveryTipoEntrega)
        // Troca entrega ↔ retirada invalida o slot escolhido.
        next.modoTempo = ''
        next.slotInicio = ''
        next.slotFim = ''
        next.slotLabel = ''
      }
      formRef.current = next
      setForm(next)
      if (key === 'telefone' || key === 'telefonePaisIso2') {
        agendarConsultaTelefone(next.telefone, next.telefonePaisIso2)
      }
    },
    [slug, setTipoEntregaPreferencia, agendarConsultaTelefone]
  )

  const selecionarEnderecoExistente = useCallback((enderecoId: string) => {
    preferirNovoEnderecoRef.current = false
    setForm(prev => ({
      ...prev,
      modoEndereco: 'existente',
      enderecoIdSelecionado: enderecoId,
    }))
  }, [])

  const usarNovoEndereco = useCallback(() => {
    preferirNovoEnderecoRef.current = true
    setForm(prev => ({
      ...prev,
      modoEndereco: 'novo',
      enderecoIdSelecionado: '',
    }))
  }, [])

  const consultarTelefoneAtual = useCallback(() => {
    const tel = resolveTelefoneApi(formRef.current)
    telefoneDigitsRef.current = tel
    void consultarClientePorTelefone(tel)
  }, [consultarClientePorTelefone, resolveTelefoneApi])

  const confirmarNovoEndereco = useCallback(async (): Promise<string> => {
    const f = formRef.current
    const tel = resolveTelefoneApi(f)
    telefoneDigitsRef.current = tel
    const nomeEfetivo =
      f.nome.trim() || clienteLookupRef.current.cliente?.nome?.trim() || null

    preferirNovoEnderecoRef.current = true

    const enderecoId = await garantirEnderecoEntregaPublico({
      telefone: tel,
      nome: nomeEfetivo,
      modoEndereco: 'novo',
      enderecoIdSelecionado: null,
      clienteLookup: clienteLookupRef.current.cliente,
      enderecoNovo: {
        rua: f.rua,
        numero: f.numero,
        bairro: f.bairro,
        cidade: f.cidade,
        estado: f.estado,
        cep: f.cep,
        complemento: f.complemento,
        pontoReferencia: f.pontoReferencia,
        etiqueta: f.etiquetaEndereco,
      },
    })

    const raw = await buscarClienteDeliveryPublico(tel)
    const cliente = raw ? normalizarClienteDeliveryPublico(raw) : null
    setClienteLookup({
      status: cliente ? 'encontrado' : 'nao_encontrado',
      telefoneConsultado: tel,
      cliente,
      mensagemErro: null,
    })

    preferirNovoEnderecoRef.current = false
    setForm(prev => ({
      ...prev,
      modoEndereco: 'existente',
      enderecoIdSelecionado: enderecoId,
      nome: nomeEfetivo ?? prev.nome,
    }))

    return enderecoId
  }, [resolveTelefoneApi])

  const enviarPedido = useCallback(async () => {
    const tel = resolveTelefoneApi(form)
    telefoneDigitsRef.current = tel
    if (tel.length < 8) {
      showToast.error('Informe um telefone válido')
      return
    }

    if (itens.length === 0) {
      showToast.error('Carrinho vazio')
      return
    }

    const nomeEfetivo =
      form.nome.trim() || clienteLookup.cliente?.nome?.trim() || null

    setEnviando(true)
    try {
      let enderecoIdEntrega: string | null = null

      if (form.tipoEntrega === 'entrega') {
        enderecoIdEntrega = await garantirEnderecoEntregaPublico({
          telefone: tel,
          nome: nomeEfetivo,
          modoEndereco: form.modoEndereco,
          enderecoIdSelecionado: form.enderecoIdSelecionado || null,
          clienteLookup: clienteLookup.cliente,
          enderecoNovo: {
            rua: form.rua,
            numero: form.numero,
            bairro: form.bairro,
            cidade: form.cidade,
            estado: form.estado,
            cep: form.cep,
            complemento: form.complemento,
            pontoReferencia: form.pontoReferencia,
            etiqueta: form.etiquetaEndereco,
          },
        })
      }

      const resultado = montarPedidoPublico({
        slug,
        itens,
        total,
        form: { ...form, nome: nomeEfetivo ?? '' },
        enderecoIdEntrega,
      })
      if (!resultado.ok) {
        showToast.error(resultado.error)
        return
      }

      await criarPedidoPublico(resultado.payload)
      limpar(slug)
      showToast.success('Pedido enviado com sucesso!')
      router.push(deliveryPublicoHomePath(slug))
    } catch (error) {
      console.error(error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }, [slug, itens, total, form, clienteLookup.cliente, limpar, router, resolveTelefoneApi])

  return {
    itens,
    total,
    form,
    updateForm,
    clienteLookup,
    selecionarEnderecoExistente,
    usarNovoEndereco,
    consultarClientePorTelefone,
    consultarTelefoneAtual,
    confirmarNovoEndereco,
    meiosPagamento: meiosData?.meiosPagamento ?? [],
    loadingMeios,
    enviando,
    enviarPedido,
  }
}
