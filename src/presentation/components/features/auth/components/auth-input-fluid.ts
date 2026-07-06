/**
 * Estilos fluidos para inputs de auth: escalonam com `vmin` / `clamp`,
 * alinhados ao vídeo e ao modal (`AuthPublicShell`), não só a breakpoints em px.
 *
 * Em monitores com mesma resolução, escala/DPI/zoom costuma mudar o viewport em px —
 * essas classes reagem a isso; `sm:`/`md:` fixos quase não diferenciam.
 */
export const authFluid = {
  /** Label acima do campo */
  label:
    'mb-[clamp(0.25rem,0.85vmin,0.5rem)] block font-medium text-gray-700 text-[clamp(0.6875rem,2.1vmin,0.875rem)]',
  /** Ícone à esquerda dentro do input */
  iconLeft: 'absolute left-[clamp(0.45rem,1.65vmin,0.75rem)] top-1/2 -translate-y-1/2 text-gray-500',
  iconSvg: 'h-[clamp(0.8125rem,3vmin,1.25rem)] w-[clamp(0.8125rem,3vmin,1.25rem)]',
  /** Base comum ao <input> */
  shell:
    'w-full rounded-lg border border-gray-300 bg-gray-100 leading-snug transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-alternate',
  /** Texto + altura (padding vertical) fluidos */
  textAndPy:
    'py-[clamp(0.35rem,1.15vmin,0.8125rem)] text-[clamp(0.8125rem,2.75vmin,1rem)]',
  /** Nome / e-mail: ícone esquerda + texto */
  padIconField:
    'pl-[clamp(1.75rem,6vmin,2.5rem)] pr-[clamp(0.45rem,1.65vmin,1rem)]',
  /** Senha com cadeado + olho */
  padPwdField:
    'pl-[clamp(1.75rem,6vmin,2.5rem)] pr-[clamp(2.125rem,8.25vmin,3.125rem)]',
  /** Senha sem cadeado (só olho) */
  padPwdNoLock:
    'px-[clamp(0.45rem,1.65vmin,1rem)] pr-[clamp(2.125rem,8.25vmin,3.125rem)]',
  /** Botão olho (password) */
  eyeBtn:
    'absolute right-[clamp(0.2rem,1.15vmin,0.5rem)] top-1/2 -translate-y-1/2 rounded-md text-gray-500 transition-colors hover:text-gray-800 p-[clamp(0.15rem,0.55vmin,0.375rem)]',
  eyeIcon: 'h-[clamp(0.8125rem,2.85vmin,1.125rem)] w-[clamp(0.8125rem,2.85vmin,1.125rem)]',

  /**
   * Logo Jiffy no topo do painel — escala com `vmin` (como inputs/vídeo).
   * Em viewports menores ou mais baixos, fica proporcionalmente menor que antes.
   */
  logoOuter: 'mb-[clamp(0.35rem,1.25vmin,0.75rem)] [@media(max-height:720px)]:mb-2 flex justify-center',
  /** Um pouco maior em viewports compactos (pedido UX): sobe piso do clamp e o peso do vmin. */
  logoBox:
    'relative mx-auto w-full max-w-[min(100%,58vmin)] h-[clamp(3.75rem,13.5vmin,8rem)] max-h-[min(30vmin,36vh)] [@media(max-height:720px)]:h-[clamp(3.5rem,12.5vmin,7.25rem)] [@media(max-height:720px)]:max-h-[30vh]',
} as const
