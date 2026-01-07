'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Importa os ícones
import { Skeleton, FormControl, Select, MenuItem, FormGroup, FormControlLabel, Checkbox } from '@mui/material'
import { motion } from 'framer-motion'; // Importar motion do Framer Motion
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto' // Importar a entidade

// Função para obter o label do período
const getPeriodoLabel = (periodo: string): string => {
  switch (periodo) {
    case 'todos':
      return 'Todos os Períodos';
    case 'hoje':
      return 'Hoje';
    case 'mes':
      return 'Mês Atual';
    case 'semana':
      return 'Últimos 7 Dias';
    case '30dias':
      return 'Últimos 30 Dias';
    case '60dias':
      return 'Últimos 60 Dias';
    case '90dias':
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
  const [periodo, setPeriodo] = useState('semana'); // Estado para o período
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['FINALIZADA']); // Estado para os status selecionados
  const [topProdutosData, setTopProdutosData] = useState<DashboardTopProduto[]>([]); // Novo estado para os top produtos

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Função para verificar se os botões de rolagem devem ser exibidos
  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth, scrollLeft } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  // Efeito para adicionar listener de scroll e verificar scrollabilidade inicial
  useEffect(() => {
    checkScrollability();
    scrollContainerRef.current?.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', checkScrollability);
    return () => {
      scrollContainerRef.current?.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, []);

  // Função para rolagem dos itens
  const scroll = (scrollOffset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += scrollOffset;
    }
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
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="hoje">Hoje</MenuItem>
            <MenuItem value="mes">Mês Atual</MenuItem>
            <MenuItem value="semana">Últimos 7 Dias</MenuItem>
            <MenuItem value="30dias">Últimos 30 Dias</MenuItem>
            <MenuItem value="60dias">Últimos 60 Dias</MenuItem>
            <MenuItem value="90dias">Últimos 90 Dias</MenuItem>
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
          <div className="bg-white rounded-lg shadow-sm shadow-primary/70 border border-gray-200 px-6 py-2">
                   <div className="mb-6 flex items-start gap-12">
                     <div className="flex flex-col items-start justify-start">
                      <h3 className="text-lg font-semibold text-primary">Evolução de Vendas</h3>
                      <p className="text-sm text-primary/70">{getPeriodoLabel(periodo)}</p>
                     </div>
                     <FormGroup row>
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
                             }}
                           />
                         }
                         label="Finalizadas"
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
                         label="Canceladas"
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
          <Suspense fallback={<Skeleton variant="rectangular" height={600} className="rounded-lg" />}>
            <UltimasVendas />
          </Suspense>
        </motion.div>
      </div>

      {/* Top Produtos - Container com botões de rolagem */}
      <div className="relative w-full px-9">
        {/* Botão de rolagem para a esquerda */}
        {canScrollLeft && (
          <button
            onClick={() => scroll(-300)} // Rola 300px para a esquerda
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow-md z-10  border-2 border-primary"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} className="text-primary" />
          </button>
        )}

        {/* Conteúdo rolável */}
        <motion.div
          variants={slideFromLeftVariants}
          initial="hidden"
          animate="visible"
          className="flex space-x-2 bg-transparent overflow-x-hidden border border-primary/50 rounded-lg px-2 pt-2" // Esconde a barra de rolagem nativa
          ref={scrollContainerRef} // Adiciona ref para controlar a rolagem
          style={{ scrollBehavior: 'smooth' }} // Garante rolagem suave
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
            <div className="bg-white mb-3 rounded-lg shadow-sm shadow-primary/70 border border-gray-200 p-6 min-w-[450px]">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary">Quantidade de Produtos Vendidos</h3>
                <p className="text-sm text-primary/70">Distribuição dos Top Produtos</p>
              </div>
              <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
                <GraficoTopProdutos data={topProdutosData} />
              </Suspense>
            </div>

            {/* Novo Gráfico de top produtos (por valor total) */}
            <div className="bg-white mb-3 rounded-lg shadow-sm shadow-primary/70 border border-gray-200 p-6 min-w-[600px]">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary">Valor Total dos Produtos Vendidos</h3>
                <p className="text-sm text-primary/70">Distribuição por Valor</p>
              </div>
              <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
                <GraficoTopProdutosValor data={topProdutosData} />
              </Suspense>
            </div>
          </motion.div>

        {/* Botão de rolagem para a direita */}
        {canScrollRight && (
          <button
            onClick={() => scroll(300)} // Rola 300px para a direita
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow-md z-10  border-2 border-primary"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} className="text-primary" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
