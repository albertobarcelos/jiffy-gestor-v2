'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'; // Importa os ícones
import { Skeleton, FormControl, Select, MenuItem, FormGroup, FormControlLabel, Checkbox, Popover } from '@mui/material'
import { motion } from 'framer-motion'; // Importar motion do Framer Motion
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto' // Importar a entidade
import { EscolheDatasModal } from '@/src/presentation/components/features/vendas/EscolheDatasModal'
import { MdCalendarToday } from 'react-icons/md'

// Função para obter o label do período
const getPeriodoLabel = (periodo: string, dataInicial?: Date | null, dataFinal?: Date | null): string => {
  if (periodo === 'Datas Personalizadas' && dataInicial && dataFinal) {
    const formatDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${day}/${month}/${year} ${hours}:${minutes}`
    }
    return `${formatDate(dataInicial)} - ${formatDate(dataFinal)}`
  }
  
  switch (periodo) {
    case 'Todos':
      return 'Todos os Períodos';
    case 'Hoje':
      return 'Hoje';
    case 'Mês Atual':
      return 'Mês Atual';
    case 'Últimos 7 Dias':
      return 'Últimos 7 Dias';
    case 'Últimos 30 Dias':
      return 'Últimos 30 Dias';
    case 'Últimos 60 Dias':
      return 'Últimos 60 Dias';
    case 'Últimos 90 Dias':
      return 'Últimos 90 Dias';
    case 'Datas Personalizadas':
      return 'Datas Personalizadas';
    default:
      return 'Período Desconhecido';
  }
};

// Variantes para animação de fade-in e slide-up
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Atraso entre os itens filhos
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

const slideFromLeftVariants = {
  hidden: { x: -100, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.7 } }, // Removido 'ease' para compatibilidade de tipo
};

const slideFromRightVariants = {
  hidden: { x: 100, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.7 } }, // Removido 'ease' para compatibilidade de tipo
};

// Dynamic imports para code-splitting
const MetricCards = dynamic(
  () => import('@/src/presentation/components/features/dashboard/MetricCards').then((mod) => ({ default: mod.MetricCards })),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={80} className="rounded-lg" />
        ))}
      </div>
    ),
  }
);

const GraficoVendasLinha = dynamic(
  () => import('@/src/presentation/components/features/dashboard/GraficoVendasLinha').then((mod) => ({ default: mod.GraficoVendasLinha })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={300} />,
  }
);

const TabelaTopProdutos = dynamic(
  () => import('@/src/presentation/components/features/dashboard/TabelaTopProdutos').then((mod) => ({ default: mod.TabelaTopProdutos })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={400} />,
  }
);

const GraficoTopProdutos = dynamic(
  () => import('@/src/presentation/components/features/dashboard/GraficoTopProdutos').then((mod) => ({ default: mod.GraficoTopProdutos })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={400} className="rounded-xl" />,
  }
);

const GraficoTopProdutosValor = dynamic(
  () => import('@/src/presentation/components/features/dashboard/GraficoTopProdutosValor').then((mod) => ({ default: mod.GraficoTopProdutosValor })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={400} className="rounded-xl" />,
  }
);

const UltimasVendas = dynamic(
  () => import('@/src/presentation/components/features/dashboard/UltimasVendas').then((mod) => ({ default: mod.UltimasVendas })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={600} className="rounded-xl" />,
  }
);

/**
 * Página do dashboard
 * Otimizada com code-splitting e Suspense
 */
export default function DashboardPage() {
  const [periodo, setPeriodo] = useState('Últimos 7 Dias'); // Estado para o período
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['FINALIZADA']); // Estado para os status selecionados
  const [topProdutosData, setTopProdutosData] = useState<DashboardTopProduto[]>([]); // Novo estado para os top produtos
  const [periodoInicial, setPeriodoInicial] = useState<Date | null>(null); // Estado para data inicial personalizada
  const [periodoFinal, setPeriodoFinal] = useState<Date | null>(null); // Estado para data final personalizada
  const [isDatasModalOpen, setIsDatasModalOpen] = useState(false); // Estado para controlar o modal de datas
  const [intervaloHora, setIntervaloHora] = useState<number>(30); // Estado para intervalo de tempo (15, 30 ou 60 minutos)
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null); // Ref para posicionar o popover

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartRef = useRef(0);

  const getPageX = (event: React.MouseEvent | React.TouchEvent) =>
    'touches' in event ? event.touches[0].pageX : event.pageX;

  const handleDragStart = (event: React.MouseEvent | React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    dragStartXRef.current = getPageX(event) - scrollContainerRef.current.offsetLeft;
    scrollStartRef.current = scrollContainerRef.current.scrollLeft;
  };

  const handleDragMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    event.preventDefault();
    const x = getPageX(event) - scrollContainerRef.current.offsetLeft;
    const walk = x - dragStartXRef.current;
    scrollContainerRef.current.scrollLeft = scrollStartRef.current - walk;
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setSelectedStatuses((prev) =>
      checked ? [...prev, value] : prev.filter((status) => status !== value)
    );
  };

  const handleIntervaloHoraChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    if (checked) {
      setIntervaloHora(parseInt(value, 10));
    }
  };

  /**
   * Confirma seleção de datas e aplica filtro
   */
  const handleConfirmDatas = (dataInicial: Date | null, dataFinal: Date | null) => {
    setPeriodoInicial(dataInicial)
    setPeriodoFinal(dataFinal)
    // Se pelo menos uma data foi selecionada, muda período para "Datas Personalizadas"
    if (dataInicial || dataFinal) {
      setPeriodo('Datas Personalizadas')
    }
  };

  /**
   * Handler para mudança de período no dropdown
   */
  const handlePeriodoChange = (novoPeriodo: string) => {
    setPeriodo(novoPeriodo)
    // Se não for "Datas Personalizadas", limpa as datas personalizadas
    if (novoPeriodo !== 'Datas Personalizadas') {
      setPeriodoInicial(null)
      setPeriodoFinal(null)
    }
  };

  /**
   * Limpa todos os filtros e retorna ao padrão (Últimos 7 Dias)
   */
  const handleLimparFiltros = () => {
    setPeriodo('Últimos 7 Dias')
    setPeriodoInicial(null)
    setPeriodoFinal(null)
    setIsDatasModalOpen(false)
    setAnchorEl(null)
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2 bg-custom-2/50 py-2 px-1 rounded-lg mt-2"
    >
      {/* Barra de seleção de período */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center justify-start gap-2 mt-2">
        <span className="text-primary text-sm font-exo">Período:</span>
        <div className="flex flex-row items-center justify-start gap-2">
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={periodo}
            onChange={(e) => handlePeriodoChange(e.target.value)}
            sx={{
              height: '24px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              fontSize: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--color-primary)',
              },
              '& .MuiSvgIcon-root': {
                color: 'white',
              },
            }}
          >
            <MenuItem value="Todos">Todos</MenuItem>
            <MenuItem value="Hoje">Hoje</MenuItem>
            <MenuItem value="Mês Atual">Mês Atual</MenuItem>
            <MenuItem value="Últimos 7 Dias">Últimos 7 Dias</MenuItem>
            <MenuItem value="Últimos 30 Dias">Últimos 30 Dias</MenuItem>
            <MenuItem value="Últimos 60 Dias">Últimos 60 Dias</MenuItem>
            <MenuItem value="Últimos 90 Dias">Últimos 90 Dias</MenuItem>
            <MenuItem value="Datas Personalizadas">Datas Personalizadas</MenuItem>
          </Select>
        </FormControl>
        
        {/* Botão Por Datas */}
        <button
          onClick={(e) => {
            setAnchorEl(e.currentTarget)
            setIsDatasModalOpen(true)
          }}
          className="h-6 px-4 bg-primary text-white rounded-lg flex items-center gap-2 text-sm font-nunito hover:bg-primary/90 transition-colors"
        >
          <MdCalendarToday size={10} />
          Por datas
        </button>
        </div>
        {/* Botão Limpar Filtros */}
        <button
          onClick={handleLimparFiltros}
          className="h-6 px-4 bg-gray-500 text-white rounded-lg flex items-center gap-2 text-sm font-nunito hover:bg-gray-600 transition-colors"
          title="Limpar filtros e voltar ao padrão (Últimos 7 Dias)"
        >
          <RotateCcw size={12} />
          Limpar
        </button>
      </motion.div>

      {/* Cards de métricas */}
      <motion.div variants={itemVariants}>
        <Suspense fallback={
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={80} className="rounded-lg" />
            ))}
          </div>
        }>
          <MetricCards 
            periodo={periodo}
            periodoInicial={periodoInicial}
            periodoFinal={periodoFinal}
          />
        </Suspense>
      </motion.div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda - 2 colunas */}
        <motion.div variants={slideFromLeftVariants} initial="hidden" animate="visible" className="lg:col-span-2 space-y-6">
          {/* Gráfico de evolução */}
          <div className="bg-white md:h-[440px] h-[600px] rounded-lg shadow-sm shadow-primary/70 border border-gray-200 px-2 md:px-6 py-2 flex flex-col">
                   <div className="mb-1 flex md:flex-row flex-col items-start gap-4 md:gap-12 flex-shrink-0">
                     <div className="flex flex-col items-start justify-start">
                      <h3 className="md:text-lg text-sm font-semibold text-primary">Evolução de Vendas</h3>
                      <p className="md:text-sm text-xs text-primary/70">{getPeriodoLabel(periodo, periodoInicial, periodoFinal)}</p>
                     </div>
                     <div className="flex flex-col">
                       <FormGroup
                         sx={{
                           flexDirection: { xs: 'row', md: 'row' },
                           alignItems: { xs: 'flex-start', md: 'center' },
                           gap: { xs: 0, md: 0 },
                         }}
                       >
                         <FormControlLabel
                           control={
                             <Checkbox
                               checked={selectedStatuses.includes('FINALIZADA')}
                               onChange={handleStatusChange}
                               value="FINALIZADA"
                               sx={{
                                 color: '#4082b4', // Cor azul para Finalizadas
                                 '&.Mui-checked': {
                                   color: '#4082b4',
                                 },
                                 size: 'small',
                               }}
                             />
                           }
                           label={<span className="md:text-sm text-xs">Finalizadas</span>}
                         />
                         <FormControlLabel
                           control={
                             <Checkbox
                               checked={selectedStatuses.includes('CANCELADA')}
                               onChange={handleStatusChange}
                               value="CANCELADA"
                               sx={{
                                 color: '#EF4444', // Cor vermelha para Canceladas
                                 '&.Mui-checked': {
                                   color: '#EF4444',
                                 },
                                 size: 'small',
                               }}
                             />
                           }
                           label={<span className="md:text-sm text-xs">Canceladas</span>}
                         />
                       </FormGroup>
                       {/* Checkboxes para intervalo de tempo (apenas quando for exibir por hora) */}
                       {(periodo === 'Datas Personalizadas' && periodoInicial && periodoFinal) ? (
                         <FormGroup
                           sx={{
                             flexDirection: { xs: 'row', md: 'row' },
                             alignItems: { xs: 'flex-start', md: 'center' },
                             gap: { xs: 0, md: 0 },
                           }}
                         >
                          <div className="flex flex-col">
                           <span className="md:text-sm text-xs text-primary/70 mr-2">Intervalo:</span>
                           <div className="flex flex-row">
                           <FormControlLabel
                             control={
                               <Checkbox
                                 checked={intervaloHora === 15}
                                 onChange={handleIntervaloHoraChange}
                                 value="15"
                                 sx={{
                                   color: '#530CA3',
                                   '&.Mui-checked': {
                                     color: '#530CA3',
                                   },
                                   size: 'small',
                                 }}
                               />
                             }
                             label={<span className="md:text-sm text-xs">15 min</span>}
                           />
                           <FormControlLabel
                             control={
                               <Checkbox
                                 checked={intervaloHora === 30}
                                 onChange={handleIntervaloHoraChange}
                                 value="30"
                                 sx={{
                                   color: '#530CA3',
                                   '&.Mui-checked': {
                                     color: '#530CA3',
                                   },
                                   size: 'small',
                                 }}
                               />
                             }
                             label={<span className="md:text-sm text-xs">30 min</span>}
                           />
                           <FormControlLabel
                             control={
                               <Checkbox
                                 checked={intervaloHora === 60}
                                 onChange={handleIntervaloHoraChange}
                                 value="60"
                                 sx={{
                                   color: '#530CA3',
                                   '&.Mui-checked': {
                                     color: '#530CA3',
                                   },
                                   size: 'small',
                                 }}
                               />
                             }
                             label={<span className="md:text-sm text-xs">1h</span>}
                           />
                         </div>
                         </div>
                         </FormGroup>
                         
                       ) : (
                         <div className="h-[32px]"></div>
                       )}
                     </div>
                   </div>
            <div className="flex-1 min-h-0">
              <Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
                <GraficoVendasLinha 
                  periodo={periodo} 
                  selectedStatuses={selectedStatuses}
                  periodoInicial={periodoInicial}
                  periodoFinal={periodoFinal}
                  intervaloHora={intervaloHora}
                />
              </Suspense>
            </div>
          </div>
        </motion.div>

        {/* Coluna direita - Últimas Vendas */}
        <motion.div variants={slideFromRightVariants} initial="hidden" animate="visible" className="lg:col-span-1">
          <Suspense fallback={<Skeleton variant="rectangular" height={390} className="rounded-lg" />}>
            <UltimasVendas 
              periodo={periodo}
              periodoInicial={periodoInicial}
              periodoFinal={periodoFinal}
            />
          </Suspense>
        </motion.div>
      </div>

      {/* Top Produtos - Container com botões de rolagem */}
      <div className="relative w-full max-w-full overflow-x-hidden">
        {/* Conteúdo rolável com drag-to-scroll */}
        <motion.div
          variants={slideFromLeftVariants}
          initial="hidden"
          animate="visible"
          className="flex md:flex-row flex-col md:space-x-2 space-y- bg-transparent overflow-x-hidden md:overflow-x-auto border border-primary/50 rounded-lg md:px-2 px-1 pt-2 md:cursor-grab md:active:cursor-grabbing select-none"
          ref={scrollContainerRef}
          style={{ scrollBehavior: 'smooth' }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => {
            // Desabilitar drag-to-scroll em mobile
            if (window.innerWidth < 768) {
              return
            }
            handleDragStart(e)
          }}
          onTouchMove={(e) => {
            // Desabilitar drag-to-scroll em mobile
            if (window.innerWidth < 768) {
              return
            }
            handleDragMove(e)
          }}
          onTouchEnd={() => {
            // Desabilitar drag-to-scroll em mobile
            if (window.innerWidth < 768) {
              return
            }
            handleDragEnd()
          }}
        >
            {/* Tabela de top produtos */}
            <div className="bg-white mb-3 rounded-lg shadow-sm shadow-primary/70 border border-gray-200 md:px-6 px-1 py-2 w-full md:min-w-[500px] md:w-auto">
              <div className="mb-2">
                <h3 className="text-base md:text-lg font-semibold text-primary">Top Produtos</h3>
                <p className="text-xs md:text-sm text-primary/70">Os 10 mais vendidos</p>
              </div>
              <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
                <TabelaTopProdutos 
                  periodo={periodo} 
                  onDataLoad={setTopProdutosData}
                  periodoInicial={periodoInicial}
                  periodoFinal={periodoFinal}
                />
              </Suspense>
            </div>

            {/* Gráfico de top produtos (por quantidade) */}
            <div className="bg-white mb-3 rounded-lg shadow-sm shadow-primary/70 border border-gray-200 md:px-6 px-1 py-2 w-full md:min-w-[500px] md:w-auto">
              <div className="mb-4">
                <h3 className="text-base md:text-lg font-semibold text-primary">Quantidade de Produtos Vendidos</h3>
                <p className="text-xs md:text-sm text-primary/70">Distribuição dos Top Produtos</p>
              </div>
              <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
                <GraficoTopProdutos data={topProdutosData} />
              </Suspense>
            </div>

            {/* Novo Gráfico de top produtos (por valor total) */}
            <div className="bg-white mb-3 rounded-lg shadow-sm shadow-primary/70 border border-gray-200 md:px-6 px-1 py-2 w-full md:min-w-[500px] md:w-auto">
              <div className="mb-4">
                <h3 className="text-base md:text-lg font-semibold text-primary">Valor Total dos Produtos Vendidos</h3>
                <p className="text-xs md:text-sm text-primary/70">Distribuição por Valor</p>
              </div>
              <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
                <GraficoTopProdutosValor data={topProdutosData} />
              </Suspense>
            </div>
          </motion.div>
      </div>

      {/* Popover de Seleção de Datas */}
      <Popover
        open={isDatasModalOpen}
        anchorEl={anchorEl}
        onClose={() => {
          setIsDatasModalOpen(false)
          setAnchorEl(null)
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '12px',
            maxWidth: '400px',
            marginTop: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        }}
      >
        <div className="p-0">
          <EscolheDatasModal
            open={isDatasModalOpen}
            onClose={() => {
              setIsDatasModalOpen(false)
              setAnchorEl(null)
            }}
            onConfirm={(dataInicial, dataFinal) => {
              handleConfirmDatas(dataInicial, dataFinal)
              setIsDatasModalOpen(false)
              setAnchorEl(null)
            }}
            dataInicial={periodoInicial}
            dataFinal={periodoFinal}
            usePopover={true}
          />
        </div>
      </Popover>
    </motion.div>
  )
}
