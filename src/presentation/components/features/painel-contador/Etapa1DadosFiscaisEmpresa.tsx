'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Button } from '@/src/presentation/components/ui/button'
import { MdSettings, MdWarning, MdDelete } from 'react-icons/md'
import { CertificadoUploadModal } from './CertificadoUploadModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { showToast } from '@/src/shared/utils/toast'

export function Etapa1DadosFiscaisEmpresa() {
  const { addTab } = useTabsStore()
  const { auth, isRehydrated } = useAuthStore()
  const [certificado, setCertificado] = useState<any>(null)
  const [isLoadingCertificado, setIsLoadingCertificado] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  // Busca dados do certificado
  const loadCertificado = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingCertificado(true)
    try {
      const response = await fetch('/api/certificado', {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      const result = await response.json()
      
      // Se a resposta indica sucesso (mesmo que data seja null), não há erro
      if (result.success) {
        setCertificado(result.data) // Pode ser null se não houver certificado
      } else {
        // Apenas logar erro se for um erro real (não "não encontrado")
        console.error('Erro ao carregar certificado:', result.message)
        setCertificado(null)
      }
    } catch (error) {
      console.error('Erro ao carregar certificado:', error)
      setCertificado(null)
    } finally {
      setIsLoadingCertificado(false)
    }
  }, [auth])

  useEffect(() => {
    if (isRehydrated) {
      loadCertificado()
    }
  }, [isRehydrated, loadCertificado])

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
    setShowUploadModal(true)
  }

  const handleOpenConfirmRemover = () => {
    if (!certificado) return
    setShowConfirmModal(true)
  }

  const handleConfirmRemover = async () => {
    if (!certificado) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      setShowConfirmModal(false)
      return
    }

    setIsRemoving(true)
    const toastId = showToast.loading('Removendo certificado...')

    try {
      // UF não é mais necessária - uma empresa tem apenas UMA configuração por ambiente
      const response = await fetch(
        `/api/certificado?ambiente=${certificado.ambiente}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao remover certificado')
      }

      showToast.successLoading(toastId, 'Certificado removido com sucesso!')
      setShowConfirmModal(false)
      
      // Recarregar dados (agora não terá certificado)
      await loadCertificado()
    } catch (error: any) {
      console.error('Erro ao remover certificado:', error)
      showToast.errorLoading(toastId, error.message || 'Erro ao remover certificado')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleCertificadoSuccess = async () => {
    // Aguardar um pouco para garantir que o certificado foi salvo no banco
    await new Promise(resolve => setTimeout(resolve, 500))
    // Recarregar dados do certificado
    await loadCertificado()
  }

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

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="font-inter font-medium text-amber-800 text-sm">
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
      
      <div className="flex flex-col">
      {/* Seção: Dados Fiscais */}
      <div className="flex flex-row items-center justify-between gap-2">
        <h4 className="font-exo font-semibold text-primary text-sm md:text-base">
          Dados Fiscais da Empresa
        </h4>
        <div className="flex items-center justify-center p-2">
          <Button
            onClick={() => {
              addTab({
                id: 'config-empresa-completa',
                label: 'Configuração Completa',
                path: '/painel-contador/config/empresa-completa',
              })
            }}
            className="rounded-lg px-4 py-2 text-white text-sm font-medium flex items-center gap-2"
            sx={{
              backgroundColor: 'var(--color-secondary)',
              '&:hover': { backgroundColor: 'var(--color-alternate)' },
            }}
          >
            <MdSettings size={18} />
            Configurar
          </Button>
        </div>
      </div>
      {/* Seção: Certificado Digital */}
      <div className="flex flex-col gap-2">
        <h4 className="font-exo font-semibold text-primary text-sm md:text-base border-b border-primary/20 pb-1">
          Certificado Digital
        </h4>
        <div className="flex flex-col">
          <p className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
            {certificado 
              ? 'Certificado digital cadastrado e ativo' 
              : 'Cadastre o certificado digital da empresa e deixe sua comunicação com a SEFAZ funcionando'}
          </p>
          {certificado && (
            <div className="flex flex-col gap-1">
              <span className="font-inter font-bold text-secondary-text text-xs lg:text-sm">
                Tipo: A1
              </span>
              <span className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
                Validade: {certificado.validadeCertificado ? formatarData(certificado.validadeCertificado) : '--'}
              </span>
              <span className="font-inter font-medium text-secondary-text text-xs lg:text-sm">
                Ambiente: {certificado.ambiente === 'HOMOLOGACAO' ? 'Homologação' : 'Produção'}
              </span>
            </div>
          )}
          <div className="flex flex-row items-center gap-2">
            {certificado ? (
              <Button
                onClick={handleOpenConfirmRemover}
                className="rounded-lg px-3 py-2 text-white text-sm font-medium w-full"
                disabled={isLoadingCertificado}
                sx={{
                  backgroundColor: '#dc2626',
                  '&:hover': { backgroundColor: '#b91c1c' },
                }}
              >
                Remover Certificado
              </Button>
            ) : (
              <Button
                onClick={handleOpenCertificadoConfig}
                className="rounded-lg px-3 py-2 text-white text-sm font-medium w-full"
                disabled={isLoadingCertificado}
                sx={{
                  backgroundColor: 'var(--color-secondary)',
                  '&:hover': { backgroundColor: 'var(--color-alternate)' },
                }}
              >
                Cadastrar Certificado
              </Button>
            )}
            {certificado && certificado.validadeCertificado && (() => {
              const diasRestantes = calcularDiasRestantes(certificado.validadeCertificado)
              if (diasRestantes === null) return null
              
              const isExpiringSoon = diasRestantes <= 30
              const isExpired = diasRestantes < 0
              
              return (
                <span 
                  className={`font-medium text-sm rounded-lg px-3 py-2.5 w-full text-center ${
                    isExpired 
                      ? 'bg-[#ffa3a3] text-[#dd1717]' 
                      : isExpiringSoon 
                      ? 'bg-[#fff3cd] text-[#856404]' 
                      : 'bg-accent1 text-[#f6f8fc]'
                  }`}
                >
                  {isExpired 
                    ? 'Expirado' 
                    : `Expira em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`}
                </span>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
