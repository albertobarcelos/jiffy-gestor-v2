'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useRef, useEffect } from 'react'
import { Skeleton, FormControl, Select, MenuItem, FormGroup, FormControlLabel, Checkbox } from '@mui/material'
import { motion } from 'framer-motion'; // Importar motion do Framer Motion
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto' // Importar a entidade

// Função para obter o label do período
const getPeriodoLabel = (periodo: string): string => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={120} className="rounded-xl" />
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2 bg-custom-2/50 p-2 rounded-lg mt-2"
    >
      {/* Barra de seleção de período */}
      <motion.div variants={itemVariants} className="flex items-center justify-start gap-2 mt-2">
        <span className="text-primary text-sm font-exo">Período:</span>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            sx={{
              height: '20px',
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
          </Select>
        </FormControl>
      </motion.div>

      {/* Cards de métricas */}
      <motion.div variants={itemVariants}>
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={120} className="rounded-xl" />
            ))}
          </div>
        }>
          <MetricCards periodo={periodo} />
        </Suspense>
      </motion.div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda - 2 colunas */}
        <motion.div variants={slideFromLeftVariants} initial="hidden" animate="visible" className="lg:col-span-2 space-y-6">
          {/* Gráfico de evolução */}
          <div className="bg-white rounded-lg shadow-sm shadow-primary/70 border border-gray-200 px-2 md:px-6 py-2">
                   <div className="mb-6 flex items-start gap-4 md:gap-12">
                     <div className="flex flex-col items-start justify-start">
                      <h3 className="md:text-lg text-sm font-semibold text-primary">Evolução de Vendas</h3>
                      <p className="md:text-sm text-xs text-primary/70">{getPeriodoLabel(periodo)}</p>
                     </div>
                     <FormGroup
                       sx={{
                         flexDirection: { xs: 'column', md: 'row' },
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
                       label={<span className="md:text-lg text-xs">Finalizadas</span>}
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
                             }}
                           />
                         }
                         label={<span className="md:text-lg text-xs">Canceladas</span>}
                       />
                     </FormGroup>
                   </div>
            <Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
              <GraficoVendasLinha periodo={periodo} selectedStatuses={selectedStatuses} />
            </Suspense>
          </div>
        </motion.div>

        {/* Coluna direita - Últimas Vendas */}
        <motion.div variants={slideFromRightVariants} initial="hidden" animate="visible" className="lg:col-span-1">
          <Suspense fallback={<Skeleton variant="rectangular" height={390} className="rounded-lg" />}>
            <UltimasVendas periodo={periodo} />
          </Suspense>
        </motion.div>
      </div>

      {/* Top Produtos - Container com botões de rolagem */}
      <div className="relative w-full">
        {/* Conteúdo rolável com drag-to-scroll */}
        <motion.div
          variants={slideFromLeftVariants}
          initial="hidden"
          animate="visible"
          className="flex md:flex-row flex-col md:space-x-2 space-y-2 bg-transparent overflow-x-hidden border border-primary/50 rounded-lg px-2 pt-2 cursor-grab active:cursor-grabbing select-none"
          ref={scrollContainerRef}
          style={{ scrollBehavior: 'smooth' }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
            {/* Tabela de top produtos */}
            <div className="bg-white mb-3 rounded-lg shadow-sm shadow-primary/70 border border-gray-200 px-6 py-2 min-w-[500px]">
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-primary">Top Produtos</h3>
                <p className="text-sm text-primary/70">Os 10 mais vendidos</p>
              </div>
              <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
                <TabelaTopProdutos periodo={periodo} onDataLoad={setTopProdutosData} />
              </Suspense>
            </div>

            {/* Gráfico de top produtos (por quantidade) */}
            <div className="bg-white mb-3 rounded-lg shadow-sm shadow-primary/70 border border-gray-200 md:p-6 p-4 flex-1 xl:min-w-[500px]">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary">Quantidade de Produtos Vendidos</h3>
                <p className="text-sm text-primary/70">Distribuição dos Top Produtos</p>
              </div>
              <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
                <GraficoTopProdutos data={topProdutosData} />
              </Suspense>
            </div>

            {/* Novo Gráfico de top produtos (por valor total) */}
            <div className="bg-white mb-3 rounded-lg shadow-sm shadow-primary/70 border border-gray-200 p-6 flex-1 xl:min-w-[600px]">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary">Valor Total dos Produtos Vendidos</h3>
                <p className="text-sm text-primary/70">Distribuição por Valor</p>
              </div>
              <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
                <GraficoTopProdutosValor data={topProdutosData} />
              </Suspense>
            </div>
          </motion.div>
      </div>
    </motion.div>
  )
}
