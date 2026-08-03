import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SchoolIcon from '@mui/icons-material/School'
import { HUB_PATH, HUB_ROUTES } from '@/src/shared/constants/hubRoutes'

export type HubMenuItem = {
  label: string
  href: string
  /** Ícones Material (`@mui/icons-material`), mesma família que `DashboardOutlinedIcon`. */
  Icon: typeof DashboardOutlinedIcon
}

export const HUB_MENU_ITEMS: HubMenuItem[] = [
  { label: 'Meu Jiffy', href: HUB_ROUTES.root, Icon: DashboardOutlinedIcon },
  { label: 'Extrato Financeiro', href: HUB_ROUTES.extratoFinanceiro, Icon: ReceiptLongIcon },
  { label: 'Treinamentos', href: HUB_ROUTES.treinamentos, Icon: SchoolIcon },
]

export function isHubMenuActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/perfil') {
    return pathname === '/perfil' || pathname.startsWith('/perfil/')
  }
  if (href === HUB_PATH) {
    if (pathname === HUB_PATH) return true
    if (!pathname.startsWith(`${HUB_PATH}/`)) return false
    if (pathname.startsWith(HUB_ROUTES.extratoFinanceiro)) return false
    if (pathname.startsWith(HUB_ROUTES.treinamentos)) return false
    return true
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
