'use client'

import { useEffect } from 'react'
import { Box, Typography, Card } from '@mui/material'
import { MdCheckCircle } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { ConfiguracaoImpostosView } from '@/src/presentation/components/features/impostos/ConfiguracaoImpostosView'

/**
 * Portal do Contador - Design do Figma
 * Implementação fiel ao design fornecido
 * As abas "Portal do Contador" e "Impostos" são gerenciadas pelo sistema de tabs existente
 * Renderiza conteúdo condicionalmente baseado na aba ativa (estilo SPA)
 */
export default function PainelContadorPage() {
  const { addTab, activeTabId, setActiveTab: setActiveTabStore } = useTabsStore()

  // Adiciona aba principal ao montar (se não existir)
  useEffect(() => {
    addTab({
      id: 'painel-contador',
      label: 'Portal do Contador',
      path: '/painel-contador',
      isFixed: true,
    })
  }, [addTab])

  // Sincroniza aba ativa com store
  useEffect(() => {
    if (activeTabId === 'painel-contador') {
      setActiveTabStore('painel-contador')
    }
  }, [activeTabId, setActiveTabStore])

  // Renderiza conteúdo condicionalmente baseado na aba ativa
  if (activeTabId === 'impostos') {
    return <ConfiguracaoImpostosView />
  }

  const handleOpenCertificadoConfig = () => {
    addTab({
      id: 'config-certificado',
      label: 'Configurar Certificado',
      path: '/painel-contador/config/certificado',
    })
  }

  const handleOpenNCMConfig = () => {
    addTab({
      id: 'config-ncm-cest',
      label: 'Configurar NCM/CEST',
      path: '/painel-contador/config/ncm-cest',
    })
  }

  const handleOpenImpostosConfig = () => {
    addTab({
      id: 'impostos',
      label: 'Impostos',
      path: '/painel-contador/impostos',
      isFixed: false, // Permite fechar a aba
    })
  }

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        backgroundColor: '#f6f8fc',
        position: 'relative',
        overflow: { xs: 'auto', lg: 'hidden' },
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: { xs: 0, lg: 0 },
        alignItems: { xs: 'stretch', lg: 'flex-start' },
      }}
    >
        {/* Painel Esquerdo - Roxo */}
        <Box
          sx={{
            width: { xs: '100%', lg: '65%' },
            maxWidth: { lg: '1030px' },
            minHeight: { xs: 'auto', lg: '100%' },
            height: { xs: 'auto', lg: '100%' },
            backgroundColor: '#530ca3',
            borderBottomRightRadius: { xs: 0, lg: '48px' },
            borderTopRightRadius: { xs: 0, lg: '48px' },
            position: 'relative',
            overflow: { xs: 'visible', lg: 'auto' },
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 2, sm: 2.5, md: 3, lg: 4 },
            flexShrink: 0,
          }}
        >
          {/* Seção Superior com Título e Ilustração - Portal do Contador */}
          <Box
            sx={{
              height: { xs: 'auto', sm: '280px', md: '320px', lg: '370px' },
              minHeight: { xs: '240px', sm: '280px', md: '320px', lg: '370px' },
              backgroundColor: 'rgba(131, 56, 236, 0.4)',
              borderBottom: '1px solid #330468',
              borderTopRightRadius: { xs: '16px', sm: '24px', md: '32px', lg: '48px' },
              position: 'relative',
              overflow: { xs: 'visible', lg: 'hidden' },
              pb: { xs: 3, sm: 0 },
              flexShrink: 0,
            }}
          >
            {/* Ilustração do robô Jiffy - Esquerda, Topo */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: { xs: '30%', sm: '35%', md: '38%', lg: '319px' },
                maxWidth: '319px',
                height: { xs: 'auto', lg: '319px' },
                aspectRatio: '1/1',
                zIndex: 1,
              }}
            >
              <img
                src="http://localhost:3845/assets/7e0683d45238ab4ed1d4af3c78b6984b4e31be58.png"
                alt="Jiffy Contador"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'left top',
                }}
              />
            </Box>

            {/* Group 29 - Título e Informações da Empresa */}
            <Box
              sx={{
                position: { xs: 'relative', lg: 'absolute' },
                left: { lg: '357px' },
                top: { lg: '0px' },
                zIndex: 2,
                width: { xs: 'calc(100% - 32%)', sm: '60%', md: '55%', lg: '574px' },
                height: { xs: 'auto', lg: '274px' },
                ml: { xs: '32%', sm: '38%', md: '42%', lg: 0 },
                mt: { xs: 1, sm: 0 },
                pr: { xs: 1, sm: 0 },
              }}
            >
              {/* Título "Portal do Contador" */}
              <Typography
                sx={{
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 700,
                  fontSize: { xs: 'clamp(20px, 5vw, 28px)', sm: 'clamp(24px, 4.5vw, 36px)', md: 'clamp(28px, 5vw, 44px)', lg: '70px' },
                  color: '#ffffff',
                  letterSpacing: '-0.7px',
                  lineHeight: { xs: '1.2', md: '1.1', lg: '60px' },
                  width: { xs: '100%', lg: '326px' },
                  height: { xs: 'auto', lg: '135px' },
                  mb: { xs: 1.5, sm: 2, md: 2.5, lg: 0 },
                }}
              >
                Portal do Contador
              </Typography>

              {/* Informações da Empresa - Alinhadas à esquerda, abaixo do título */}
              <Box
                sx={{
                  mt: { xs: 1.5, sm: 2, md: 2.5, lg: '167px' },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5 },
                }}
              >
                {/* Empresa */}
                <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 0.25, sm: 0.75, md: 1 }, flexWrap: 'wrap' }}>
                  <Typography
                    sx={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontWeight: 600,
                      fontSize: { xs: 'clamp(11px, 2.2vw, 14px)', sm: 'clamp(12px, 2.5vw, 16px)', md: 'clamp(14px, 3vw, 18px)', lg: '32px' },
                      color: '#f6f8fc',
                      letterSpacing: '-0.32px',
                      lineHeight: { xs: '1.4', md: '1.3', lg: '30px' },
                      flexShrink: 0,
                    }}
                  >
                    Empresa:
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontWeight: 400,
                      fontSize: { xs: 'clamp(11px, 2.2vw, 14px)', sm: 'clamp(12px, 2.5vw, 16px)', md: 'clamp(14px, 3vw, 18px)', lg: '32px' },
                      color: '#f6f8fc',
                      letterSpacing: '-0.32px',
                      lineHeight: { xs: '1.4', md: '1.3', lg: '30px' },
                      wordBreak: 'break-word',
                    }}
                  >
                    Nexsyn Soluções Inteligentes
                  </Typography>
                </Box>

                {/* CNPJ */}
                <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 0.25, sm: 0.75, md: 1 }, flexWrap: 'wrap' }}>
                  <Typography
                    sx={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontWeight: 500,
                      fontSize: { xs: 'clamp(11px, 2.2vw, 14px)', sm: 'clamp(12px, 2.5vw, 16px)', md: 'clamp(14px, 3vw, 18px)', lg: '32px' },
                      color: '#f6f8fc',
                      letterSpacing: '-0.32px',
                      lineHeight: { xs: '1.4', md: '1.3', lg: '30px' },
                      flexShrink: 0,
                    }}
                  >
                    CNPJ:
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontWeight: 400,
                      fontSize: { xs: 'clamp(11px, 2.2vw, 14px)', sm: 'clamp(12px, 2.5vw, 16px)', md: 'clamp(14px, 3vw, 18px)', lg: '32px' },
                      color: '#f6f8fc',
                      letterSpacing: '-0.32px',
                      lineHeight: { xs: '1.4', md: '1.3', lg: '30px' },
                      wordBreak: 'break-word',
                    }}
                  >
                    45.628.098/0001-64
                  </Typography>
                </Box>

                {/* Regime */}
                <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 0.25, sm: 0.75, md: 1 }, flexWrap: 'wrap' }}>
                  <Typography
                    sx={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontWeight: 500,
                      fontSize: { xs: 'clamp(11px, 2.2vw, 14px)', sm: 'clamp(12px, 2.5vw, 16px)', md: 'clamp(14px, 3vw, 18px)', lg: '32px' },
                      color: '#f6f8fc',
                      letterSpacing: '-0.32px',
                      lineHeight: { xs: '1.4', md: '1.3', lg: '30px' },
                      flexShrink: 0,
                    }}
                  >
                    Regime:
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontWeight: 400,
                      fontSize: { xs: 'clamp(11px, 2.2vw, 14px)', sm: 'clamp(12px, 2.5vw, 16px)', md: 'clamp(14px, 3vw, 18px)', lg: '32px' },
                      color: '#f6f8fc',
                      letterSpacing: '-0.32px',
                      lineHeight: { xs: '1.4', md: '1.3', lg: '30px' },
                      wordBreak: 'break-word',
                    }}
                  >
                    Simples Nacional
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Indicadores de paginação */}
            <Box
              sx={{
                position: { xs: 'relative', lg: 'absolute' },
                bottom: { lg: '20px' },
                left: { lg: '50%' },
                transform: { lg: 'translateX(-50%)' },
                display: 'flex',
                gap: { xs: 0.75, sm: 1 },
                zIndex: 2,
                justifyContent: { xs: 'center', lg: 'flex-start' },
                mt: { xs: 2, lg: 0 },
                mb: { xs: 1, lg: 0 },
              }}
            >
              {/* Dot ativo */}
              <Box
                sx={{
                  width: { xs: '8px', sm: '9px', lg: '10px' },
                  height: { xs: '8px', sm: '9px', lg: '10px' },
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                }}
              />
              {/* Dots inativos */}
              {[1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: { xs: '8px', sm: '9px', lg: '10px' },
                    height: { xs: '8px', sm: '9px', lg: '10px' },
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'transparent',
                  }}
                />
              ))}
            </Box>
          </Box>


          {/* Barra de Progresso */}
          <Box sx={{ mt: { xs: 2, sm: 2.5, md: 3, lg: 4 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography
              sx={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: { xs: 'clamp(12px, 2.5vw, 16px)', sm: 'clamp(14px, 3vw, 18px)', md: 'clamp(16px, 3.5vw, 22px)', lg: '24px' },
                color: '#ffffff',
                letterSpacing: '-0.32px',
                lineHeight: { xs: '1.4', md: '1.3' },
                mb: { xs: 1.5, sm: 1.75, md: 2 },
                wordBreak: 'break-word',
              }}
            >
              Configuração Contábil: 3 de 5 Etapas concluídas
            </Typography>

            {/* Barra de progresso */}
            <Box
              sx={{
                width: '100%',
                maxWidth: { lg: '947px' },
                height: { xs: '18px', sm: '20px', md: '22px', lg: '26px' },
                backgroundColor: '#f5f8fa',
                borderRadius: '18.5px',
                position: 'relative',
                overflow: 'hidden',
                mb: { xs: 2, sm: 2.25, md: 2.5, lg: 3 },
              }}
            >
              <Box
                sx={{
                  width: '60%',
                  maxWidth: { lg: '422px' },
                  height: '100%',
                  backgroundColor: '#adde0b',
                  borderRadius: '18.5px',
                }}
              />
            </Box>

            {/* Lista de etapas concluídas */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5 } }}>
              {[
                'Certificado Cadastrado',
                'Regime Tributário Definido',
                'Mapeamento dos NCMs',
              ].map((etapa, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 0.75 } }}>
                  <MdCheckCircle
                    style={{
                      color: '#ffffff',
                      fontSize: 'clamp(16px, 2vw, 20px)',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: "'Manrope', sans-serif",
                      fontWeight: 700,
                      fontSize: { xs: 'clamp(11px, 2.2vw, 14px)', sm: 'clamp(12px, 2.5vw, 16px)', md: 'clamp(14px, 3vw, 16px)', lg: '18px' },
                      color: '#ffffff',
                      letterSpacing: '-0.2px',
                      lineHeight: { xs: '1.4', md: '1.3' },
                    }}
                  >
                    {etapa}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Painel Direito - Cards */}
        <Box
          sx={{
            width: { xs: '100%', lg: '35%' },
            maxWidth: { lg: '780px' },
            minHeight: { xs: 'auto', lg: '100%' },
            height: { xs: 'auto', lg: '100%' },
            p: { xs: 2, sm: 2.5, md: 3, lg: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 2.5, md: 3 },
            overflow: { xs: 'visible', lg: 'auto' },
            flexShrink: 0,
          }}
        >
          {/* Card: Configurar Certificado Digital */}
          <Card
            sx={{
              minHeight: { xs: 'auto', lg: '180px' },
              width: '100%',
              p: { xs: 2, sm: 2.25, md: 2.5, lg: 3 },
              borderRadius: { xs: '16px', sm: '20px', lg: '24px' },
              border: '1px solid #2967ec',
              backgroundColor: '#f6f8fc',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Exo 2', sans-serif",
                fontWeight: 500,
                fontSize: { xs: 'clamp(14px, 3vw, 18px)', sm: 'clamp(16px, 3.5vw, 20px)', md: 'clamp(18px, 4vw, 22px)', lg: '24px' },
                color: '#2b2b2b',
                letterSpacing: '-0.56px',
                lineHeight: { xs: '1.3', md: '1.2' },
                mb: { xs: 1.5, sm: 1.75, md: 2 },
                textAlign: 'center',
              }}
            >
              Configurar Certificado Digital
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: { xs: 'clamp(12px, 2.5vw, 14px)', sm: 'clamp(13px, 2.8vw, 15px)', md: 'clamp(14px, 3vw, 17px)', lg: '18px' },
                color: '#4b5563',
                letterSpacing: '-0.22px',
                lineHeight: { xs: '1.5', md: '1.4' },
                mb: { xs: 1.5, sm: 2, md: 2.5 },
                width: '100%',
                maxWidth: { lg: '556px' },
              }}
            >
              Cadastre o certificado digital da empresa e deixe sua comunicação com a SEFAZ funcionando
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: { xs: 1.5, sm: 2, md: 2.5 } }}>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: { xs: 'clamp(11px, 2.2vw, 13px)', md: '14px' },
                  color: '#4b5563',
                  letterSpacing: '-0.15px',
                  lineHeight: { xs: '1.5', md: '1.4' },
                }}
              >
                Tipo: A1
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: { xs: 'clamp(11px, 2.2vw, 13px)', md: '14px' },
                  color: '#4b5563',
                  letterSpacing: '-0.15px',
                  lineHeight: { xs: '1.5', md: '1.4' },
                }}
              >
                Validade: 22/12/2025
              </Typography>
            </Box>

            {/* Badge de expiração */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                height: { xs: '22px', sm: '24px', lg: '26px' },
                px: { xs: 1.5, sm: 1.75, md: 2 },
                py: 0.5,
                backgroundColor: '#adde0b',
                borderRadius: '10px',
                mb: { xs: 1.5, sm: 2, md: 2.5 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: { xs: 'clamp(10px, 2vw, 12px)', sm: 'clamp(11px, 2.2vw, 13px)', lg: '14px' },
                  color: '#f6f8fc',
                  letterSpacing: '-0.15px',
                  lineHeight: { xs: '1.4', md: '1.3' },
                }}
              >
                Expira em 27 dias
              </Typography>
            </Box>

            <Button 
              onClick={handleOpenCertificadoConfig}
              variant="contained"
              sx={{
                backgroundColor: '#530ca3',
                color: '#ffffff',
                borderRadius: '48px',
                height: { xs: '36px', sm: '38px', lg: '40px' },
                width: { xs: '100%', sm: 'auto', lg: '170px' },
                px: { xs: 2.5, sm: 3, lg: 3 },
                py: 0.5,
                textTransform: 'none',
                fontSize: { xs: '12px', sm: '13px', lg: '14px' },
                fontWeight: 500,
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                '&:hover': {
                  backgroundColor: '#430a83',
                },
              }}
            >
              Cadastrar Certificado
            </Button>
          </Card>

          {/* Card: Mapear NCM, Cest e CFOP */}
          <Card
            sx={{
              minHeight: { xs: 'auto', lg: '180px' },
              width: '100%',
              p: { xs: 2, sm: 2.25, md: 2.5, lg: 3 },
              borderRadius: { xs: '16px', sm: '20px', lg: '24px' },
              border: '1px solid #2967ec',
              backgroundColor: '#f6f8fc',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Exo 2', sans-serif",
                fontWeight: 500,
                fontSize: { xs: 'clamp(14px, 3vw, 18px)', sm: 'clamp(16px, 3.5vw, 20px)', md: 'clamp(18px, 4vw, 22px)', lg: '24px' },
                color: '#2b2b2b',
                letterSpacing: '-0.56px',
                lineHeight: { xs: '1.3', md: '1.2' },
                mb: { xs: 1.5, sm: 1.75, md: 2 },
                textAlign: 'center',
              }}
            >
              Mapear NCM, Cest e CFOP
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: { xs: 'clamp(12px, 2.5vw, 14px)', sm: 'clamp(13px, 2.8vw, 15px)', md: 'clamp(14px, 3vw, 17px)', lg: '18px' },
                color: '#4b5563',
                letterSpacing: '-0.22px',
                lineHeight: { xs: '1.5', md: '1.4' },
                mb: { xs: 1.5, sm: 2, md: 2.5 },
                width: '100%',
                maxWidth: { lg: '438px' },
              }}
            >
              Classifique produtos para que notas e impostos sejam calculados corretamente
            </Typography>

            {/* Badge de produtos pendentes */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                height: { xs: '26px', sm: '28px', lg: '30px' },
                px: { xs: 1.5, sm: 1.75, md: 2 },
                py: 0.5,
                backgroundColor: '#ffa3a3',
                borderRadius: '48px',
                mb: { xs: 1.5, sm: 2, md: 2.5, lg: 3 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: { xs: '11px', sm: '12px' },
                  color: '#dd1717',
                  letterSpacing: '-0.12px',
                  lineHeight: { xs: '1.4', md: '26px' },
                }}
              >
                8 PRODUTOS PENDENTES
              </Typography>
            </Box>

            <Button 
              onClick={handleOpenNCMConfig}
              variant="contained"
              sx={{
                backgroundColor: '#530ca3',
                color: '#ffffff',
                borderRadius: '48px',
                height: { xs: '36px', sm: '38px', lg: '40px' },
                width: { xs: '100%', sm: 'auto', lg: '170px' },
                px: { xs: 2.5, sm: 3, lg: 3 },
                py: 0.5,
                textTransform: 'none',
                fontSize: { xs: '12px', sm: '13px', lg: '14px' },
                fontWeight: 500,
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                '&:hover': {
                  backgroundColor: '#430a83',
                },
              }}
            >
              Mapear Produtos
            </Button>
          </Card>

          {/* Card: Configurar Impostos */}
          <Card
            sx={{
              minHeight: { xs: 'auto', lg: '180px' },
              width: '100%',
              p: { xs: 2, sm: 2.25, md: 2.5, lg: 3 },
              borderRadius: { xs: '16px', sm: '20px', lg: '24px' },
              border: '1px solid #2967ec',
              backgroundColor: '#f6f8fc',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Exo 2', sans-serif",
                fontWeight: 500,
                fontSize: { xs: 'clamp(14px, 3vw, 18px)', sm: 'clamp(16px, 3.5vw, 20px)', md: 'clamp(18px, 4vw, 22px)', lg: '24px' },
                color: '#2b2b2b',
                letterSpacing: '-0.56px',
                lineHeight: { xs: '1.3', md: '1.2' },
                mb: { xs: 1.5, sm: 1.75, md: 2 },
                textAlign: 'center',
              }}
            >
              Configurar Impostos
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: { xs: 'clamp(12px, 2.5vw, 14px)', sm: 'clamp(13px, 2.8vw, 15px)', md: 'clamp(14px, 3vw, 17px)', lg: '18px' },
                color: '#4b5563',
                letterSpacing: '-0.22px',
                lineHeight: { xs: '1.5', md: '1.4' },
                mb: { xs: 1.5, sm: 2, md: 2.5 },
                width: '100%',
                maxWidth: { lg: '556px' },
              }}
            >
              Configure os cenários fiscais e defina as regras de impostos para sua empresa
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: { xs: 1.5, sm: 2, md: 2.5 } }}>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: { xs: 'clamp(11px, 2.2vw, 13px)', md: '14px' },
                  color: '#4b5563',
                  letterSpacing: '-0.15px',
                  lineHeight: { xs: '1.5', md: '1.4' },
                }}
              >
                Cenário: Padrão
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: { xs: 'clamp(11px, 2.2vw, 13px)', md: '14px' },
                  color: '#4b5563',
                  letterSpacing: '-0.15px',
                  lineHeight: { xs: '1.5', md: '1.4' },
                }}
              >
                Status: Ativo
              </Typography>
            </Box>

            {/* Badge de status */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                height: { xs: '22px', sm: '24px', lg: '26px' },
                px: { xs: 1.5, sm: 1.75, md: 2 },
                py: 0.5,
                backgroundColor: '#adde0b',
                borderRadius: '10px',
                mb: { xs: 1.5, sm: 2, md: 2.5 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: { xs: 'clamp(10px, 2vw, 12px)', sm: 'clamp(11px, 2.2vw, 13px)', lg: '14px' },
                  color: '#f6f8fc',
                  letterSpacing: '-0.15px',
                  lineHeight: { xs: '1.4', md: '1.3' },
                }}
              >
                Configurado
              </Typography>
            </Box>

            <Button
              onClick={handleOpenImpostosConfig}
              variant="contained"
              sx={{
                backgroundColor: '#530ca3',
                color: '#ffffff',
                borderRadius: '48px',
                height: { xs: '36px', sm: '38px', lg: '40px' },
                width: { xs: '100%', sm: 'auto', lg: '170px' },
                px: { xs: 2.5, sm: 3, lg: 3 },
                py: 0.5,
                textTransform: 'none',
                fontSize: { xs: '12px', sm: '13px', lg: '14px' },
                fontWeight: 500,
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                '&:hover': {
                  backgroundColor: '#430a83',
                },
              }}
            >
              Configurar Impostos
            </Button>
          </Card>
        </Box>
    </Box>
  )
}
