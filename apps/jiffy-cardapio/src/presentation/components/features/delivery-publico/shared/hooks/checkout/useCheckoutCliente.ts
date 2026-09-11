'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { CheckoutFormData } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { EnderecoGeoCheckoutInput } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  atualizarNomeClienteDeliveryPublicoUseCase,
  buscarClienteDeliveryPublicoUseCase,
  garantirEnderecoEntregaPublicoUseCase,
  removerEnderecoClienteDeliveryPublicoUseCase,
} from '@/src/infrastructure/di/deliveryPublicoUseCases'
import {
  clienteAtingiuMaxEnderecosDelivery,
  MSG_MAX_ENDERECOS_CLIENTE_DELIVERY,
} from '@/src/shared/constants/deliveryClienteEnderecos'
import {
  normalizarEnderecoFormPublico,
  normalizarEnderecoGeocodeInput,
} from '@/src/shared/utils/normalizarTextoEnderecoPublico'
import {
  comporTelefoneApi,
  formatarTelefonePorPais,
} from '@/src/shared/utils/deliveryTelefonePais'
import { showToast } from '@/src/shared/utils/toast'
import {
  type DeliveryCheckoutCotacaoState,
  isTokenCotacaoExpirado,
} from '../../utils/deliveryCheckoutCotacaoUtils'
import {
  BR_CELULAR_DIGITOS,
  LOOKUP_DEBOUNCE_MS,
  createInitialLookup,
  limparLookupEstadoIncompleto,
  onlyDigits,
} from './formHelpers'
import type { ClienteLookupState } from './types'

type UseCheckoutClienteParams = {
  formRef: MutableRefObject<CheckoutFormData>
  setForm: Dispatch<SetStateAction<CheckoutFormData>>
  telefoneDigitsRef: MutableRefObject<string>
  limparCotacao: () => void
  cotacaoRef: MutableRefObject<DeliveryCheckoutCotacaoState | null>
  cotacaoSeqRef: MutableRefObject<number>
  setCotacao: Dispatch<SetStateAction<DeliveryCheckoutCotacaoState | null>>
  setCotacaoLoading: Dispatch<SetStateAction<boolean>>
}

