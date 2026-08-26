'use client'

import { useEffect, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryPaisTelefoneSelect } from '../../../shared/components/DeliveryPaisTelefoneSelect'
import { DELIVERY_PAIS_TELEFONE_PADRAO } from '../../../shared/constants/deliveryPaisesTelefone'
import {
  DELIVERY_CELULAR_BR_DIGITOS,
  DELIVERY_MSG_CELULAR_COMPLETO,
} from '../../../shared/constants/deliveryPublicoPlaceholders'
import type { DeliveryTipoEntrega } from '../../../shared/stores/deliveryPreferenciaEntregaStore'
import {
  comporTelefoneApi,
  formatarTelefoneExibicao,
  formatarTelefonePorPais,
} from '../../../shared/utils/deliveryTelefonePais'
import type { ClienteLookupStatus } from '../../../shared/hooks/useDeliveryCheckout'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import { isNomeCompletoCheckoutValido } from './deliveryCheckoutProgress'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'
import {
  DeliveryCheckoutTipoEntregaOpcoes,
  type ModoEntregaOpcao,
} from './DeliveryCheckoutTipoEntregaOpcoes'

type DeliveryCheckoutIdentifiqueSeModalProps = {
  telefone: string
  telefonePaisIso2?: string
  nome: string
  /** Nome já salvo no cadastro (API). Vazio = cliente sem nome. */
  nomeCadastro: string | null
  /** Telefone consultado com sucesso (dígitos). Usado quando o input Celular fica vazio. */
  telefoneConfirmadoDigits: string | null
  lookupStatus: ClienteLookupStatus
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado'
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  temEnderecosCadastrados: boolean
  enderecoEmpresaTexto: string | null
  taxaEntregaOficial?: number | null
  cotacaoLoading?: boolean
  cotacaoPronta?: boolean
  onChangeTelefone: (value: string) => void
  onChangeTelefonePais?: (iso2: string) => void
  /** Busca manual (10 dígitos): blur do input ou Enter/OK do teclado. */
  onConsultarTelefone?: () => void
  onChangeNome: (value: string) => void
  onChangeOpcaoEntrega: (opcao: ModoEntregaOpcao) => void
  onEditarEndereco: () => void
  onCadastrarEndereco: () => void
  onSalvarNome: (nome: string) => Promise<void>
  /** Remove cliente/lookup e reabre o input para buscar outro número. */
  onLimparIdentificacao: () => void
  onClose: () => void
  onContinuar: (telefoneDigits: string) => Promise<void>
}

