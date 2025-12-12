'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  Checkbox,
  FormControlLabel,
  Button,
  IconButton,
  Divider,
  Grid,
} from '@mui/material'
import {
  MdClose,
  MdCloudUpload,
  MdAdd,
  MdSend,
  MdContentCopy,
  MdPersonOff,
  MdSettings,
  MdDelete,
  MdArrowForward,
  MdAccountBalance,
  MdReceipt,
  MdLocalShipping,
  MdBusiness,
  MdDescription,
  MdAssessment,
  MdPayment,
  MdAttachMoney,
  MdTrendingUp,
  MdCheckCircle,
} from 'react-icons/md'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'

/**
 * Componente principal da tela de Configuração de Impostos
 * Implementa a tela "Cenário de Impostos" conforme design
 */
export function ConfiguracaoImpostosView() {
  const { setActiveTab } = useTabsStore()
  const [tiposAtividade, setTiposAtividade] = useState({
    industria: true,
    comercioVarejista: true,
    comercioAtacadista: true,
    prestadorServico: true,
    construcaoCivil: true,
  })

  const handleToggleTipoAtividade = (tipo: keyof typeof tiposAtividade) => {
    setTiposAtividade((prev) => ({
      ...prev,
      [tipo]: !prev[tipo],
    }))
  }

  const categoriasImpostos: Array<{
    nome: string
    icon: React.ComponentType<{ size?: number }>
    color: string
  }> = [
    { nome: 'CFOP e Situação Tributária (CSOSN)', icon: MdDescription, color: '#530ca3' },
    { nome: 'IPI', icon: MdReceipt, color: '#7c3aed' },
    { nome: 'ICMS Interestadual (DIFAL)', icon: MdLocalShipping, color: '#a855f7' },
    { nome: 'Fundo de Combate à Pobreza (FCP)', icon: MdAttachMoney, color: '#c084fc' },
    { nome: 'ICMS (Simples Nacional)', icon: MdBusiness, color: '#530ca3' },
    { nome: 'ICMS ST (Substituição Tributária)', icon: MdTrendingUp, color: '#7c3aed' },
    { nome: 'Tabela do IBPT', icon: MdAssessment, color: '#a855f7' },
    { nome: 'Lançamentos de Ajuste de ICMS', icon: MdPayment, color: '#c084fc' },
    { nome: 'PIS', icon: MdReceipt, color: '#530ca3' },
    { nome: 'COFINS', icon: MdReceipt, color: '#7c3aed' },
    { nome: 'CF-e SAT e NFC-e', icon: MdDescription, color: '#a855f7' },
  ]

  const tiposAtividadeSelecionados = Object.values(tiposAtividade).filter(Boolean).length

  const acoesSidebar: Array<{
    label: string
    icon: React.ComponentType<{ size?: number }>
    showArrow?: boolean
  }> = [
    { label: 'Salvar', icon: MdCloudUpload },
    { label: 'Criar Cenário', icon: MdAdd },
    { label: 'Imprimir', icon: MdSend },
    { label: 'Copiar os Impostos de um NCM', icon: MdContentCopy },
    { label: 'Inativar', icon: MdPersonOff, showArrow: true },
    { label: 'Outras Recomendações', icon: MdSettings },
  ]

  const handleClose = () => {
    // Volta para a aba do Portal do Contador
    setActiveTab('painel-contador')
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f6f8fc',
      }}
    >
      {/* Header da Página */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #530ca3 0%, #7c3aed 100%)',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2.5, sm: 3, md: 4 },
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          boxShadow: '0 4px 6px rgba(83, 12, 163, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: { xs: 44, sm: 50, md: 56 },
              height: { xs: 44, sm: 50, md: 56 },
              borderRadius: { xs: '12px', sm: '14px' },
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              flexShrink: 0,
            }}
          >
            <MdAccountBalance size={24} color="#ffffff" style={{ fontSize: 'clamp(20px, 4vw, 28px)' }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontFamily: "'Exo 2', sans-serif",
                fontWeight: 700,
                fontSize: { xs: '20px', sm: '24px', md: '32px' },
                color: '#ffffff',
                mb: { xs: 0.25, sm: 0.5 },
                lineHeight: 1.2,
              }}
            >
              Cenário de Impostos
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                fontSize: { xs: '12px', sm: '13px', md: '15px' },
                color: 'rgba(255, 255, 255, 0.9)',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Configure os impostos e regras fiscais da sua empresa
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            width: { xs: 36, sm: 40 },
            height: { xs: 36, sm: 40 },
            flexShrink: 0,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
            },
          }}
        >
          <MdClose size={20} />
        </IconButton>
      </Box>

      {/* Conteúdo Principal */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          overflow: 'auto',
          gap: { xs: 2, sm: 2.5, md: 3 },
          p: { xs: 2, sm: 2.5, md: 3, lg: 4 },
        }}
      >
        {/* Área Principal */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 2.5, md: 3 },
            minWidth: 0,
            maxWidth: { lg: '1000px' },
          }}
        >
          {/* Card: Nome do Cenário */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3, md: 4 },
              borderRadius: { xs: '16px', sm: '20px' },
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #530ca3 0%, #7c3aed 100%)',
              },
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'flex-start' },
              justifyContent: 'space-between', 
              gap: { xs: 1.5, sm: 2 },
              mb: { xs: 0, sm: 2 },
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: { xs: '11px', sm: '12px' },
                    color: '#6b7280',
                    mb: { xs: 1, sm: 1.5 },
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Nome deste Cenário Fiscal
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontWeight: 700,
                    fontSize: { xs: '22px', sm: '28px', md: '36px' },
                    color: '#1f2937',
                    mb: { xs: 0.5, sm: 1 },
                    lineHeight: 1.2,
                  }}
                >
                  Padrão
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    fontSize: { xs: '13px', sm: '14px', md: '15px' },
                    color: '#6b7280',
                  }}
                >
                  Este é o cenário fiscal padrão de impostos
                </Typography>
              </Box>
              <Box
                sx={{
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.75, sm: 1 },
                  borderRadius: { xs: '16px', sm: '20px' },
                  backgroundColor: '#adde0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  alignSelf: { xs: 'flex-start', sm: 'flex-start' },
                  mt: { xs: 1, sm: 0 },
                }}
              >
                <MdCheckCircle size={16} color="#1f2937" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }} />
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: { xs: '12px', sm: '13px' },
                    color: '#1f2937',
                  }}
                >
                  Ativo
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Card: Tipos de Atividade */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3, md: 4 },
              borderRadius: { xs: '16px', sm: '20px' },
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between', 
              gap: { xs: 1.5, sm: 2 },
              mb: { xs: 2, sm: 2.5, md: 3 },
            }}>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: { xs: '16px', sm: '18px', md: '20px' },
                  color: '#1f2937',
                  flex: 1,
                  lineHeight: 1.3,
                }}
              >
                Se aplica aos clientes com os seguintes Tipos de Atividade
              </Typography>
              <Box
                sx={{
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.5, sm: 0.75 },
                  borderRadius: { xs: '12px', sm: '16px' },
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: { xs: '12px', sm: '13px', md: '14px' },
                    color: '#530ca3',
                  }}
                >
                  {tiposAtividadeSelecionados} selecionados
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: { xs: 1.5, sm: 2, md: 2.5 },
              }}
            >
              {[
                { key: 'industria', label: 'Indústria' },
                { key: 'comercioVarejista', label: 'Comércio (Varejista)' },
                { key: 'comercioAtacadista', label: 'Comércio (Atacadista)' },
                { key: 'prestadorServico', label: 'Prestador de Serviço' },
                { key: 'construcaoCivil', label: 'Construção Civil' },
              ].map((tipo) => {
                const isChecked = tiposAtividade[tipo.key as keyof typeof tiposAtividade]
                return (
                  <Box
                    key={tipo.key}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: { xs: '10px', sm: '12px' },
                      border: `2px solid ${isChecked ? '#530ca3' : '#e5e7eb'}`,
                      backgroundColor: isChecked ? '#f9f5ff' : '#ffffff',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#530ca3',
                        backgroundColor: '#f9f5ff',
                      },
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isChecked}
                          onChange={() =>
                            handleToggleTipoAtividade(tipo.key as keyof typeof tiposAtividade)
                          }
                          size="small"
                          sx={{
                            color: '#530ca3',
                            '&.Mui-checked': {
                              color: '#530ca3',
                            },
                          }}
                        />
                      }
                      label={
                        <Typography
                          sx={{
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 500,
                            fontSize: { xs: '13px', sm: '14px', md: '15px' },
                            color: '#374151',
                            lineHeight: 1.4,
                          }}
                        >
                          {tipo.label}
                        </Typography>
                      }
                    />
                  </Box>
                )
              })}
            </Box>
          </Card>

          {/* Card: Categorias de Impostos */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3, md: 4 },
              borderRadius: { xs: '16px', sm: '20px' },
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: { xs: '16px', sm: '18px', md: '20px' },
                color: '#1f2937',
                mb: { xs: 2, sm: 2.5, md: 3 },
              }}
            >
              Categorias de Impostos
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
              {categoriasImpostos.map((categoria) => {
                const Icon = categoria.icon
                return (
                  <Grid item xs={12} sm={6} md={4} key={categoria.nome}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Icon size={18} color={categoria.color} style={{ fontSize: 'clamp(16px, 3vw, 20px)' }} />}
                      sx={{
                        borderColor: categoria.color,
                        borderWidth: '2px',
                        color: '#1f2937',
                        backgroundColor: '#ffffff',
                        py: { xs: 2, sm: 2.5, md: 3 },
                        px: { xs: 2, sm: 2.5 },
                        textTransform: 'none',
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontSize: { xs: '12px', sm: '13px', md: '14px' },
                        borderRadius: { xs: '12px', sm: '14px' },
                        minHeight: { xs: '80px', sm: '90px', md: '100px' },
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: { xs: 1, sm: 1.5 },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          borderColor: categoria.color,
                          backgroundColor: '#f9f5ff',
                          borderWidth: '2px',
                          transform: { xs: 'translateY(-2px)', sm: 'translateY(-4px)' },
                          boxShadow: `0 8px 20px ${categoria.color}25`,
                        },
                      }}
                    >
                      {categoria.nome}
                    </Button>
                  </Grid>
                )
              })}
            </Grid>
          </Card>
        </Box>

        {/* Sidebar Direita */}
        <Box
          sx={{
            width: { xs: '100%', lg: '320px' },
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 2.5, md: 3 },
            flexShrink: 0,
          }}
        >
          {/* Card: Informações da Empresa */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3, md: 3.5 },
              borderRadius: { xs: '16px', sm: '20px' },
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, mb: { xs: 2, sm: 2.5, md: 3 } }}>
              <Box
                sx={{
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  borderRadius: { xs: '8px', sm: '10px' },
                  backgroundColor: '#530ca3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MdBusiness size={18} color="#ffffff" style={{ fontSize: 'clamp(16px, 3vw, 20px)' }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: { xs: '16px', sm: '17px', md: '18px' },
                  color: '#1f2937',
                }}
              >
                Sua Empresa
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 1.5 } }}>
              <Box>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: { xs: '11px', sm: '12px' },
                    color: '#6b7280',
                    mb: 0.5,
                  }}
                >
                  Razão Social
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: { xs: '13px', sm: '14px' },
                    color: '#1f2937',
                    wordBreak: 'break-word',
                  }}
                >
                  COZINHA SABOR 67 LTDA
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: { xs: '11px', sm: '12px' },
                    color: '#6b7280',
                    mb: 0.5,
                  }}
                >
                  CNPJ
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: { xs: '13px', sm: '14px' },
                    color: '#1f2937',
                  }}
                >
                  51.547.686/0001-76
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: { xs: '11px', sm: '12px' },
                    color: '#6b7280',
                    mb: 0.5,
                  }}
                >
                  Regime Tributário
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: { xs: '13px', sm: '14px' },
                    color: '#1f2937',
                  }}
                >
                  Simples Nacional
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: { xs: '11px', sm: '12px' },
                    color: '#6b7280',
                    mb: 0.5,
                  }}
                >
                  Localização
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: { xs: '13px', sm: '14px' },
                    color: '#1f2937',
                  }}
                >
                  Campo Grande (MS)
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Card: Ações */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3, md: 3.5 },
              borderRadius: { xs: '16px', sm: '20px' },
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, mb: { xs: 2, sm: 2.5, md: 3 } }}>
              <Box
                sx={{
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  borderRadius: { xs: '8px', sm: '10px' },
                  backgroundColor: '#530ca3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MdSettings size={18} color="#ffffff" style={{ fontSize: 'clamp(16px, 3vw, 20px)' }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: { xs: '16px', sm: '17px', md: '18px' },
                  color: '#1f2937',
                }}
              >
                Ações
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.75, sm: 1 } }}>
              {acoesSidebar.map((acao, index) => {
                const Icon = acao.icon
                return (
                  <Button
                    key={index}
                    startIcon={
                      acao.showArrow ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MdArrowForward size={16} />
                          <Icon size={18} />
                        </Box>
                      ) : (
                        <Icon size={18} />
                      )
                    }
                    variant="outlined"
                    fullWidth
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      color: '#374151',
                      borderColor: '#e5e7eb',
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 500,
                      fontSize: { xs: '12px', sm: '13px', md: '14px' },
                      py: { xs: 1.25, sm: 1.5, md: 1.75 },
                      px: { xs: 2, sm: 2.25, md: 2.5 },
                      borderRadius: { xs: '10px', sm: '12px' },
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: '#f9f5ff',
                        borderColor: '#530ca3',
                        transform: { xs: 'translateX(2px)', sm: 'translateX(4px)' },
                      },
                    }}
                  >
                    {acao.label}
                  </Button>
                )
              })}
            </Box>

            <Divider sx={{ my: { xs: 2, sm: 2.5 } }} />

            {/* Ação Excluir */}
            <Button
              startIcon={<MdDelete size={16} style={{ fontSize: 'clamp(14px, 2vw, 18px)' }} />}
              variant="outlined"
              fullWidth
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                color: '#dc2626',
                borderColor: '#fecaca',
                backgroundColor: '#fef2f2',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: { xs: '12px', sm: '13px', md: '14px' },
                py: { xs: 1.25, sm: 1.5 },
                px: { xs: 2, sm: 2.25 },
                borderRadius: { xs: '10px', sm: '12px' },
                '&:hover': {
                  backgroundColor: '#fee2e2',
                  borderColor: '#fca5a5',
                },
              }}
            >
              Excluir
            </Button>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}