export function useCheckoutCliente({
  formRef,
  setForm,
  telefoneDigitsRef,
  limparCotacao,
  cotacaoRef,
  cotacaoSeqRef,
  setCotacao,
  setCotacaoLoading,
}: UseCheckoutClienteParams) {
  const [clienteLookup, setClienteLookup] = useState<ClienteLookupState>(createInitialLookup)
  const lookupSeqRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Escolha explícita do usuário; não pode ser sobrescrita pelo lookup. */
  const preferirNovoEnderecoRef = useRef(false)
  const clienteLookupRef = useRef(clienteLookup)
  clienteLookupRef.current = clienteLookup

  /**
   * Snapshot da seleção/cotação antes de “novo endereço” (ou fluxo que limpa a seleção),
   * para restaurar sem nova requisição se o usuário cancelar.
   */
  const enderecoSelecaoBackupRef = useRef<{
    enderecoIdSelecionado: string
    cotacao: DeliveryCheckoutCotacaoState | null
  } | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const resolveTelefoneApi = useCallback((formData: CheckoutFormData) => {
    return (
      telefoneDigitsRef.current ||
      comporTelefoneApi(formData.telefone, formData.telefonePaisIso2)
    )
  }, [])

  const capturarBackupEnderecoSelecionado = useCallback(() => {
    const f = formRef.current
    const id = f.enderecoIdSelecionado.trim()
    if (f.modoEndereco !== 'existente' || !id) return

    const cotacaoAtual = cotacaoRef.current
    enderecoSelecaoBackupRef.current = {
      enderecoIdSelecionado: id,
      cotacao:
        cotacaoAtual && !isTokenCotacaoExpirado(cotacaoAtual.expiresAt) ? cotacaoAtual : null,
    }
  }, [formRef, cotacaoRef])

  const limparBackupEnderecoSelecionado = useCallback(() => {
    enderecoSelecaoBackupRef.current = null
  }, [])

  const restaurarEnderecoSelecaoCancelada = useCallback((): boolean => {
    preferirNovoEnderecoRef.current = false
    const backup = enderecoSelecaoBackupRef.current
    if (!backup?.enderecoIdSelecionado) return false

    const enderecos = clienteLookupRef.current.cliente?.enderecos ?? []
    if (!enderecos.some(e => e.id === backup.enderecoIdSelecionado)) {
      enderecoSelecaoBackupRef.current = null
      return false
    }

    setForm(prev => ({
      ...prev,
      modoEndereco: 'existente',
      enderecoIdSelecionado: backup.enderecoIdSelecionado,
    }))

    if (backup.cotacao && !isTokenCotacaoExpirado(backup.cotacao.expiresAt)) {
      cotacaoSeqRef.current += 1
      setCotacao(backup.cotacao)
      setCotacaoLoading(false)
    }

    return true
  }, [setForm, cotacaoSeqRef, setCotacao, setCotacaoLoading])

  const aplicarClienteNoForm = useCallback(
    (cliente: ClienteDeliveryPublicoDTO | null) => {
      setForm(prev => {
        const enderecos = cliente?.enderecos ?? []
        const primeiro = enderecos[0]
        const nomeApi = cliente?.nome?.trim() ?? ''
        const nome = nomeApi || prev.nome.trim() || ''

        if (preferirNovoEnderecoRef.current) {
          return {
            ...prev,
            nome,
            modoEndereco: 'novo',
            enderecoIdSelecionado: '',
          }
        }

        if (enderecos.length > 0 && primeiro) {
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
    },
    [setForm]
  )

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
    formRef,
    setForm,
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

      if (tel.length < BR_CELULAR_DIGITOS) {
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
        const resultado = await buscarClienteDeliveryPublicoUseCase.execute(tel)
        if (seq !== lookupSeqRef.current) return { status: 'idle', cliente: null }

        if (!resultado.ok) {
          setClienteLookup({
            status: 'erro',
            telefoneConsultado: tel,
            cliente: null,
            mensagemErro: resultado.error,
          })
          return { status: 'erro', cliente: null }
        }

        if (!resultado.encontrado) {
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

        const cliente = resultado.cliente
        telefoneDigitsRef.current = tel
        setClienteLookup({
          status: 'encontrado',
          telefoneConsultado: tel,
          cliente,
          mensagemErro: null,
        })
        aplicarClienteNoForm(cliente)
        setForm(prev => ({ ...prev, telefone: '' }))
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
    [aplicarClienteNoForm, setForm]
  )

  const agendarConsultaTelefone = useCallback(
    (telefoneMasked: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const tel = comporTelefoneApi(telefoneMasked, 'BR')
      telefoneDigitsRef.current = tel

      if (tel.length < BR_CELULAR_DIGITOS) {
        limparLookupEstadoIncompleto(
          setClienteLookup,
          setForm,
          lookupSeqRef,
          preferirNovoEnderecoRef
        )
        return
      }

      if (clienteLookupRef.current.telefoneConsultado !== tel) {
        preferirNovoEnderecoRef.current = false
      }

      debounceRef.current = setTimeout(() => {
        void consultarClientePorTelefone(tel)
      }, LOOKUP_DEBOUNCE_MS)
    },
    [consultarClientePorTelefone, setForm]
  )

  const selecionarEnderecoExistente = useCallback(
    (enderecoId: string) => {
      preferirNovoEnderecoRef.current = false
      limparBackupEnderecoSelecionado()
      const f = formRef.current
      if (f.enderecoIdSelecionado !== enderecoId || f.modoEndereco !== 'existente') {
        limparCotacao()
      }
      setForm(prev => ({
        ...prev,
        modoEndereco: 'existente',
        enderecoIdSelecionado: enderecoId,
      }))
    },
    [limparCotacao, limparBackupEnderecoSelecionado, formRef, setForm]
  )

  const usarNovoEndereco = useCallback(() => {
    capturarBackupEnderecoSelecionado()
    preferirNovoEnderecoRef.current = true
    limparCotacao()
    setForm(prev => ({
      ...prev,
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
    }))
  }, [limparCotacao, capturarBackupEnderecoSelecionado, setForm])

  const preencherFormParaEditarEndereco = useCallback(
    (endereco: {
      id: string
      rua: string
      numero: string
      bairro: string
      cidade?: string | null
      estado?: string | null
      cep?: string | null
      complemento?: string | null
      etiqueta?: string | null
    }) => {
      preferirNovoEnderecoRef.current = false
      limparCotacao()
      const etiqueta =
        endereco.etiqueta === 'trabalho' || endereco.etiqueta === 'outro'
          ? endereco.etiqueta
          : 'casa'
      const normalizado = normalizarEnderecoGeocodeInput({
        rua: endereco.rua ?? '',
        numero: endereco.numero ?? '',
        bairro: endereco.bairro ?? '',
        cidade: endereco.cidade ?? '',
        estado: endereco.estado ?? '',
        cep: endereco.cep ?? '',
        complemento: endereco.complemento ?? '',
      })
      setForm(prev => ({
        ...prev,
        modoEndereco: 'existente',
        enderecoIdSelecionado: endereco.id,
        rua: normalizado.rua,
        numero: normalizado.numero,
        bairro: normalizado.bairro ?? '',
        cidade: normalizado.cidade ?? '',
        estado: normalizado.estado ?? '',
        cep: normalizado.cep ?? '',
        complemento: normalizado.complemento ?? '',
        etiquetaEndereco: etiqueta,
        apelidoEndereco:
          etiqueta === 'trabalho' ? 'Trabalho' : etiqueta === 'outro' ? 'Outro' : 'Casa',
      }))
    },
    [limparCotacao, setForm]
  )

  const removerEnderecoCliente = useCallback(
    async (enderecoId: string): Promise<void> => {
      const id = enderecoId.trim()
      if (!id) throw new Error('Endereço inválido')

      const tel =
        telefoneDigitsRef.current ||
        clienteLookupRef.current.telefoneConsultado ||
        resolveTelefoneApi(formRef.current)

      const resultado = await removerEnderecoClienteDeliveryPublicoUseCase.execute({
        telefone: tel,
        enderecoId: id,
      })
      if (!resultado.ok) {
        throw new Error(resultado.error)
      }

      limparCotacao()
      setClienteLookup({
        status: 'encontrado',
        telefoneConsultado: tel.replace(/\D/g, '') || tel,
        cliente: resultado.cliente,
        mensagemErro: null,
      })
      setForm(prev =>
        prev.enderecoIdSelecionado === id
          ? { ...prev, enderecoIdSelecionado: '', modoEndereco: 'novo' }
          : prev
      )
    },
    [limparCotacao, resolveTelefoneApi, formRef, setForm]
  )

  const consultarTelefoneAtual = useCallback(() => {
    const tel = onlyDigits(
      telefoneDigitsRef.current ||
        comporTelefoneApi(formRef.current.telefone, 'BR')
    )
    telefoneDigitsRef.current = tel
    if (tel.length < BR_CELULAR_DIGITOS) return
    void consultarClientePorTelefone(tel)
  }, [consultarClientePorTelefone, formRef])

  const limparIdentificacaoCliente = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    lookupSeqRef.current += 1
    preferirNovoEnderecoRef.current = false
    enderecoSelecaoBackupRef.current = null

    const tel =
      onlyDigits(
        clienteLookupRef.current.telefoneConsultado ||
          telefoneDigitsRef.current ||
          comporTelefoneApi(formRef.current.telefone, 'BR')
      ) || ''
    telefoneDigitsRef.current = tel

    setClienteLookup(createInitialLookup())
    setForm(prev => ({
      ...prev,
      telefone: tel ? formatarTelefonePorPais(tel, 'BR') : prev.telefone,
      nome: '',
      modoEndereco: 'novo',
      enderecoIdSelecionado: '',
    }))
  }, [formRef, setForm])

  const salvarNomeCliente = useCallback(
    async (nomeInformado: string) => {
      const tel =
        telefoneDigitsRef.current ||
        clienteLookupRef.current.telefoneConsultado ||
        ''

      const resultado = await atualizarNomeClienteDeliveryPublicoUseCase.execute({
        telefone: tel,
        nome: nomeInformado,
      })
      if (!resultado.ok) {
        throw new Error(resultado.error)
      }

      const cliente = resultado.cliente
      setClienteLookup(prev => ({
        ...prev,
        status: 'encontrado',
        telefoneConsultado: tel.replace(/\D/g, '') || tel,
        cliente,
        mensagemErro: null,
      }))
      setForm(prev => ({ ...prev, nome: cliente.nome?.trim() || nomeInformado.trim() }))
    },
    [setForm]
  )

  const montarEnderecoNovoForm = useCallback(
    (f: CheckoutFormData) =>
      normalizarEnderecoFormPublico({
        rua: f.rua,
        numero: f.numero,
        bairro: f.bairro,
        cidade: f.cidade,
        estado: f.estado,
        cep: f.cep,
        complemento: f.complemento,
        pontoReferencia: f.pontoReferencia,
        etiqueta: f.etiquetaEndereco,
      }),
    []
  )

  const confirmarNovoEndereco = useCallback(
    async (geo: EnderecoGeoCheckoutInput): Promise<string> => {
      const f = formRef.current
      const tel = resolveTelefoneApi(f)
      telefoneDigitsRef.current = tel
      const nomeEfetivo =
        f.nome.trim() || clienteLookupRef.current.cliente?.nome?.trim() || null

      preferirNovoEnderecoRef.current = true

      const { enderecoId, cliente: clienteAposWrite } =
        await garantirEnderecoEntregaPublicoUseCase.execute({
          telefone: tel,
          nome: nomeEfetivo,
          modoEndereco: 'novo',
          enderecoIdSelecionado: null,
          clienteLookup: clienteLookupRef.current.cliente,
          enderecoNovo: montarEnderecoNovoForm(f),
          geo,
        })

      const cliente = clienteAposWrite
      setClienteLookup({
        status: cliente ? 'encontrado' : 'nao_encontrado',
        telefoneConsultado: tel,
        cliente,
        mensagemErro: null,
      })

      preferirNovoEnderecoRef.current = false
      limparBackupEnderecoSelecionado()
      setForm(prev => ({
        ...prev,
        modoEndereco: 'existente',
        enderecoIdSelecionado: enderecoId,
        nome: nomeEfetivo ?? prev.nome,
      }))

      return enderecoId
    },
    [montarEnderecoNovoForm, resolveTelefoneApi, limparBackupEnderecoSelecionado, formRef, setForm]
  )

  const confirmarGeoEnderecoExistente = useCallback(
    async (geo: EnderecoGeoCheckoutInput): Promise<void> => {
      const f = formRef.current
      const tel = resolveTelefoneApi(f)
      const enderecoId = f.enderecoIdSelecionado.trim()
      if (!enderecoId) {
        throw new Error('Selecione um endereço de entrega')
      }

      const nomeEfetivo =
        f.nome.trim() || clienteLookupRef.current.cliente?.nome?.trim() || null

      const { cliente: clienteAposWrite } = await garantirEnderecoEntregaPublicoUseCase.execute({
        telefone: tel,
        nome: nomeEfetivo,
        modoEndereco: 'existente',
        enderecoIdSelecionado: enderecoId,
        clienteLookup: clienteLookupRef.current.cliente,
        enderecoNovo: montarEnderecoNovoForm(f),
        geo,
      })

      const cliente = clienteAposWrite ?? clienteLookupRef.current.cliente
      setClienteLookup({
        status: cliente ? 'encontrado' : 'nao_encontrado',
        telefoneConsultado: tel,
        cliente,
        mensagemErro: null,
      })
    },
    [montarEnderecoNovoForm, resolveTelefoneApi, formRef]
  )

  const podeCriarNovoEndereco = useCallback((): boolean => {
    const quantidade = clienteLookup.cliente?.enderecos?.length ?? 0
    if (!clienteAtingiuMaxEnderecosDelivery(quantidade)) return true
    showToast.error(MSG_MAX_ENDERECOS_CLIENTE_DELIVERY)
    return false
  }, [clienteLookup.cliente?.enderecos?.length])

  return {
    clienteLookup,
    setClienteLookup,
    clienteLookupRef,
    resolveTelefoneApi,
    agendarConsultaTelefone,
    selecionarEnderecoExistente,
    usarNovoEndereco,
    restaurarEnderecoSelecaoCancelada,
    limparBackupEnderecoSelecionado,
    preencherFormParaEditarEndereco,
    removerEnderecoCliente,
    consultarClientePorTelefone,
    consultarTelefoneAtual,
    limparIdentificacaoCliente,
    confirmarNovoEndereco,
    confirmarGeoEnderecoExistente,
    salvarNomeCliente,
    podeCriarNovoEndereco,
  }
}
