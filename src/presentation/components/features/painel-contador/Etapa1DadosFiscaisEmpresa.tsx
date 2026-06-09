'use client'

import React, { useEffect, useState } from 'react'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { useCertificadoDigital } from '@/src/presentation/hooks/painel-contador/useCertificadoDigital'
import { Button } from '@/src/presentation/components/ui/button'
import { MdSettings, MdWarning, MdDelete, MdCheckCircle, MdRefresh } from 'react-icons/md'
import { CertificadoUploadModal } from './CertificadoUploadModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { showToast } from '@/src/shared/utils/toast'
import { InfoHint } from '@/src/presentation/components/ui/InfoHint'
import { Etapa5TabelaIbpt, IbptInfoHint } from './Etapa5TabelaIbpt'

const DADOS_FISCAIS_INFO_HINT =
  'Informe CNPJ, Inscrição Estadual (IE), Inscrição Municipal (IM) e Regime Tributário da empresa. Esses dados são obrigatórios para emissão de notas fiscais e devem ser concluídos antes do certificado digital.'

const CERTIFICADO_DIGITAL_INFO_HINT =
  'Certificado digital A1 autentica a comunicação com a SEFAZ e é obrigatório para emitir notas fiscais eletrônicas. Cadastre-o após concluir os dados fiscais da empresa.'

