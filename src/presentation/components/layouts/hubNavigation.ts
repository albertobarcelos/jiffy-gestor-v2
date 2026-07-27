import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SchoolIcon from '@mui/icons-material/School'

export type HubMenuItem = {
  label: string
  href: string
  /** Ícones Material (`@mui/icons-material`), mesma família que `DashboardOutlinedIcon`. */
  Icon: typeof DashboardOutlinedIcon
}

export const HUB_MENU_ITEMS: HubMenuItem[] = [
  { label: 'Meu Jiffy', href: '/meus-apps', Icon: DashboardOutlinedIcon },
  { label: 'Extrato Financeiro', href: '/meus-apps/extrato-financeiro', Icon: ReceiptLongIcon },
  { label: 'Treinamentos', href: '/meus-apps/treinamentos', Icon: SchoolIcon },
]

export function isHubMenuActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/perfil') {
    return pathname === '/perfil' || pathname.startsWith('/perfil/')
  }
  if (href === '/meus-apps') {
    if (pathname === '/meus-apps') return true
    if (!pathname.startsWith('/meus-apps/')) return false
    if (pathname.startsWith('/meus-apps/extrato-financeiro')) return false
    if (pathname.startsWith('/meus-apps/treinamentos')) return false
    return true
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
