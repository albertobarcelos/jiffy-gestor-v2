/** Largura intrínseca da faixa, sem encolher nem quebrar linha. */
export function medirLarguraNatural(el: HTMLElement): number {
  const { display, flexWrap, width, flex, minWidth } = el.style
  el.style.display = 'flex'
  el.style.flexWrap = 'nowrap'
  el.style.width = 'max-content'
  el.style.flex = '0 0 auto'
  el.style.minWidth = 'max-content'
  const medido = el.scrollWidth
  el.style.display = display
  el.style.flexWrap = flexWrap
  el.style.width = width
  el.style.flex = flex
  el.style.minWidth = minWidth
  return medido
}
