import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  LineChart,
  Moon,
  Sun,
  Folder,
  Clock,
  LogOut,
  Scale,
  ClipboardList,
  KeyRound,
  UserCog,
  Files,
  ChevronDown,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

const SIDEBAR_PREFS_KEY = 'gasparotto_sidebar_expanded_sections'

export default function Layout() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isGestor = user?.perfil === 'gestor'
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
    window.scrollTo(0, 0)
  }, [location.pathname])

  const navSections = useMemo(
    () => [
      {
        id: 'visao-geral',
        label: 'VISÃO GERAL',
        items: [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }],
      },
      {
        id: 'gestao-casos',
        label: 'GESTÃO DE CASOS',
        items: [
          { name: 'RPV/Precatório', path: '/rpv', icon: Scale },
          { name: 'Protocolo', path: '/protocolo', icon: FileText },
          { name: 'Contratos Fechados', path: '/dashboard', icon: Folder },
          { name: 'Perícias', path: '/pericias', icon: Clock },
        ].filter((item) => item.path !== '/rpv' || isGestor),
      },
      {
        id: 'captacao-leads',
        label: 'CAPTAÇÃO DE LEADS',
        items: [
          { name: 'Leads Campanha', path: '/leads', icon: LineChart },
          { name: 'Registro de Leads', path: '/leads-registro', icon: ClipboardList },
        ],
      },
      {
        id: 'gestao-pessoas',
        label: 'GESTÃO DE PESSOAS',
        items: [
          { name: 'Acesso Sistemas', path: '/gestao/acessos', icon: KeyRound },
          { name: 'Cartão de Ponto', path: '/gestao/ponto', icon: Clock },
          { name: 'Funcionários', path: '/gestao/funcionarios', icon: Users },
          { name: 'Responsáveis', path: '/gestao/responsaveis', icon: UserCog },
        ].filter((item) => item.path !== '/gestao/funcionarios' || isGestor),
      },
      {
        id: 'ferramentas',
        label: 'FERRAMENTAS',
        items: [{ name: 'Editor de PDFs', path: '/ferramentas-pdf', icon: Files }],
      },
    ],
    [isGestor],
  )

  const isItemActive = useCallback(
    (itemPath: string) => {
      const current = location.pathname
      if (itemPath === '/') {
        return current === '/'
      }
      return current === itemPath || current.startsWith(`${itemPath}/`)
    },
    [location.pathname],
  )

  const activeSectionId = useMemo(() => {
    const matched = navSections.find((section) =>
      section.items.some((item) => isItemActive(item.path)),
    )
    return matched ? matched.id : null
  }, [navSections, isItemActive])

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const current = location.pathname
    const matched = navSections.find((section) =>
      section.items.some((item) =>
        item.path === '/'
          ? current === '/'
          : current === item.path || current.startsWith(`${item.path}/`),
      ),
    )
    const activeId = matched ? matched.id : null

    try {
      const saved = localStorage.getItem(SIDEBAR_PREFS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>
        if (parsed && typeof parsed === 'object') {
          if (activeId) {
            return { ...parsed, [activeId]: true }
          }
          return parsed
        }
      }
    } catch {
      // Falha ao ler localStorage, usa padrão
    }

    const initial: Record<string, boolean> = {
      'visao-geral': false,
      'gestao-casos': false,
      'captacao-leads': false,
      'gestao-pessoas': false,
      ferramentas: false,
    }
    if (activeId) {
      initial[activeId] = true
    }
    return initial
  })

  useEffect(() => {
    if (activeSectionId) {
      setExpandedSections((prev) => {
        if (prev[activeSectionId]) return prev
        const updated = { ...prev, [activeSectionId]: true }
        try {
          localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(updated))
        } catch {
          // localStorage indisponível
        }
        return updated
      })
    }
  }, [activeSectionId])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const updated = {
        ...prev,
        [sectionId]: !prev[sectionId],
      }
      try {
        localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(updated))
      } catch {
        // localStorage indisponível
      }
      return updated
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('gasparotto_auth')
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant="inset" className="border-r">
          <SidebarHeader className="p-0 border-b border-border">
            <div className="flex items-center justify-center px-4 py-3.5 w-full">
              <Link
                to="/"
                className="w-full max-w-[216px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-opacity hover:opacity-95"
                title="Advocacia Gasparotto - Início"
              >
                <BrandLogo className="w-full h-auto max-h-[64px]" />
              </Link>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4 py-2">
            <div className="flex flex-col">
              {navSections.map((section, index) => {
                const isExpanded = !!expandedSections[section.id]
                const contentId = `nav-section-${section.id}`

                return (
                  <div key={section.id} className={cn(index > 0 && 'mt-4')}>
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={isExpanded}
                      aria-controls={contentId}
                      className="group/sec-header flex w-full items-center justify-between px-2 py-1.5 mb-1 rounded text-[10px] uppercase font-semibold tracking-[1px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer select-none"
                    >
                      <span className="truncate">{section.label}</span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200 group-hover/sec-header:text-foreground',
                          isExpanded && 'rotate-180',
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    {isExpanded && (
                      <div id={contentId}>
                        <SidebarMenu>
                          {section.items.map((item) => {
                            const isActive = isItemActive(item.path)
                            return (
                              <SidebarMenuItem key={item.path}>
                                <SidebarMenuButton
                                  asChild
                                  isActive={isActive}
                                  className={cn(
                                    'w-full py-5 text-base transition-colors border-l-4 rounded-none h-12',
                                    isActive
                                      ? 'bg-[#C9922A]/15 border-[#C9922A] text-[#C9922A] font-bold hover:bg-[#C9922A]/20 hover:text-[#C9922A]'
                                      : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium',
                                  )}
                                >
                                  <Link to={item.path}>
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.name}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )
                          })}
                        </SidebarMenu>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair do sistema
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair do sistema</AlertDialogTitle>
                  <AlertDialogDescription>Deseja sair do sistema?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex w-full flex-col overflow-hidden bg-background">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-card px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <SidebarTrigger className="-ml-2" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[12px] font-bold text-foreground">Advocacia</span>
                <span className="text-[14px] font-bold text-[#C9922A]">Gasparotto</span>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-full border">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-full transition-all',
                  theme === 'light'
                    ? 'bg-[#C9922A] text-white shadow-sm hover:bg-[#C9922A] hover:text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-full transition-all',
                  theme === 'dark'
                    ? 'bg-[#C9922A] text-white shadow-sm hover:bg-[#C9922A] hover:text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-8 bg-background">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