export function DeliveryCheckoutIdentifiqueSeModal({
  telefone,
  telefonePaisIso2: _telefonePaisIso2 = DELIVERY_PAIS_TELEFONE_PADRAO,
  nome,
  nomeCadastro,
  telefoneConfirmadoDigits,
  lookupStatus,
  tipoEntrega,
  modoTempo,
  enderecoCliente,
  temEnderecosCadastrados,
  enderecoEmpresaTexto,
  taxaEntregaOficial = null,
  cotacaoLoading = false,
  cotacaoPronta = false,
  onChangeTelefone,
  onConsultarTelefone,
  onChangeNome,
  onChangeOpcaoEntrega,
  onEditarEndereco,
  onCadastrarEndereco,
  onSalvarNome,
  onLimparIdentificacao,
  onClose,
  onContinuar,
}: DeliveryCheckoutIdentifiqueSeModalProps) {
  const [enviando, setEnviando] = useState(false)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const paisIso2 = DELIVERY_PAIS_TELEFONE_PADRAO
  const [tentouNome, setTentouNome] = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)

  useEffect(() => {
    if (lookupStatus !== 'encontrado') {
      setEditandoNome(false)
    }
  }, [lookupStatus])

  const telefoneDigits = telefone.replace(/\D/g, '')
  const telefoneOk = telefoneDigits.length === DELIVERY_CELULAR_BR_DIGITOS
  const clienteEncontrado = lookupStatus === 'encontrado'
  const consultaPronta =
    (telefoneOk || Boolean(telefoneConfirmadoDigits)) &&
    (lookupStatus === 'encontrado' ||
      lookupStatus === 'nao_encontrado' ||
      lookupStatus === 'erro')

  const temNomeNoCadastro = Boolean(nomeCadastro?.trim())
  const precisaNome =
    lookupStatus === 'nao_encontrado' ||
    (lookupStatus === 'encontrado' && !temNomeNoCadastro)

  const nomeAlterado =
    clienteEncontrado && nome.trim() !== (nomeCadastro?.trim() ?? '')

  const mostrarCampoNomeNovo =
    lookupStatus === 'nao_encontrado' && consultaPronta

  /** Opções de entrega/retirada só após busca (encontrado ou não). */
  const mostrarOpcoesEntrega =
    lookupStatus === 'encontrado' || lookupStatus === 'nao_encontrado'

  const alertarCelularIncompleto = () => {
    showToast.error(DELIVERY_MSG_CELULAR_COMPLETO)
  }

  const tentarConsultaConfirmada = () => {
    if (telefoneDigits.length === 0) return
    if (telefoneDigits.length < DELIVERY_CELULAR_BR_DIGITOS) {
      alertarCelularIncompleto()
      return
    }
    onConsultarTelefone?.()
  }

  const resolverTelefoneDigits = (): string | null => {
    if (clienteEncontrado && telefoneConfirmadoDigits) {
      return telefoneConfirmadoDigits
    }
    if (telefoneDigits.length === DELIVERY_CELULAR_BR_DIGITOS) {
      return comporTelefoneApi(telefone, paisIso2)
    }
    return null
  }

  const handleSalvarNome = async () => {
    if (!isNomeCompletoCheckoutValido(nome)) {
      setTentouNome(true)
      showToast.error('Informe nome e sobrenome')
      return
    }
    setSalvandoNome(true)
    try {
      await onSalvarNome(nome.trim())
      setEditandoNome(false)
      showToast.success('Nome atualizado')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar nome')
    } finally {
      setSalvandoNome(false)
    }
  }

  const handleContinuar = async () => {
    const digits = resolverTelefoneDigits()
    if (!digits || digits.length < DELIVERY_CELULAR_BR_DIGITOS) {
      alertarCelularIncompleto()
      return
    }
    if (lookupStatus === 'loading' || lookupStatus === 'idle') {
      showToast.error('Aguarde a consulta do telefone')
      return
    }
    if (lookupStatus === 'erro') {
      showToast.error('Erro ao consultar cadastro. Tente novamente.')
      return
    }
    if (precisaNome && !isNomeCompletoCheckoutValido(nome)) {
      setTentouNome(true)
      showToast.error('Informe nome e sobrenome')
      return
    }
    if (clienteEncontrado && nomeAlterado) {
      if (!isNomeCompletoCheckoutValido(nome)) {
        setTentouNome(true)
        showToast.error('Informe nome e sobrenome')
        return
      }
    }

    setEnviando(true)
    try {
      if (clienteEncontrado && nomeAlterado) {
        await onSalvarNome(nome.trim())
      }
      await onContinuar(digits)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao continuar')
    } finally {
      setEnviando(false)
    }
  }

  const placeholder = paisIso2 === 'BR' ? '(99) 99999-9999' : '999 999 999'
  const telefoneConfirmadoExibicao = telefoneConfirmadoDigits
    ? formatarTelefoneExibicao(telefoneConfirmadoDigits, paisIso2)
    : telefoneDigits.length === DELIVERY_CELULAR_BR_DIGITOS
      ? formatarTelefoneExibicao(comporTelefoneApi(telefone, paisIso2), paisIso2)
      : telefone.trim()
        ? formatarTelefoneExibicao(telefone, paisIso2)
        : ''

  const nomeSomenteLeitura = clienteEncontrado && temNomeNoCadastro && !editandoNome
  /** Após busca, some o input de celular; fica só nome/telefone confirmados + X. */
  const ocultarInputBusca = mostrarOpcoesEntrega

  const handleLimparIdentificacao = () => {
    setTentouNome(false)
    setEditandoNome(false)
    onLimparIdentificacao()
  }

  return (
    <>
      <DeliveryCheckoutShellHeader
        title="Identifique-se"
        showBack
        onBack={onClose}
      />
      <DeliveryCheckoutShellFooter>
        <DeliveryCheckoutFooterActions
          onVoltar={onClose}
          onContinuar={() => void handleContinuar()}
          continuarDisabled={enviando || salvandoNome || lookupStatus === 'loading'}
          continuarLabel={enviando || lookupStatus === 'loading' ? '...' : 'Continuar'}
          top={
            <p className="text-center text-[11px] leading-relaxed delivery-text-secondary">
              Ao prosseguir, confirmo que li e aceito os{' '}
              <span className="underline">Termos de uso</span> e{' '}
              <span className="underline">Política de privacidade</span>.
            </p>
          }
        />
      </DeliveryCheckoutShellFooter>

      <div className="space-y-4">
        {!ocultarInputBusca ? (
          <label className="relative block">
            <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
              Celular
            </span>
            <div
              className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2"
              style={{ borderColor: 'var(--delivery-border)' }}
            >
              <DeliveryPaisTelefoneSelect
                value={paisIso2}
                onChange={() => {
                  /* País travado em BR até o backend persistir. */
                }}
                disabled={enviando}
                locked
              />
              <input
                type="tel"
                inputMode="tel"
                enterKeyHint="done"
                autoComplete="tel-national"
                placeholder={placeholder}
                value={telefone}
                onChange={e => onChangeTelefone(formatarTelefonePorPais(e.target.value, paisIso2))}
                onBlur={tentarConsultaConfirmada}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    // Só o blur dispara a validação — evita toast duplicado.
                    ;(e.currentTarget as HTMLInputElement).blur()
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-base outline-none delivery-text-primary"
              />
            </div>
            <p className="mt-1.5 text-xs delivery-text-secondary">
              Celular com DDD — 11 dígitos, ex.: (99) 99999-9999
            </p>
          </label>
        ) : null}

        {lookupStatus === 'loading' && telefoneOk ? (
          <p className="text-xs delivery-text-secondary">Consultando cadastro...</p>
        ) : null}

        {clienteEncontrado ? (
          <div className="space-y-3">
            <label className="relative block">
              <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                Nome
              </span>
              <div
                className="flex min-h-[44px] items-center gap-2 rounded-xl border bg-white px-3 py-2"
                style={{
                  borderColor:
                    tentouNome && !isNomeCompletoCheckoutValido(nome)
                      ? '#f87171'
                      : 'var(--delivery-border)',
                }}
              >
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Nome + Sobrenome"
                  value={nome}
                  readOnly={nomeSomenteLeitura}
                  onChange={e => onChangeNome(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none delivery-text-primary"
                />
                {temNomeNoCadastro && !editandoNome ? (
                  <button
                    type="button"
                    onClick={() => setEditandoNome(true)}
                    aria-label="Editar nome"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ color: 'var(--delivery-text-muted)' }}
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                ) : null}
              </div>
              {!temNomeNoCadastro ? (
                <p className="mt-1.5 text-xs delivery-text-secondary">
                  Informe seu nome completo para continuar.
                </p>
              ) : null}
            </label>

            {nomeAlterado ? (
              <button
                type="button"
                onClick={() => void handleSalvarNome()}
                disabled={salvandoNome}
                className="min-h-[44px] w-full rounded-xl bg-black text-sm font-semibold text-white disabled:opacity-60"
              >
                {salvandoNome ? 'Salvando...' : 'Salvar nome'}
              </button>
            ) : null}

            {telefoneConfirmadoExibicao ? (
              <div className="relative block">
                <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                  Telefone
                </span>
                <div
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border bg-white px-3 py-2"
                  style={{ borderColor: 'var(--delivery-border)' }}
                >
                  <p className="min-w-0 flex-1 text-sm font-medium delivery-text-primary">
                    {telefoneConfirmadoExibicao}
                  </p>
                  <button
                    type="button"
                    onClick={handleLimparIdentificacao}
                    aria-label="Buscar outro número"
                    title="Buscar outro número"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ color: 'var(--delivery-text-muted)' }}
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {mostrarCampoNomeNovo ? (
          <div className="space-y-3">
            <label className="relative block">
              <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                Nome
              </span>
              <input
                type="text"
                autoComplete="name"
                placeholder="Nome + Sobrenome"
                value={nome}
                onChange={e => onChangeNome(e.target.value)}
                className={`w-full rounded-xl border bg-white px-3 py-2 text-base outline-none delivery-text-primary ${
                  tentouNome && !isNomeCompletoCheckoutValido(nome) ? 'border-red-400' : ''
                }`}
                style={{ borderColor: 'var(--delivery-border)' }}
              />
              <p className="mt-1.5 text-xs delivery-text-secondary">
                Informe seu nome completo para continuar.
              </p>
            </label>

            {telefoneConfirmadoExibicao ? (
              <div className="relative block">
                <span className="absolute -top-2 left-3 z-10 bg-[var(--delivery-surface,#fff)] px-1 text-xs delivery-text-secondary">
                  Telefone
                </span>
                <div
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border bg-white px-3 py-2"
                  style={{ borderColor: 'var(--delivery-border)' }}
                >
                  <p className="min-w-0 flex-1 text-sm font-medium delivery-text-primary">
                    {telefoneConfirmadoExibicao}
                  </p>
                  <button
                    type="button"
                    onClick={handleLimparIdentificacao}
                    aria-label="Buscar outro número"
                    title="Buscar outro número"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ color: 'var(--delivery-text-muted)' }}
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {mostrarOpcoesEntrega ? (
          <DeliveryCheckoutTipoEntregaOpcoes
            tipoEntrega={tipoEntrega}
            modoTempo={modoTempo}
            enderecoCliente={enderecoCliente}
            temEnderecosCadastrados={temEnderecosCadastrados}
            enderecoEmpresaTexto={enderecoEmpresaTexto}
            taxaEntregaOficial={taxaEntregaOficial}
            cotacaoLoading={cotacaoLoading}
            cotacaoPronta={cotacaoPronta}
            onChangeOpcao={onChangeOpcaoEntrega}
            onEditarEndereco={onEditarEndereco}
            onCadastrarEndereco={onCadastrarEndereco}
          />
        ) : null}
      </div>
    </>
  )
}