export function Etapa1DadosFiscaisEmpresa() {
  const { addTab } = useTabsStore()
  const { certificadoQuery, dadosCompletosQuery, removeMutation, refetchDadosCompletos } =
    useCertificadoDigital()

  const certificadoEntity = certificadoQuery.data?.certificado
  const certificado = certificadoEntity
    ? {
        id: certificadoEntity.id,
        ambiente: certificadoEntity.ambiente,
        validadeCertificado: certificadoEntity.validadeCertificado?.toISOString(),
      }
    : null
  const isLoadingCertificado = certificadoQuery.isLoading
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const dadosCompletos = dadosCompletosQuery.data ?? null
  const isVerificandoDados = dadosCompletosQuery.isFetching

  const verificarDadosCompletos = () => {
    void refetchDadosCompletos()
  }


  // Calcula dias restantes até expiração
  const calcularDiasRestantes = (dataValidade: string | null | undefined): number | null => {
    if (!dataValidade) return null
    const hoje = new Date()
    const validade = new Date(dataValidade)
    const diffTime = validade.getTime() - hoje.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Formata data para exibição
  const formatarData = (dataISO: string): string => {
    const data = new Date(dataISO)
    return data.toLocaleDateString('pt-BR')
  }

  const handleOpenCertificadoConfig = () => {
    // Verificar se os dados fiscais estão completos antes de permitir cadastrar certificado
    if (dadosCompletos === false) {
      showToast.warning('Complete primeiro todos os dados fiscais da empresa antes de cadastrar o certificado digital.')
      return
    }
    
    // Se dadosCompletos ainda está sendo verificado (null), aguardar
    if (dadosCompletos === null && !isVerificandoDados) {
      showToast.warning('Aguarde a verificação dos dados fiscais.')
      return
    }
    
    setShowUploadModal(true)
  }

  const handleOpenConfirmRemover = () => {
    if (!certificado) return
    setShowConfirmModal(true)
  }

  const handleConfirmRemover = async () => {
    if (!certificado) return
    await removeMutation.mutateAsync()
    setShowConfirmModal(false)
  }

  const handleCertificadoSuccess = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await certificadoQuery.refetch()
    verificarDadosCompletos()
  }

  const isRemoving = removeMutation.isPending

  return (
    <>
      <CertificadoUploadModal 
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleCertificadoSuccess}
      />

      {/* Modal de Confirmação de Remoção */}
      <Dialog 
        open={showConfirmModal} 
        onOpenChange={setShowConfirmModal}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ p: 3 }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                <MdWarning className="text-red-600" size={24} />
              </div>
              <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc2626' }}>
                Confirmar Remoção do Certificado
              </DialogTitle>
            </div>
            <DialogDescription>
              <span className="block mt-2 text-sm leading-relaxed">
                Tem certeza que deseja remover o certificado digital?
              </span>
            </DialogDescription>
          </DialogHeader>

          {certificado && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-inter font-medium text-secondary-text text-sm">
                    Ambiente:
                  </span>
                  <span className="font-inter font-semibold text-primary text-sm">
                    {certificado.ambiente === 'HOMOLOGACAO' ? 'Homologação' : 'Produção'}
                  </span>
                </div>
                {certificado.validadeCertificado && (
                  <div className="flex items-center justify-between">
                    <span className="font-inter font-medium text-secondary-text text-sm">
                      Validade:
                    </span>
                    <span className="font-inter font-semibold text-secondary-text text-sm">
                      {formatarData(certificado.validadeCertificado)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-inter font-medium text-red-800 text-sm">
              ⚠️ Após a remoção, não será mais possível emitir notas fiscais até que um novo certificado seja cadastrado.
            </p>
          </div>

          <DialogFooter sx={{ mt: 3, gap: 2 }}>
            <Button
              onClick={() => setShowConfirmModal(false)}
              disabled={isRemoving}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              sx={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                '&:hover': { backgroundColor: '#e5e7eb' },
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRemover}
              disabled={isRemoving}
              className="rounded-lg px-4 py-2 text-white text-sm font-medium flex items-center gap-2"
              sx={{
                backgroundColor: '#dc2626',
                '&:hover': { backgroundColor: '#b91c1c' },
                '&:disabled': { backgroundColor: '#fca5a5' },
              }}
            >
              <MdDelete size={18} />
              {isRemoving ? 'Removendo...' : 'Confirmar Remoção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="flex flex-col gap-4 p-2 sm:p-4">
        {/* Passo 1: Dados da Empresa */}
        <div className="flex flex-col gap-4 rounded-lg border-2 border-alternate/30 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="md:flex-shrink-0 md:flex hidden items-center justify-center w-10 h-10 rounded-full bg-alternate text-white font-semibold text-lg">
              1
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <h3 className="font-exo font-semibold text-alternate text-lg sm:text-xl flex flex-wrap items-center gap-1">
                  Passo 1: Dados da Empresa
                  <InfoHint text={DADOS_FISCAIS_INFO_HINT} />
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {isVerificandoDados ? (
                    <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 sm:text-sm">
                      <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-alternate border-t-transparent" />
                      Verificando dados fiscais...
                    </div>
                  ) : dadosCompletos === true ? (
                    <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-800 sm:text-sm">
                      <MdCheckCircle className="shrink-0" size={18} />
                      Dados fiscais completos
                    </div>
                  ) : dadosCompletos === false ? (
                    <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 sm:text-sm">
                      <MdWarning className="shrink-0" size={18} />
                      Dados fiscais incompletos
                    </div>
                  ) : null}
                  {!isVerificandoDados && dadosCompletos !== null && (
                    <button
                      type="button"
                      onClick={verificarDadosCompletos}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-secondary-text transition-colors hover:bg-gray-100 hover:text-alternate"
                      title="Verificar novamente"
                    >
                      <MdRefresh size={16} />
                      Verificar
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <Button
                  onClick={() => {
                    addTab({
                      id: 'config-empresa-completa',
                      label: 'Configuração Completa',
                      path: '/portal-contador',
                    })
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
                  sx={{
                    backgroundColor: 'var(--color-secondary)',
                    '&:hover': { backgroundColor: 'var(--color-alternate)' },
                  }}
                >
                  <MdSettings size={18} />
                  Configurar Dados Fiscais
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Passo 2: Gerenciar Certificado Digital */}
        <div className="flex flex-col gap-4 rounded-lg border-2 border-alternate/30 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="md:flex-shrink-0 md:flex hidden items-center justify-center w-10 h-10 rounded-full bg-alternate text-white font-semibold text-lg">
              2
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <h3 className="font-exo font-semibold text-alternate text-lg sm:text-xl flex flex-wrap items-center gap-1">
                  Passo 2: Gerenciar
                  <span className="inline-flex items-center gap-1">
                    Certificado Digital
                    <InfoHint text={CERTIFICADO_DIGITAL_INFO_HINT} />
                  </span>
                </h3>
                {certificado && certificado.validadeCertificado && (() => {
                  const diasRestantes = calcularDiasRestantes(certificado.validadeCertificado)
                  const isExpiringSoon = diasRestantes !== null && diasRestantes <= 30
                  const isExpired = diasRestantes !== null && diasRestantes < 0

                  return (
                    <div
                      className={`inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium ${
                        isExpired
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : isExpiringSoon
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-green-50 text-green-800 border border-green-200'
                      }`}
                    >
                      <MdCheckCircle className="shrink-0" size={18} />
                      <span>
                        A1 · válido até {formatarData(certificado.validadeCertificado)}
                        {diasRestantes !== null && (
                          <>
                            {' '}
                            ({isExpired
                              ? 'expirado'
                              : `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`})
                          </>
                        )}
                      </span>
                    </div>
                  )
                })()}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-row items-center gap-3">
                    {certificado ? (
                      <Button
                        onClick={handleOpenConfirmRemover}
                        className="rounded-lg px-4 py-2.5 text-white text-sm font-medium flex-1 flex items-center justify-center gap-2"
                        disabled={isLoadingCertificado}
                        sx={{
                          backgroundColor: '#dc2626',
                          '&:hover': { backgroundColor: '#b91c1c' },
                          '&:disabled': { backgroundColor: '#fca5a5', cursor: 'not-allowed' },
                        }}
                      >
                        <MdDelete size={18} />
                        Remover Certificado
                      </Button>
                    ) : (
                      <Button
                        onClick={handleOpenCertificadoConfig}
                        className="rounded-lg px-4 py-2.5 text-white text-sm font-medium flex-1 flex items-center justify-center gap-2"
                        disabled={isLoadingCertificado}
                        sx={{
                          backgroundColor: (dadosCompletos === false || (dadosCompletos === null && !isVerificandoDados))
                            ? '#cbd5e1'
                            : 'var(--color-secondary)',
                          '&:hover': { 
                            backgroundColor: (dadosCompletos === false || (dadosCompletos === null && !isVerificandoDados))
                              ? '#cbd5e1'
                              : 'var(--color-alternate)' 
                          },
                          '&:disabled': { backgroundColor: '#cbd5e1', cursor: 'not-allowed' },
                          cursor: (dadosCompletos === false || (dadosCompletos === null && !isVerificandoDados))
                            ? 'not-allowed'
                            : 'pointer',
                        }}
                      >
                        <MdSettings size={18} />
                        {isLoadingCertificado ? 'Carregando...' : 'Cadastrar Certificado'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Passo 3: Chave IBPT */}
        <div className="flex flex-col gap-4 rounded-lg border-2 border-alternate/30 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="md:flex-shrink-0 md:flex hidden items-center justify-center w-10 h-10 rounded-full bg-alternate text-white font-semibold text-lg">
              3
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <h3 className="font-exo font-semibold text-alternate text-lg sm:text-xl flex flex-wrap items-center gap-1">
                  Passo 3: Chave
                  <span className="inline-flex items-center gap-1">
                    IBPT
                    <IbptInfoHint />
                  </span>
                </h3>
              </div>
              <Etapa5TabelaIbpt embedded />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
